# Excel Module Explorer V1 — QA

## UX requirement

The learner should not jump directly from:

`Excel Foundations & Data Handling`

into a long Study page.

The new learner flow is:

`Excel → Module → Content Map → Learning Group → Lesson → Study`

## Module Explorer

Clicking the Excel module or the selected-module card opens a dedicated Content Map.

The page shows:
- module title
- module progress
- source-batch reference
- 8 relationship-based Learning Groups
- number of lessons per Group
- Group progress
- key terms
- `Why these lessons belong together`
- prerequisite / Deep V2 badges where applicable

The first Study card in the existing Study → Practice → Exam flow is renamed for Excel to:

`Explore the learning map`

Button:

`Explore Content →`

## Group Explorer

Opening a Group shows:
- Group number / title
- learning purpose
- `How this Group fits together`
- lesson flow
- Group progress
- individual lesson cards
- source trace
- key terms
- lesson completion state
- Start / Review Lesson button

The learner chooses the exact lesson before Study opens.

## Study scope

When a lesson is started from a Group:
- Study renders only that Group's lessons
- the selected lesson is the initial target
- Prev / Next stay inside the Group
- the Study header says `← Group`
- while Excel assessments are still locked, the Study next action returns to Group Overview instead of pretending Practice is ready

## Progress safety

Study progress is still stored at module level.

Group-scoped actions are safe:
- `Mark Group as Completed` adds only the current Group's lessons
- it preserves completions in all other Groups
- `Reset Group Progress` removes only the current Group
- it preserves other Groups and exam results

## Statistics Decision B

The Statistics Group remains visibly prerequisite-only.

Its lessons can be explored/studied normally, but they remain excluded from Excel assessment eligibility.

## Automated QA

PASS:
- 8 Groups
- 27 unique lessons
- Group order equals Study lesson order
- Module Explorer DOM/wiring
- Group Explorer DOM/wiring
- lesson → scoped Study wiring
- group-scoped Mark/Reset preservation
- all previous Excel Study / SQL / Python / Official QBank regression suites

## Visual component QA

Production CSS was rendered with the real Learning Group / lesson data.

Desktop:
- 8 Group cards
- 2 Group 02 lesson cards
- two-column Group map
- horizontal overflow = 0

390px:
- Group map collapses to one column
- lesson action moves below lesson copy
- page-level horizontal overflow = 0

Result: PASS.

## Local browser acceptance

Run:

`TEST-LOCAL.bat`

Then verify:

1. Learn → Data Analysis → Excel
2. click `Excel Foundations & Data Handling`
3. Content Map opens
4. choose Group 02
5. Group Overview opens
6. choose `Formula vs Function, References & Calculation Order`
7. only Group 02 Study lessons render
8. Back returns to Group Overview
9. Group progress updates after lesson completion
10. Back again returns to Content Map
