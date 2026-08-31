# Excel Week 2 — Source QA & Overlap Log

## QA findings

### 1. HIGH — w2-qa-01
- Source: `excel-w2-s08` • Slides: 19-20
- Finding: Text.End use-case line says 'extract the first few characters', while the function name, example and explanation state it extracts the last three characters.
- Production action: No silent repair. Show PRESENTATION CORRECTION if teaching this slide.

### 2. MEDIUM — w2-qa-02
- Source: `excel-w2-s01` • Slides: 3-11
- Finding: Sparklines, Consolidation, Data Entry Form and FILTER search already exist in Week 1.
- Production action: Reuse Week 1 explanations; only produce new Week 2 behavior (VSTACK/3D refs/ActiveX/VBA).

### 3. MEDIUM — w2-qa-03
- Source: `excel-w2-s01` • Slides: 9-10
- Finding: ActiveX and the VBA TextBox workflow depend on desktop Excel/Windows-style controls and are not universal across Excel environments.
- Production action: Label environment dependency; do not present as the only search method.

### 4. MEDIUM — w2-qa-04
- Source: `excel-w2-s02` • Slides: 10-11,17,24-27
- Finding: Several chart types are named/shown visually with little or no explanatory text: stacked/clustered variants, Sunburst, Treemap, Funnel, Radar and Combo.
- Production action: Use source visuals for recognition. Do not invent detailed use-case rules that are not supported by the deck.

### 5. MEDIUM — w2-qa-05
- Source: `excel-w2-s03` • Slides: 4-6
- Finding: IQR, Box Plot/outliers and Standard Deviation concepts were already approved as Statistics prerequisite in Week 1.
- Production action: Teach only the Excel application layer: QUARTILE.INC, limits, IF/OR flag, Box & Whisker and STANDARDIZE.

### 6. MEDIUM — w2-qa-06
- Source: `excel-w2-s03` • Slides: 7
- Finding: Regression is mentioned alongside Solver/Descriptive Statistics, but no regression workflow is taught in this deck.
- Production action: Do not create a standalone Regression lesson or assessment question from the mention alone.

### 7. MEDIUM — w2-qa-07
- Source: `excel-w2-s05` • Slides: 9-10
- Finding: Python in Excel and Pandas overlap the existing Python/Pandas curriculum.
- Production action: Keep as Excel automation bridge only; no duplicate Python fundamentals.

### 8. MEDIUM — w2-qa-08
- Source: `excel-w2-s06` • Slides: 19-28
- Finding: The Top 10 Dashboard Mistakes section often supplies a title plus visual example rather than full written reasoning.
- Production action: Teach the named mistake + what the source visual demonstrates; do not manufacture unsupported rules.

### 9. MEDIUM — w2-qa-09
- Source: `excel-w2-s07` • Slides: 8-12
- Finding: Dashboard questions jump from 1 to 3; question 2 is missing from the supplied deck.
- Production action: Preserve numbering/source trace; do not invent the missing question.

### 10. MEDIUM — w2-qa-10
- Source: `excel-w2-s08` • Slides: 35
- Finding: The M slide states a library size of nearly 1,000 functions; this is not necessary to understand or operate M.
- Production action: Keep as source context if desired, but exclude the numeric claim from assessment.

### 11. MEDIUM — w2-qa-11
- Source: `excel-w2-s10` • Slides: 3-7
- Finding: Slides contain broad productivity/governance claims (for example a 35% accuracy improvement) and conclusion-style statements.
- Production action: Do not turn unsourced productivity percentages into assessment facts.

### 12. MEDIUM — w2-qa-12
- Source: `batch` • Slides: Assessments
- Finding: Several assessments require companion Excel/Access files (Lectures 19, 21, 23, 24, 26, 27 and 28) that are not in this uploaded batch.
- Production action: Study can be produced from slides; practical assessment reproduction stays blocked until companion files are supplied or explicitly waived.

### 13. LOW — w2-qa-13
- Source: `excel-w2-s01` • Slides: 5
- Finding: VSTACK is mentioned as a consolidation option but there is no worked VSTACK formula example.
- Production action: Supporting mention only unless another source later teaches its syntax.

### 14. LOW — w2-qa-14
- Source: `excel-w2-s10` • Slides: 5-6
- Finding: SQLite is presented as an external source via ODBC/add-ins; the source does not provide a detailed driver-installation procedure.
- Production action: Teach connection concept and workflow only; do not invent driver setup steps.

## Overlap resolutions

- **Sparklines** — Reuse the existing Sparklines lesson; Lecture 19 becomes KPI/dashboard context only.
- **Data Consolidation** — One core explanation. Add new 3D-reference/VSTACK/multi-source contexts without duplicating basics.
- **Data Entry Form** — Reuse Week 1 lesson; Lecture 19 assessment references it.
- **Dynamic FILTER Search** — Reuse FILTER+ISNUMBER+SEARCH; Week 2 adds ActiveX LinkedCell and VBA fallback only.
- **IQR / Outliers / Box Plot** — Week 1 remains prerequisite theory; Week 2 teaches Excel application with QUARTILE.INC, fences, IF/OR and Box & Whisker.
- **Standard Deviation / Z-score** — Do not reteach SD theory. Teach STANDARDIZE as the Excel application.
- **Analysis ToolPak** — Reuse activation lesson; Week 2 references Descriptive Statistics use.
- **Goal Seek → Solver** — Goal Seek first; Solver follows as multi-variable/constraint optimization.
- **Dashboard design** — Lecture 25 supplies evaluation/audience principles; Lecture 24 supplies build/interactivity/storytelling workflow.
- **Power Query ETL** — Lecture 26 is foundation; Lecture 27 is applied transformation/combine/load continuation.
- **Power Query Merge / Relational data** — Teach merge/relationship distinction once; later sources become external-connection/application cases.
- **Python/Pandas** — Excel keeps only Python-in-Excel/Pandas automation bridge; Python language/Pandas fundamentals remain in Python track.
