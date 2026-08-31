# Excel Reference Track — Production Evidence V1

**Platform version inspected:** 0.20.12  
**Purpose:** concrete evidence used to define the Track Production Reference Standard.  
**Scope:** current Excel track inside Data Analysis.

## 1. Current Excel Production Footprint

| Area | Current evidence |
|---|---:|
| Source files | 29 |
| Source slides | 610 |
| Study weeks | 3 |
| Learning Groups | 24 |
| Study lessons | 96 |
| Study concept mappings | 294 unique |
| Week 1 concepts | 70 |
| Week 2 concepts | 101 |
| Week 3 concepts | 123 |
| Practice questions | 228 total |
| Week 1 Practice | 53 |
| Week 2 Practice | 89 |
| Week 3 Practice | 86 |
| Independent Track Exam bank | 228 questions |
| Track Exam form | 50 questions |
| Track Exam timer | 60 minutes |
| Track Exam pass score | 60% |
| Ranked full-track exam | Yes |

## 2. Study Evidence

Primary files:
- `data/learning.json`
- `data/curriculum/excel.json`
- `data/syllabus-maps/excel.json`
- `data/excel-intake/source-manifest.json`
- `data/excel-intake/week-status.json`
- `docs/excel-production/FINAL-EXCEL-STUDY-QA-V0.20.6.md`

Current structural evidence:
- Week 1: 8 Groups / 27 lessons / 70 concepts.
- Week 2: 8 Groups / 35 lessons / 101 concepts.
- Week 3: 8 Groups / 34 lessons / 123 concepts.
- Total: 24 Groups / 96 lessons / 294 unique concept references.
- 29 processed Excel sources are recorded in the curriculum/source system.

Key automated protections include:
- `tests/excel-week3-study.test.mjs`
- `tests/excel-final-study-quality.test.mjs`

## 3. Practice Evidence

Registry:
- `data/exams.json`

Practice artifacts:
- `exams/data-analysis/excel/production/data-analysis-excel-week01-practice-v1.json` — 53 questions.
- `exams/data-analysis/excel/production/data-analysis-excel-week02-practice-v1.json` — 89 questions.
- `exams/data-analysis/excel/production/data-analysis-excel-week03-practice-v1.json` — 86 questions.

Practice policy:
- total = 228 questions;
- course-source grounded;
- practice exams are `ranked: false`;
- Week exam gates remain separate from the full-track exam;
- Practice integrates with learner progress/My Mistakes according to the platform runtime contract.

Primary QA:
- `tests/excel-practice-production.test.mjs`
- `docs/excel-production/EXCEL-PRACTICE-V1-QA.md`

## 4. Independent Full-Track Exam Evidence

Question bank:
- `question-banks/data-analysis/excel/da-excel-track-bank-v1.json`

Registry entry:
- `data/question-banks.json` → `da-excel-track-bank-v1`

Current bank facts:
- 228 questions;
- `trackExamEligible: true`;
- `finalEligible: false`;
- Week distribution: 53 / 89 / 86;
- Difficulty depth: Easy 88 / Medium 113 / Hard 27;
- family depth: direct 88 / scenario 86 / tracing 42 / troubleshooting 12;
- covers 23 assessment groups;
- Excel Group 14 is intentionally absent from assessed groups because its content is bridge/supporting rather than assessment-eligible.

Primary QA:
- `tests/excel-track-bank-independent.test.mjs`

## 5. Dynamic Blueprint Evidence

Blueprint:
- `data/exam-blueprints.json` → `data-analysis-excel-track-v1`

Coverage registry:
- `data/coverage-blueprints.json` → `excel-track-coverage-v1`
- `data/coverage-blueprints/excel-track.json`

Approved 50-question profile:
- Week 1 = 12;
- Week 2 = 20;
- Week 3 = 18;
- Easy = 13;
- Medium = 25;
- Hard = 12;
- direct = 13;
- scenario = 20;
- tracing = 10;
- troubleshooting = 7;
- duplicate concept keys avoided;
- question/options shuffled;
- answer positions balanced on a best-effort basis;
- ranked = true.

Primary QA:
- `tests/excel-track-blueprint.test.mjs`
- `tests/excel-track-runtime-engine.test.mjs`
- `tests/excel-track-registry-linkage.test.mjs`

## 6. Results & Learner-State Evidence

Results helper:
- `assets/js/excel-track-results.js`

Current Excel full-track result contract includes:
- overall score;
- Week breakdown;
- Learning Group breakdown;
- result persistence through the shared result flow;
- My Mistakes integration;
- ranking through the shared ranked-exam flow.

Primary QA:
- `tests/excel-track-results.test.mjs`

## 7. Platform-Level Safety Evidence

Excel production sits on platform-level protections, including:
- compatibility-safe UUID generation;
- versioned learner storage schema;
- future-schema guard;
- restore rollback on failed writes;
- Platform Health severity/current-version filtering;
- startup readiness gate;
- dark-mode startup handling;
- performance budgets;
- UX/navigation consistency and portability gates.

These protections are track-independent and therefore become requirements for future track production readiness.

## 8. Manual Acceptance Status

The Excel Track has been manually exercised through the production learner flow after automated package verification, including Study, Practice, Full Track Exam, Results, My Mistakes, and Ranking behavior.

This manual acceptance is part of why Excel is used as the reference track rather than relying only on file counts or automated tests.

## 9. Metadata Consistency — Normalized in V0.20.13

The Excel production metadata is now aligned with the approved production state:
- `data/learning.json` reports Excel `productionStats.status: "FINAL READY"`;
- all 3 weeks are audited and Study/Practice approved;
- Practice coverage is 228 questions across Weeks 1–3;
- the independent Full Track Exam bank contains 228 questions and produces validated 50-question ranked forms;
- Week Exams remain intentionally locked;
- Data Analysis Final readiness remains a separate bank/readiness gate and is not implied by the Excel Track Exam.

**Reference-standard rule:** readiness summaries must agree with the concrete registries, banks, blueprints, QA gates, and learner-facing runtime state. Any future drift must fail the metadata-consistency gate before packaging.

## 10. Excel Reference Decision

Excel is accepted as the **Reference Track** because it demonstrates the complete production chain:

`Sources → Study → Practice → Independent Exam Bank → Validated Blueprint → Runtime → Results → My Mistakes → Ranking → Data Safety → UX/Performance Gates → Portable Package QA → Manual Acceptance`

Future tracks may differ in source count, lesson count, question count, duration, or assessment mix, but they should meet the same quality gates and evidence standard.
