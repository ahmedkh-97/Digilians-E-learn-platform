# Digilians E-Learn Platform V0.18.2

## CURRENT AUTHORITATIVE OFFICIAL QBANK STATUS — V0.9.5

A full 208-page source audit was completed before continuing explanation production.

- Junior Official QBank: **930 source-verified questions**
- Excel: 230
- Power BI: 235
- SQL: 85
- Python: 85
- Tableau: 210
- Looker Studio: 85
- Junior ranked sections: **21**
- Source audit: **PASSED**

Historical sections below may mention earlier extraction counts (830/880). Those numbers are retained only as version history and are no longer authoritative.


A modern, free-first learning and exam platform prototype.

## V0.3 UI/UX redesign
- Premium landing page with animated product preview
- Light / dark mode with strong selected states
- Saved name on the same device — no login required
- Home command center: Continue Where You Left Off
- Course learning paths: Study → Practice → Exam
- Study page architecture ready for text, lists and callouts
- Exam library with filters and search
- Instant Feedback and Exam Mode
- Timer, question navigator, Next / Previous navigation
- Exam progress saved locally so users can continue later
- Result score animation, improvement message and personal best
- Achievements / badges
- Profile drawer with local statistics
- Mobile bottom navigation
- Leaderboard UI prepared for the Supabase integration step
- Professional footer credit with Ahmed Khaled's LinkedIn

## Current data architecture
- `data/exams.json` — exam registry
- `data/learning.json` — course/module/study structure
- `exams/.../*.json` — individual exam files
- localStorage — user name, preferences, progress and local results

## Important
The shared leaderboard is intentionally not faked in this version. Cross-device scores require an online database.
The next technical step is Supabase Free Tier integration.

## Running the project
The app uses `fetch()` for JSON files, so open it through:
- GitHub Pages, or
- a local web server such as VS Code Live Server.

Do not test by double-clicking `index.html` directly.


## V0.3.1 readability patch
- Increased Explanation font size and line-height in Instant Feedback.
- Increased Explanation font size in Review Answers.

## V0.3.2 Dark Mode Contrast Patch
- Fixed course-card headings appearing black in Dark Mode.
- Explicitly bound course-card text to the design-system text tokens.
- Added a dark-mode contrast safeguard for course titles and metadata.


## V0.4 — Supabase Online Leaderboard
- Connected to Supabase using the public Publishable API key.
- Uses the Data API via `apikey` header only.
- Every browser gets a persistent `player_id` UUID.
- Every exam attempt gets a unique `client_attempt_id`.
- Attempts save locally first, then sync online.
- Failed online submissions are queued in localStorage and retried on a later visit.
- Shared leaderboard shows the best attempt only for each player.
- Ranking: percentage descending, then time ascending.
- Result page displays online rank after successful sync.
- Ranking page supports per-exam leaderboards and live refresh.
- User-generated names are escaped before rendering to prevent HTML injection.

### Public browser configuration
The publishable key is intentionally present in `assets/js/online.js`.
Do not ever replace it with a Supabase Secret key or service_role key.

### Supabase table expected
`public.exam_attempts` with RLS allowing `anon` SELECT + INSERT only.


## V0.5 — Exam JSON Validator
- Added an in-browser Exam JSON Validator.
- Open it from the Profile drawer.
- Drag/drop or choose an AI-generated `.json` file.
- Validates:
  - schema version
  - exam metadata
  - timer and feedback settings
  - duplicate question IDs
  - exactly four MCQ options A–D
  - correct-answer mapping
  - Arabic explanations
  - topics and difficulty
  - source traceability warnings
- Generates a ready-to-copy `data/exams.json` registry entry when valid.
- Provides a suggested GitHub file path.
- Added downloadable `data/exam-template.json`.
- Added `docs/EXAM-JSON-SCHEMA.md`.
- Validation runs entirely in the browser; the exam file is not uploaded anywhere.


## V0.5.1 — First Real Exam + Data Analysis Track Structure
- Added the first real course exam:
  - Data Analysis
  - SQL & Databases
  - Session 1 — Relational Databases & Data Modeling
- Added 50 validated MCQs from the real Session1.pptx material.
- Added a source-based compact Study page for Session 1.
- Added Data Analysis sub-tracks:
  - Excel
  - SQL & Databases
  - Python for Data Analysis
  - Power BI
  - Statistics
- Learn navigation now supports Course → Track → Module.
- Real exam path:
  `exams/data-analysis/sql/data-analysis-sql-session1-data-modeling-practice.json`
- Supabase leaderboard integration remains active.


## V0.6 — Question Bank Architecture + Dynamic Final Exam Engine

### Architecture
Material is now processed incrementally:
`Material → Question Bank → Topic/Track Exam → Final Exam Pool`

The final no longer requires all original course files to be uploaded again.

### Question Bank V2
Added:
- `data/question-bank-template.json`
- `data/question-banks.json`
- `docs/QUESTION-BANK-SCHEMA-V2.md`
- `assets/js/bank-validator.js`
- `assets/js/bank-engine.js`

The existing SQL Session 1 exam was converted into the first real bank:
`question-banks/data-analysis/sql/session1-data-modeling-bank.json`

### Exam DNA V2
Added `data/exam-style-v2.json`:
- Topic exams: 40–50 questions
- Default difficulty target: 25% Easy / 50% Medium / 25% Hard
- Source target: 80% course / 20% external-similar
- External-similar cannot introduce new syllabus concepts
- Question-family profiles for Python, SQL, Excel, Power BI, Tableau and Looker Studio

### Data Analysis Final
Added a visible Final Exam area and blueprint:
- 100 questions
- 120 minutes
- Excel 20
- Power BI 20
- SQL 20
- Python 20
- Tableau 10
- Looker Studio 10

The Final automatically remains in **POOL BUILDING** state until all required banks contain enough questions by:
- subject
- difficulty
- source type

### Final Result Analytics
Generated multi-track exams now show a Subject Breakdown.

### Validator Upgrade
The in-platform validator now auto-detects:
- Exam JSON V1
- Question Bank JSON V2

### Current readiness
Only the SQL Session 1 seed bank exists today. It is valid, but its current Easy/Medium/Hard and course/external mix does not yet satisfy the agreed V2 Final quotas. This is intentional: the engine does not silently lower the standard.


## V0.6.1 — Curriculum Manifest + Track Readiness

Added Architecture V2.1.

### New curriculum layer
Every Data Analysis track now has its own manifest under:
`data/curriculum/`

Tracked fields include:
- curriculum status
- curriculum version
- processed sources
- mapped topics
- explicit user completion confirmation

### Readiness states
- IN PROGRESS
- CONTENT COMPLETE — BANK BUILDING
- FINAL READY

### Final Exam rule
The 100-question Data Analysis Final remains locked until all six required tracks are FINAL READY:
- Excel
- Power BI
- SQL & Databases
- Python
- Tableau
- Looker Studio

The system no longer treats “enough questions” as equivalent to “curriculum complete”.

### Current state
All tracks intentionally remain IN PROGRESS because no track has yet been explicitly confirmed complete by the user.


## V0.7 — Syllabus Map + Coverage Blueprint Engine

### New Syllabus Maps
Added track-level syllabus maps under:
`data/syllabus-maps/`

Each map supports:
- Major topics
- Subtopics
- Importance (`core`, `important`, `supporting`)
- Curriculum versioning

### New Coverage Blueprints
Added:
`data/coverage-blueprints/`

Coverage controls how many questions must come from each major topic.

### SQL Pilot
The existing SQL Session 1 bank was enriched with:
- `topicId`
- `subtopicId`
- `importance`

A pilot SQL coverage blueprint is included for:
- 20-question Final share
- 45-question Track Exam

These pilot weights must be recalculated as additional SQL curriculum is processed.

### Final Engine
The dynamic exam engine can now apply topic coverage instead of selecting blindly from a large pool.

