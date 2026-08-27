# Digilians E-Learn Platform V0.3

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
