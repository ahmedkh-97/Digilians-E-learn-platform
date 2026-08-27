import {
  getStudentName,setStudentName,clearStudentName,getTheme,setTheme,getResults,saveResult,
  getBestForExam,getPreviousBestForExam,saveExamProgress,getExamProgress,clearExamProgress,
  setLastCourse
} from "./storage.js";

import {validateExamPayload,calculateResult,formatDuration} from "./exam.js";

const state={
  studentName:"",
  registry:[],
  learning:{courses:[]},
  selectedCourse:null,
  selectedModule:null,
  currentExam:null,
  currentRegistryItem:null,
  answers:{},
  currentIndex:0,
  feedbackMode:"instant",
  startedAt:null,
  remainingSeconds:null,
  timerId:null,
  lastResult:null,
  previousBest:null,
  filter:"All"
};

const $=id=>document.getElementById(id);
const views=["welcomeView","dashboardView","learnView","studyView","examsView","setupView","examView","resultView","reviewView","rankingView"];

function initials(name){
  return (name || "Guest").trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join("") || "G";
}

function routeTo(id){
  views.forEach(v=>$(v)?.classList.toggle("active",v===id));
  updateNav(id);
  window.scrollTo({top:0,behavior:"smooth"});
  if(id==="dashboardView") renderDashboard();
  if(id==="learnView") renderLearn();
  if(id==="examsView") renderExamLibrary($("examSearch")?.value || "");
  if(id==="rankingView") renderRanking();
}

function updateNav(viewId){
  const map={dashboardView:"dashboardView",learnView:"learnView",examsView:"examsView",rankingView:"rankingView"};
  document.querySelectorAll("[data-route]").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.route===map[viewId]);
  });
  document.querySelectorAll(".bottom-nav-item").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.route===map[viewId]);
  });
}

function applyTheme(theme){
  document.documentElement.dataset.theme=theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",theme==="dark"?"#07101f":"#eef4ff");
  setTheme(theme);
}
$("themeToggle").addEventListener("click",()=>applyTheme((document.documentElement.dataset.theme||"light")==="dark"?"light":"dark"));

document.querySelectorAll("[data-route]").forEach(btn=>btn.addEventListener("click",()=>routeTo(btn.dataset.route)));

$("brandHome").addEventListener("click",e=>{
  e.preventDefault();
  if(state.studentName) routeTo("dashboardView");
  else routeTo("welcomeView");
});

function syncUserUI(){
  const name=state.studentName || "Guest";
  const ini=initials(name);
  ["profileAvatar","drawerAvatar"].forEach(id=>$(id).textContent=ini);
  $("profileName").textContent=name;
  $("drawerName").textContent=name;
  $("rankingLocalName").textContent=name;
}

function handleNameSubmit(){
  const name=$("studentName").value.trim();
  if(name.length<2){
    $("nameError").textContent="Please enter a valid name.";
    return;
  }
  $("nameError").textContent="";
  setStudentName(name);
  state.studentName=name;
  syncUserUI();
  showToast(`Welcome, ${name}`);
  routeTo("dashboardView");
}
$("startBtn").addEventListener("click",handleNameSubmit);
$("studentName").addEventListener("keydown",e=>{if(e.key==="Enter")handleNameSubmit()});
$("continueUserBtn").addEventListener("click",()=>routeTo("dashboardView"));

async function loadJson(path){
  const res=await fetch(path,{cache:"no-store"});
  if(!res.ok) throw new Error(`Could not load ${path}`);
  return res.json();
}

async function loadData(){
  const [registry,learning]=await Promise.all([loadJson("data/exams.json"),loadJson("data/learning.json")]);
  state.registry=registry.exams || [];
  state.learning=learning;
}

function getUserResults(){
  return getResults().filter(r=>r.studentName===state.studentName);
}
function getStats(){
  const results=getUserResults();
  const completed=new Set(results.map(r=>r.examId)).size;
  const best=results.length?Math.max(...results.map(r=>r.percentage)):null;
  const badges=getAchievements(results);
  return {results,completed,best,attempts:results.length,badges};
}