### Result Analytics
Topic-level performance is now calculated and displayed after an exam.


## V0.8 - Official Ministry QBank Hub

Integrated the complete 208-page official Junior MCQ Exercise bank as a first-class product area.

### Extracted Questions
- Total: 830
- Excel: 230
- Power BI: 185
- SQL: 85
- Python: 85
- Tableau: 160
- Looker Studio: 85

### Features
- Official QBank desktop navigation + mobile bottom navigation
- Home shortcut
- Study every official question in original source order
- Source page and original question number shown
- Search + topic filter
- Reviewed / unseen / bookmarks / mistakes filters
- Local progress persistence
- Practice 40
- Exam 50
- Official-only 100-question / 120-minute Final Simulation
- Exact official text locked in archive
- Official answers clearly separated from platform-generated explanations


## V0.8.1 — Official QBank Interaction Fix

Fixed the issue visible in the user test recording where answers inside **Study All Questions**
looked clickable but did not respond.

### Study All behavior now
- Every A/B/C/D option is a real interactive button.
- Selecting an answer gives immediate feedback.
- Correct option is highlighted in green.
- A wrong selected option is highlighted in red while the official answer is highlighted in green.
- Answer is saved locally per question.
- Reviewed and mistake states are updated automatically.
- Returning to the question restores the previous answer and feedback.
- `Show Official Answer` remains available for users who want to reveal the answer without attempting it.
- Previous / Next now respect active search/topic/state filters.

### Readability
- Official answer option text increased from 10px to 15px on desktop.
- Official answer option text uses 14px on mobile.
- Official answer feedback box enlarged.
- General Exam/Practice answer choices were also enlarged for consistency.


## V0.8.2 — Official QBank Arabic Explanation Layer

Added Arabic educational explanations to all 830 Official Ministry QBank questions.

### Source integrity
- Official question text remains unchanged.
- Official options remain unchanged.
- Official correct answer remains unchanged.
- `officialTextLocked` remains untouched.
- Arabic explanations are stored separately in `aiExplanation`.
- The UI clearly labels them as **AI Explanation — Arabic**.

### Feedback behavior
After selecting an answer:
- Correct selection: Arabic note explains that the choice matches the official answer, followed by an Arabic concept explanation.
- Wrong selection: shows the chosen option, identifies it as incorrect, shows the official answer, then gives an Arabic explanation.
- `Show Official Answer` also displays the Arabic explanation.

The platform explicitly states that the answer is official while the Arabic explanation is an educational platform-generated addition.


## V0.8.3 — Deep Explanation Pilot

A real option-by-option Arabic explanation layer was added as a quality pilot.

### Pilot scope
- Track: Excel
- Questions: Official Excel Q1–Q50
- Source pages: 1–10 of the Ministry QBank
- Each item now contains:
  - a concept-specific Arabic explanation
  - why the official answer is correct
  - why A is correct/wrong
  - why B is correct/wrong
  - why C is correct/wrong
  - why D is correct/wrong

### UI
After answering:
- If correct, the exact reason for the selected option is shown.
- If wrong, the exact reason why the selected distractor is wrong is shown.
- A detailed section analyzes all four choices.

The official question text, options and correct answer remain unchanged.
Explanations are stored separately as `deepExplanation` and are clearly labeled as a Digilians E-Learn educational addition.

Questions outside this 50-question pilot keep the V0.8.2 explanation until the deep layer is expanded after pilot approval.


## V0.8.4 — Deep Explanation Batch 2

Expanded the approved Deep Explanation format to Official Excel questions Q51–Q100.

### Cumulative Excel deep coverage
- Q1–Q50: complete
- Q51–Q100: complete
- Total deep explanations: 100 / 230 Excel official questions

Each completed question includes:
- concept-specific Arabic explanation
- why the official answer is correct
- why A is correct/wrong
- why B is correct/wrong
- why C is correct/wrong
- why D is correct/wrong

The official wording, options and correct answers remain unchanged.


## V0.8.5 — Deep Explanation Batch 3

Expanded the approved Deep Explanation format to Official Excel questions Q101–Q150.

### Cumulative Excel deep coverage
- Q1–Q50: complete
- Q51–Q100: complete
- Q101–Q150: complete
- Total deep explanations: 150 / 230 Excel official questions

Each completed question includes:
- concept-specific Arabic explanation
- why the official answer is correct
- why A is correct/wrong
- why B is correct/wrong
- why C is correct/wrong
- why D is correct/wrong

The official wording, options and correct answers remain unchanged.


## V0.8.6 — Deep Explanation Batch 4

Expanded the approved Deep Explanation format to Official Excel questions Q151–Q200.

### Cumulative Excel deep coverage
- Q1–Q50: complete
- Q51–Q100: complete
- Q101–Q150: complete
- Q151–Q200: complete
- Total deep explanations: 200 / 230 Excel official questions

Each completed question includes a concept-specific Arabic explanation plus A/B/C/D option-by-option reasoning.
Official wording, options, and official answers remain unchanged.


## V0.8.7 — Excel Deep Explanation Complete

Completed the approved Deep Explanation format for Official Excel questions Q201–Q230.

### Excel deep coverage
- Q1–Q50: complete
- Q51–Q100: complete
- Q101–Q150: complete
- Q151–Q200: complete
- Q201–Q230: complete
- Total: 230 / 230 Excel official questions

Every Official Excel question now includes:
- concept-specific Arabic explanation
- why the official answer is correct
- why each A/B/C/D option is correct or wrong

Official wording, options, and official answers remain unchanged.


## V0.9 — Official QBank Levels + Ranked Sections

### New first-level navigation
Official QBank now opens a level chooser:
- Junior Data Analysis — active
- Professional Data Analysis — separate placeholder for the future official bank

### Junior sections
The 830-question Junior bank is now organized into 19 stable official sections:
- Excel: 5
- Power BI: 4
- SQL: 2
- Python: 2
- Tableau: 4
- Looker Studio: 2

Every section can be studied without ranking, or solved as a complete ranked section.

### Section completion
Ranked section attempts show:
- Correct / Wrong / Unanswered
- Accuracy and time
- Personal best
- Online section rank
- Review Answers
- Retake Section
- View Ranking
- Next Section

### Mandatory ranked identity
A saved name is required before:
- solving a ranked official section
- random official practice/exam
- official final simulation
- viewing any leaderboard
- starting any other ranked platform exam

No anonymous / Guest attempt can start a ranked activity.

### Future Professional level
Professional Data Analysis remains completely separate from Junior and is ready to receive its own source, tracks, sections and rankings later.


## V0.9.1 — Power BI Deep Explanation Batch 1

Added approved option-by-option Arabic deep explanations to Official Junior Power BI Q1–Q50.

### Deep explanation coverage
- Excel: 230 / 230 complete
- Power BI: 50 / 185 complete

Each completed Power BI question includes:
- concept-specific Arabic explanation
- why the official answer is correct
- why A/B/C/D are correct or wrong

Official question wording, official options, and official answers remain unchanged.
The Arabic explanation layer is a Digilians E-Learn educational addition, not part of the official ministry wording.


## V0.9.2 — Power BI Deep Explanation Batch 2

Added approved option-by-option Arabic deep explanations to Official Junior Power BI Q51–Q100.

### Deep explanation coverage
- Excel: 230 / 230 complete
- Power BI: 100 / 185 complete

Power BI Q51–Q100 now includes question-specific Arabic explanations for:
Power Query, data types, Unpivot/Pivot, Merge/Append, M language, grain, relationships,
Star Schema, cross-filter direction, bridge tables, visual selection, measures vs calculated columns,
and DAX calculation/tracing questions.

Official question wording, official options, and official answers remain unchanged.
Arabic explanations are a Digilians E-Learn educational layer and are not part of the official source wording.


