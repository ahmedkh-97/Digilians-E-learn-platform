# Digilians E-Learn — Question Bank Schema V2

## Purpose
Question Banks are the permanent source for:
- Practice banks
- Topic / Track Exams (40–50 questions)
- Data Analysis Final Exam (100 questions)

The Final Exam does **not** require all original PDFs to be uploaded again. Each material chunk is converted into a bank when it is processed.

## Required top level
- `schemaVersion`: `"2.0"`
- `bank`
- `questions`

## Required bank metadata
- `id`
- `courseId`
- `course`
- `trackId`
- `track`
- `moduleId`
- `module`
- `title`
- `version`
- `status`
- `sourceFiles`

## Required question metadata
Every question keeps the normal MCQ fields plus:
- `trackId`
- `track`
- `questionType`
- `sourceType`
- `trackExamEligible`
- `finalEligible`
- `conceptKey`
- `source.file`
- `source.reference`

## sourceType
Allowed:
- `course`
- `external-similar`

`external-similar` is allowed only when it applies a concept already taught in the supplied course material. It must not introduce a new syllabus concept.

## questionType
Allowed:
- `direct-knowledge`
- `scenario-application`
- `code-tracing`
- `calculation-tracing`
- `best-decision`
- `troubleshooting`

## Difficulty target
Default target:
- Easy 25%
- Medium 50%
- Hard 25%

## Final Exam Blueprint
100 questions / 120 minutes:
- Excel: 20
- Power BI: 20
- SQL: 20
- Python: 20
- Tableau: 10
- Looker Studio: 10

Source target:
- 80% course-based
- 20% external-similar

## Important
A bank may be valid but still **not ready** for the Final if it does not contain enough questions in the required difficulty/source buckets.
