# Excel Week 1 — Scope Decision B

## Status

LOCKED for production unless the user explicitly changes the decision.

## Source batch

Week 1 contains:

- 9 PowerPoint source files
- 262 slides total
- 6 Excel-core sources
- 3 Statistics prerequisite sources

## Decision B

The three `Introduction to Statistics` lectures remain visible inside the Week 1 learning journey because they provide conceptual context for later Excel statistical functions.

They are **not Excel assessment content**.

### Include in Week 1 learning path

Yes:
- Statistics Foundations I
- Statistics Foundations II
- Statistics Foundations III

Recommended UI treatment:
- `PREREQUISITE • STATISTICS`
- visually distinct from `EXCEL CORE`
- source trace preserved
- linked before/around the Excel statistical-function lesson where relevant

### Exclude from Excel assessment

Do NOT use standalone Statistics theory from these three sources in:
- Excel Session Practice
- Excel Week 1 Exam
- Excel Track Exam
- Excel Track Final
- Excel share of the overall Data Analysis Final

Examples of excluded standalone theory include, where present in the sources:
- defining Statistics as a discipline
- measurement levels as independent theory questions
- Descriptive vs Inferential Statistics as independent theory
- manual/statistical theory of dispersion
- skewness theory
- correlation theory
- population/sample theory
- probability/normal-distribution theory

## What Excel assessment MAY test

When an Excel-core source explicitly teaches an Excel function that implements a statistical concept, the Excel assessment may test the **Excel function/use/syntax/result behavior supported by that Excel source**.

Example boundary:

- `STDEV.P` function taught in the Excel formulas/functions source → Excel scope.
- "Define standard deviation mathematically" from the Statistics prerequisite lecture → Statistics scope, not Excel scope.

This separation prevents duplicate weighting between Excel and the independent Statistics learning track.

## Source QA flag

Statistics Foundations III contains a skewness wording/visual consistency issue in the supplied presentation.

Production rule:
- preserve source trace
- flag the inconsistency
- do not silently rewrite/reconcile it as if the source were internally consistent
- any presentation correction must be explicitly labeled

## Next gate

Before Study or assessment production:
1. audit all 9 files completely
2. verify content-based sequence
3. create Week 1 coverage map
4. separate every concept into `excel-core` vs `statistics-prerequisite`
5. only then generate Study sections and question banks