## V0.9.3 — Power BI Deep Explanation Batch 3 + Source Integrity Guard

Added deep option-by-option Arabic explanations to Power BI Q102–Q150.

### Coverage
- Excel: 230 / 230 complete
- Power BI: 149 deeply explained items out of the currently extracted 185
- Power BI Q101: source parsing review required

### Important source integrity finding
Power BI Q101 in the extracted JSON contains multiple later official questions inside option D due to an extraction collision.
The official source itself shows that this area contains a larger question block. The platform does NOT silently invent or alter the official item.

Until a dedicated reparse:
- Q101 stays visible in Study All for source completeness.
- Q101 is marked `source-parse-review-required`.
- Q101 is excluded from ranked Section/Practice/Final generation.
- Official source text is not mutated.

### Deep explanation standard
Q102–Q150 each include:
- concept-specific Arabic explanation
- why the official answer is correct
- why A/B/C/D are correct or wrong

The Junior/Professional, ranked identity, retake and section ranking architecture remains intact.


## V0.9.4 - Power BI Official Source Repair

A source-level audit found that the previous 185-question Power BI extraction was incomplete.

### Corrected authoritative counts
- Power BI: 235 official questions
- Junior Official QBank: 880 official questions
- Junior sections: 20
- Power BI sections: 5

### Repair details
- Recovered 50 official Power BI questions from PDF pages 68-74.
- Used the official 50-question answer key on page 75.
- Repaired the malformed record after the answer key into the real source Q16 (Merge).
- Reindexed the later Power BI questions while preserving their existing deep explanations.
- Corrected the smaller M-language parsing artifact on source page 60.
- No official source wording or answers were invented.

Previous references to 830 questions describe the pre-audit extraction. The current authoritative Junior count is 880.


## V0.9.5 — Full Official Source Audit + Tableau Repair

Before continuing Deep Explanations, the entire 208-page Junior Official QBank was audited against the platform extraction.

### New source repair
A missing 50-question Tableau block was recovered from PDF pages 178–184 using the official answer key on page 185.

### Authoritative totals
- Excel 230
- Power BI 235
- SQL 85
- Python 85
- Tableau 210
- Looker Studio 85
- Total Junior Official QBank: 930
- Total ranked sections: 21

### Safety improvements
- Source-revision-safe section/ranking IDs
- Repaired Power BI/Tableau local progress does not inherit incompatible legacy answer maps
- Mandatory ranked-name guards preserved
- Official text/options/answers remain locked
- Full question/option/source/answer audit passed


## V0.9.6 — Power BI Deep Explanation: Recovered Official Q101-Q150

Added approved option-by-option Arabic deep explanations to the 50 Power BI questions recovered and source-verified during the V0.9.4/V0.9.5 audit.

### Power BI deep coverage
- Q1-Q100: complete
- Q101-Q150: complete
- Q152-Q200: previously completed and preserved
- Q151 + Q201-Q235: still pending

Cumulative Power BI deep explanations: **199 / 235**.

Official question wording, options, answers, source pages, source revision IDs, Junior/Professional isolation, ranked identity, section retakes and leaderboards remain unchanged.


## V0.9.7 — Power BI Deep Explanation Complete

Completed the final 36 pending Power BI questions:
- Q151
- Q201-Q235

### Final Power BI coverage
**235 / 235 official Power BI questions now have approved deep Arabic explanations.**

Each Power BI question now includes:
- concept-specific Arabic explanation
- why the official answer is correct
- why A/B/C/D are correct or wrong
- execution/calculation reasoning where applicable
- scenario reasoning where applicable

Official text, options, official answers, source pages, source-revision IDs, Junior/Professional isolation, ranked identity, retakes and section leaderboards remain unchanged.


## V0.9.8 — SQL Deep Explanation Batch 1

Added approved option-by-option Arabic deep explanations to Official Junior SQL Q1-Q50.

### SQL deep coverage
- Q1-Q50: complete
- Q51-Q85: pending

Cumulative SQL deep explanations: **50 / 85**.

Covered concepts include JOINs, GROUP BY/HAVING, NULL handling, DISTINCT, ORDER BY, CASE, subqueries,
UNION, CTEs, keys and constraints, normalization, indexes, views, stored procedures, transactions,
DELETE/TRUNCATE/DROP, aggregate behavior, duplicate detection, conditional aggregation, and multi-table reporting.

Official question wording, options, answers, source pages, source-revision IDs, ranked identity, retakes and section leaderboards remain unchanged.


## V0.9.9 — SQL Deep Explanation Complete

Completed Official Junior SQL Q51-Q85 with approved option-by-option Arabic deep explanations.

### Final SQL coverage
**85 / 85 official SQL questions now have deep explanations.**

The completed SQL bank covers:
- SELECT / FROM / WHERE
- ORDER BY / ASC / DESC
- DISTINCT / LIKE / BETWEEN / IN
- AND / OR / NULL
- aggregate functions
- GROUP BY / HAVING
- JOINs
- subqueries / UNION / CTEs
- keys and constraints
- normalization and indexes
- views / stored procedures
- INSERT / UPDATE / DELETE / TRUNCATE / DROP
- transactions
- reporting scenarios and conditional aggregation

Official wording, options, answers, source references, source revisions, ranked identity, section retakes and leaderboard architecture remain unchanged.


## V0.10.0 — Python Deep Explanation Batch 1

Added approved option-by-option Arabic deep explanations to Official Junior Python Q1-Q50.

### Python deep coverage
- Q1-Q50: complete
- Q51-Q85: pending

Cumulative Python deep explanations: **50 / 85**.

Covered areas include Python data types, lists/dictionaries/slicing, control flow, functions, lambda,
error handling, NumPy arrays/shape/indexing/aggregation/reshape/boolean filtering, Pandas loading,
inspection, grouping, aggregation, sorting, missing values, duplicates, string cleaning, merging,
concatenation, outliers, and Matplotlib/Seaborn visualization selection.

Official question wording, options, answers, source references, source revisions, ranked identity,
section retakes and leaderboard architecture remain unchanged.


## V0.10.1 — Python Deep Explanation Complete

Completed Official Junior Python Q51-Q85 with approved option-by-option Arabic deep explanations.

### Final Python coverage
**85 / 85 official Python questions now have deep explanations.**

This final batch covers:
- reset_index / set_index / sort_index
- slicing
- reproducible sampling
- df.info / df.describe / dtypes / empty / ndim / transpose
- functions, return, loops, break
- dictionary update and access
- Pandas rename/drop/to_csv
- Seaborn data/x mapping
- range, tuples, lists and operators
- Matplotlib figure, labels, grid and title

Official wording, options, answers, source references, source revisions, ranked identity,
section retakes and leaderboard architecture remain unchanged.


## V0.10.2 — Tableau Deep Explanation Batch 1

Added approved option-by-option Arabic deep explanations to Official Junior Tableau Q1-Q50.

### Tableau deep coverage
- Q1-Q50: complete
- Q51-Q210: pending

Cumulative Tableau deep explanations: **50 / 210**.

Covered concepts include Show Me, Sheets, Rows shelf, Marks card, Dashboards, Stories, Tooltips,
Dashboard Actions, Heat Maps, Parameters, Parameter Actions, Calculated Fields, Hierarchies,
Clustering, MAKEPOINT, MAKELINE, DISTANCE, Groups, Sets, and drill-down behavior.

Official question wording, options, answers, source references, source revisions, ranked identity,
section retakes and leaderboard architecture remain unchanged.


## V0.10.3 — Tableau Deep Explanation Batch 2

Added approved option-by-option Arabic deep explanations to Official Junior Tableau Q51-Q100.

### Tableau deep coverage
- Q1-Q100: complete
- Q101-Q210: pending

Cumulative Tableau deep explanations: **100 / 210**.

