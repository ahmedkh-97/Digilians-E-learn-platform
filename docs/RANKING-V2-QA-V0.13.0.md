# Ranking V2 QA — Digilians E-Learn V0.13.0

## Implemented ranking layers

### Exam Ranking
Every ranked exam/activity keeps its own leaderboard. Best attempt only.

### Track Overall Ranking
Uses only the fixed Official Section exams inside the selected track.
Best attempt from every fixed section is counted once, then raw correct answers are summed as Total Grade.

### Full Bank Overall Ranking
- Junior Overall: 930 total marks across 21 fixed sections.
- Professional Overall: 1189 total marks across 26 fixed sections.

## Aggregate ranking order
1. More fixed sections completed.
2. Higher Total Grade.
3. Higher overall percentage.
4. Faster combined time across the counted best attempts.
5. Earlier submission as final tie-breaker.

## Fairness rule
Random Practice 40, Random Exam 50 and Final simulations remain separately ranked activities, but they do not add marks to Track Overall or Full Bank Overall. Their questions are randomized and overlap with the fixed source sections.

## Ranking Center
- Junior Overall
- Professional Overall
- Track Overall
- Exam Ranking

Shortcuts also exist from each Official level, each Official track, and each fixed section.

## Supabase
No database migration is required. Ranking V2 reads the existing `exam_attempts` rows and aggregates best section attempts in the client.

## QA
- Junior section total: 930 / 21 sections — PASS
- Professional section total: 1189 / 26 sections — PASS
- Track section totals equal source-bank track counts — PASS
- Aggregate best-attempt selection — PASS
- Completion-first ordering — PASS
- Random / Final exclusion from Total Grades — PASS
- Multi-exam Supabase chunking and pagination logic — PASS
- Direct section/result ranking opens Exam Ranking — PASS
- HTML IDs unique — PASS
- JavaScript DOM references valid — PASS
- All JSON files parse — PASS
- All JavaScript files pass `node --check` — PASS

## Browser note
A full visual Chromium click-through is not claimed for this milestone because the execution environment did not complete the local-page Chromium run reliably. The ranking engine, production modules, registry structure and DOM bindings were validated directly.
