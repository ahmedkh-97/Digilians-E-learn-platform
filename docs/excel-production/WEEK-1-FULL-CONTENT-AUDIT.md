# Excel Week 1 — Full Content Audit

## Final status

**AUDIT COMPLETE**

- 9 source files
- 262 total slides
- 176 Excel Core slides
- 86 Statistics Prerequisite slides
- 70 concept clusters
- 53 Excel Core clusters
- 17 Statistics Prerequisite clusters
- 8 source QA issues/gaps
- 5 cross-source overlap resolutions

Decision **B** remains locked: Statistics stays visible as prerequisite learning, but standalone Statistics theory contributes zero Excel assessment questions.

## Locked content-based sequence

1. Advanced Conditional Formatting
2. Formula Fundamentals, References & Text Operations
3. Logic, Lookup, Named Ranges & Date Functions
4. Statistics Prerequisite I — Data Types & Central Tendency
5. Statistics Prerequisite II — Dispersion, Sampling & Percentiles
6. Statistics Prerequisite III — Skewness, Correlation & Distributions
7. Statistical, Criteria & Dynamic Array Functions
8. Filtering, Dynamic Search, Consolidation & Data Entry
9. Data Preparation, Sparklines & Analysis Tools

The Statistics block was moved next to the Excel statistical-function source because its approved role is prerequisite context. This also puts FILTER before the later dynamic-search workflow.

## Excel Core coverage

### Advanced Conditional Formatting
Purpose/criteria, rules, Below Average, Data Bars, Color Scales, priority, Manage Rules, Clear Rules and formula-based rules.

### Formula Fundamentals, References & Text Operations
Formula vs Function, equal sign, Formula Bar, arguments, cell references/ranges/named ranges, operator precedence, CONCAT, TEXTJOIN, percentages, absolute-reference example, averages, text-to-date conversion, DATEVALUE, LEFT/RIGHT/MID, TEXTBEFORE/TEXTAFTER, TRIM/CLEAN, PROPER/UPPER/LOWER, TEXT, SUBSTITUTE, TEXTSPLIT, LEN, FIND and SEARCH.

### Logic, Lookup, Named Ranges & Date Functions
IF, INDEX/MATCH, comparison with VLOOKUP, two-way/multiple-criteria source patterns, CHOOSE, VLOOKUP, XLOOKUP, dynamic named ranges, Tables, OFFSET+COUNTA, INDEX+COUNTA, DATE/TODAY/NOW/YEAR/MONTH/DAY, NETWORKDAYS/WORKDAY variants, EDATE/EOMONTH/WEEKDAY/DATEDIF and ROWS/COLUMNS.

### Statistical, Criteria & Dynamic Array Functions
STDEV.P, RANK.EQ, PERCENTILE.INC, LARGE/SMALL, NORM.DIST, BINOM.DIST, arrays/spilling/#SPILL!/spill references, FILTER, UNIQUE, SORT/SORTBY, SEQUENCE, descriptive Excel functions, COUNT/COUNTA/COUNTIFS/AVERAGEIFS, SUMIF/SUMIFS/MAXIFS/MINIFS, IFS and formula protection.

### Filtering, Dynamic Search, Consolidation & Data Entry
AutoFilter, delete rows, dynamic FILTER + ISNUMBER + SEARCH workflow, Data Consolidation, Data Entry Form and moving/swapping columns.

### Data Preparation, Sparklines & Analysis Tools
Text to Columns, Flash Fill, Unmerge, Sparklines, Data Analysis ToolPak activation and sorting Subtotals.

## Statistics prerequisite coverage — excluded from Excel scoring

Statistics I:
- definition of Statistics
- data/variable types and measurement concepts
- descriptive vs inferential
- frequency tables
- mean/median/mode
- effect of outliers

Statistics II:
- central tendency vs dispersion
- variance
- standard deviation
- population/sample/sampling
- range/quartiles/IQR/box plots/outlier fences
- percentiles

Statistics III:
- skewness
- correlation/coefficient/scatter
- worked descriptive-statistics task
- data/probability distributions
- Normal/Binomial/Poisson concepts
- Normal Distribution

## Source QA findings

1. **HIGH — Skewness contradiction, Statistics III slides 3–4.** The two slides disagree internally on skewness signs. No silent correction.
2. **MEDIUM — Math worked-example label, Statistics III slide 12.** One subtraction result is internally inconsistent with the squared-deviation value.
3. **MEDIUM — Correlation wording, Statistics III slide 8.** Regression-line sentence is unclear and will not become an assessment fact.
4. **MEDIUM — HLOOKUP assessment gap, Lecture 15 slide 36.** HLOOKUP is requested in the assessment but is not explicitly taught as a standalone lesson.
5. **MEDIUM — Nested IF / IFS sequence gap, Lecture 15 slide 36.** IF is taught there; IFS is taught in Lecture 16. No unsupported Nested IF lesson will be invented.
6. **LOW — Text to Columns overlap.** Lecture 14 uses it for text dates; Lecture 18 uses it for splitting content.
7. **LOW — ISNUMBER embedded use.** Lecture 17 uses ISNUMBER inside the search workflow without a standalone Week 1 lesson.
8. **LOW — Lecture 18 title/scope mismatch.** Professional display name is changed while original filename is preserved in Source Trace.

## Overlap policy

- Text to Columns: one reusable tool explanation, two different use cases.
- LEFT/RIGHT/MID: teach once; later source assessment reuses prior knowledge.
- FILTER: Lecture 16 teaches it; Lecture 17 applies it.
- Descriptive Statistics: theory is prerequisite-only; Excel function behavior is assessable.
- Standard deviation/percentile/distributions: Statistics explains concepts; Excel source teaches the functions.

## Visual-learning requirement

This batch is highly visual. Several decks contain screenshot-heavy or textless visual slides.

Production rules:
- Excel formulas remain real selectable LTR text.
- Cell/range/ribbon workflows need visual support.
- Screenshot-only source meaning must not become unexplained prose.
- Platform-created diagrams are labeled `PLATFORM VISUAL CLARIFICATION`.
- Any source correction is labeled `PRESENTATION CORRECTION`.

## Gate status

- Source Intake ✅
- Decision B ✅
- Full 262-slide Audit ✅
- Content-Based Sequence ✅
- Coverage Map ✅
- QA / Overlap Log ✅
- Study Production ⏳ next
- Question Banks 🔒 blocked until Study/source trace is built
- Week 1 Exam 🔒 blocked
- Excel Final weights 🔒 blocked until Weeks 2 and 3 are audited

Machine-readable map:

`data/excel-intake/week-1-coverage-map.json`
