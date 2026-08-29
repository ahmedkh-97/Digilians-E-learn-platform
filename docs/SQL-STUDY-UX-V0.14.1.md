# SQL Learn Readability & Study UX — V0.14.1

## Problem fixed

The first SQL integration exposed production metadata and mixed Arabic/English strings in the same text flow. Browser bidirectional text rendering made some sentences difficult to read.

## New student-facing structure

Each SQL study topic now renders as:

1. English topic title in an isolated LTR header.
2. `الفكرة الأساسية` in an RTL Arabic explanation card.
3. Optional additional Arabic explanation paragraphs.
4. `KEY TERMS` as isolated LTR chips sourced from the finalized SQL syllabus map.
5. `نقط مهمة للمذاكرة` as separate RTL takeaway cards.
6. `SOURCE TRACE` as a dedicated LTR source-reference block.

## Scope

Applied to all 8 SQL modules and all 34 SQL study sections.

## Content integrity

This release changes presentation, not educational source facts.

- Existing validated Arabic explanation text is reused.
- Existing richer Session 1 prose is preserved.
- Key terms come from the production syllabus map.
- Source references remain visible.
- Production/admin metadata is retained in data for traceability but hidden from the lesson body.
- SQL Question Banks remain 13 / 520.
- Junior Official QBank remains 930.
- Professional Official QBank remains 1189.
- Ranking V2 remains unchanged.

## QA

- 8/8 SQL modules use the readable study mode.
- 34/34 SQL study sections have a visible summary.
- 34/34 SQL study sections retain Source Trace.
- No `SQL production map` or `Assessment scope` metadata remains in the student-facing explanation/takeaway fields.
- All JSON files parse.
- All JavaScript files pass `node --check`.
- HTML IDs and JavaScript DOM references remain valid.

## Browser note

A full automated Chromium screenshot/click-through could not be completed reliably in this execution environment, so no browser visual-pass claim is made. The bidi layout was corrected through explicit RTL/LTR isolation and validated structurally in the production markup/CSS.
