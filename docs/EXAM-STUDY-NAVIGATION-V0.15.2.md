# Exam Navigator & Smart Study Navigation — V0.15.2

## 1. Question Navigator

### Instant Feedback Mode

Question-number states:
- Blue outline: current question
- Green: answered correctly
- Red: answered incorrectly
- Neutral: unanswered
- Gold star: Marked for Review

Correct/wrong state is derived only after an answer exists and only when `feedbackMode === "instant"`.

### Exam Mode privacy

During Exam Mode the navigator does **not** expose whether an answer is correct.

Answered questions receive a neutral answered style until submission.

This prevents the navigator from leaking result information before the exam is finished.

## 2. Mark for Review

Every question now has:

`☆ Mark for Review`

After marking:

`★ Marked for Review`

The mark:
- can be toggled at any time;
- appears as a gold star on the question number;
- is included in the in-progress Resume payload;
- survives leaving the exam and resuming later.

It is a review/navigation aid only and does not change scoring.

## 3. Smart Study Navigator

The `ON THIS PAGE` panel now tracks the reader's real position.

Features:
- active section highlighting;
- `YOU ARE HERE` label;
- completed-topic indicator;
- `Section X of Y`;
- reading-position percentage;
- mini position progress bar;
- automatic TOC scrolling;
- Previous Topic / Next Topic controls.

The implementation uses `IntersectionObserver` rather than repeatedly polling scroll position.

The active Study section is also stored as `lastSectionId`, so the existing Resume Study action can return to the latest topic.

## 4. Python line-by-line readability

The Python explanation rows now use:
- explicit LTR structure for line-number badges;
- isolated line numbers;
- RTL explanation paragraphs;
- bidi isolation for embedded Python/English technical terms.

This targets the mixed-direction wrapping issue visible in the Python Study screenshot.

## QA

- All JavaScript files pass `node --check`.
- All JSON files parse.
- All direct JavaScript DOM references resolve.
- Marked-question state is present in save and restore paths.
- Correct/wrong navigator state is guarded by Instant Feedback Mode.
- Exam Mode uses neutral answered state.
- Study active tracking uses `IntersectionObserver`.
- Previous/Next Topic controls are present.
- 47 Python code examples continue to parse as valid Python.
- SQL Production remains 13 banks / 520 questions.
- Python Production remains 13 banks / 520 questions.
- Junior Official QBank remains 930.
- Professional Official QBank remains 1189.
- Dynamic SQL/Python Track and Final-share regression tests pass.

## Browser note

No full Chromium click-through is claimed in this environment. Feature logic, runtime bank generation, data integrity, JavaScript syntax and DOM bindings were tested directly.
