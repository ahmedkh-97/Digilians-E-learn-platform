const VALID_QUESTION_DIFFICULTIES = new Set(["Easy", "Medium", "Hard"]);
const VALID_EXAM_DIFFICULTIES = new Set(["Easy", "Medium", "Hard", "Mixed"]);
const VALID_FEEDBACK_MODES = new Set(["instant", "exam"]);
const REQUIRED_OPTION_IDS = ["A", "B", "C", "D"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function add(list, path, message) {
  list.push({ path, message });
}

export function validateExamJson(payload) {
  const errors = [];
  const warnings = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    add(errors, "root", "The file must contain one JSON object.");
    return { valid: false, errors, warnings, summary: null };
  }

  if (payload.schemaVersion !== "1.0") {
    add(errors, "schemaVersion", 'schemaVersion must be exactly "1.0".');
  }

  const exam = payload.exam;
  if (!exam || typeof exam !== "object" || Array.isArray(exam)) {
    add(errors, "exam", "Missing exam object.");
  } else {
    const requiredStrings = [
      "id", "title", "description", "course", "module",
      "category", "uploadedBy", "createdAt", "version", "difficulty"
    ];

    requiredStrings.forEach(key => {
      if (!isNonEmptyString(exam[key])) {
        add(errors, `exam.${key}`, `${key} is required and cannot be empty.`);
      }
    });

    if (isNonEmptyString(exam.id) && !/^[a-z0-9][a-z0-9-_]*$/.test(exam.id)) {
      add(errors, "exam.id", "Use lowercase letters, numbers, hyphens or underscores only.");
    }

    if (isNonEmptyString(exam.difficulty) && !VALID_EXAM_DIFFICULTIES.has(exam.difficulty)) {
      add(errors, "exam.difficulty", "Must be Easy, Medium, Hard or Mixed.");
    }

    if (isNonEmptyString(exam.createdAt) && !/^\d{4}-\d{2}-\d{2}$/.test(exam.createdAt)) {
      add(errors, "exam.createdAt", "Use YYYY-MM-DD format.");
    }

    const settings = exam.settings;
    if (!settings || typeof settings !== "object") {
      add(errors, "exam.settings", "Missing settings object.");
    } else {
      if (typeof settings.allowRetake !== "boolean") {
        add(errors, "exam.settings.allowRetake", "Must be true or false.");
      }
      if (typeof settings.shuffleQuestions !== "boolean") {
        add(errors, "exam.settings.shuffleQuestions", "Must be true or false.");
      }
      if (typeof settings.shuffleOptions !== "boolean") {
        add(errors, "exam.settings.shuffleOptions", "Must be true or false.");
      }
      if (!Number.isInteger(settings.passingScore) || settings.passingScore < 0 || settings.passingScore > 100) {
        add(errors, "exam.settings.passingScore", "Must be an integer between 0 and 100.");
      }

      if (!Array.isArray(settings.feedbackModes) || settings.feedbackModes.length === 0) {
        add(errors, "exam.settings.feedbackModes", "At least one feedback mode is required.");
      } else {
        settings.feedbackModes.forEach((mode, index) => {
          if (!VALID_FEEDBACK_MODES.has(mode)) {
            add(errors, `exam.settings.feedbackModes[${index}]`, 'Allowed values are "instant" and "exam".');
          }
        });
      }

      const timer = settings.timer;
      if (!timer || typeof timer !== "object") {
        add(errors, "exam.settings.timer", "Missing timer object.");
      } else {
        if (typeof timer.enabled !== "boolean") {
          add(errors, "exam.settings.timer.enabled", "Must be true or false.");
        }
        if (timer.enabled) {
          if (!Number.isInteger(timer.durationMinutes) || timer.durationMinutes <= 0 || timer.durationMinutes > 600) {
            add(errors, "exam.settings.timer.durationMinutes", "When timer is enabled, durationMinutes must be between 1 and 600.");
          }
        } else if (timer.durationMinutes !== null && timer.durationMinutes !== 0 && timer.durationMinutes !== undefined) {
          add(warnings, "exam.settings.timer.durationMinutes", "Timer is disabled, so durationMinutes can be null.");
        }
      }
    }
  }

  const questions = payload.questions;
  const ids = new Set();
  const topicCounts = {};
  const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };

  if (!Array.isArray(questions) || questions.length === 0) {
    add(errors, "questions", "At least one question is required.");
  } else {
    questions.forEach((q, index) => {
      const path = `questions[${index}]`;

      if (!q || typeof q !== "object" || Array.isArray(q)) {
        add(errors, path, "Question must be an object.");
        return;
      }

      if (!isNonEmptyString(q.id)) {
        add(errors, `${path}.id`, "Question ID is required.");
      } else {
        if (ids.has(q.id)) add(errors, `${path}.id`, `Duplicate question ID "${q.id}".`);
        ids.add(q.id);
      }

      if (!isNonEmptyString(q.question)) {
        add(errors, `${path}.question`, "Question text is required.");
      }

      if (!Array.isArray(q.options)) {
        add(errors, `${path}.options`, "Options must be an array.");
      } else {
        if (q.options.length !== 4) {
          add(errors, `${path}.options`, "MCQ questions must contain exactly 4 options.");
        }

        const optionIds = q.options.map(o => o?.id);
        const uniqueIds = new Set(optionIds);

        if (uniqueIds.size !== optionIds.length) {
          add(errors, `${path}.options`, "Option IDs must be unique.");
        }

        REQUIRED_OPTION_IDS.forEach(id => {
          if (!optionIds.includes(id)) add(errors, `${path}.options`, `Missing option "${id}".`);
        });

        q.options.forEach((option, optionIndex) => {
          if (!option || typeof option !== "object") {
            add(errors, `${path}.options[${optionIndex}]`, "Option must be an object.");
            return;
          }
          if (!REQUIRED_OPTION_IDS.includes(option.id)) {
            add(errors, `${path}.options[${optionIndex}].id`, "Option ID must be A, B, C or D.");
          }
          if (!isNonEmptyString(option.text)) {
            add(errors, `${path}.options[${optionIndex}].text`, "Option text cannot be empty.");
          }
        });

        if (!isNonEmptyString(q.correctAnswer)) {
          add(errors, `${path}.correctAnswer`, "Correct answer is required.");
        } else if (!optionIds.includes(q.correctAnswer)) {
          add(errors, `${path}.correctAnswer`, `Correct answer "${q.correctAnswer}" does not exist in options.`);
        }
      }

      if (!q.explanation || typeof q.explanation !== "object") {
        add(errors, `${path}.explanation`, "Explanation object is required.");
      } else if (!isNonEmptyString(q.explanation.ar)) {
        add(errors, `${path}.explanation.ar`, "Arabic explanation is required.");
      } else if (q.explanation.ar.trim().length < 12) {
        add(warnings, `${path}.explanation.ar`, "Explanation looks very short.");
      }

      if (!isNonEmptyString(q.topic)) {
        add(errors, `${path}.topic`, "Topic is required.");
      } else {
        topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
      }

      if (!isNonEmptyString(q.difficulty)) {
        add(errors, `${path}.difficulty`, "Difficulty is required.");
      } else if (!VALID_QUESTION_DIFFICULTIES.has(q.difficulty)) {
        add(errors, `${path}.difficulty`, "Must be Easy, Medium or Hard.");
      } else {
        difficultyCounts[q.difficulty]++;
      }

      if (!q.source || typeof q.source !== "object") {
        add(warnings, `${path}.source`, "Source reference is recommended for traceability.");
      } else {
        if (!isNonEmptyString(q.source.file)) {
          add(warnings, `${path}.source.file`, "Source file is recommended.");
        }
        if (!isNonEmptyString(q.source.reference)) {
          add(warnings, `${path}.source.reference`, "Source reference is recommended.");
        }
      }
    });
  }

  const summary = {
    examId: exam?.id || "",
    title: exam?.title || "",
    course: exam?.course || "",
    module: exam?.module || "",
    category: exam?.category || "",
    difficulty: exam?.difficulty || "",
    questionCount: Array.isArray(questions) ? questions.length : 0,
    topicCount: Object.keys(topicCounts).length,
    topicCounts,
    difficultyCounts
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary
  };
}

export function buildRegistryEntry(payload, suggestedFolder = "") {
  const exam = payload.exam;
  const courseSlug = suggestedFolder ||
    (exam.course || "general")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    course: exam.course,
    module: exam.module,
    category: exam.category,
    difficulty: exam.difficulty,
    questionCount: payload.questions.length,
    file: `exams/${courseSlug}/${exam.id}.json`,
    active: true,
    featured: false
  };
}
