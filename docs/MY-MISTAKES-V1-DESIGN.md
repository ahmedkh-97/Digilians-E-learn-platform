# My Mistakes V1 — Product Design

## Purpose

`My Mistakes` turns wrong answers into a recovery loop instead of leaving them inside isolated exam results.

The system is local-first and learner-specific on the current browser/player profile.

## Unified sources

V1 combines:

- Official Ministry QBank wrong answers
- Course Practice wrong answers
- Course Exam wrong answers
- Future Excel Practice/Exam questions automatically once those banks are built

Existing Official QBank mistake IDs are imported automatically into the universal notebook.

Older non-Official exam results created before V0.20.0 cannot be reconstructed question-by-question because the old result schema stored aggregate scores/topic breakdowns, not the exact wrong questions. From V0.20.0 onward, exact question snapshots are saved locally when an answered question is wrong.

## Mastery state machine

A unique question moves through:

`Needs Review → Improving → Mastered`

Rules:

- Wrong answer → `Needs Review`
- First correct recovery after the latest wrong → `Improving`
- Second consecutive correct recovery → `Mastered`
- Any new wrong answer resets the question to `Needs Review`

Mastery threshold: **2 consecutive correct recoveries** after the latest wrong answer.

The historical wrong count is preserved even after Mastery.

## My Mistakes page

The page includes:

- Active Mistakes
- Needs Review
- Improving
- Mastered
- Weak Topics
- Search
- Source filter
- Track filter
- Topic filter
- Mastery-state filter
- Wrong-attempt count
- Last wrong answer
- Correct answer
- Explanation
- Retry Question
- Practice My Mistakes

## Weak Topics

Weak Topics ranks unresolved topics using:

1. number of `Needs Review` questions
2. repeated wrong attempts
3. number of unresolved questions

This is intentionally a learner-priority signal, not a ranked score.

## Practice My Mistakes

Learners can practice:

- one question via `Retry Question`
- the current filtered mistake set using 10 / 20 / 30 / All

Practice uses the existing interactive question UI and Instant Feedback.

### Ranking isolation

My Mistakes Practice:

- does **not** call `saveResult()`
- does **not** create Pending Attempts
- does **not** submit to Supabase
- does **not** appear in Ranking
- does **not** change leaderboard scoring

It only updates local mistake mastery states.

## Official QBank integration

The legacy Official QBank mistake list remains as a source history for safe migration.

The Official `Mistakes` filter is now mastery-aware:

- unresolved universal mistakes remain visible
- a question hidden as `Mastered` in My Mistakes is also hidden from the Official Mistakes filter
- if the learner gets that question wrong again, it returns to Needs Review and appears again

Official source text/options/answers are never modified.

## Storage

New local key:

`digilians.mistakes`

Schema:

- schemaVersion
- owners keyed by player ID
- question snapshot
- source/context metadata
- first/last wrong timestamps
- wrong count
- correct recovery count
- current recovery streak
- current mastery status

The question snapshot stores enough data to review/retry without depending on a past dynamic exam selection.

## Backup & Restore

`digilians.mistakes` is included in learner-controlled Backup/Restore.

Merge behavior is question-key aware and keeps the newer state while preserving the highest recorded historical counters.

Analytics/Admin identities remain excluded from learner backups.

## Privacy

`assets/js/mistakes.js` has no network calls.

Question text, selected answers and mistake history remain local and are not sent to Analytics or Supabase by the My Mistakes engine.

Only aggregate custom analytics events for starting/completing mistake practice are emitted; they contain counts, not question text or answers.