const achievementDefs=[
  {id:"first-step",icon:"✦",title:"First Step",desc:"Complete your first exam.",test:r=>r.length>=1},
  {id:"club-90",icon:"🏆",title:"90% Club",desc:"Score 90% or higher.",test:r=>r.some(x=>x.percentage>=90)},
  {id:"perfect",icon:"◆",title:"Perfect Score",desc:"Reach 100% on an exam.",test:r=>r.some(x=>x.percentage===100)},
  {id:"five-attempts",icon:"🔥",title:"Momentum",desc:"Complete 5 exam attempts.",test:r=>r.length>=5},
  {id:"comeback",icon:"↗",title:"Comeback",desc:"Improve an exam score by 10% or more.",test:r=>{
    const byExam={};
    for(const x of r){
      byExam[x.examId] ||= [];
      byExam[x.examId].push(x.percentage);
    }
    return Object.values(byExam).some(scores=>scores.some((s,i)=>i>0 && s-Math.max(...scores.slice(0,i))>=10));
  }},
  {id:"speed",icon:"⚡",title:"Speed Solver",desc:"Finish an exam in under 3 minutes with 80%+.",test:r=>r.some(x=>x.timeTakenSeconds<180 && x.percentage>=80)}
];
function getAchievements(results){
  return achievementDefs.map(a=>({...a,unlocked:a.test(results)}));
}

function renderDashboard(){
  if(!state.studentName)return;
  const stats=getStats();
  $("welcomeTitle").textContent=`Welcome back, ${state.studentName}`;
  $("completedCount").textContent=stats.completed;
  $("bestScore").textContent=stats.best===null?"—":`${stats.best}%`;
  $("achievementCount").textContent=stats.badges.filter(b=>b.unlocked).length;
  $("attemptCount").textContent=stats.attempts;

  renderContinueCard();
  renderCourses("homeCourseGrid",true);
  renderHomeExams();
  renderMiniAchievements();
  renderProfile();
}

function renderContinueCard(){
  const progress=getExamProgress();
  if(progress && progress.studentName===state.studentName){
    const registryItem=state.registry.find(x=>x.id===progress.examId);
    const total=registryItem?.questionCount || progress.totalQuestions || 1;
    const percent=Math.round(((progress.currentIndex+1)/total)*100);
    $("continueTitle").textContent=registryItem?.title || "Continue your exam";
    $("continueSubtitle").textContent=`Question ${progress.currentIndex+1} of ${total} • ${progress.feedbackMode==="instant"?"Instant Feedback":"Exam Mode"}`;
    $("continuePercent").textContent=`${percent}%`;
    $("continueAction").innerHTML='Continue Exam <span>→</span>';
    $("continueAction").onclick=()=>resumeProgress(progress);
    return;
  }
  const latest=[...getUserResults()].sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt))[0];
  if(latest){
    const exam=state.registry.find(x=>x.id===latest.examId);
    $("continueTitle").textContent=exam?`Improve ${exam.title}`:"Beat your personal best";
    $("continueSubtitle").textContent=`Last score: ${latest.percentage}% • Try again or choose another exam.`;
    $("continuePercent").textContent=`${latest.percentage}%`;
    $("continueAction").innerHTML='Practice Again <span>→</span>';
    $("continueAction").onclick=()=>exam?prepareExam(exam):routeTo("examsView");
  }else{
    $("continueTitle").textContent="Start your first exam";
    $("continueSubtitle").textContent="Choose a course and begin building your progress.";
    $("continuePercent").textContent="0%";
    $("continueAction").innerHTML='Explore Exams <span>→</span>';
    $("continueAction").onclick=()=>routeTo("examsView");
  }
}

function renderCourses(targetId,compact=false){
  const target=$(targetId); if(!target)return;
  target.innerHTML="";
  state.learning.courses.forEach(course=>{
    const moduleCount=course.modules.length;
    const card=document.createElement("button");
    card.className="course-card";
    card.style.setProperty("--course-accent",course.accent || "var(--primary)");
    card.innerHTML=`
      <div class="course-icon">${course.icon || course.title[0]}</div>
      <h4>${course.title}</h4>
      <p>${course.description}</p>
      <div class="course-footer"><span>${moduleCount?`${moduleCount} module${moduleCount===1?"":"s"}`:"Coming soon"}</span><span class="course-arrow">→</span></div>
    `;
    card.addEventListener("click",()=>openCourse(course));
    target.appendChild(card);
  });
}

function openCourse(course){
  state.selectedCourse=course;
  setLastCourse(course.id);
  routeTo("learnView");
  renderModulePanel(course);
}

function renderLearn(){
  renderCourses("learnCourseGrid");
  if(state.selectedCourse) renderModulePanel(state.selectedCourse);
}

