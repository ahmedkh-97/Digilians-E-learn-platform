# Excel Deep Learning V3.2 — Full Rollout QA

## Scope

Full Deep Learning rollout across the current Excel source batch.

- Learning Groups: **8 / 8**
- Study lessons: **27 / 27**
- Audited concepts preserved: **70 / 70**
- Excel Core lessons: **20**
- Statistics Prerequisite lessons: **7**
- Deep Quick Checks: **27**
- Try It activities: **27**
- Source formula cards available in lesson data: **45**
- Source workflow steps available: **42**

## Educational change

All 27 lessons now use the same learner-first structure.

The remaining Groups no longer fall back to the old summary-style Study V1.

Every lesson contains:
- beginner explanation
- relationship context
- concepts
- example
- why it matters
- mistakes
- practice
- Quick Check
- next connection
- Source Trace

Source-supported Visual / Formula / Workflow components are automatically included when that lesson has them.

## Language QA

PASS:
- 27/27 `beginnerLearningV3` records
- no `المصدر` phrasing in direct learner explanations
- Source Trace remains separate
- Source Gap / Presentation Correction warnings remain preserved

## Decision B

PASS:
- 7 Statistics prerequisite lessons remain clearly separated
- 0 Statistics concept clusters eligible for Excel assessment
- Statistics Study Quick Checks are learning-only and do not enter ranking

## Automated checks

### Excel Intake Check
**PASS**

Checks include:
- 8 Learning Groups
- 27 unique lessons
- 27/27 Deep Learning structure
- 70/70 audited concepts
- Practice/Exam gate remains locked

### Platform Pre-Deploy
**PASS**

Existing protected systems still pass:
- SQL 520-question production
- Python 520-question production
- Junior Official QBank 930
- Professional Official QBank 1189
- SQL/Python Study renderers
- universal technical renderer
- Rankings / Shared Avatars
- Analytics
- Backup/Restore
- Update Manager
- startup recovery

## Visual QA

Representative real-renderer sample: one lesson from every Learning Group.

Desktop:
- 8/8 representative sections rendered
- 8/8 Group headers
- 8/8 Understand From Zero blocks
- 8/8 Common Mistakes blocks
- 8/8 Try It blocks
- 8/8 Quick Checks
- 8/8 Source Trace blocks
- horizontal overflow = 0

Readability:
- main learner explanation: **16px**
- concept explanations: **14px**
- common mistakes: **13.5px**

390px:
- Deep opening grid collapses
- Quick Check grid collapses
- page-level horizontal overflow = 0

Result: **PASS**

## Assessment payload protection

No Excel Practice bank or Excel Exam was generated in this rollout.

Existing SQL / Python / Official assessment content remains unchanged.

## Local acceptance

Run:

`TEST-LOCAL.bat`

Then review at least one lesson from each Group:

`Learn → Data Analysis → Excel → Excel Foundations & Data Handling → Content Map`

Recommended review points:
- Group 01: Formula-Based Conditional Formatting
- Group 02: Percentages & Average Functions
- Group 03: Extracting & Splitting Text
- Group 04: INDEX/MATCH, VLOOKUP & XLOOKUP
- Group 05: Date & Working-Day Functions
- Group 06: Frequency, Mean, Median, Mode & Outliers
- Group 07: FILTER, UNIQUE, SORT, SORTBY & SEQUENCE
- Group 08: Filtering + Dynamic Search Workflow
