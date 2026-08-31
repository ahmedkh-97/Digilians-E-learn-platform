# Excel Week 2 — Full Content Audit

## Final status

**AUDIT COMPLETE — STUDY INTEGRATION NOT STARTED**

- 10 source files: Lectures 19–28
- 194 total slides
- 108 source concept clusters
- 91 net-new clusters
- 8 reuse clusters
- 3 Python/Pandas cross-track bridge clusters
- 89 currently assessment-eligible clusters
- 12 supporting-only / visual-recognition clusters
- 14 QA findings/gaps
- 12 overlap resolutions

The stable V0.20.1 platform was **not modified**. This audit package only adds source inventory, coverage and planning artifacts.

## Main finding

Week 2 should **not** be produced as ten more lecture cards.

It naturally forms eight learner-facing relationship Groups:

1. Advanced Data Management & Search Automation
2. Chart Selection & Visual Analysis
3. Table Design & Readability
4. Outliers, Goal Seek & Optimization
5. Dashboard Design, Interactivity & Storytelling
6. Excel Automation Bridge
7. Power Query Foundations & M
8. Power Query Integration & External Data

## Important Week 1 reuse

Lecture 19 repeats four Week 1 areas:
- Sparklines
- Data Consolidation
- Data Entry Form
- Dynamic FILTER + ISNUMBER + SEARCH

These will **not** become duplicate lessons.

Week 2 only adds the genuinely new layer:
- VSTACK mention
- 3D references
- ActiveX LinkedCell search
- VBA AutoFilter search fallback

Lecture 21 also reuses Week 1 Statistics, but its role is different:

`Statistics prerequisite → Excel application`

So Week 2 may assess:
- QUARTILE.INC
- IQR limits inside Excel
- IF + OR outlier flag
- Box & Whisker chart
- STANDARDIZE / Z-score workflow

without turning standalone Statistics theory into Excel-scoring questions.

## New high-value blocks

### Visualization

Lecture 20 adds the chart-selection foundation: Bar, Column, Line, Pie, Scatter, Waterfall and Histogram, plus visual-recognition examples for additional chart families.

Lecture 22 adds table readability:
Data Ink Ratio, minimal grids, white space, fills/highlighting and alignment.

### Analysis / optimization

Lecture 21 adds applied outlier workflows and Goal Seek.

Lecture 23 adds Solver:
- enable add-in
- Goal Seek vs Solver
- objective / variable cells / constraints
- Simplex LP / GRG Nonlinear / Evolutionary

Python in Excel and Pandas remain a **bridge**, not a duplicate Python course.

### Dashboards

Lectures 24–25 form one strong block:
- audience and purpose
- specific vs broad focus
- static vs granular detail
- Strategic / Operational / Analytical dashboards
- KPI actionability
- PivotTables / Pivot Charts
- Slicers / Report Connections / Timelines
- dynamic titles
- storytelling
- Overview → Analysis → Action
- visual hierarchy / color / clutter / annotations
- poor vs good design

### Power Query & external data

Lectures 26–28 form a progression:

`Power Query ETL → Applied Steps/M → Transform/Merge/Append → Data Model → External Sources/Refresh`

M functions explicitly present in the source:
- Number.FromText
- Number.Round
- if...then...else
- Text.End
- Text.Replace
- Text.Trim
- Text.Proper
- Text.Length
- List.Sum
- Date.AddDays
- Date.Year
- let...in structure

## Highest-priority QA finding

**Lecture 26 slides 19–20 — Text.End contradiction**

The use-case text says “extract the first few characters,” while the function, example and explanation use the **last** three characters.

Production rule:

`PRESENTATION CORRECTION — never silently fix it.`

## Other production cautions

- Several chart types in Lecture 20 are mainly visual/name-only. Do not invent use-case rules.
- Lecture 24's Top 10 Dashboard Mistakes contains many visual-only examples. Use the source image and named mistake.
- Lecture 25 jumps from dashboard question 1 to 3. Do not invent question 2.
- ActiveX/VBA are environment-dependent.
- Regression is mentioned in Lecture 21 but not taught deeply enough for a standalone lesson.
- VSTACK is mentioned but not demonstrated with a worked source formula.
- Broad productivity/accuracy percentages are excluded from assessment facts.
- Practical assessments reference companion files that are not currently in this batch.

## Assessment gate

- Week 2 Study production: **ready after approval of this audit**
- Week 2 Practice: **blocked until Study + source trace**
- Week 2 Exam: **blocked**
- Excel Track Question Bank: **blocked until Week 3 audit**
- Excel Final weighting: **blocked until Week 3 audit**

Machine-readable map:

`data/excel-intake/week-2-coverage-map.json`