This batch covers parameters, calculated fields, Top/Wildcard/Measure filters, dashboards and actions,
stories, spatial points, clustering, dimensions vs measures, Marks properties, date granularity,
detail vs tooltip, color ranges, reference bands, forecasting, dashboard layout, field roles,
groups, sets, discrete/continuous pills, and analytical title design.

Official question wording, options, answers, source references, source revisions, ranked identity,
section retakes and leaderboard architecture remain unchanged.


## V0.10.4 — Tableau Deep Explanation Batch 3

Added approved option-by-option Arabic deep explanations to Official Junior Tableau Q101-Q150.

### Tableau deep coverage
- Q1-Q150: complete
- Q151-Q210: pending

Cumulative Tableau deep explanations: **150 / 210**.

This batch covers worksheet design context, dimensions/measures, Rows/Columns shelves, filters,
data connections and validation, joins/relationships/unions, Top/Date/Context filters,
calculated fields, parameters, groups/sets/hierarchies, table calculations, forecasting,
trend lines, dashboards/actions/tooltips, maps, dashboard design, and join/union selection.

Official question wording, options, answers, source references, source revisions, ranked identity,
section retakes and leaderboard architecture remain unchanged.


## V0.10.5 — Tableau Deep Explanation Complete

Completed Official Junior Tableau Q151-Q210 with approved option-by-option Arabic deep explanations.

### Final Tableau coverage
**210 / 210 official Tableau questions now have deep explanations.**

This final batch covers:
- multi-value filters, parameters, groups, sets and hierarchies
- forecast and trend lines
- dashboard filter actions
- Tableau products and file types
- dimensions/measures and discrete/continuous fields
- worksheets, dashboards, stories and Show Me
- extracts/live connections and Hyper
- chart selection and maps
- calculated fields, CASE, LOD/FIXED and table calculations
- data blending, joins, data source filters and context filters
- Data Interpreter, Analytics pane, Pages shelf and Tableau Public

Official wording, options, answers, source references, source revisions, ranked identity,
section retakes and leaderboard architecture remain unchanged.


## V0.10.6 — Looker Studio Deep Explanation Batch 1

Added approved option-by-option Arabic deep explanations to Official Junior Looker Studio Q1-Q50.

### Looker Studio deep coverage
- Q1-Q50: complete
- Q51-Q85: pending

Cumulative Looker Studio deep explanations: **50 / 85**.

This batch covers Google Sheets connections, scorecards, time series/bar/pie/table/geo visualizations,
dimensions and metrics, calculated fields, CASE logic, aggregations, COUNT DISTINCT, data blending,
join keys, data quality, sorting, Top N, conditional formatting, report pages/navigation,
filter/date controls, chart interactions, themes, sharing, scheduled delivery, and end-to-end
dashboard design.

Official question wording, options, answers, source references, source revisions, ranked identity,
section retakes and leaderboard architecture remain unchanged.


## V0.10.7 — Junior Official QBank Deep Explanation Complete

Completed Official Junior Looker Studio Q51-Q85.

### Deep-explanation coverage
- Excel: **230 / 230**
- Power BI: **235 / 235**
- SQL: **85 / 85**
- Python: **85 / 85**
- Tableau: **210 / 210**
- Looker Studio: **85 / 85**
- TOTAL: **930 / 930**

Every official Junior question now includes a concept-specific Arabic summary plus an A/B/C/D option analysis.
The official question text, options and official answer remain locked and unchanged. Platform explanations remain clearly labeled `platform-generated`.


## V0.10.9 — Hotfix: Home + Ranking Data Analysis Priority

Built from the last known-good V0.10.7 baseline after V0.10.8 introduced a runtime regression.

### Fixes
- Restored the original `async function renderRanking()` runtime flow.
- Landing product preview now shows **Data Analysis • Official QBank** instead of the English demo.
- Landing preview subtitle now shows **Resume Track**.
- Ranking dropdown is reordered with Data Analysis first:
  - Junior Official Final
  - Official Junior QBank sections
  - Data Analysis platform exams
  - other legacy/demo exams last
- Ranking default now prioritizes:
  1. last selected Data Analysis leaderboard
  2. most attempted Data Analysis leaderboard for the current saved user/device
  3. Junior Data Analysis Official Final
  4. first available Data Analysis leaderboard
- Last ranking selection is saved safely in localStorage.
- No Official QBank question data or source-audit content was changed.


## V0.11.0 — Professional Official QBank Phase 1 Integration

Professional Data Analysis is now an active, isolated Official QBank level.

- 1,189 Professional official questions
- 7 tracks / 26 sections
- 675 source-identical questions reuse reviewed Junior deep explanations
- 162 SQL/Python variants carry `adapt-and-review` reuse metadata
- 352 questions are marked `new-required` for new deep explanations
- Web Scraping and Machine Learning are Professional-only tracks
- Professional has no Looker Studio section in the supplied 221-page source
- Junior 930-question source and rankings remain unchanged

Professional Final is intentionally not enabled in this phase; section ranking and per-track Random Practice/Exam are active.


## V0.11.1 — Professional SQL Variant Deep Explanations Batch 1

Completed the first **50 Professional SQL variant questions** using the approved reuse workflow.

- Junior explanations were used only as conceptual/review references.
- Every Professional question was rechecked against its own wording, A/B/C/D options, and official answer.
- `reuseAudit.explanationReuse` changed from `adapt-and-review` to `adapted-and-reviewed`.
- Every completed question now has a Professional-specific Arabic `deepExplanation` with A/B/C/D analysis.
- Official Professional wording, options, answer, source order, and source metadata remain unchanged.

Professional SQL status after this batch:
- 50 variants: adapted and reviewed
- 56 variants: still adapt-and-review
- 45 unique questions: new explanation required
- Total SQL: 151


## V0.11.2 — Professional SQL Variant Deep Explanations COMPLETE

Completed the remaining **56 Professional SQL variant questions**.

Professional SQL reuse status:
- **106 / 106 variants adapted and reviewed**
- **45 unique SQL questions still require new explanations**
- Total Professional SQL: **151**

Every completed variant now has:
- Professional-specific Arabic concept explanation
- A/B/C/D analysis
- `reuseAudit.explanationReuse: adapted-and-reviewed`
- `deepExplanation.status: reviewed-batch`

Official Professional wording, options, answers, source order, and source metadata remain unchanged.


## V0.11.3 — Professional SQL Deep Explanations COMPLETE

Completed all **45 unique Professional SQL questions** with new, source-specific Arabic deep explanations.

Professional SQL is now **151 / 151 complete**:
- 106 variants: adapted and reviewed from Junior reference concepts
- 45 unique: newly written and reviewed
- every question has A/B/C/D analysis
- official question wording, options, answer and source order remain unchanged

Unique topics completed in this batch include:
RIGHT JOIN, triggers, UDFs, ALTER/DROP VIEW, ER modeling, weak entities, M:N mapping,
operator precedence, star vs snowflake schemas, DECIMAL, DDL/DCL, DATE_ADD, IF...ELSE,
subqueries, ALL/EXISTS, window functions, RANK/DENSE_RANK/ROW_NUMBER/LAG, PIVOT,
TRY/CATCH, SQL categories, aliases, ISNULL, logical query execution order, UPPER and CONCAT.


## V0.11.4 — Professional Python Variants COMPLETE

Completed all **56 Professional Python variant questions** using the approved reuse workflow.

Professional Python status:
- **56 / 56 variants adapted and reviewed**
- **94 unique Python questions still require new explanations**
- Total Professional Python: **150**

Each completed variant now includes:
- Professional-specific Arabic concept explanation
- A/B/C/D option analysis
- `reuseAudit.explanationReuse: adapted-and-reviewed`
- `deepExplanation.status: reviewed-batch`

Junior material was used only as a conceptual/review reference. Official Professional wording,
options, answers, order and source metadata remain unchanged.


