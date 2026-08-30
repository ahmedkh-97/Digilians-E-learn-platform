# Excel Week 1 — Study V1 QA

## Build scope

This is an Excel development workspace on top of runtime **V0.19.6**.

Implemented:
- **27 Study sections**
- **20 Excel Core**
- **7 Statistics Prerequisite**
- **70/70 audited concepts mapped exactly once**
- **45 source formula cards**
- Source Trace on all 27 sections
- Excel-specific visual-learning renderer
- Statistics prerequisite visual separation
- Practice / Exam intentionally locked until Study QA is accepted

## Decision B

Statistics appears in the Week 1 learning journey as:

`PREREQUISITE • STATISTICS`

It remains excluded from:
- Excel Practice
- Excel Week Exam
- Excel Track Final
- Excel share of Data Analysis Final

## Source integrity

The Study content was produced from the Week 1 audited source map.

Important source issues are not silently corrected:
- skewness contradiction is shown as `SOURCE INCONSISTENCY`
- Math worked-example arithmetic-label problem is shown as a correction warning
- HLOOKUP assessment gap is shown as `SOURCE GAP`
- Nested IF / IFS sequencing gap is preserved
- ISNUMBER is explained only inside the source workflow where it is used

## Renderer runtime QA

Automated Pre-Deploy verifies:
- 27/27 Study sections render
- 20 Excel Core / 7 Statistics prerequisite
- 70 unique concept IDs
- exact match with the Week 1 Coverage Map
- 45 formula cards in data
- all sections contain Source Trace
- all Statistics Study sections map only to Statistics prerequisite concepts
- Practice/Exam gate remains locked

Result: **PASS**

## Chromium component visual QA

Real production renderer + production CSS were rendered for:
- Formula / reference section
- Statistics skewness conflict section
- Dynamic-array spill section

Desktop:
- 3/3 test sections rendered
- 7 technical Excel formula blocks in the selected sample
- prerequisite badge visible
- source-conflict card visible
- page-level horizontal overflow = 0

390px:
- intro cards collapse to one column
- formula cards collapse to one column
- page-level horizontal overflow = 0

Result: **PASS**

## Full localhost browser navigation

A real localhost server was started successfully, but Chromium navigation to:

`http://127.0.0.1:8145/`

was blocked by the execution environment with:

`ERR_BLOCKED_BY_ADMINISTRATOR`

Therefore this report does **not** claim a full browser click-through.

Use `TEST-LOCAL.bat` on the user's machine for:
`Learn → Data Analysis → Excel → Week 1 → Study`

## Existing platform regression

The normal platform Pre-Deploy remains PASS, including:
- SQL 520
- Python 520
- Junior Official QBank 930
- Professional Official QBank 1189
- Python Study
- SQL Study
- Ranking
- Shared Avatars
- Analytics
- Backup/Restore
- Update Manager

No Excel Week 1 question bank or exam was created in Study V1.
