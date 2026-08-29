# Track Cards Layout Fix — V0.15.3

## Problem

The Data Analysis track cards used an absolutely positioned footer while SQL and Python had longer descriptions than the placeholder tracks. The description text could therefore run underneath the footer metadata and arrow.

## Fix

The card layout now uses:

`Header → Body → Flexible space → Footer`

Implementation details:

- `.track-card` uses `display:flex; flex-direction:column`.
- `.track-card-body` uses `flex:1`.
- `.track-footer` is no longer absolutely positioned.
- Footer has a separator and its own minimum height.
- Track grid uses equal-height rows where possible.
- Cards can still grow vertically if content requires more room.
- Mobile cards revert to natural minimum height.

## Content presentation

The chooser intentionally uses concise summaries:

- SQL: SQL querying, relational databases, joins, subqueries and analytical workflows.
- Python: Python foundations, NumPy, Pandas and data visualization.

The detailed curriculum descriptions stored in `learning.json` were not removed or shortened.

Production-ready cards expose useful footer stats:

- SQL: 8 Sessions • 520 Questions
- Python: 13 Sessions • 520 Questions

Incomplete tracks display `Coming Soon`.

## Regression QA

- All JSON files parse.
- All JavaScript files pass `node --check`.
- Direct JavaScript DOM references resolve.
- SQL remains 8 sessions / 520 production questions.
- Python remains 13 sessions / 520 production questions.
- Junior Official QBank remains 930.
- Professional Official QBank remains 1189.
- Ranking V2 controls remain present.

## Browser note

No automated Chromium visual-pass claim is made in this environment. The overlap cause was removed structurally by eliminating the absolute footer and using normal flex flow.
