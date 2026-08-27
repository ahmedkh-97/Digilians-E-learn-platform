# Digilians E-Learn Platform V0.7

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
