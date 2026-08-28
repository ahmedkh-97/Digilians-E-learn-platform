# Official Junior Data Analysis QBank - Full Source Audit V0.9.5

Audit date: 2026-08-28
Official source: Junior_MCQ_Exercises.pdf
PDF pages: 208
Audit status: PASSED after source repairs

## Final authoritative source counts

| Track | PDF pages | Official questions | Sections |
|---|---:|---:|---:|
| Excel | 1-47 | 230 | 5 |
| Power BI | 48-95 | 235 | 5 |
| SQL | 96-121 | 85 | 2 |
| Python | 122-146 | 85 | 2 |
| Tableau | 147-185 | 210 | 5 |
| Looker Studio | 186-208 | 85 | 2 |
| **Total** | **1-208** | **930** | **21** |

## Repairs discovered by source audit

### Power BI
Previously repaired in V0.9.4:
- 50 official questions on PDF pages 68-74 had been merged into one parser record.
- Their official answer key is on page 75.
- Power BI authoritative count is 235.

### Tableau
Discovered during this full audit:
- An additional complete 50-question Tableau block begins on PDF page 178.
- Questions continue through page 184.
- The official 50-answer key is on page 185.
- These questions were completely absent from the prior 160-question extraction.
- They are now stored as `official-tableau-q0161` through `official-tableau-q0210`.
- Tableau authoritative count is now 210.

## Source text integrity tests

After repair:
- 930 / 930 stored question texts were matched back to the cited official PDF page or adjacent continuation page.
- 3,720 / 3,720 option texts were matched back to the official PDF.
- 930 / 930 official answers were source-verified:
  - inline `Answer:` / `Correct Answer:` for normal blocks
  - Power BI official answer key on page 75 for recovered Q101-Q150
  - Tableau official answer key on page 185 for recovered Q161-Q210
- Every question has exactly A/B/C/D.
- Every `correctAnswer` is A/B/C/D.
- Every record remains `officialTextLocked: true`.
- No giant merged option/question collision remains.
- No active `source-parse-review-required` item remains.

## Duplicate handling

Excel contains one exact repeated official question pair (Q83 and Q215). It is preserved in Study All because the source repeats it; random exam generation deduplicates by fingerprint.

Official repeated questions are never deleted from Study All.
Random Practice / Exam / Final use the fingerprint deduplication rule.

## Ranked activity audit

- Saved student name remains mandatory before any ranked activity.
- The exam start function has a second hard name check.
- Section leaderboard uses best attempt per persistent player ID.
- Ranking order remains:
  1. higher percentage
  2. lower time
  3. earlier submission
- Repaired source tracks now use source-revision-safe IDs.
- Power BI and Tableau repaired progress does not inherit incompatible legacy answer maps.
- Junior and Professional namespaces remain isolated.

## Current explanation coverage

- Excel deep explanations: 230 / 230
- Power BI deep explanations: 149 / 235
- SQL deep explanations: 0 / 85
- Python deep explanations: 0 / 85
- Tableau deep explanations: 0 / 210
- Looker Studio deep explanations: 0 / 85

The source bank is now structurally ready for the remaining Deep Explanation work.


## Final Tableau section packing verification

The recovered Tableau block was repacked so ranked sections remain consistent:
- Section 1: Q1-Q50 (50)
- Section 2: Q51-Q100 (50)
- Section 3: Q101-Q150 (50)
- Section 4: Q151-Q200 (50)
- Section 5: Q201-Q210 (10)

Each section file count was checked against its registry metadata.