function renderModulePanel(course){
  const panel=$("modulePanel");
  if(!course.modules.length){
    panel.classList.remove("hidden");
    $("moduleBreadcrumb").textContent=`Learn / ${course.title}`;
    $("modulePanelTitle").textContent=`${course.title} modules are coming next`;
    $("modulePanelDescription").textContent="The course card is already part of the final UI. Add your material later and modules will populate here.";
    panel.querySelector(".learning-flow").classList.add("hidden");
    panel.scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }
  panel.querySelector(".learning-flow").classList.remove("hidden");
  const module=course.modules[0];
  state.selectedModule=module;
  $("moduleBreadcrumb").textContent=`Learn / ${course.title}`;
  $("modulePanelTitle").textContent=module.title;
  $("modulePanelDescription").textContent=module.description || "";
  panel.classList.remove("hidden");
  panel.scrollIntoView({behavior:"smooth",block:"start"});
}
$("closeModulePanel").addEventListener("click",()=>$("modulePanel").classList.add("hidden"));

$("openStudyBtn").addEventListener("click",()=>openStudy());
$("openPracticeBtn").addEventListener("click",()=>openModuleExam("instant"));
$("openModuleExamBtn").addEventListener("click",()=>openModuleExam(null));

function openStudy(){
  const c=state.selectedCourse,m=state.selectedModule;
  if(!c||!m?.study)return;
  $("studyBreadcrumb").textContent=`${c.title} / ${m.title} / Study`;
  $("studyTitle").textContent=m.study.title;
  $("studyDescription").textContent=m.study.description || "";
  const toc=$("studyTocList"),sections=$("studySections");
  toc.innerHTML="";sections.innerHTML="";
  m.study.sections.forEach((s,i)=>{
    const id=`study-section-${s.id || i}`;
    const tocBtn=document.createElement("button");
    tocBtn.textContent=s.title;
    tocBtn.addEventListener("click",()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"}));
    toc.appendChild(tocBtn);

    const article=document.createElement("section");
    article.className="study-section";article.id=id;
    const paragraphs=(s.paragraphs||[]).map(p=>`<p>${p}</p>`).join("");
    const bullets=s.bullets?.length?`<ul>${s.bullets.map(b=>`<li>${b}</li>`).join("")}</ul>`:"";
    const callout=s.callout?`<div class="study-callout"><strong>${s.callout.label}:</strong> ${s.callout.text}</div>`:"";
    article.innerHTML=`<span class="eyebrow">SECTION ${String(i+1).padStart(2,"0")}</span><h3>${s.title}</h3>${paragraphs}${bullets}${callout}`;
    sections.appendChild(article);
  });
  routeTo("studyView");
}
$("studyBackBtn").addEventListener("click",()=>routeTo("learnView"));
$("studyToPracticeBtn").addEventListener("click",()=>openModuleExam("instant"));
$("studyToPracticeTop").addEventListener("click",()=>openModuleExam("instant"));

function openModuleExam(forcedMode){
  const examId=state.selectedModule?.examId;
  const item=state.registry.find(x=>x.id===examId);
  if(!item){showToast("No exam is connected to this module yet.");return}
  prepareExam(item,forcedMode);
}

function renderHomeExams(){
  const target=$("homeExamGrid"); target.innerHTML="";
  state.registry.filter(x=>x.active!==false).slice(0,3).forEach(item=>{
    const best=getBestForExam(item.id,state.studentName);
    const row=document.createElement("div");
    row.className="compact-exam";
    row.innerHTML=`
      <div class="compact-exam-icon">${item.course?.[0] || "E"}</div>
      <div class="compact-exam-copy"><strong>${item.title}</strong><small>${item.questionCount} questions • ${best?`Best ${best.percentage}%`:"Not attempted"}</small></div>
      <button aria-label="Open exam">→</button>
    `;
    row.addEventListener("click",()=>prepareExam(item));
    target.appendChild(row);
  });
}

function renderMiniAchievements(){
  const target=$("homeAchievements");target.innerHTML="";
  getAchievements(getUserResults()).slice(0,3).forEach(a=>{
    const item=document.createElement("div");
    item.className=`mini-achievement ${a.unlocked?"":"locked"}`;
    item.innerHTML=`<div class="badge-icon">${a.icon}</div><div><strong>${a.title}</strong><small>${a.unlocked?"Unlocked":a.desc}</small></div>`;
    target.appendChild(item);
  });
}
$("openProfileAchievements").addEventListener("click",openProfile);

function renderExamFilters(){
  const courses=["All",...new Set(state.registry.filter(x=>x.active!==false).map(x=>x.course))];
  const target=$("examFilters");target.innerHTML="";
  courses.forEach(c=>{
    const btn=document.createElement("button");
    btn.className=`filter-btn ${state.filter===c?"active":""}`;
    btn.textContent=c;
    btn.addEventListener("click",()=>{
      state.filter=c;renderExamFilters();renderExamLibrary($("examSearch").value);
    });
    target.appendChild(btn);
  });
}

function renderExamLibrary(filter=""){
  const grid=$("examGrid"); if(!grid)return;
  renderExamFilters();
  grid.innerHTML="";
  const list=state.registry.filter(x=>x.active!==false)
    .filter(x=>state.filter==="All" || x.course===state.filter)
    .filter(x=>`${x.title} ${x.course} ${x.module} ${x.category}`.toLowerCase().includes(filter.toLowerCase()));
  list.forEach(item=>{
    const best=getBestForExam(item.id,state.studentName);
    const card=document.createElement("article");card.className="exam-card";
    card.innerHTML=`
      <div class="exam-meta"><span class="pill">${item.category || "Exam"}</span><span class="pill subtle">${item.difficulty || "Mixed"}</span></div>
      <h3>${item.title}</h3><p>${item.description || ""}</p>
      <div class="exam-details">
        <div><span>COURSE</span><strong>${item.course || "—"}</strong></div>
        <div><span>MODULE</span><strong>${item.module || "—"}</strong></div>
        <div><span>QUESTIONS</span><strong>${item.questionCount ?? "—"}</strong></div>
        <div><span>YOUR BEST</span><strong>${best?`${best.percentage}%`:"Not attempted"}</strong></div>
      </div>
      <button class="primary-btn wide">Open Exam <span>→</span></button>`;
    card.querySelector("button").addEventListener("click",()=>prepareExam(item));
    grid.appendChild(card);
  });
  if(!list.length) grid.innerHTML=`<div class="status-card"><div><strong>No matching exams</strong><p>Try another search or filter.</p></div></div>`;
}
$("examSearch").addEventListener("input",e=>renderExamLibrary(e.target.value));

async function prepareExam(registryItem,forcedMode=null){
  try{
    const payload=await loadJson(registryItem.file);
    const errors=validateExamPayload(payload);
    if(errors.length){showToast("This exam JSON needs validation.");console.error(errors);return}
    state.currentExam=payload;
    state.currentRegistryItem=registryItem;
    state.previousBest=getPreviousBestForExam(payload.exam.id,state.studentName);

    const exam=payload.exam;
    $("setupCategory").textContent=exam.category || "Exam";
    $("setupDifficulty").textContent=exam.difficulty || "Mixed";
    $("setupTitle").textContent=exam.title;
    $("setupDescription").textContent=exam.description || "";
    $("setupQuestions").textContent=payload.questions.length;
    $("setupPass").textContent=`${exam.settings?.passingScore ?? 60}%`;
    $("setupTimer").textContent=exam.settings?.timer?.enabled?`${exam.settings.timer.durationMinutes} min`:"No timer";
    $("setupBreadcrumb").textContent=`${exam.course || ""} / ${exam.module || ""} / ${exam.category || "Exam"}`;

    const allowed=exam.settings?.feedbackModes || ["instant","exam"];
    document.querySelectorAll('input[name="feedbackMode"]').forEach(input=>{
      input.disabled=!allowed.includes(input.value);
      input.closest(".mode-option").classList.toggle("hidden",input.disabled);
    });
    const desired=forcedMode && allowed.includes(forcedMode)?forcedMode:allowed[0];
    const radio=document.querySelector(`input[name="feedbackMode"][value="${desired}"]`);
    if(radio)radio.checked=true;
    routeTo("setupView");
  }catch(err){
    console.error(err);showToast("Could not load this exam.");
  }
}
$("backToLibraryBtn").addEventListener("click",()=>routeTo("examsView"));

$("beginExamBtn").addEventListener("click",()=>{
  state.feedbackMode=document.querySelector('input[name="feedbackMode"]:checked')?.value || "instant";
  startExam();
});

function startExam(restored=null){
  stopTimer();
  if(restored){
    state.answers=restored.answers || {};
    state.currentIndex=restored.currentIndex || 0;
    state.feedbackMode=restored.feedbackMode || "instant";
    state.startedAt=Date.now()-(restored.elapsedSeconds || 0)*1000;
    state.remainingSeconds=restored.remainingSeconds ?? null;
  }else{
    state.answers={};state.currentIndex=0;state.startedAt=Date.now();
    const timer=state.currentExam.exam.settings?.timer;
    state.remainingSeconds=timer?.enabled?timer.durationMinutes*60:null;
  }
  buildQuestionNavigator();renderQuestion();startTimerIfNeeded();persistProgress();routeTo("examView");
}

async function resumeProgress(progress){
  const item=state.registry.find(x=>x.id===progress.examId);
  if(!item){clearExamProgress();routeTo("examsView");return}
  try{
    const payload=await loadJson(item.file);
    const errors=validateExamPayload(payload);
    if(errors.length)throw new Error("Invalid exam");
    state.currentExam=payload;state.currentRegistryItem=item;
    state.previousBest=getPreviousBestForExam(payload.exam.id,state.studentName);
    startExam(progress);
  }catch(e){clearExamProgress();showToast("Saved progress could not be restored.");routeTo("examsView")}
}

function persistProgress(){
  if(!state.currentExam || !state.studentName)return;
  saveExamProgress({
    studentName:state.studentName,
    examId:state.currentExam.exam.id,
    answers:state.answers,
    currentIndex:state.currentIndex,
    totalQuestions:state.currentExam.questions.length,
    feedbackMode:state.feedbackMode,
    remainingSeconds:state.remainingSeconds,
    elapsedSeconds:Math.max(0,Math.floor((Date.now()-state.startedAt)/1000))
  });
}

function buildQuestionNavigator(){
  const nav=$("questionNavigator");nav.innerHTML="";
  state.currentExam.questions.forEach((q,index)=>{
    const btn=document.createElement("button");btn.className="nav-number";btn.textContent=index+1;
    btn.addEventListener("click",()=>{state.currentIndex=index;persistProgress();renderQuestion()});
    nav.appendChild(btn);
  });
}

function renderQuestion(){
  const qs=state.currentExam.questions,q=qs[state.currentIndex];
  $("questionCounter").textContent=`Question ${state.currentIndex+1} / ${qs.length}`;
  $("progressFill").style.width=`${((state.currentIndex+1)/qs.length)*100}%`;
  $("questionTopic").textContent=q.topic || "General";
  $("questionDifficulty").textContent=q.difficulty || "Medium";
  $("questionText").textContent=q.question;

  const list=$("optionsList");list.innerHTML="";
  q.options.forEach(option=>{
    const btn=document.createElement("button");btn.className="option-btn";
    btn.innerHTML=`<span class="option-letter">${option.id}</span><span>${option.text}</span>`;
    const selected=state.answers[q.id];
    if(selected===option.id)btn.classList.add("selected");
    if(state.feedbackMode==="instant" && selected){
      if(option.id===q.correctAnswer)btn.classList.add("correct");
      if(option.id===selected && selected!==q.correctAnswer)btn.classList.add("wrong");
    }
    btn.addEventListener("click",()=>selectAnswer(q,option.id));
    list.appendChild(btn);
  });
  renderInstantFeedback(q);updateNavigator();
  $("prevQuestionBtn").disabled=state.currentIndex===0;
  $("nextQuestionBtn").classList.toggle("hidden",state.currentIndex===qs.length-1);
  $("submitExamBtn").classList.toggle("hidden",state.currentIndex!==qs.length-1);
}

function selectAnswer(q,optionId){
  if(state.feedbackMode==="instant" && state.answers[q.id])return;
  state.answers[q.id]=optionId;persistProgress();renderQuestion();
}

function renderInstantFeedback(q){
  const box=$("instantFeedback");box.className="feedback-box hidden";box.innerHTML="";
  const selected=state.answers[q.id];
  if(state.feedbackMode!=="instant" || !selected)return;
  const correct=selected===q.correctAnswer;
  const explanation=q.explanation?.ar || q.explanation?.en || "No explanation provided.";
  box.className=`feedback-box ${correct?"success":"error"}`;
  box.innerHTML=`<strong>${correct?"Correct ✓":`Incorrect ✕ — Correct answer: ${q.correctAnswer}`}</strong><div>${explanation}</div>`;
}

function updateNavigator(){
  const answered=Object.keys(state.answers).length;
  $("answeredCount").textContent=`${answered} answered`;
  document.querySelectorAll(".nav-number").forEach((btn,index)=>{
    const q=state.currentExam.questions[index];
    btn.classList.toggle("current",index===state.currentIndex);
    btn.classList.toggle("answered",Boolean(state.answers[q.id]));
  });
}
$("prevQuestionBtn").addEventListener("click",()=>{if(state.currentIndex>0){state.currentIndex--;persistProgress();renderQuestion()}});
$("nextQuestionBtn").addEventListener("click",()=>{if(state.currentIndex<state.currentExam.questions.length-1){state.currentIndex++;persistProgress();renderQuestion()}});
$("submitExamBtn").addEventListener("click",()=>finishExam(false));

$("exitExamBtn").addEventListener("click",()=>{
  const ok=confirm("Exit the exam? Your current progress is saved on this device and you can continue later.");
  if(!ok)return;stopTimer();persistProgress();routeTo("dashboardView");
});

function startTimerIfNeeded(){
  if(state.remainingSeconds===null){$("timerDisplay").classList.add("hidden");return}
  $("timerDisplay").classList.remove("hidden");updateTimerDisplay();
  state.timerId=setInterval(()=>{
    state.remainingSeconds--;updateTimerDisplay();
    if(state.remainingSeconds%5===0)persistProgress();
    if(state.remainingSeconds<=0)finishExam(true);
  },1000);
}
function updateTimerDisplay(){
  const total=Math.max(0,state.remainingSeconds ?? 0);
  $("timerDisplay").textContent=`${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}
function stopTimer(){if(state.timerId)clearInterval(state.timerId);state.timerId=null}

function finishExam(autoSubmitted){
  stopTimer();
  const beforeAchievements=getAchievements(getUserResults()).filter(a=>a.unlocked).map(a=>a.id);
  const result=calculateResult(state.currentExam.questions,state.answers);
  const timeTakenSeconds=Math.max(0,Math.floor((Date.now()-state.startedAt)/1000));
  const record={
    examId:state.currentExam.exam.id,examTitle:state.currentExam.exam.title,studentName:state.studentName,
    percentage:result.percentage,correct:result.correct,wrong:result.wrong,unanswered:result.unanswered,
    timeTakenSeconds,submittedAt:new Date().toISOString(),autoSubmitted
  };
  saveResult(record);clearExamProgress();
  state.lastResult={...result,record};
  const afterAchievements=getAchievements(getUserResults()).filter(a=>a.unlocked);
  state.lastResult.newBadges=afterAchievements.filter(a=>!beforeAchievements.includes(a.id));
  renderResult();routeTo("resultView");
}

function animateScore(target){
  const el=$("resultPercent");let current=0;
  const duration=700,start=performance.now();
  function tick(now){
    const p=Math.min(1,(now-start)/duration);
    current=Math.round(target*(1-Math.pow(1-p,3)));
    el.textContent=`${current}%`;
    if(p<1)requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
}

function renderResult(){
  const {record}=state.lastResult,score=state.lastResult,pass=state.currentExam.exam.settings?.passingScore ?? 60;
  let headline="Keep practicing";
  if(record.percentage>=90)headline="Excellent work";
  else if(record.percentage>=80)headline="Great job";
  else if(record.percentage>=pass)headline="Good progress";
  $("resultHeadline").textContent=headline;$("resultPercent").textContent="0%";
  $("resultScore").textContent=`${record.correct} / ${state.currentExam.questions.length}`;
  $("correctCount").textContent=score.correct;$("wrongCount").textContent=score.wrong;$("unansweredCount").textContent=score.unanswered;
  $("timeTaken").textContent=formatDuration(record.timeTakenSeconds);
  $("celebration").classList.toggle("hidden",record.percentage<80);
  setTimeout(()=>animateScore(record.percentage),120);

  const best=getBestForExam(record.examId,state.studentName);
  $("resultBestScore").textContent=best?`${best.percentage}%`:`${record.percentage}%`;

  const improve=$("improvementMessage");
  if(state.previousBest && record.percentage>state.previousBest.percentage){
    improve.textContent=`↗ Improved by ${record.percentage-state.previousBest.percentage}% from your previous best.`;
    improve.classList.remove("hidden");
  }else improve.classList.add("hidden");

  const badge=$("newBadgeNotice");
  if(state.lastResult.newBadges?.length){
    badge.innerHTML=`🏆 New achievement: <strong>${state.lastResult.newBadges.map(x=>x.title).join(", ")}</strong>`;
    badge.classList.remove("hidden");
  }else badge.classList.add("hidden");
}
$("reviewBtn").addEventListener("click",renderReview);
$("retakeBtn").addEventListener("click",()=>routeTo("setupView"));
$("reviewRetakeBtn").addEventListener("click",()=>routeTo("setupView"));
$("nextExamBtn").addEventListener("click",()=>routeTo("examsView"));

function renderReview(){
  const list=$("reviewList");list.innerHTML="";$("reviewTitle").textContent=state.currentExam.exam.title;
  state.currentExam.questions.forEach((q,index)=>{
    const selected=state.answers[q.id] ?? null;
    const selectedOption=q.options.find(o=>o.id===selected),correctOption=q.options.find(o=>o.id===q.correctAnswer);
    const isCorrect=selected===q.correctAnswer;
    const item=document.createElement("article");item.className="review-item";
    item.innerHTML=`
      <span class="eyebrow">QUESTION ${String(index+1).padStart(2,"0")}</span>
      <h3>${q.question}</h3>
      <div class="review-answer ${isCorrect?"correct":"wrong"}"><strong>Your answer:</strong> ${selected?`${selected}. ${selectedOption?.text || ""}`:"Unanswered"}</div>
      <div class="review-answer correct"><strong>Correct answer:</strong> ${q.correctAnswer}. ${correctOption?.text || ""}</div>
      <div class="review-explanation"><strong>Explanation:</strong><br>${q.explanation?.ar || q.explanation?.en || "No explanation provided."}</div>`;
    list.appendChild(item);
  });
  routeTo("reviewView");
}
$("reviewHomeBtn").addEventListener("click",()=>routeTo("examsView"));

function renderRanking(){
  const stats=getStats();
  $("rankingLocalName").textContent=state.studentName || "Guest";
  $("rankingBest").textContent=stats.best===null?"—":`${stats.best}%`;
  $("rankingAttempts").textContent=stats.attempts;
  $("rankingBadges").textContent=stats.badges.filter(b=>b.unlocked).length;
}

function renderProfile(){
  const stats=getStats();
  $("profileBest").textContent=stats.best===null?"—":`${stats.best}%`;
  $("profileAttempts").textContent=stats.attempts;
  $("profileCompleted").textContent=stats.completed;
  const target=$("profileAchievements");target.innerHTML="";
  stats.badges.forEach(a=>{
    const card=document.createElement("div");
    card.className=`achievement-card ${a.unlocked?"":"locked"}`;
    card.innerHTML=`<span>${a.icon}</span><strong>${a.title}</strong><small>${a.unlocked?"Unlocked":a.desc}</small>`;
    target.appendChild(card);
  });
}
function openProfile(){renderProfile();$("drawerBackdrop").classList.remove("hidden");$("profileDrawer").classList.add("open");$("profileDrawer").setAttribute("aria-hidden","false")}
function closeProfile(){$("drawerBackdrop").classList.add("hidden");$("profileDrawer").classList.remove("open");$("profileDrawer").setAttribute("aria-hidden","true")}
$("profileButton").addEventListener("click",openProfile);$("profileClose").addEventListener("click",closeProfile);$("drawerBackdrop").addEventListener("click",closeProfile);
$("changeNameBtn").addEventListener("click",()=>{
  closeProfile();clearStudentName();state.studentName="";syncUserUI();
  $("studentName").value="";$("returningUserEntry").classList.add("hidden");$("newUserEntry").classList.remove("hidden");routeTo("welcomeView");
});

function showToast(message){
  const t=document.createElement("div");t.className="toast";t.textContent=message;$("toastContainer").appendChild(t);
  setTimeout(()=>t.remove(),2600);
}

async function init(){
  applyTheme(getTheme());
  try{await loadData()}catch(e){
    console.error(e);
    $("examLoadError").textContent="Could not load platform data. Open this project through GitHub Pages or a local web server.";
    $("examLoadError").classList.remove("hidden");
  }
  state.studentName=getStudentName();syncUserUI();
  if(state.studentName){
    $("returningUserEntry").classList.remove("hidden");$("newUserEntry").classList.add("hidden");
    $("returningUserName").textContent=state.studentName;
    routeTo("welcomeView");
  }else routeTo("welcomeView");
}
init();
