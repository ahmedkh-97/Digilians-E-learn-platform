# Digilians E-Learn Platform V0.22.2

A local-first learning and assessment platform for the Digilians Data Analysis track.

## Current release

**V0.22.2 — PL-300 Study UX & Answer Lock**

This release keeps the complete **509/509** PL-300 Full Ranked Learning journey and makes it easier and safer to study in smaller batches.

- Submitted answers are now **locked for that attempt**; changing the UI after Check Answer cannot rewrite the graded response.
- **Retry Question** starts a new attempt while preserving the original First-Pass result.
- Source-backed Answer Area fields use **native dropdowns** when the original source provides verified choices; no distractors are invented.
- Reviewed/mapped explanations are **Arabic-first**, with the original English Source Explanation available in a collapsible reference panel.
- The 509 source occurrences are organized into **34 Domain → Section → Mini Part batches** (up to 20 questions each), while All 509 Questions remains available.
- **509 completion** and the existing **265 validated-concept mastery weighting** remain unchanged.
- Repository cleanup is organizational only: Windows launcher/QA scripts live under `tools/windows/`, and development workflow notes live under `docs/development/`.

Release history is maintained in `data/changelog.json`. Release QA evidence is stored under `docs/releases`, and PL-300 review evidence is stored under `docs/voucher-production`.

## Run locally

The package includes a self-contained local workflow. Ordinary Windows localhost start does not require Node.js; Full developer QA requires Node.js 20+.

- `tools/windows/START-LOCAL.bat` — Node-independent Windows launcher: runs the PowerShell basic safety check, then starts localhost on port 4173 or the next available port.
- `tools/windows/QUICK-CHECK.bat` — fast integrity/syntax/targeted-test gate.
- `tools/windows/FULL-QA.bat` — full pre-deploy regression gate.
- `tools/windows/TEST-LOCAL.bat` — full QA first, then starts localhost for manual browser acceptance.
- `tools/windows/RUN-PREFLIGHT.bat` — direct pre-deploy gate.

See `docs/development/LOCAL-TESTING.md` for the local workflow.

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

- Responsive Home / Learn / Official QBank / Exams / Voucher / My Mistakes / Ranking navigation.
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
- `voucher/` — Voucher registry, released exam configs, reviewed master banks, source manifests, visual assets, and per-track exam registries.
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
3. Run `tools/windows/QUICK-CHECK.bat` / `tools/quick-local-check.mjs`.
4. Run `tools/windows/FULL-QA.bat` / `tools/pre-deploy-check.mjs`.
5. Build a fresh ZIP.
6. Extract that ZIP into a clean directory.
7. Re-run Quick Check and Full QA from the extracted package.
8. Run localhost HTTP smoke and manual browser acceptance where relevant.
9. Generate a SHA-256 sidecar.
10. Treat deployment as a separate explicit step.

## Branding

Prepared by Ahmed Khaled  
LinkedIn: `www.linkedin.com/in/ahmed-khalid97`
