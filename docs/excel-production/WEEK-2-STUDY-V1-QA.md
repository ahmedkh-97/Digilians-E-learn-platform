# Excel Week 2 — Study V1 QA

## Build

**V0.20.2 — Excel Week 2 Study Production**

This QA report covers the first production build generated from the CLOSED Week 2 audit for Lectures 19–28.

## Coverage QA

PASS:

- 8 / 8 approved Learning Groups
- 35 / 35 Study lessons
- 101 / 101 audited non-reuse production concepts mapped exactly once
- no duplicate Week 2 production concept IDs
- approved Group order preserved
- 35 / 35 Source Trace blocks
- 35 / 35 Deep Learning V3.2 structures
- 35 / 35 Quick Checks
- 35 / 35 Try It activities
- 15 Technical Labs
- 6 formula cards
- 33 source workflow steps

Assessment-role distribution at Study level:

- 27 eligible lessons
- 6 mixed lessons
- 2 supporting-only lessons

These lesson-level roles do not override concept-level assessment eligibility from the audit.

## Source / overlap QA

PASS:

- Week 1 reuse is referenced rather than duplicated.
- Text.End contradiction is visible as `PRESENTATION CORRECTION`.
- ActiveX and VBA lessons expose `ENVIRONMENT DEPENDENCY`.
- VSTACK remains supporting-only with no invented worked formula.
- Pandas bridge remains supporting-only with no invented source code.
- visual-only dashboard evidence remains explicitly limited.
- SQLite / external-data boundaries remain source-limited.
- missing companion-file requirements remain visible.
- Practice / Exam gate remains locked.

## Renderer QA

PASS:

The production Excel renderer successfully renders all **35 / 35** Week 2 lessons in the automated runtime check.

The Excel-scoped renderer now supports a `TECHNICAL LAB` block using the existing universal technical-code renderer. This is used for source-backed VBA, Python in Excel and Power Query M examples without changing the core technical-content parser.

## Full platform Pre-Deploy

**PASS — 2026-08-30**

The complete existing Pre-Deploy suite passed after Week 2 integration, including:

- JSON parse checks
- ES-module syntax
- DOM references
- SQL 520 questions
- Python 520 questions
- Junior Official QBank 930
- Professional Official QBank 1189
- SQL / Python Study runtime
- universal technical renderer regressions
- Ranking / Shared Avatars
- Analytics / Platform Health
- Backup / Restore
- Update Manager
- My Mistakes
- startup recovery
- Week 1 Excel Deep Learning regression checks
- new Week 2 source/overlap/coverage guards

## Protected-payload comparison

Byte-level directory hashes against the uploaded V0.20.1 audit baseline confirm that these payload directories are unchanged:

- `question-banks/` — unchanged
- `exams/` — unchanged
- `official-qbank/` — unchanged

No assessment bank was intentionally modified during Week 2 Study production.

## Local HTTP smoke

**PASS**

A local no-cache server was started on port 8146 and returned HTTP 200 for:

- `/`
- `/VERSION.txt`
- `/data/learning.json`
- `/data/curriculum/excel.json`
- `/data/syllabus-maps/excel.json`
- `/assets/js/excel-study-render.js`
- `/assets/css/style.css`

This confirms the production files are serveable as a local web build.

## Browser visual QA

**PENDING — not claimed in this report.**

No full interactive browser click-through was completed in this execution environment. The user should run `TEST-LOCAL.bat` on the target machine before GitHub LIVE.

Minimum visual acceptance path:

`Learn → Data Analysis → Excel → Excel Advanced Analysis, Dashboards & Power Query → Content Map`

Review at least one lesson from every Week 2 Group, with special attention to:

1. Group 09 — ActiveX Search and VBA AutoFilter Technical Lab
2. Group 10 — chart-selection / visual-recognition boundaries
3. Group 11 — table readability layouts
4. Group 12 — outlier formulas and Solver workflow
5. Group 13 — dashboard layout / storytelling cards
6. Group 14 — Python bridge boundary
7. Group 15 — Power Query M code + Text.End correction
8. Group 16 — external-data / SQLite / companion-file notes

Also verify at desktop and narrow mobile width:

- no horizontal page overflow
- Technical Lab code remains readable/scrollable
- Quick Check controls remain usable
- Source Trace remains visible
- no Week 1 progress is reset when opening Week 2
- Practice / Exam controls remain locked

## Release decision

Automated QA: **APPROVED**

Local browser visual QA: **REQUIRED BEFORE GITHUB LIVE**

GitHub `main` should remain on V0.20.1 until the local V0.20.2 build is accepted.