## V0.11.5 — Professional Python Unique Batch 1

Completed the first **50 / 94 unique Professional Python questions** with new, source-specific deep explanations.

Professional Python status:
- 56 variants: adapted and reviewed
- 50 unique: newly created and reviewed
- **106 / 150 total Python questions now have deep explanations**
- **44 unique Python questions remain**

This batch includes Python fundamentals, loops, collections, functions, Pandas basics,
advanced output tracing, NumPy indexing/reshaping/broadcasting/aggregation, mutable default
arguments, copying behavior, recursion, nested loops, and exact code-execution reasoning.

Official wording, options, answers, source order, and source metadata remain unchanged.


## V0.11.6 — Professional Python Deep Explanations COMPLETE

Completed the remaining **44 unique Professional Python questions**.

Professional Python is now **150 / 150 complete**:
- 56 variants: adapted and reviewed
- 94 unique: newly written and reviewed
- every question has an Arabic concept/execution explanation plus A/B/C/D analysis
- official question wording, options, answer and source order remain unchanged

This final batch covers advanced NumPy and Pandas execution tracing, DataFrame copying,
sorting, value_counts, missing-data handling, duplicate handling, map/apply, datetime access,
basic Python syntax/types/operators, sets, input, loops, strings, Pandas structures and Matplotlib.


## V0.11.7 — Professional Web Scraping Deep Explanations Batch 1

Completed the first **50 / 123 Professional Web Scraping questions** with new, source-specific Arabic deep explanations.

Coverage in this batch:
- requests.get, headers, timeout and HTTP 200
- BeautifulSoup creation, parsers, prettify, find/find_all and ResultSet
- tags, attributes, get_text, href, urljoin and image attributes
- CSS-selector searching and DOM navigation
- BeautifulSoup limitations with JavaScript
- Selenium fundamentals, WebDriver, element locating, clicking and send_keys

Every completed question now includes A/B/C/D analysis.
Official question wording, options, answer, source order and source metadata remain unchanged.


## V0.11.8 — Professional Web Scraping Deep Explanations Batch 2

Completed the next **50 Professional Web Scraping questions**.

Professional Web Scraping status:
- **100 / 123 questions complete**
- **23 questions remain**

This batch covers Selenium waits and browser control, feedparser/RSS/Atom,
HTTP status codes, scraping ethics, robots.txt, APIs, User-Agent and request delays,
HTML structure, Scrapy, dynamic JavaScript pages, and core BeautifulSoup concepts.

Every completed question includes an Arabic explanation plus A/B/C/D analysis.
Official question wording, options, answers, source order and source metadata remain unchanged.


## V0.11.9 — Professional Web Scraping Deep Explanations COMPLETE

Completed the remaining **23 Professional Web Scraping questions**.

Professional Web Scraping is now **123 / 123 complete**.

Final coverage includes:
- BeautifulSoup find_all/select and CSS selectors
- HTML attributes and parsers
- XPath
- pandas read_html
- pagination
- JSON APIs
- headless browsers and CAPTCHA
- rate limiting, Authorization headers and cookies
- requests response text/status_code
- robust scraper practices
- structured storage and privacy/legal considerations

Every Professional Web Scraping question now includes an Arabic explanation and A/B/C/D analysis.
Official wording, options, answers, source order and source metadata remain unchanged.


## V0.12.0 — Professional Machine Learning Deep Explanations Batch 1

Completed the first **50 / 90 Professional Machine Learning questions** with new, source-specific Arabic deep explanations.

Coverage in this batch:
- Linear and Multiple Linear Regression
- MSE, R² and Ordinary Least Squares
- Logistic Regression, sigmoid, thresholds and Log Loss
- SVM and kernels
- Decision Trees and Random Forest
- K-Means and the Elbow Method
- overfitting, underfitting, regularization and bias-variance tradeoff
- supervised, unsupervised and reinforcement learning
- classification vs regression
- features, targets and train/test split

Every completed question includes A/B/C/D analysis.
Official question wording, options, answer, source order and source metadata remain unchanged.


## V0.12.1 — Professional Deep Explanations COMPLETE

Completed the remaining **40 Professional Machine Learning questions**.

Professional Machine Learning is now **90 / 90 complete**.

The entire Professional Official QBank is now **1189 / 1189 complete with deep explanations**:
- Excel: 230 / 230
- Power BI: 235 / 235
- SQL & Databases: 151 / 151
- Python: 150 / 150
- Web Scraping: 123 / 123
- Machine Learning: 90 / 90
- Tableau: 210 / 210

Every Professional question has a platform-generated Arabic deep explanation with A/B/C/D analysis.
Official wording, options, official answers, source order, source numbering and source metadata remain unchanged.

The Professional Final Exam blueprint remains intentionally inactive until its seven-track distribution
is separately approved; the Junior final distribution has not been copied automatically.


## V0.12.2 — Professional Official Final ACTIVATED

- 100 questions / 120 minutes
- 7 Professional tracks
- Source-proportional distribution: 19 Excel / 20 Power BI / 13 SQL / 13 Python / 10 Web Scraping / 7 Machine Learning / 18 Tableau
- Topic-aware selection inside every track
- Fingerprint deduplication within each generated attempt
- Separate Professional Final leaderboard
- Professional Final ID: `official-professional-data-analysis-final-v1-professional-1189-r1`
- The weighting is explicitly labeled as platform-generated, not an official ministry final-exam specification.


## V0.12.3 — Full Platform QA & UX Stability Pass

Junior + Professional QA pass completed after Professional Final activation.

Fixes:
- Professional Final resume now restores the correct Professional level/track context.
- Mistake tracking now uses the correct level-specific source revision after resume.
- Result buttons use the correct Junior/Professional QBank label.
- Back/review/setup navigation restores the original Official QBank level context.
- `View Ranking` now preserves the leaderboard of the exam just completed.
- Random Official Practice 40 and Exam 50 leaderboards are now selectable in Ranking.
- Dashboard Official QBank count now reflects all active levels (2119 questions).
- Generated Official exams show their real title in `Continue Where You Left Off`.
- Official results can be launched again directly from the Continue card.
- Official result records now retain feedback mode and exam category for reliable reruns.
- Search/filter/file controls received explicit accessibility labels.
- Static Junior-only fallback copy was removed from generic Professional-capable flows.

QA report: `docs/FULL-PLATFORM-QA-V0.12.3.md`


## V0.13.0 — Ranking V2

Ranking is now hierarchical:

- Exam Ranking: every ranked exam/activity remains independent.
- Track Overall: sums the best attempt from every fixed section in the selected track.
- Junior Overall: Total Grades across all 930 Junior source questions.
- Professional Overall: Total Grades across all 1189 Professional source questions.
- Completion ranks first, then Total Grade, then total time.
- Random Practice 40 / Random Exam 50 / Final simulations remain separately ranked but are excluded from aggregate Total Grades.
- No Supabase schema migration is required.


## V0.14.0 — Complete SQL Curriculum Integration

Integrated the finalized SQL production package into the Data Analysis learning and assessment architecture.

- SQL curriculum status: complete / FINAL READY
- 8 processed SQL sessions
- 25 mapped major topics
- 13 production Question Banks
- 520 validated SQL questions
- 8 source-scoped Session Practice exams
- Dynamic Full SQL Track Exam: 50 questions
- SQL share in the Data Analysis Final: 20 questions
- Validated signature rotation preserves the approved topic, difficulty, source-type and question-family profiles while allowing alternate forms.
- Legacy 50-question Session 1 seed bank was removed from the active registry.
- Session2 remains scoped to DDL, DML and DQL only.
- Official Ministry QBank and Ranking V2 remain independent from the course-production SQL bank.


## V0.14.1 — SQL Learn Readability & Study UX Fix

Reworked the student-facing SQL study presentation across all 8 integrated SQL sessions.

