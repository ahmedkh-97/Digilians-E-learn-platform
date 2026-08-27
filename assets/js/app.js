import {
  getStudentName,
  setStudentName,
  clearStudentName,
  getTheme,
  setTheme,
  getResults,
  saveResult,
  getBestForExam
} from "./storage.js";

import {
  validateExamPayload,
  calculateResult,
  formatDuration
} from "./exam.js";

const state = {
  studentName: "",
  registry: [],
  currentExam: null,
  answers: {},
  currentIndex: 0,
  feedbackMode: "instant",
  startedAt: null,
  remainingSeconds: null,
  timerId: null,
  lastResult: null
};

const $ = (id) => document.getElementById(id);

const views = [
  "welcomeView",
  "dashboardView",
  "setupView",
  "examView",
  "resultView",
  "reviewView"
];

function showView(id) {
  views.forEach(viewId => $(viewId).classList.toggle("active", viewId === id));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  setTheme(theme);
}

$("themeToggle").addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || "light";
  applyTheme(current === "dark" ? "light" : "dark");
});

$("brandHome").addEventListener("click", (e) => {
  e.preventDefault();
  if (state.studentName) openDashboard();
  else showView("welcomeView");
});

$("startBtn").addEventListener("click", handleNameSubmit);
$("studentName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleNameSubmit();
});

function handleNameSubmit() {
  const name = $("studentName").value.trim();

  if (name.length < 2) {
    $("nameError").textContent = "Please enter a valid name.";
    return;
  }

  $("nameError").textContent = "";
  setStudentName(name);
  state.studentName = name;
  openDashboard();
}

$("changeNameBtn").addEventListener("click", () => {
  clearStudentName();
  state.studentName = "";
  $("studentName").value = "";
  $("userChip").textContent = "Guest";
  showView("welcomeView");
});

async function loadRegistry() {
  const res = await fetch("data/exams.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load exam registry.");
  const payload = await res.json();
  return payload.exams || [];
}

async function openDashboard() {
  showView("dashboardView");
  $("userChip").textContent = state.studentName;
  $("welcomeTitle").textContent = `Welcome, ${state.studentName}`;

  try {
    if (!state.registry.length) {
      state.registry = await loadRegistry();
    }
    renderExamLibrary();
    renderDashboardStats();
  } catch (error) {
    $("examLoadError").textContent =
      "Could not load exams. This site must be opened through a web server or GitHub Pages, not directly as a local file.";
    $("examLoadError").classList.remove("hidden");
  }
}

function renderDashboardStats() {
  $("examCount").textContent = state.registry.filter(x => x.active !== false).length;

  const results = getResults().filter(r => r.studentName === state.studentName);
  const examIds = new Set(results.map(r => r.examId));
  $("completedCount").textContent = examIds.size;

  if (!results.length) {
    $("bestScore").textContent = "—";
  } else {
    const best = Math.max(...results.map(r => r.percentage));
    $("bestScore").textContent = `${best}%`;
  }
}

function renderExamLibrary(filter = "") {
  const grid = $("examGrid");
  grid.innerHTML = "";

  const list = state.registry
    .filter(item => item.active !== false)
    .filter(item => {
      const text = `${item.title} ${item.course} ${item.module} ${item.category}`.toLowerCase();
      return text.includes(filter.toLowerCase());
    });

  for (const item of list) {
    const best = getBestForExam(item.id, state.studentName);
    const card = document.createElement("article");
    card.className = "exam-card";

    card.innerHTML = `
      <div class="exam-meta">
        <span class="pill">${item.category || "Exam"}</span>
        <span class="pill subtle">${item.difficulty || "Mixed"}</span>
      </div>

      <h3>${item.title}</h3>
      <p>${item.description || ""}</p>

      <div class="exam-details">
        <div>
          <span>Course</span>
          <strong>${item.course || "—"}</strong>
        </div>
        <div>
          <span>Module</span>
          <strong>${item.module || "—"}</strong>
        </div>
        <div>
          <span>Questions</span>
          <strong>${item.questionCount ?? "—"}</strong>
        </div>
        <div>
          <span>Your Best</span>
          <strong>${best ? `${best.percentage}%` : "Not attempted"}</strong>
        </div>
      </div>

      <button class="primary-btn wide">Open Exam</button>
    `;

    card.querySelector("button").addEventListener("click", () => prepareExam(item));
    grid.appendChild(card);
  }

  if (!list.length) {
    grid.innerHTML = `<p class="error-card">No exams matched your search.</p>`;
  }
}

$("examSearch").addEventListener("input", (e) => {
  renderExamLibrary(e.target.value);
});

