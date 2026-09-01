# Digilians E-Learn Platform V0.20.23

A local-first learning and assessment platform for the Digilians Data Analysis track.

## Current release

**V0.20.23 — Official Final Feedback Mode Choice**

This release lets learners choose **Instant Feedback** or **Exam Mode** before starting the ranked Official Junior or Professional Final simulation. The selected mode is preserved when an unfinished attempt is resumed.

Release history is maintained in `data/changelog.json`. Release QA evidence is stored under `docs/releases/`.

## Run locally

The package includes a self-contained local QA workflow. Node.js is required.

- `START-LOCAL.bat` — runs the Quick Check first, then starts localhost only if the check passes.
- `QUICK-CHECK.bat` — fast integrity/syntax/targeted-test gate.
- `FULL-QA.bat` — full pre-deploy regression gate.
- `TEST-LOCAL.bat` — full QA first, then starts localhost for manual browser acceptance.
- `RUN-PREFLIGHT.bat` — direct pre-deploy gate.

See `LOCAL-TESTING.md` for the local workflow.

## Production status

| Track | Status |
| --- | --- |
| Excel | Final Ready |
| SQL | Final Ready |
| Python | Final Ready |
| Power BI | Next production track |
| Tableau | Pending |
| Looker Studio | Pending |
| Data Analysis Final | Locked until all six tracks are ready |

The planned Data Analysis Final remains 100 questions / 2 hours: Excel 20, Power BI 20, SQL 20, Python 20, Tableau 10, Looker Studio 10.

## Learning and assessment model

Each production track follows the same boundary:

`Source Intake → Study → Practice → Independent Full Track Exam → Results / My Mistakes / Ranking → Final eligibility`

Key rules:

- Educational content must remain source-grounded.
- Study comes before assessment production.
- Course Practice and Full Track Exam banks stay independent.
- Official QBank remains separate from course Practice and course Exam content.
- Learner progress, resume state, timer fairness, MARK, results, My Mistakes, and Ranking must be preserved across content-production releases.
- Data Analysis Final stays gated until all required tracks are production-ready.

The reference production standard is `docs/production/TRACK-PRODUCTION-REFERENCE-STANDARD-V1.md` and the readiness checklist is `docs/production/TRACK-PRODUCTION-READINESS-CHECKLIST-V1.md`.

## Current platform systems

The frozen core includes:

- Responsive Home / Learn / Official QBank / Exams / My Mistakes / Ranking navigation.
- Local learner identity and avatar profile.
- Study and Quick Check persistence.
- Exam resume and timer fairness.
- Question Navigator, track-grouped navigation, and Mark for Review.
- Universal technical renderer for SQL, Python, DAX, Excel formulas, and Power Query M.
- Official Junior / Professional QBank flows.
- My Mistakes recovery workflow.
- Ranking V2 and optional shared leaderboard sync.
- Live Update / What's New.
- Private analytics and platform-health/error monitoring.
- Learner Backup / Restore.
- Local Quick Check and Full Pre-Deploy workflow.

Core behavior should not be redesigned during curriculum production unless a reproducible blocker, integrity risk, security/privacy issue, or genuinely reusable missing capability requires it.

## Repository/package structure

- `index.html` — application shell.
- `assets/css/` — platform styling.
- `assets/js/` — runtime, study renderers, assessment logic, storage, analytics, update manager, and QA-support modules.
- `assets/avatars/` — local avatar assets.
- `data/` — curriculum, learning, registry, changelog, and platform data.
- `official-qbank/` — Official QBank payloads.
- `question-banks/` — course Practice banks.
- `exams/` — course and full-track exam payloads.
- `tests/` — Node regression suite.
- `tools/` — local quick check, pre-deploy, localhost server, and intake tooling.
- `docs/production/` — cross-track production standards and readiness evidence.
- `docs/excel-production/`, `docs/sql-production/`, `docs/python-production/` — retained source/production evidence.
- `docs/releases/` — release QA reports.
- `supabase/` — optional analytics/ranking SQL setup and Markdown guides.

## Workspace cleanliness policy

Production ZIPs intentionally do not ship:

- HTML documentation mirrors when an equivalent Markdown source exists.
- Temporary `docs/superpowers/` planning/spec workspaces.
- Stale root intake markers that no longer describe the current platform state.
- Version-by-version release history inside this README.

`tests/workspace-cleanliness.test.mjs` protects these rules from regression.

## Protected data policy

Workspace-cleanup releases must not rewrite assessment or curriculum payloads. In particular, cleanup work must leave these areas unchanged unless the release is explicitly a content/data release:

- `official-qbank/`
- `question-banks/`
- `exams/`
- `data/` except intentional release metadata such as `data/changelog.json`
- learner storage schema and runtime behavior
- ranking/scoring rules

## Release workflow

For each local release:

1. Make the bounded change on the latest accepted local baseline.
2. Run targeted tests.
3. Run `QUICK-CHECK.bat` / `tools/quick-local-check.mjs`.
4. Run `FULL-QA.bat` / `tools/pre-deploy-check.mjs`.
5. Build a fresh ZIP.
6. Extract that ZIP into a clean directory.
7. Re-run Quick Check and Full QA from the extracted package.
8. Run localhost HTTP smoke and manual browser acceptance where relevant.
9. Generate a SHA-256 sidecar.
10. Treat deployment as a separate explicit step.

## Branding

Prepared by Ahmed Khaled  
LinkedIn: `www.linkedin.com/in/ahmed-khalid97`