- 34 SQL study sections use a dedicated readable mixed-language renderer.
- Arabic explanation blocks are RTL and right-aligned.
- English SQL terminology is direction-isolated to prevent bidi reordering.
- Production/admin phrases such as `SQL production map`, `core topic`, and `Assessment scope` are no longer shown as lesson prose.
- Key Terms are displayed separately as LTR chips.
- Important points are displayed as individual RTL study cards instead of long mixed-direction bullet paragraphs.
- Source Trace is preserved in a dedicated LTR block.
- Existing source-grounded study content, validated explanations, questions, answers and traceability were not changed.


## V0.14.2 — Module Selection Flow Fix

Improved the Learn module/session selection UX.

- The selected session now has a clear visual selected state.
- A confirmation strip shows the selected session directly above the learning path.
- Clicking any session now scrolls to `Study → Practice → Exam`, instead of scrolling back to the module panel.
- The learning path receives a short visual focus animation after selection.
- The default first module is selected without forcing an unwanted scroll when the track first opens.
- Smooth scrolling respects `prefers-reduced-motion`.
- SQL V0.14.1 readability improvements remain unchanged.


## V0.15.0 — Complete Python Curriculum Integration

Integrated the finalized Python Production V1.0 into `Learn → Data Analysis → Python for Data Analysis`.

### Curriculum
- 13 professionally named sessions based on actual content, not uploaded filenames.
- 75 detailed Study Sections.
- 47 structured Python code walkthroughs.
- Dedicated Python Code Learning renderer:
  - Arabic concept explanation
  - LTR selectable code with line numbers and Copy Code
  - Line-by-Line explanation
  - Execution Trace
  - Expected Output
  - Why It Works
  - Common Mistakes
  - Exam / Tracing Tips
  - Source Trace
- Platform clarification and presentation-correction examples are visibly labeled.

### Assessment
- 13 active Python Question Banks.
- 520 total production questions.
- 13 Session Practice exams × 40 questions.
- Dynamic Full Python Track Exam: 50 questions.
- Python share in the Data Analysis Final: 20 questions using a validated signature profile.
- 70 assessment topics are mapped directly from the actual question-bank taxonomy and configured for Final coverage.

### Runtime status
- Python curriculum readiness: `final-ready`.
- SQL remains `final-ready`.
- Data Analysis Final is still intentionally unavailable because Excel, Power BI, Tableau and Looker Studio production curricula are not complete yet (2/6 required tracks ready).
- Junior/Professional Official QBank and Ranking V2 remain independent and unchanged.


## V0.15.1 — Resume & Study Progress System

### Exam Resume
- Every in-progress attempt autosaves answers, current question, feedback mode and time state.
- Dashboard `Continue Where You Left Off` now uses **Resume Exam**.
- Exams Library displays an in-progress Resume banner and changes the matching exam card to **Resume Exam**.
- Ranking Center shows an in-progress ranked-attempt banner separately from the leaderboard.
- Incomplete attempts never enter Ranking; only `finishExam()` saves/syncs a result.

### Smart Time Policy
- Practice / Instant Feedback: remaining countdown and elapsed attempt time pause while the user is away.
- Ranked Exam Mode: ranked elapsed time continues while away; if a countdown exists, it also continues.
- A ranked timer that expires while away auto-submits the saved answers when the user resumes.
- Tab visibility changes and browser unloads autosave progress.
- Starting another exam warns before replacing a different unfinished attempt.

### Study Progress
- Study progress is stored separately per local student name and per module.
- Every Study section has `Mark Section Complete`.
- Study page shows completed topics and a percentage progress bar.
- The Learning Path Study card shows the saved completion percentage.
- Practice and Exam cards show the best result for Instant Feedback and Exam Mode separately.
- `Mark Study as Completed` completes all sections.
- `Reset Study Progress` resets only the current session's Study state; Practice scores, Exam results and Rankings are preserved.
- `Resume last topic` appears when a last Study topic has been saved.

### Regression
SQL 520, Python 520, Junior Official 930, Professional Official 1189 and Ranking V2 remain intact.


## V0.15.2 — Exam Navigator & Smart Study Navigation

### Exam Navigator
- Instant Feedback:
  - Current question keeps the primary-blue focus border.
  - Correct answered questions become green.
  - Wrong answered questions become red.
  - Unanswered questions remain neutral.
- Exam Mode preserves answer privacy:
  - answered questions use a neutral answered state;
  - correct/wrong colors are not shown while solving.
- Added `Mark for Review`.
- Marked questions show a gold star in the navigator.
- Marked-question state is saved with the V0.15.1 Resume payload and restored after leaving/reloading.
- Navigator count now includes answered + marked counts.

### Smart Study Navigator
- `ON THIS PAGE` is now a live navigator rather than a static list.
- Uses `IntersectionObserver` to follow the Study section currently being read.
- Active item shows `YOU ARE HERE`.
- Completed items continue to show `✓ Completed`.
- Displays current reading position as `Section X of Y` and percentage.
- Active TOC item auto-scrolls inside the sticky navigator when needed.
- Each Study section now has `Previous Topic` / `Next Topic` controls.
- The current section is saved as the last Study location for Resume.

### Python readability
- Reworked the Python `LINE-BY-LINE` layout with explicit LTR line-number isolation and RTL explanation text.
- English/Python terms remain isolated inside Arabic explanations to reduce bidi reordering.

### Regression
Resume V0.15.1, Ranking V2, SQL 520, Python 520, Junior Official 930 and Professional Official 1189 remain intact.


## V0.15.3 — Track Cards Layout Fix

Reworked the Data Analysis track-selection cards to remove text/footer overlap.

- Track cards now use a real vertical flex layout instead of an absolutely positioned footer.
- Card body grows naturally with the description.
- Footer stays in normal document flow and is visually separated by a divider.
- SQL and Python use concise chooser-level summaries while full curriculum descriptions remain unchanged in the underlying learning data.
- Production-ready tracks show a `Final Ready` chip.
- SQL footer: `8 Sessions • 520 Questions`.
- Python footer: `13 Sessions • 520 Questions`.
- Incomplete tracks show `Coming Soon`.
- Cards keep equal grid height on desktop while remaining free to grow when content requires it.
- Mobile cards use natural height.


## V0.16.0 — Python Study Content V2

Python Study was rebuilt from a revision-oriented summary into a deeper teaching experience while preserving the existing assessment system.

### Learning depth
Every one of the 75 Python Study Sections now includes:
- What Is It?
- Why Do We Need It?
- Mental Model
- Step-by-Step concept walkthrough
- Comparison table when the concept benefits from contrast
- Before → Operation → After visualization for important NumPy/Pandas transformations
- Code Lab
- Try Changing This
- Source-grounded Quick Check
- Source Trace

### Code coverage
- Previous code walkthroughs: 47
- V2 code walkthroughs: 77
- Every Study Section now has at least one code/example walkthrough.
- Newly created explanatory examples are labeled `PLATFORM CLARIFICATION`.
- Source-based/rendered examples keep their existing source labels.

### Quick Checks
- 75/75 sections have an interactive Quick Check.
- 75 unique Quick Check questions.
- Correct/wrong feedback appears inside Study after the learner answers.
- Quick Checks are sourced from the existing session-scoped production banks and do not change exam scoring.

### Reading model
Python code walkthrough detail cards are now presented vertically rather than as a dense two-column dashboard:
`Code → Explanation → Line-by-Line → Execution Trace → Expected Output → Why It Works → Mistakes → Exam Tips`

### Data-analysis specific teaching
NumPy and Pandas lessons use Before/Operation/After panels to show how data changes.

Visualization lessons emphasize:
`Question → Variables → Chart Choice → Read the Visual → Insight`

### Assessment protection
Study V2 changes no assessment content:
- Python 13 Question Banks / 520 questions are byte-identical to V0.15.3.
- 13 Python Session Practice exam files are byte-identical to V0.15.3.
- Exam blueprints, question-bank registry, exam registry and Official QBank data are unchanged.


