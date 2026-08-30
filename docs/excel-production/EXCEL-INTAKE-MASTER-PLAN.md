# Excel Production — Intake Master Plan

## Confirmed scale

The Excel course is now confirmed as **3 weeks**.

The exact number of lectures per week is intentionally **not assumed**. Source count, lecture boundaries, topic density, and sequencing will be established only after the real files are received and audited.

## Source-of-truth rule

Educational content must come from the uploaded course material. Do not invent missing Excel topics, formula rules, examples, assessment facts, lecture counts, or sequencing details.

Filenames are hints only. Final sequencing is based on the actual content of each file.

## Batch strategy

Process **one week at a time**.

If a week is too large or visually dense, it may be split into smaller intake batches while preserving its original week identity.

## Per-week pipeline

### Stage A — Source Intake
For every uploaded lecture:
- record the exact filename
- record slide/page count when available
- identify the real lecture/topic label from content
- identify scope boundaries
- detect duplicates / repeated material
- identify prerequisites
- flag contradictions or unclear source material without silently correcting it

Output: `data/excel-intake/source-manifest.json`

### Stage B — Content-Based Sequencing
Order files by learning dependency, not filename.

Possible signals include:
- concept before application
- basic formula before nested/combined use
- source-data preparation before analysis/output
- feature explanation before project/application

Do not impose an outside Excel curriculum if the source does not support it.

### Stage C — Curriculum Registry
Update:
- `data/curriculum/excel.json`
- `data/syllabus-maps/excel.json`

Every published topic must retain source traceability.

### Stage D — Study Production
Where applicable, preferred teaching flow:

**Concept → Why It Matters → Workbook Context → Formula/Feature → Argument Breakdown → Step-by-Step Evaluation → Expected Result → Common Mistakes → Exam Tip → Source Trace**

For visual spreadsheet concepts:

**Business Question → Sheet/Table Setup → Action/Formula → Before/After → How to Read the Result → Common Misinterpretation → Source Trace**

Platform-created examples are allowed only as clearly labeled clarifications based on a source concept.

### Stage E — Assessment Production
Assessment volume is based on real source density, not a fixed arbitrary quota.

Question forms may include when supported:
- direct concept recognition
- formula/result prediction
- reference/range interpretation
- scenario/application
- troubleshooting/error diagnosis
- feature-selection
- table/chart interpretation

Every question, answer, distractor, and explanation must remain source-traceable.

### Stage F — Week Completion Gate
A week becomes assessment-ready only after:
- every source is processed
- sequence is confirmed
- duplicate/overlap decisions are resolved
- syllabus coverage is audited
- Study sections render successfully
- assessment questions validate
- source trace is complete

## Track Final Gate

The Excel Track Final stays unavailable until:
- **all 3 weeks** are processed
- exact lecture count is known
- all major topics are mapped
- coverage weights are derived from real material
- final selection profile is repeatedly validated

Do not pre-fill `excel-final.json` with invented allocations.

## Data Analysis Final

Excel becoming final-ready completes one required Data Analysis track only. The overall Data Analysis Final remains governed by the existing multi-track readiness rule.
