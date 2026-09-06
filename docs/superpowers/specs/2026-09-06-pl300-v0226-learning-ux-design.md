# PL-300 V0.22.6 Learning UX Design

Date: 2026-09-06
Branch: `feature/v0.22.6-pl300-learning-ux`
Base: `main@0085b11be07e5a06d1a54695a8cc58cb5db16734`

## 1. Goal

Turn the current PL-300 Full Ranked Bank flow into a clearer learning loop without changing the validated source bank, ranking rules, source fidelity, or existing persistence model.

V0.22.6 must improve comprehension and study flow in five areas:

1. interaction labels and progress semantics;
2. structured-answer presentation;
3. delayed retry for wrong answers;
4. end-of-part review and stronger part cards;
5. structured Arabic explanation presentation.

The release must also bump the runtime/cache identity from 0.22.5 to 0.22.6 so learners cannot remain on stale V0.22.5 assets or question-bank JSON after the source-backed native-choice repair.

## 2. Non-goals

- Do not alter the 509 source-occurrence count.
- Do not alter the 265 validated-concept baseline.
- Do not invent distractors, answer keys, explanations, or educational claims that are not supported by existing source data.
- Do not introduce partial credit.
- Do not redesign global navigation or unrelated tracks.
- Do not replace Ranking, My Mistakes, Answer Lock, Retry, Instant Feedback, Supabase ranking, or local persistence.
- Do not add startup imports that threaten the existing gzip budget unless the feature cannot be implemented within already-loaded PL-300 modules.

## 3. Interaction labels

The question header must describe the actual learner interaction rather than the internal source type.

Mapping:

- scored objective with one correct option -> `SINGLE CHOICE · RANKED`
- scored objective with N correct options -> `MULTI SELECT · SELECT N`
- native structured dropdown fields -> `DROPDOWNS · RANKED`
- native yes/no fields -> `YES / NO · RANKED`
- native ordered fields / drag-drop -> `ORDERING · RANKED`
- true source text-entry interaction -> `TEXT ENTRY · RANKED`
- source-backed uncertain/non-scored block -> `STUDY CHECKPOINT`

`TEXT` must never be shown for a rendered MCQ, dropdown, yes/no, or ordering interaction.

Any visible `NON-RANKED` label in the PL-300 ranked-learning study flow becomes `STUDY MODE`. Where needed, supporting microcopy explains that validated objective attempts still contribute to ranked mastery.

## 4. Progress semantics

The active question view must have one primary progress bar and two explicit text metrics:

- `Question X of Y` = current position inside the active part/filter.
- `Studied A of Y` = source occurrences in that active part/filter with a persisted first-pass record.

Do not show two visually competing progress bars for the same part.

Part headings must keep spacing between metadata, for example:

`Part 1 · 14 Questions` and `4 / 14 studied`

Never concatenate these strings without spacing.

## 5. Structured Answer Area

For native structured questions with preserved source visuals, the learner must clearly distinguish source evidence from the interactive controls.

### Desktop

Use a two-column content area when width allows:

- left: `Original source view · Reference only`
- right: `Answer Area`

The right panel contains the actual dropdowns, yes/no buttons, or ordering controls.

### Mobile

Stack source evidence first and interactive Answer Area second.

### Copy cleanup

Remove developer-facing text such as `NATIVE / AUTO-SCORED`.

Use:

- heading: `Answer Area`
- instruction for dropdown fields: `Complete each field using the source-backed options.`
- instruction for yes/no: `Choose Yes or No for every statement.`
- instruction for ordering: `Arrange the source-backed choices in the required order.`

The original image is always non-interactive reference material; the learner must never be expected to interact with controls visible inside the image.

## 6. Navigation before and after answering

Before the current question has a saved attempt, the forward action label is:

`Skip for now →`

After a saved attempt exists, the forward action label becomes:

`Next →`

Skipping must not create a correctness record and must remain distinguishable from an answered question. Existing unanswered semantics remain intact.

## 7. Smart delayed retry loop

### Purpose

Avoid immediate recognition-memory retries where the learner simply repeats an answer that is still visible in short-term memory.

### First wrong answer

When a scored objective/native question is answered incorrectly:

1. preserve the immutable first-pass result;
2. show the normal answer feedback and Arabic explanation;
3. mark the item as needing retry;
4. enqueue it for delayed retry after four different question transitions when possible;
5. show `Review & retry later` as the recommended next action;
6. keep `Retry now` available as a secondary action.

A delayed retry does not replace the first-pass record. It increments the existing attempt count and may set `everCorrect=true` once the learner solves it correctly.

### Near the end of a part

If fewer than four different questions remain, do not force an awkward loop. Carry the unresolved question into End-of-Part Review.

### Delayed retry outcome

- correct -> state becomes `Recovered` and `everCorrect=true`;
- wrong again -> keep it in the unresolved/weak list for End-of-Part Review.

### Persistence

The pending retry queue must be stored in the existing PL-300 local state with a versioned, backward-compatible shape. Old V0.22.5 state without a retry queue must load normally as an empty queue.

The queue must be scoped to the active part so a learner does not unexpectedly receive a question from another domain/section while studying a focused part.

## 8. End-of-Part Review

When all first-pass occurrences in the current part have been visited, show an interstitial summary before returning to the part catalog or continuing.

Metrics:

- `Studied` = persisted first-pass records / part total.
- `First-pass correct` = objective/native scored occurrences correct on first attempt.
- `Recovered` = initially wrong scored occurrences later solved correctly.
- `Need review` = attempted scored occurrences that still have not been solved correctly.
- checkpoints are counted under Studied but never represented as scored correct/wrong.

Primary actions:

