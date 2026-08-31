# Excel Intake / Study Status — V0.20.6 Final Clean

Base runtime: **V0.20.6**

## Current authoritative status

The full 3-week Excel source batch has been received, audited and integrated into Study.

- **Week 1:** 9 files / 262 slides / 8 Groups / 27 lessons / 70 audited concepts
- **Week 2:** 10 files / 194 slides / 8 Groups / 35 lessons / 101 non-reuse production concepts
- **Week 3:** 10 files / 154 slides / 8 Groups / 34 lessons / 123 production concepts
- **Total:** 29 source files / 610 slides / 24 Groups / 96 lessons / 294 production topics

## Source rule

Uploaded Excel course files remain the educational source of truth. Source inconsistencies, environment dependencies, visual-only limitations, cross-track boundaries and missing companion files are preserved as explicit QA boundaries rather than silently corrected or invented.

## Current gate

Excel **Study is complete at production level**, but Practice / Week Exam / Excel Final assessment production remains blocked until final Study, source-trace and local visual QA are approved.

Run before upload:

1. `RUN-PREFLIGHT.bat`
2. `TEST-LOCAL.bat`
3. Complete `PRE-DEPLOY-CHECKLIST.md`

Coverage references:
- `data/excel-intake/week-1-coverage-map.json`
- `data/excel-intake/week-2-coverage-map.json`
- `data/syllabus-maps/excel.json` (includes Week 3 production mapping)
- `docs/excel-production/WEEK-3-FULL-CONTENT-AUDIT.md`
