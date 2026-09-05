# Microsoft PL-300 Voucher - Source Audit V1

## Exam Configuration
- Track: Data Analysis
- Voucher: Microsoft PL-300 Exam
- Real exam size: 60 questions
- Real duration: 120 minutes
- Passing threshold: 70%
- Source 01: PL-300 Final.pdf (501 pages)
- Source 02: PL-300 Final 2.pdf (62 pages)

## Structural Extraction
| Metric | Source 01 | Source 02 | Combined |
|---|---:|---:|---:|
| Actual question blocks | 369 | 140 | 509 |
| MCQ/text-style | 238 | 86 | 324 |
| Hotspot | 94 | 31 | 125 |
| Drag & Drop | 37 | 16 | 53 |
| Fill in the Blank | 0 | 7 | 7 |
| Questions without a reliable textual scoring key | 132 | 54 | 186 |

Notes:
- Source 02 contains 140 actual question blocks. A trailing `NEW QUESTION 415` marker is promotional product copy rather than a question and is excluded from the bank.
- Source 02 repeats `NEW QUESTION 10`; numbering cannot be used as the question count.
- 132 Source 01 questions do not expose a reliable textual answer token, mainly visual Hotspot / Drag & Drop questions. Their rendered answer images must be treated as authoritative source evidence during ingestion. Source 02 visual items use a Mastered/Not Mastered wrapper, so those tokens are not treated as faithful scoring keys.

## Duplicate Audit
- Strict normalized unique stems in Source 01: 357 (12 exact/repeated stems inside the source).
- Strict normalized unique actual stems in Source 02: 139 (1 repeated stem inside the source; promotional marker excluded).
- Strict normalized unique actual stems across both sources: 471.
- Therefore there are at least 38 strict duplicate copies across/within the two files (509 actual blocks - 471 strict unique stems).
- High-similarity clustering identified 50 duplicate/near-duplicate candidate clusters containing 71 redundant copies. These require semantic review before final deduplication; they must not be auto-merged solely by similarity score.

Large repeated families include:
- Logged date/time transformation scenario (multiple variants across both files).
- Median/percentile reference-line scenario.
- Late-order percentage DAX scenario.
- RLS/workspace access scenarios.
- Power Query error replacement / data cleanup scenarios.

## Answer-Key Risk
Source 02 must be treated as a lower-trust source until each candidate answer is validated. Examples discovered during audit:

1. Existing published Power BI report/dataset scenario
   - Source 01 answer: Power BI dataset.
   - Source 02 `NEW QUESTION 227` answer key: SharePoint folder.
   - Source 02 explanation itself says the existing dataset should be used.
   - Status: CONFLICT - exclude from Master Bank until research + owner approval.

2. Report visual personalization scenario
   - Source 01 near/exact version answers with visual personalization.
   - Source 02 `NEW QUESTION 296` selects a separate report page.
   - Status: CONFLICT CANDIDATE - research required.

3. Report-wide personalization scenario
   - Source 01 equivalent selects `Enable personalization for the report`.
   - Source 02 `NEW QUESTION 310` selects `Edit the interactions between the three visuals`.
   - Status: CONFLICT - research required.

4. Logged date/time scenario
   - Source 01 contains variants that select splitting on `at`.
   - Source 02 contains both a column-by-example answer (`NEW QUESTION 168`) and a split-on-`at` answer (`NEW QUESTION 365`) for highly similar requirements.
   - Status: VARIANT/CONFLICT FAMILY - must be compared by exact wording before deduplication.

5. SharePoint manufacturing-files scenario
   - Source 01 equivalent requires SharePoint Folder -> Transform -> filter Folder Path.
   - Source 02 `NEW QUESTION 410` selects Combine & Load.
   - Status: CONFLICT CANDIDATE - research required.

## Production Rules from Audit
1. Do not convert visual questions into ordinary text MCQ if the answer depends on an exhibit.
2. Preserve question-specific images for Hotspot, Drag & Drop, Fill-in-the-Blank and any question whose options/answer area are image-only.
3. Full Source Review preserves each actual PDF question block independently; scored Full Source mocks remain withheld until complex interactions can be normalized faithfully.
4. Master Bank deduplicates only after semantic review.
5. When duplicate sources disagree, mark `conflict=true` and exclude from Random / Real Exam generation.
6. Research conflicts against current authoritative Microsoft documentation.
7. If research would change the PDF answer key, present the conflict to Ahmed before changing scoring.
8. Explanations can be rewritten as detailed Arabic study explanations, but question wording/source evidence remains traceable.
9. Safe option shuffle stays locked for positional answers (`A and B`, `All/None of the above`, answer-area dependencies, image answer layouts).
10. Real Exam generator remains 60 questions / 120 minutes / 70% and is the only ranked mock size.

## Next Gate
Before production ingestion:
- Finish semantic duplicate review.
- Produce Conflict Review List with source question IDs and proposed evidence status.
- Research conflicts using authoritative Microsoft Learn / Fabric / Power BI documentation.
- Ask for approval only where the scientifically/currently correct answer would differ from a source answer key.
