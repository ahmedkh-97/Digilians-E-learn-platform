# Digilians E-Learn Platform V0.5

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
