# Excel Study V2 — Group 02 Prototype QA

## Data architecture

PASS:
- 8 Learning Groups
- 27 lessons covered exactly once
- lesson array reordered to match Group order
- 70/70 audited concepts remain covered exactly once
- 20 Excel Core + 7 Statistics prerequisite Study sections unchanged
- Statistics assessment leakage = 0
- Deep V2 restricted to Group 02 only
- 2 Deep V2 lessons

## Deep renderer

PASS:
- Learning Goal
- relationship context
- Real Problem
- sheet/table model
- Worked Examples
- Formula Anatomy
- Execution Trace
- Expected Result
- Common Mistakes
- Try It Yourself
- Quick Check
- Source Trace
- Platform Clarification labels

Group 02 rendered:
- 10 Worked Examples
- 2 Quick Checks

## Visual QA

Chromium component QA used production renderer + production CSS.

Desktop:
- 8/8 Group cards
- 2/2 Deep sections
- 10 Worked Examples
- 2 Quick Checks
- 10+ Platform/source labels
- horizontal overflow = 0

390px:
- desktop Study TOC hides
- Group map collapses to one column
- Deep opening cards collapse to one column
- horizontal overflow = 0

Result: PASS.

## Existing platform QA

Excel Intake Check: PASS.

Platform Pre-Deploy: PASS, including:
- SQL 520
- Python 520
- Junior Official QBank 930
- Professional Official QBank 1189
- SQL/Python Study renderers
- technical renderer
- Rankings / Shared Avatars
- Analytics
- Backup/Restore
- Update Manager

## Assessment payload protection

No Excel question bank or Excel exam is introduced by this prototype.

Existing SQL / Python / Official assessment payloads remain protected.

## Local acceptance

Run:

`TEST-LOCAL.bat`

Then:

`Learn → Data Analysis → Excel → Excel Foundations & Data Handling → Study`

Review especially:
- Learning Map
- Group 02
- formula explanation depth
- mobile layout
- Quick Check interaction

Do not deploy this prototype as the final Excel Study standard until the educational depth is approved.
