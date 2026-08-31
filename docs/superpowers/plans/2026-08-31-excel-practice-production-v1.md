# Excel Practice Production V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three local Excel Practice exams with exactly one source-grounded MCQ for each of the 228 assessment-eligible Excel concepts, while keeping Excel Exam and Ranking locked.

**Architecture:** A deterministic local builder reads the approved Excel curriculum, syllabus map, and Study lessons, maps each eligible concept to its owning lesson, and produces three static Exam JSON payloads. The existing exam runtime loads those payloads through `data/exams.json`; `practiceExamId` is added to each Excel module while `examId` remains null. Questions use only source-traced evidence already present in Study (quick checks, formulas, steps, key terms, and concept metadata), with Arabic deep explanations and option-level reasons.

**Tech Stack:** Python 3 builder, Node.js `node:test`, existing vanilla JS exam runtime, JSON payloads.

**Spec:** `docs/excel-production/EXCEL-PRACTICE-PRODUCTION-DESIGN-V1.md`

## Global Constraints

- Local filesystem only; no GitHub operations.
- Exactly 228 eligible concepts: Week 1 = 53, Week 2 = 89, Week 3 = 86.
- Exactly one V1 Practice question per eligible concept.
- Four A/B/C/D options; one correct answer.
- English question/options; Arabic concept/deep explanation.
- `sourceType: "course"` only.
- `trackExamEligible: false` and `finalEligible: false` for every Practice question.
- Practice registry items use `ranked: false`.
- `practiceExamId` is enabled per Excel module; `examId` remains null.
- Existing Week 1–3 Study data and protected `official-qbank/`, existing `question-banks/`, and existing non-Excel exams must not be changed.
- Every task must finish with its test cycle green before the next task begins.

---

### Task 1: Eligibility and coverage contract

**Files:**
- Create: `tests/excel-practice-production.test.mjs`
- Read: `data/curriculum/excel.json`
- Read: `data/learning.json`

**Interfaces:**
- Consumes: curriculum topics with `assessment.practiceEligible`; Study sections with `conceptIds`.
- Produces: regression contract for 53/89/86 eligible counts and unique concept ownership.

- [ ] **Step 1: Write failing tests** asserting three expected Practice files, 228 exact mappings, no non-eligible concepts, and module `practiceExamId` integration.
- [ ] **Step 2: Run** `node --test tests/excel-practice-production.test.mjs` and confirm RED because Practice files/IDs do not exist.
- [ ] **Step 3: Keep production files untouched** until RED is confirmed.

### Task 2: Deterministic Practice builder

**Files:**
- Create: `tools/build-excel-practice.py`
- Create: `exams/data-analysis/excel/production/data-analysis-excel-week01-practice-v1.json`
- Create: `exams/data-analysis/excel/production/data-analysis-excel-week02-practice-v1.json`
- Create: `exams/data-analysis/excel/production/data-analysis-excel-week03-practice-v1.json`

**Interfaces:**
- Consumes: `data/curriculum/excel.json`, `data/syllabus-maps/excel.json`, `data/learning.json`.
- Produces: Exam JSON schema V1.0 payloads; each question has `topicId`, `conceptKey`, `deepExplanation`, and source trace.

- [ ] **Step 1: Build concept→lesson ownership map** and abort on missing/duplicate ownership.
- [ ] **Step 2: For each eligible concept choose evidence in this priority:** closest Study quick check, closest formula, closest workflow step, closest key term/source concept label.
- [ ] **Step 3: Build three source-only distractors** from distinct evidence owned by other concepts in the same week; never invent a false Excel rule.
- [ ] **Step 4: Generate option-level Arabic reasons** explaining that the correct evidence belongs to the target concept and each distractor belongs to a different source-taught concept.
- [ ] **Step 5: Write the three payloads** and fail if counts are not exactly 53/89/86.
- [ ] **Step 6: Run builder twice and compare hashes** to prove deterministic output.

### Task 3: Schema and educational quality gate

**Files:**
- Modify: `tests/excel-practice-production.test.mjs`
- Read: `assets/js/json-validator.js`

