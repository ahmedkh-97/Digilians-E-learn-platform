# My Mistakes V1 — QA Report

## Release

**V0.20.0 — My Mistakes V1**

Date: 2026-08-30

## Automated engine QA

PASS:

- wrong answer creates `Needs Review`
- first correct recovery creates `Improving`
- second consecutive correct recovery creates `Mastered`
- a new wrong answer resets Mastered to `Needs Review`
- wrong-count history is preserved
- last wrong choice is preserved independently from later correct recoveries
- practice-question snapshot reconstructs question/options/correct answer
- Weak Topics aggregation ranks unresolved topics
- non-Official sources normalize into the Course Practice/Exam family

## Platform wiring QA

PASS:

- Desktop `My Mistakes` navigation
- Mobile `Mistakes` navigation
- Profile quick access
- My Mistakes route/view
- summary state cards
- source / track / topic / status filters
- Weak Topics
- Retry Question
- filtered Practice My Mistakes
- Official mistake migration
- normal Practice/Exam result tracking
- correct-recovery tracking on later attempts
- Official Study wrong-answer tracking
- Official Mistakes filter hides Mastered questions
- saved mistake practice can be resumed

## Ranking isolation QA

PASS:

`finishMistakesPractice()` contains no:

- `saveResult()`
- `queuePendingAttempt()`
- `submitAttemptOnline()`

My Mistakes practice never enters Ranking.

## Backup / Restore QA

PASS:

- `digilians.mistakes` is an allowed backup key
- JSON validation includes the mistakes store
- Merge Restore is mistake-key aware
- Backup preview includes My Mistakes count
- restore summary includes saved mistake count
- Admin/Analytics sensitive keys remain excluded

## Existing Official QBank migration

Existing Official mistake IDs are imported automatically when My Mistakes is opened.

To avoid unnecessary repeated file loading, tracks whose Official mistakes already exist in the universal notebook are skipped on later page visits in the same/current saved state.

No Official question text, option, answer or source JSON is modified.

## Legacy general-results limitation

This is intentional and disclosed in the UI:

Old non-Official result records created before V0.20.0 do not contain the exact question-level answer history, so those old wrong questions cannot be recreated safely without guessing.

V0.20.0 starts exact question-level tracking for new Practice/Exam attempts.

## Visual QA

Production CSS component render:

Desktop 1440px:

- 4 summary cards in one row
- Weak Topics row
- five-filter toolbar
- mistake question cards
- answer comparison
- explanation area
- Retry action
- horizontal page overflow = **0**

Mobile 390px:

- 6-item bottom navigation fits one row
- summary cards collapse to one column
- toolbar collapses responsively
- answer comparison collapses to one column
- page-level horizontal overflow = **0**

Result: **PASS**

## Automated Pre-Deploy

`tools/pre-deploy-check.mjs`

Result: **PASSED**

Includes explicit My Mistakes regression tests for:

- mastery state machine
- UI/wiring
- Official migration
- Ranking isolation
- Backup/Restore
- local-only privacy guard

## Local server smoke

Node local HTTP server starts and serves the build correctly.

Full Chromium localhost click-through cannot be claimed in this execution environment because browser navigation to `127.0.0.1` is blocked with:

`ERR_BLOCKED_BY_ADMINISTRATOR`

Run `TEST-LOCAL.bat` on the learner/admin machine before GitHub LIVE.

## Manual acceptance path

1. Open My Mistakes.
2. Confirm existing Official QBank mistakes appear.
3. Open a Needs Review item.
4. Retry it and answer correctly.
5. Finish Practice.
6. Confirm status becomes Improving.
7. Retry and answer correctly again.
8. Confirm status becomes Mastered.
9. Open the matching Official track and choose the Mistakes filter.
10. Confirm the Mastered question no longer appears.
11. Get the same question wrong in a later official attempt.
12. Confirm it returns to Needs Review.
13. Export Progress Backup and verify My Mistakes is counted.
14. Restore with Merge and confirm mistake history remains.