## V0.16.1 — Critical Startup Hotfix

V0.16.0 contained a JavaScript ES-module syntax error in the new Python Study V2 Quick Check event binding.

### Root cause
The outer `forEach` that attaches Quick Check behavior was closed with an extra parenthesis:

`  }));`

instead of:

`  });`

This occurred in `assets/js/app.js` around the Python Quick Check listener and prevented the browser from importing `app.js`, so the whole platform could appear stopped.

### Why the previous QA missed it
The release QA used `node --check <file.js>`. In this environment that did not validate `app.js` using the same ES-module parsing mode used by the browser.

V0.16.1 changes the release validation policy:
- every JavaScript file is checked using true ES-module parsing:
  `node --input-type=module --check`
- the complete application module is imported in a startup runtime simulation;
- all 75 Python Study V2 sections are rendered through the actual Python Study renderer.

### Verified
- Application module startup simulation: PASS
- Python Study V2 renderer: 75/75 sections PASS
- True ES-module syntax: 11/11 JS files PASS
- Study V2 content remains 13 sessions / 75 sections / 77 walkthroughs / 75 Quick Checks
- Python assessment content remains unchanged
- SQL / Python / Official QBank baselines remain unchanged


## V0.16.2 — Pre-Deploy Safety & Staging Toolkit

Added a deployment safety workflow so new builds are not uploaded directly to LIVE.

### One-click local testing
- `RUN-PREFLIGHT.bat` — automated checks only.
- `TEST-LOCAL.bat` — runs Preflight, starts the built-in Node local HTTP server on port 8000, then opens the platform in the browser. No Python dependency is required.

### Automated Preflight
`tools/pre-deploy-check.mjs` validates:
- version/cache consistency;
- all JSON files;
- true ES-module JavaScript syntax;
- direct DOM references;
- SQL and Python production-bank counts;
- Official QBank baselines;
- Session Practice JSON;
- dynamic SQL/Python exam generation;
- Python Study V2 integrity;
- staging/test banner presence.

### Release safety
- `PRE-DEPLOY-CHECKLIST.md`
- `RELEASE-WORKFLOW.md`
- `VERSION.txt`

### Test environment banner
Localhost and repositories/paths containing `test` or `staging` automatically display:

`DIGILIANS TEST MODE — not the live production site`

The banner is initialized directly from `index.html`, so it does not depend on the main application module loading successfully.


## V0.16.3 — Local-Only Pre-Deploy Workflow

Deployment flow simplified to:

`Automated QA → Local Browser Test → GitHub LIVE`

No GitHub staging/test repository is required.

### Safety controls
- `RUN-PREFLIGHT.bat`
- `TEST-LOCAL.bat`
- `PRE-DEPLOY-CHECKLIST.md`
- `RELEASE-WORKFLOW.md`
- `VERSION.txt`

The environment banner now appears only on localhost/local file context.

After Local Test passes, the exact same build is uploaded directly to GitHub LIVE, followed by a short production smoke test.

Rollback policy remains mandatory: keep the previous stable ZIP before every deployment.


## V0.17.0 — Visual Learning & Study UX Fixes

### Systemic RTL/LTR + HTML entity fix
- Added a dedicated `study-format.js` presentation module.
- Fixes double-escaped entity behavior that could render `&` as `;amp&`.
- Pure English/code expressions are isolated as one LTR unit.
- Expressions such as `Function = Input → Process → Output` preserve their visual order inside Arabic Study content.
- The actual formatter is now directly regression-tested by the Pre-Deploy checker.

### Visual learning for Python Sessions 11–13
- 16 Visualization Study sections now include generated inline SVG visual examples.
- No external images are required.
- Supported visual families include:
  - Line
  - Bar
  - Scatter
  - Histogram
  - Box Plot
  - Subplots
  - Waffle
  - Word Cloud
  - Regression
  - Map Markers
  - Choropleth
- Chart cards use `Predict → Show Chart`.
- `Show Anatomy` exposes chart components/interpretation labels.

### Chart Decision Lab
A new interactive decision helper starts from the analytical question:
- Trend over time → Line
- Compare categories → Bar
- Relationship between two numeric variables → Scatter
- Numerical distribution → Histogram
- Spread / potential outliers → Box Plot
- Metric by region → Choropleth

### Pandas / NumPy visual transformations
`Before → Operation → After` now renders pipe-based DataFrame snapshots as actual mini tables when possible instead of plain text blocks.

### Adaptive Study depth
The 75 Python Study sections no longer force the exact same explanation density:
- Compact
- Standard
- Deep

Repeated generic `Why` and `Step-by-Step` copy was replaced with concept-family-specific guidance.

### Cleaner Code Lab
Default reading order is now:
`Code → Explanation → Execution Trace → Expected Output`

Secondary material is collapsed:
- Deep Dive: Line-by-Line & Why It Works
- Review: Common Mistakes & Exam Tips

### QA upgrades
- Pure Python Study renderer extracted to `python-study-render.js`.
- Runtime renderer executed on 75/75 Python Study sections during Pre-Deploy.
- 16/16 chart lessons render inline SVG.
- Bidi/entity formatter regression is part of Pre-Deploy.


## V0.17.1 — Study Polish & Reliability

### Mixed Arabic + English polish
- Handles Arabic article prefixes attached to English technical terms.
- Example: `الـ Expected Output` remains visually ordered inside RTL text.
- Regression coverage now includes `الـExpected Output` and `الـfor loop`.

### Quick Check improvements
- Quick Check state is saved locally per student → module → section.
- Refreshing or returning to the topic restores the selected answer and explanation.
- Added `Reset Quick Check`.
- Feedback now explicitly shows:
  - `YOUR ANSWER`
  - `CORRECT ANSWER`
- The `for ch in "Python"` checkpoint includes a concrete execution trace:
  `P → y → t → h → o → n`.

### Study readability
- Arabic helper labels were enlarged.
- Quick Check and Source Trace micro-copy was made easier to read.

### Startup / crash recovery
- Added an application-independent Recovery Screen.
- If the main JavaScript module fails before startup, the learner gets recovery controls instead of a blank page.
- Recovery actions:
  - Reload Platform
  - Clear App Cache & Reload
- Local Study progress, completed results and ranking history are not cleared by these actions.

### Pre-Deploy additions
- Quick Check save/restore/reset regression.
- Startup recovery guard validation.
- New Arabic-prefix + English-term formatter cases.


## V0.17.2 — Universal Code Readability System

This release adds one shared technical-content renderer across learner-facing question surfaces.

### Covered languages
- Python
- SQL
- DAX
- Excel formulas
- Power Query M
- Generic code fallback

### Question presentation
Technical questions are now split visually into:
`Context → Code / Formula / Query → Actual Question`

The source question text is not edited in the JSON.

For multi-line code:
- dedicated code block
- language badge
- monospace font
- syntax highlighting
- line numbers
- preserved indentation
- LTR isolation
- mobile-safe horizontal scrolling

For code/formula answer options:
- monospace presentation
- syntax highlighting
- full multi-line query blocks when needed

### Universal surfaces
The renderer is used in:
- Official QBank Study
- Practice / Instant Feedback
- Exam Mode
- Exam Review
- Python Study Quick Checks

### Technical feedback
Instant Feedback and Review now display:
- learner answer
- correct answer
- code-aware formatting
- inline technical expressions inside explanations

### SQL
Multi-line SQL answer options render as real query blocks rather than wrapped paragraph text.

### DAX
Measure/formula options render as DAX with function/reference highlighting.

### Excel
Formula options such as `=COUNTIFS(...)` render as formulas instead of normal prose.

### Power Query M
M expressions are isolated from prose and rendered as code.

