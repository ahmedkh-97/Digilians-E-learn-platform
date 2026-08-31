# Excel Week 2 — Study Production V1

## Release target

**V0.20.2 — Excel Week 2 Study Production**

Built on the approved V0.20.1 Week 2 audit package. The platform core remains frozen; this release adds Excel Study content and the minimum Excel-scoped renderer support required by source-backed technical labs.

## Implemented scope

- **8 / 8 approved Week 2 Learning Groups**
- **35 Study lessons**
- **101 / 101 audited non-reuse production concepts mapped exactly once**
- **35 / 35 Source Trace blocks**
- **35 / 35 Deep Learning Quick Checks**
- **35 / 35 Try It activities**
- **15 source-backed Technical Labs**
- **6 source formula cards**
- **33 source workflow steps**
- Week 1 + Week 2 Excel map: **16 Learning Groups / 62 Study lessons / 171 production topics / 19 files / 456 slides**

## Learning Groups

| Group | Learner-facing title | Lessons |
|---|---|---:|
| 09 | Advanced Data Management & Search Automation | 3 |
| 10 | Chart Selection & Visual Analysis | 5 |
| 11 | Table Design & Readability | 3 |
| 12 | Outliers, Goal Seek & Optimization | 5 |
| 13 | Dashboard Design, Interactivity & Storytelling | 7 |
| 14 | Excel Automation Bridge | 2 |
| 15 | Power Query Foundations & M | 6 |
| 16 | Power Query Integration & External Data | 4 |

## Deep Learning V3.2 contract

Every Week 2 lesson includes the learner-first structure used by the approved Excel Deep Learning V3.2 standard:

- Understand From Zero
- relationship / prerequisite connection
- concepts
- worked or source-supported example
- why it matters
- common mistakes
- Try It
- Quick Check
- next connection
- Source Trace

Formula, workflow and Technical Lab blocks are included only where the source supports them.

## Overlap protection

Week 2 does not recreate Week 1 lessons for:

- Sparklines
- Data Consolidation
- Data Entry Form
- FILTER + ISNUMBER + SEARCH dynamic search

The new Week 2 layer is limited to the approved extensions, including:

- VSTACK as a supporting mention only
- 3D references
- ActiveX LinkedCell search
- VBA AutoFilter fallback

Week 1 Statistics remains prerequisite theory. Week 2 teaches only the audited Excel application layer for outliers and standardization.

## Source-integrity guards

The production build preserves the audit decisions instead of silently completing missing material:

- **Text.End:** explicit `PRESENTATION CORRECTION` for the source contradiction between “first” and “last” characters.
- **ActiveX / VBA:** explicit `ENVIRONMENT DEPENDENCY` labels.
- **VSTACK:** supporting mention only; no invented worked formula.
- **Python in Excel / Pandas:** cross-track bridge only; no duplicate Python fundamentals and no invented Pandas code.
- **Chart families with visual/name-only evidence:** recognition-level teaching only; no invented selection rules.
- **Dashboard visual-only mistakes:** limited to what the visual/name supports.
- **Lecture 25 missing question 2:** not invented.
- **Regression:** mention-only; no standalone lesson/assessment.
- **SQLite:** connection concept only; no invented setup procedure.
- **Missing companion files:** practical assessment recreation remains blocked.
- **Unsourced productivity percentages:** excluded from assessment content.

## Assessment gate

Excel Week 2 Practice / Week Exam are **not** generated in this release.

Current state:

`Study Production → Automated QA → Local Visual QA → Study Approval → Practice/Exam Production`

Assessment stays locked until Study and local visual QA are accepted.

## Core protection

No intentional changes were made to SQL, Python or Official assessment payloads.

Protected baseline counts remain:

- SQL: **520**
- Python: **520**
- Official Junior: **930**
- Official Professional: **1189**

