# Resume & Study Progress System — V0.15.1

## 1. In-progress Exam Resume

The platform now treats an unfinished attempt as a local in-progress state rather than a result.

Saved state includes:
- student name
- exam ID/title
- answers
- current question index
- total questions
- feedback mode
- remaining countdown time
- elapsed attempt time
- timer policy
- ranked/non-ranked activity flag
- last saved timestamp
- generated exam payload when required for stable dynamic/Official resume

Resume entry points:
- Home / Continue Where You Left Off
- Exams Library resume banner
- matching Exam card
- Ranking Center in-progress ranked banner

A matching saved exam is resumed instead of silently creating a fresh dynamic form.

## 2. Ranking Integrity

An unfinished attempt is **not** a leaderboard result.

`persistProgress()` only writes local in-progress state.

Ranking/result writes remain inside the completed submission path:
- `saveResult(record)`
- `queuePendingAttempt(onlineAttempt)`
- online sync after `finishExam()`

The Ranking Center can display a Resume banner, but the banner explicitly states that the attempt is not counted until submission.

## 3. Smart Time Policy

### Practice / Instant Feedback
Time pauses when the attempt is left:
- countdown remains unchanged while away
- elapsed attempt time excludes the away period

### Ranked Exam Mode
Ranking fairness takes priority:
- elapsed ranking time continues while away
- countdown continues while away when the exam has a timer
- on resume, time away is deducted from the saved remaining countdown
- if countdown reached zero while away, the saved answers auto-submit on resume

The same logic protects against background-tab timer throttling using the browser visibility event.

## 4. Study Progress

Study progress is isolated from exam results in its own local-storage key.

Storage scope:
`student name → module → completed sections / last section`

Features:
- per-section `Mark Section Complete`
- Study completion percentage
- Study progress bar
- TOC completed-state indicator
- Resume last topic
- Mark Study as Completed
- Reset Study Progress

Reset affects only the current Study module. It does not delete:
- Practice attempts
- Exam results
- Ranking data
- other modules' Study progress
- another local student's Study progress

## 5. Learning Path Status

For the selected module:
- Study shows saved percentage
- Practice shows best Instant Feedback score
- Exam shows best Exam Mode score

This creates the intended visible loop:
`Study → Practice → Exam`

## QA

- Storage isolation / save / dedup / reset test: PASS
- SQL and Python Question Banks validated: PASS
- SQL dynamic Track + Final share regression: PASS
- Python dynamic Track + Final share regression: PASS
- Incomplete attempt has no ranking-write call in persistence path: PASS
- All JSON files parse: PASS
- All JavaScript files pass `node --check`: PASS
- HTML IDs and direct JavaScript DOM references: PASS
- SQL Production: 13 banks / 520 questions preserved
- Python Production: 13 banks / 520 questions preserved
- Junior Official QBank: 930 preserved
- Professional Official QBank: 1189 preserved
- Ranking V2 controls preserved

## Browser note

No claim is made for a full automated Chromium visual click-through in this execution environment. The feature logic, storage behavior, validators, runtime exam generation, JavaScript syntax and DOM bindings were tested directly.
