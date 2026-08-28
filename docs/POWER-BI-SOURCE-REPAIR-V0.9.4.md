# Power BI Official QBank Source Repair - V0.9.4

## What was wrong
The previous extraction contained a parser collision at the transition on PDF page 68:
- A complete 50-question Power BI fundamentals block was collapsed into the text of one JSON option.
- The official answer key for those 50 questions was also embedded in that malformed record.
- The next official question (source question 16 on page 75) supplied the stored answer for the malformed record.
- A smaller parse artifact also prefixed Power BI source question 13 on page 60 with stray text.

## Source-verified repair
The repair reads directly from `Junior_MCQ_Exercises.pdf`.

### Recovered block
PDF pages 68-74 contain 50 separate Power BI questions.
PDF page 75 contains their 50-answer official answer key.

Recovered as:
- `official-power-bi-q0101` through `official-power-bi-q0150`

### Repaired continuation
The real source question immediately after the answer key is:
- Source Q16, page 75
- "You need to add Product Name from a Product table to Sales by matching Product ID..."
- Official answer: 4 / D - Merge

It is now:
- `official-power-bi-q0151`

The former Q102-Q185 records were shifted by +50 so their existing source content and deep explanations remain attached to the correct questions.

### Other parse correction
Power BI Q63 was corrected from a merged prefix to the exact source question 13 shown on PDF page 60.

## Authoritative counts after repair
- Excel: 230
- Power BI: 235
- SQL: 85
- Python: 85
- Tableau: 160
- Looker Studio: 85
- Junior Official QBank total: 880

## Section architecture after repair
- Excel: 5 sections
- Power BI: 5 sections
- SQL: 2 sections
- Python: 2 sections
- Tableau: 4 sections
- Looker Studio: 2 sections
- Junior total: 20 sections

## Explanation status
Existing deep explanations were preserved with their repaired/reindexed questions.
The newly recovered 50-question block is source-correct but still awaits the approved full option-by-option Arabic Deep Explanation pass.

## Integrity rule
No official question wording, options, or official answers were invented to perform this repair.
The malformed extraction was replaced using the PDF text and official answer key.