async function prepareExam(registryItem) {
  try {
    const res = await fetch(registryItem.file, { cache: "no-store" });
    if (!res.ok) throw new Error("Exam file could not be loaded.");

    const payload = await res.json();
    const validationErrors = validateExamPayload(payload);

    if (validationErrors.length) {
      alert(`Exam JSON has errors:\n\n${validationErrors.join("\n")}`);
      return;
    }

    state.currentExam = payload;
    const exam = payload.exam;

    $("setupCategory").textContent = exam.category || "Exam";
    $("setupDifficulty").textContent = exam.difficulty || "Mixed";
    $("setupTitle").textContent = exam.title;
    $("setupDescription").textContent = exam.description || "";
    $("setupQuestions").textContent = payload.questions.length;
    $("setupPass").textContent = `${exam.settings?.passingScore ?? 60}%`;

    if (exam.settings?.timer?.enabled) {
      $("setupTimer").textContent = `${exam.settings.timer.durationMinutes} min`;
    } else {
      $("setupTimer").textContent = "No timer";
    }

    const allowedModes = exam.settings?.feedbackModes || ["instant", "exam"];
    document.querySelectorAll('input[name="feedbackMode"]').forEach(input => {
      input.disabled = !allowedModes.includes(input.value);
      input.closest(".mode-option").classList.toggle("hidden", input.disabled);
    });

    const firstAllowed = document.querySelector('input[name="feedbackMode"]:not(:disabled)');
    if (firstAllowed) firstAllowed.checked = true;

    showView("setupView");
  } catch (error) {
    alert(error.message);
  }
}

$("backToLibraryBtn").addEventListener("click", openDashboard);

$("beginExamBtn").addEventListener("click", () => {
  const selected = document.querySelector('input[name="feedbackMode"]:checked');
  state.feedbackMode = selected?.value || "instant";
  startExam();
});

function startExam() {
  stopTimer();

  state.answers = {};
  state.currentIndex = 0;
  state.startedAt = Date.now();
  state.lastResult = null;

  const timer = state.currentExam.exam.settings?.timer;
  state.remainingSeconds = timer?.enabled
    ? timer.durationMinutes * 60
    : null;

  buildQuestionNavigator();
  renderQuestion();
  startTimerIfNeeded();
  showView("examView");
}

function buildQuestionNavigator() {
  const nav = $("questionNavigator");
  nav.innerHTML = "";

  state.currentExam.questions.forEach((q, index) => {
    const btn = document.createElement("button");
    btn.className = "nav-number";
    btn.textContent = index + 1;
    btn.addEventListener("click", () => {
      state.currentIndex = index;
      renderQuestion();
    });
    nav.appendChild(btn);
  });
}

function renderQuestion() {
  const questions = state.currentExam.questions;
  const q = questions[state.currentIndex];

  $("questionCounter").textContent = `Question ${state.currentIndex + 1} / ${questions.length}`;
  $("progressFill").style.width = `${((state.currentIndex + 1) / questions.length) * 100}%`;
  $("questionTopic").textContent = q.topic || "General";
  $("questionDifficulty").textContent = q.difficulty || "Medium";
  $("questionText").textContent = q.question;

  const list = $("optionsList");
  list.innerHTML = "";

  q.options.forEach(option => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerHTML = `
      <span class="option-letter">${option.id}</span>
      <span>${option.text}</span>
    `;

    const selected = state.answers[q.id];
    if (selected === option.id) btn.classList.add("selected");

    if (state.feedbackMode === "instant" && selected) {
      if (option.id === q.correctAnswer) btn.classList.add("correct");
      if (option.id === selected && selected !== q.correctAnswer) btn.classList.add("wrong");
    }

    btn.addEventListener("click", () => selectAnswer(q, option.id));
    list.appendChild(btn);
  });

  renderInstantFeedback(q);
  updateNavigator();

  $("prevQuestionBtn").disabled = state.currentIndex === 0;
  $("nextQuestionBtn").classList.toggle("hidden", state.currentIndex === questions.length - 1);
  $("submitExamBtn").classList.toggle("hidden", state.currentIndex !== questions.length - 1);
}

function selectAnswer(question, optionId) {
  if (state.feedbackMode === "instant" && state.answers[question.id]) return;
  state.answers[question.id] = optionId;
  renderQuestion();
}

function renderInstantFeedback(q) {
  const box = $("instantFeedback");
  box.className = "feedback-box hidden";
  box.innerHTML = "";

  const selected = state.answers[q.id];

  if (state.feedbackMode !== "instant" || !selected) return;

  const correct = selected === q.correctAnswer;
  box.className = `feedback-box ${correct ? "success" : "error"}`;

  const explanation =
    q.explanation?.ar ||
    q.explanation?.en ||
    "No explanation provided.";

  box.innerHTML = `
    <strong>${correct ? "Correct ✓" : `Incorrect ✕ — Correct answer: ${q.correctAnswer}`}</strong>
    <div>${explanation}</div>
  `;
}