**Interfaces:**
- Consumes: generated Practice payloads.
- Produces: quality guard against duplicate options, missing Arabic explanations, placeholders, generic boilerplate, invalid source trace, or duplicate concept mappings.

- [ ] **Step 1: Add tests** for 4 unique options, valid answer, Arabic `explanation.ar`, `deepExplanation.summary`, A/B/C/D reasons, allowed question types/difficulties, `sourceType=course`, and false exam eligibility.
- [ ] **Step 2: Add question-text uniqueness guard** and reject placeholder/generic strings.
- [ ] **Step 3: Run** `node --test tests/excel-practice-production.test.mjs` and fix builder output until GREEN.

### Task 4: Runtime registry and module integration

**Files:**
- Modify: `data/exams.json`
- Modify: `data/learning.json`
- Modify: `assets/js/app.js`

**Interfaces:**
- Consumes: module `practiceExamId` and registry item.
- Produces: `openModuleExam("instant")` resolves `practiceExamId`; exam mode still resolves `examId` and remains locked.

- [ ] **Step 1: Extend tests** so three Excel modules resolve their Practice registry entries with `ranked:false` and still have `examId:null`.
- [ ] **Step 2: Update each Excel module** with its week Practice ID and `assessmentStatus:"practice-ready-exam-locked"`.
- [ ] **Step 3: Register three Practice entries** in `data/exams.json` with `category:"Practice"`, `ranked:false`, `questionCount` 53/89/86.
- [ ] **Step 4: Update `openModuleExam`** to select `practiceExamId` only for forced instant mode; otherwise use `examId`.
- [ ] **Step 5: Update learning-flow controls** so Practice can be ready while Exam stays disabled.
- [ ] **Step 6: Run Node syntax and Practice tests** until GREEN.

### Task 5: My Mistakes, progress, and ranking isolation

**Files:**
- Modify: `tests/excel-practice-production.test.mjs`
- Read: `assets/js/app.js`
- Read: `assets/js/mistakes.js`
- Read: `assets/js/storage.js`

**Interfaces:**
- Consumes: existing exam runtime behavior.
- Produces: proof that Practice is non-ranked, instant-only, resumable, and uses normal mistake capture paths.

- [ ] **Step 1: Assert each Practice exam allows only `feedbackModes:["instant"]`, timer disabled, retake true, registry `ranked:false`.
- [ ] **Step 2: Assert runtime selects `practiceExamId` for instant mode and does not require ranked identity for `ranked:false` items.
- [ ] **Step 3: Re-run reset/startup/mistakes regression tests** with Practice tests.

### Task 6: Pre-deploy integration and full regression

**Files:**
- Modify: `tools/pre-deploy-check.mjs`
- Modify: `PRE-DEPLOY-CHECKLIST.md`

**Interfaces:**
- Consumes: Practice test suite.
- Produces: `TEST-LOCAL.bat`/pre-deploy automatically protects Practice coverage and quality.

- [ ] **Step 1: Add `excel-practice-production.test.mjs` to pre-deploy test command.**
- [ ] **Step 2: Document 228-question Practice gate in checklist.**
- [ ] **Step 3: Run all tests, JSON validation, JS/MJS syntax, Excel Intake, and full Pre-Deploy.**
- [ ] **Step 4: Start local static server and HTTP-smoke all three new exam files plus core assets.**

### Task 7: Final package gate

**Files:**
- Create: `docs/excel-production/EXCEL-PRACTICE-V1-QA.md`
- Create deliverable ZIP outside source folder.

**Interfaces:**
- Consumes: verified local production tree.
- Produces: exact tested ZIP + SHA-256.

- [ ] **Step 1: Record final counts, test results, difficulty/question-type distribution, and known limitations.**
- [ ] **Step 2: Build ZIP excluding transient caches only.**
- [ ] **Step 3: Unpack ZIP into a clean folder and rerun Practice tests + Pre-Deploy + Intake + syntax/JSON checks on the exact deliverable.**
- [ ] **Step 4: Compute SHA-256 and only then declare Practice V1 ready for user review.**