- when unresolved items exist: `Review N weak questions`
- secondary: `Continue to next part`
- when none remain: `Continue to next part`

No automatic rank/score inflation is allowed from checkpoint completion.

## 9. Part card upgrades

Each mini-part card must show compact study state without becoming visually dense.

Required information:

- Part number and question count.
- `Studied A/B`.
- `First-pass accuracy P%` for scored attempts in the part; show `—` before any scored attempt.
- `Mistakes N` where N is currently unresolved scored questions.
- `Mastered M` using duplicate-safe validated concept clusters represented inside that part.

Button label:

- no progress -> `Start Part`
- partial progress -> `Continue Part`
- all first-pass visited and unresolved mistakes exist -> `Review Mistakes`
- all first-pass visited with no unresolved scored mistakes -> `Part Mastered ✓`

`Part Mastered` is a study-state label and must not override global 265-concept mastery calculations.

## 10. Resume behavior

When entering a partially studied part, resume at the first source occurrence without a first-pass record.

If every occurrence has a first-pass record but unresolved mistakes remain, enter the End-of-Part Review / mistake queue rather than restarting at question 1.

A matured delayed-retry item may interrupt normal forward navigation only after its retry delay is satisfied; it must not change the source ordering used for completion accounting.

## 11. Arabic explanation layout

The design must improve presentation without inventing new educational content.

Every scored question feedback block should render the following sections when supporting source-backed data exists:

1. `الإجابة الصحيحة` — from the stored correct answer/expected native fields.
2. `الشرح بالعربي` — existing Arabic explanation text.
3. `ليه الاختيارات التانية غلط؟` — only when explicit option-level/source-backed rationale exists; omit the section otherwise.
4. `Exam Tip` — only when a source-backed/stored tip exists; never synthesize one at runtime.

For existing questions that only contain one Arabic explanation paragraph, display that paragraph cleanly under `الشرح بالعربي`; do not fabricate missing subsections.

Original source explanation may remain available in a collapsed details block.

## 12. State and scoring invariants

The following fields/semantics remain protected:

- first-pass correctness never changes after first scored submission;
- `everCorrect` may become true on retry;
- `attemptCount` increments for new scored attempts;
- Ranking remains duplicate-safe at validated-concept level;
- checkpoint completion never creates fake correctness;
- My Mistakes continues to include unresolved wrong scored items;
- Answer Lock remains active after each saved attempt until a retry is explicitly started;
- no partial credit;
- no synthetic distractors.

## 13. V0.22.6 release identity

Bump all PL-300/runtime cache identities that currently use `0.22.5` to `0.22.6`, including the build version, dynamic JS imports, update-manager release identity, and any PL-300 CSS/JSON URLs that need explicit cache busting.

The release must contain a changelog entry describing:

- source-backed native-choice repair now shipped under a fresh release identity;
- clearer interaction labels/progress;
- Answer Area cleanup;
- delayed retry and part review learning loop.

## 14. Likely implementation surfaces

Keep the change isolated to existing PL-300 modules and styles. Likely files include:

- `assets/js/pl300-full-ranked-learning.js`
- `assets/js/voucher-source-practice-native.js`
- the existing PL-300 source-practice controller/wiring module that owns Next/Prev/Retry state
- `assets/css/source-practice-native.css`
- the existing PL-300 ranked-learning CSS surface
- `assets/js/app.js` only where integration/versioned imports require it
- `assets/js/update-manager.js`
- `VERSION.txt`
- `data/changelog.json`
- focused V0.22.6 tests

No unrelated core refactor is allowed.

## 15. Testing strategy

Use TDD for every behavior change.

Required focused regression coverage:

1. interaction badge mapping for single, multi-select, dropdown, yes/no, ordering, text-entry, checkpoint;
2. no accidental `TEXT` label for structured/MCQ questions;
3. one primary progress bar and correct `Question X of Y` / `Studied A of Y` semantics;
4. Q54 renders reference source evidence plus exactly two interactive dropdowns and no text fallback;
5. native developer terminology is absent from learner-facing markup;
6. `Skip for now` before save and `Next` after save;
7. first wrong attempt enqueues delayed retry without mutating first-pass correctness;
8. delayed retry matures only after the configured question-transition delay;
9. near-end wrong answers flow to End-of-Part Review;
10. recovered vs unresolved mistake classification;
11. retry queue persistence/backward compatibility;
12. part card metrics and action labels;
13. resume to first unstudied occurrence;
14. all-first-pass-with-mistakes resumes into review flow;
15. Arabic explanation sections never invent absent rationale/tips;
16. existing Single / Select 2 / Select 3 guards remain correct;
17. native dropdown/yes-no/ordering scoring remains correct;
18. Ranking/My Mistakes/Answer Lock/Retry regressions stay green;
19. exhaustive PL-300 509 audit remains green;
20. Full Node regression and pre-deploy gate remain green;
21. startup gzip budget remains within the current enforced threshold;
22. V0.22.6 cache/version identity is internally consistent.

## 16. Acceptance criteria

V0.22.6 is ready for PR only when:

- all 509 source occurrences remain reachable;
- all source-backed structured choice fields remain native and no repaired field falls back to free text;
- interaction labels match rendered controls;
- progress language is unambiguous;
- structured source images are clearly reference-only;
- wrong answers can be delayed and recovered without changing first-pass scoring;
- End-of-Part Review accurately separates first-pass correct, recovered, unresolved, and checkpoints;
- part cards guide the learner toward the correct next study action;
- Arabic explanation presentation uses only stored/source-backed educational content;
- V0.22.6 cache identity is complete;
- 509 audit, focused PL-300 gates, Full Regression, pre-deploy, and startup-budget gates all pass.

Merge remains a separate explicit user decision after the final PR head is green.