function updateNavigator() {
  document.querySelectorAll(".nav-number").forEach((btn, index) => {
    const q = state.currentExam.questions[index];
    btn.classList.toggle("current", index === state.currentIndex);
    btn.classList.toggle("answered", Boolean(state.answers[q.id]));
  });
}

$("prevQuestionBtn").addEventListener("click", () => {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderQuestion();
  }
});

$("nextQuestionBtn").addEventListener("click", () => {
  if (state.currentIndex < state.currentExam.questions.length - 1) {
    state.currentIndex++;
    renderQuestion();
  }
});

$("submitExamBtn").addEventListener("click", () => finishExam(false));

$("exitExamBtn").addEventListener("click", () => {
  const ok = confirm("Exit this exam? Your current attempt will not be saved.");
  if (!ok) return;
  stopTimer();
  openDashboard();
});

function startTimerIfNeeded() {
  if (state.remainingSeconds === null) {
    $("timerDisplay").classList.add("hidden");
    return;
  }

  $("timerDisplay").classList.remove("hidden");
  updateTimerDisplay();

  state.timerId = setInterval(() => {
    state.remainingSeconds--;
    updateTimerDisplay();

    if (state.remainingSeconds <= 0) {
      finishExam(true);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const total = Math.max(0, state.remainingSeconds ?? 0);
  const mins = String(Math.floor(total / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  $("timerDisplay").textContent = `${mins}:${secs}`;
}

function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

function finishExam(autoSubmitted) {
  stopTimer();

  const result = calculateResult(state.currentExam.questions, state.answers);
  const timeTakenSeconds = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000));

  const record = {
    examId: state.currentExam.exam.id,
    examTitle: state.currentExam.exam.title,
    studentName: state.studentName,
    percentage: result.percentage,
    correct: result.correct,
    wrong: result.wrong,
    unanswered: result.unanswered,
    timeTakenSeconds,
    submittedAt: new Date().toISOString(),
    autoSubmitted
  };

  saveResult(record);
  state.lastResult = { ...result, record };

  renderResult();
  showView("resultView");
}

function renderResult() {
  const { record } = state.lastResult;
  const score = state.lastResult;
  const passScore = state.currentExam.exam.settings?.passingScore ?? 60;

  let headline = "Keep practicing";
  if (record.percentage >= 90) headline = "Excellent work";
  else if (record.percentage >= 80) headline = "Great job";
  else if (record.percentage >= passScore) headline = "Good progress";

  $("resultHeadline").textContent = headline;
  $("resultPercent").textContent = `${record.percentage}%`;
  $("resultScore").textContent = `${record.correct} / ${state.currentExam.questions.length}`;
  $("correctCount").textContent = score.correct;
  $("wrongCount").textContent = score.wrong;
  $("unansweredCount").textContent = score.unanswered;
  $("timeTaken").textContent = formatDuration(record.timeTakenSeconds);

  $("celebration").classList.toggle("hidden", record.percentage < 80);
}

$("reviewBtn").addEventListener("click", renderReview);
$("retakeBtn").addEventListener("click", () => showView("setupView"));
$("resultHomeBtn").addEventListener("click", openDashboard);
$("reviewHomeBtn").addEventListener("click", openDashboard);

function renderReview() {
  const list = $("reviewList");
  list.innerHTML = "";
  $("reviewTitle").textContent = state.currentExam.exam.title;

  state.currentExam.questions.forEach((q, index) => {
    const selected = state.answers[q.id] ?? null;
    const selectedOption = q.options.find(o => o.id === selected);
    const correctOption = q.options.find(o => o.id === q.correctAnswer);
    const isCorrect = selected === q.correctAnswer;

    const item = document.createElement("article");
    item.className = "review-item";

    item.innerHTML = `
      <span class="eyebrow">QUESTION ${index + 1}</span>
      <h3>${q.question}</h3>

      <div class="review-answer ${isCorrect ? "correct" : "wrong"}">
        <strong>Your answer:</strong>
        ${selected ? `${selected}. ${selectedOption?.text || ""}` : "Unanswered"}
      </div>

      <div class="review-answer correct">
        <strong>Correct answer:</strong>
        ${q.correctAnswer}. ${correctOption?.text || ""}
      </div>

      <div class="review-explanation">
        <strong>Explanation:</strong><br>
        ${q.explanation?.ar || q.explanation?.en || "No explanation provided."}
      </div>
    `;

    list.appendChild(item);
  });

  showView("reviewView");
}

async function init() {
  applyTheme(getTheme());

  state.studentName = getStudentName();
  if (state.studentName) {
    $("userChip").textContent = state.studentName;
    await openDashboard();
  } else {
    showView("welcomeView");
  }
}

init();
