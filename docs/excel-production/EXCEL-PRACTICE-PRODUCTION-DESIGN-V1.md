# Excel Practice Production — Design V1

## Scope
Build Excel Practice only from the locally verified V0.20.6 Final Study QA package. GitHub is out of scope. Excel Exam remains locked until Practice is approved.

## Source of truth
- `data/curriculum/excel.json`
- `data/syllabus-maps/excel.json`
- `data/learning.json`
- Excel source trace already embedded in Study content
- Only concepts marked `practiceEligible: true` / `assessmentEligible: true` may produce Practice questions.

Current eligible coverage:
- Week 1: 53
- Week 2: 89
- Week 3: 86
- Total: 228 assessment-eligible concepts

## Approaches considered
### A. One global Excel Practice bank
Simple runtime pool, but weaker week/module traceability and harder QA isolation.

### B. Three week-scoped Practice banks — RECOMMENDED
One bank per Excel week, exactly one baseline question per eligible concept for V1. Gives deterministic 100% coverage, clean source trace, simple regression tests, and integrates naturally with the existing three module cards.

### C. Twenty-four group-scoped Practice banks
Best granularity, but creates unnecessary registry/file complexity for the first Practice release. Can be added later as a filtered practice mode without changing the source bank model.

## Approved implementation design
Use Approach B.

### Bank files
- Week 1 bank: 53 questions
- Week 2 bank: 89 questions
- Week 3 bank: 86 questions
- Total V1 pool: 228 questions

Every question maps to exactly one eligible curriculum concept. No Supporting, Bridge, statistics-prerequisite, cross-track-bridge, source-inconsistent, or environment-only item may enter Practice unless it is explicitly marked eligible in the curriculum.

### Question format
Every question must have:
- 4 options A/B/C/D
- one correct answer
- English question/options
- Arabic concept explanation
- `deepExplanation.summary` in Arabic
- `deepExplanation.options.A/B/C/D` explaining why each option is correct/wrong
- `topic`, `topicId`, `conceptKey`
- `difficulty`: Easy / Medium / Hard
- `questionType`: direct-knowledge / scenario-application / calculation-tracing / best-decision / troubleshooting where source-supported
- `sourceType: course` only
- `source.file` + slide/reference trace
- `trackExamEligible` and `finalEligible` remain false during Practice Production; Exam eligibility is a later gate.

### Difficulty strategy
Coverage comes before forced ratios. Each concept gets the strongest source-supported question form. Target distribution is checked for balance but questions are not distorted to satisfy a quota.

### Runtime integration
Add a separate `practiceExamId` to each Excel module. `openPracticeBtn` resolves `practiceExamId` in instant-feedback mode. `openModuleExamBtn` remains disabled because `examId` stays null and Exam production is not part of this release.

Practice results use the existing exam runtime and therefore inherit:
- local progress/resume
- instant feedback
- review screen
- My Mistakes capture
- navigation/marking

Practice does not enter Ranking.

### Practice files and registry
Create three Practice exam payloads, each using the existing Exam JSON runtime schema, and register them in `data/exams.json`. They are category `Practice`, feedbackModes `["instant"]`, timer disabled, retake enabled, and are reachable from their Excel module card.

## Stage gates / tests
1. Baseline regression: current 18 tests + Pre-Deploy + Intake must pass before changes.
2. Eligibility lock: exactly 228 eligible concepts = 53/89/86.
3. Coverage lock: exactly one V1 Practice question per eligible concept; 0 missing, 0 duplicate concept mappings.
4. Schema/quality: four unique options, valid answer, source trace, Arabic deep explanation, four option reasons, no placeholders/boilerplate.
5. Assessment boundary: 0 questions from non-eligible concepts; sourceType is course only.
6. Runtime integration: three `practiceExamId` values resolve; Practice enabled; Exam remains locked.
7. My Mistakes/Progress regression: existing reset/startup/mistakes tests remain green plus Practice-specific runtime checks.
8. Full regression: Pre-Deploy, Intake, all tests, JSON/JS syntax, HTTP smoke.
9. Package gate: build ZIP, unpack to a clean folder, repeat core tests on the exact deliverable.

## Non-goals
- No Excel Exam questions yet.
- No Ranking integration for Practice.
- No GitHub operations.
- No external-similar questions.
- No invented concepts or silent correction of source issues.
