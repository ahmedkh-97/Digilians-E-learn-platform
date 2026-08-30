# Excel Typography Readability V3.1

## Goal

Make Excel Study comfortable to read without zooming the browser.

## Main desktop sizes

- Deep Learning Arabic body: **15px**
- Beginner main explanation: **16px**
- Concept-card explanation: **14px**
- Worked-example title: **15px**
- Worked-example question: **14px**
- Formula Anatomy explanation: **13.5px**
- Execution Trace code: **12.5px**
- Quick Check question: **14px**
- Table cells: **12.5px**
- Section labels: **9–10px**
- Source / clarification microcopy: **10px**

## Scope

The typography increase is scoped to Excel Study V2/V3 only. It does not enlarge the global Navbar, Ranking, Official QBank, SQL or Python UI.

## Mobile

At <=680px the main Arabic explanation remains **15px** with increased line height. Tables remain horizontally contained and the Study page keeps its existing responsive behavior.

## QA

- Excel Intake Check: PASS
- Platform Pre-Deploy Check: PASS
- Chromium component typography computed-style check: PASS
- Desktop horizontal overflow: 0
- 390px horizontal overflow: 0