### Safety / source integrity
No educational JSON or Official QBank text was rewritten for V0.17.2.
The new behavior is a presentation layer only.

### QA
The shipped Pre-Deploy checker now executes the universal renderer across all discovered question objects and includes explicit regressions for:
- Official Python Q0016
- Official SQL Q0001
- Official DAX Q0179
- Official Excel Q0024
- Official Power Query M Q0064


## V0.17.3 — Code Parser Hardening & Technical QA

This release hardens the V0.17.2 Universal Code Readability layer against real Official QBank cases found during local review.

### Fixed parser fragmentation
Python technical questions now use a state-based line parser rather than independent line-only decisions.

Programs such as:

`assignment → for → if → assignment → break`

remain one code block.

Supported block ingredients now include:
- normal assignment
- augmented assignment
- tuple/destructuring assignment
- `for / while / if / elif / else`
- `try / except / finally`
- `break / continue / pass`
- `return / raise / assert`
- function/class definitions
- method calls
- Pandas / NumPy expressions
- list/dict literal continuation
- lambda expressions

### Screenshot regressions fixed
Explicit QA now covers:
- `official-python-q0012` — employee list + lambda options
- `official-python-q0030` — Pandas `fillna(median())` code options
- `official-python-q0058` — `first_odd` loop
- `official-professional-python-q0055` — full `if / else` total loop

### Code-only options
If the question is normal prose but multiple answers are code, the UI now adds the appropriate orientation:
- Python → `CHOOSE THE CORRECT CODE`
- SQL / Power Query M → `CHOOSE THE CORRECT QUERY`
- DAX / Excel → `CHOOSE THE CORRECT FORMULA`

### Display-only Unicode Bidi cleanup
Invisible directional controls are removed only while rendering.

The stored Official QBank string remains unchanged.

Visible source punctuation is preserved. For example, an English official question containing an Arabic `؟` remains visually `؟` until the original source itself is reviewed.

### Non-destructive topic classification
Python questions stored as `Other`/`General` get a better display classification without editing JSON.

Current audited display classifications:
- list slicing/indexing → `Lists & Indexing`
- list filtering/comprehension → `Lists & Comprehensions`
- comparisons → `Operators & Expressions`
- loop/break tracing → `Control Flow & Loops`

The UI exposes the stored topic in the badge tooltip when a display classification is inferred.

### Parser corpus QA
Current Python parser audit:
- 755 Python questions inspected
- 0 fragmented multi-block Python programs

Universal technical renderer QA remains active across the full current JSON payload set.


## V0.18.0 — SQL Study V2 & Learner/Admin Information Architecture

### SQL Study V2
All 34 SQL Study sections now use a teaching-oriented structure:

`What Is It? → Why It Matters → Visual Model / Query → Key Terms → Key Takeaways → Quick Check → Source Trace`

The new Study layer covers all 8 SQL sessions.

### Visual learning
34/34 SQL Study sections include a visual clarification.

Examples include:
- DDL / DML / DQL command families
- ER entities and relationships
- M:N relational mapping
- normalization before/after
- Star Schema
- constraints and rejected data
- SELECT before/result tables
- WHERE filtering
- GROUP BY aggregation
- INNER JOIN matching
- nested subqueries
- UNION
- Window Functions
- CTE flow
- Pivot row-to-column transformation
- TRY/CATCH flow
- Views
- Stored Procedures

Illustrative values created by the platform are explicitly labeled:

`PLATFORM VISUAL CLARIFICATION — based on the course concept`

They are not presented as source screenshots or official course examples.

### SQL Quick Checks
Each SQL Study section now contains one course-derived Quick Check.

Current result:
- 34 Study sections
- 34 Quick Checks
- 34 unique source question IDs

Quick Check state uses the existing local save system.

### Learner-facing Course Map
Selecting SQL now shows a clean Course Map:
- Sessions
- Topics
- Practice Questions
- Final-ready status
- learner-friendly `What You'll Learn` topic groups

### Curriculum / coverage diagnostics
`SYLLABUS MAP & COVERAGE` and detailed curriculum readiness were not deleted.

They are now inside a collapsed:

`Platform Diagnostics`

section labeled as an internal QA view.

This keeps exam-production information available while removing it from the normal learner flow.

### Final Exam card
The learner-facing Final Exam card no longer exposes:
- Hard pool
- External pool
- quota shortages
- pool-building implementation details

It now shows only:
- question count
- time
- required tracks ready
- available / coming soon status

Technical diagnostics remain available in Platform Diagnostics.

### Source protection
Assessment payloads were not edited for this release.

Only `data/learning.json` is intentionally changed to add SQL Study V2 teaching metadata.


## V0.18.1 — Technical Feedback CSS Hotfix

### Problem
Multi-line technical answers rendered correctly as code, but a broad feedback selector:

`.technical-feedback-answer span`

also targeted the syntax-highlighting `<span>` tokens inside SQL/Python/DAX/Excel/Power Query code.

That caused tokens such as `SELECT`, `CustomerID`, `SUM`, `FROM`, `GROUP BY`, and `HAVING` to become block elements and appear almost one word per visual line.

A similar historical Official QBank selector used:

`.official-option span:last-child`

which could also target nested syntax tokens.

### Fix
Feedback label styling is now scoped only to the direct label:

`.technical-feedback-answer > div > span`

Official option typography now targets the explicit wrapper:

`.official-option > .option-content`

Additional defensive rules preserve:
- `.technical-code-line` as flex
- `.technical-code-source` as preformatted block
- syntax token spans as inline content

### Exact regression
The reported SQL case is now a shipped regression:

`official-sql-q0001`

Correct answer B must render as one SQL block with exactly 4 source lines:

- SELECT CustomerID, SUM(Amount)
- FROM Orders
- GROUP BY CustomerID
- HAVING SUM(Amount) > 50000;

### Browser component QA
The exact SQL answer was rendered in Chromium with the real production CSS.

Verified:
- 4 visual lines per answer card
- syntax keyword tokens remain inline
- code source keeps `white-space: pre`
- code block height remains compact
- no page-level horizontal overflow


## V0.18.2 — Live Update & What’s New System

### Update detection
From V0.18.2 onward, an already-open platform tab checks `VERSION.txt` every 5 minutes.

The request uses:
- timestamp query cache busting
- `cache: no-store`
- no-cache request headers

If GitHub LIVE contains a newer semantic version, the open tab displays:

`New Update Available — Vx.x.x`

No automatic reload is performed.

### Safe exam behavior
The application publishes whether `examView` is active.

If a newer release is detected during an exam:
- Update Now is disabled
- the learner is told to finish the exam first
- the active attempt is never force-reloaded
- after submission/result, Update Now becomes available immediately

This applies to ranked and non-ranked attempts.

### Update Now
Update Now:
1. deletes Cache API entries when available
2. does not clear or remove localStorage
3. navigates to the same GitHub Pages path with a unique cache-busting query
4. the new index then loads versioned CSS/JS assets

Saved Study progress, Quick Checks, results, profile name and local exam data are not deliberately cleared by the update manager.

### What’s New
The current release notes appear once per installed version.

Seen version key:

`digilians.whatsNew.seenVersion`

The learner can reopen release notes from:
- Profile → What’s New & Updates
- Footer → version / What’s New

When a newer version is already detected, these entry points show the upcoming/latest release.

### Changelog
Release notes live in:

`data/changelog.json`

It currently contains the latest release plus recent history.

### Future release rule
Every future live release must update all of:
- `VERSION.txt`
- `data/changelog.json`
- `data-build-version` in `index.html`
- CSS/app/update-manager cache query versions in `index.html`

The shipped Pre-Deploy checker validates this contract.

### Important migration note
Tabs that were opened before V0.18.2 do not contain the update manager yet.

Those users need one manual refresh after V0.18.2 is deployed.

After that first refresh, later releases can be detected automatically while their tab remains open.
