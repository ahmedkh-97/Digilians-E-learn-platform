# Curriculum Manifest — Architecture V2.1

## Why it exists
The platform must never guess that a large course is complete.

Each Data Analysis track has a curriculum manifest that records:
- processed source files
- mapped topics
- curriculum version
- explicit user completion confirmation

## Status model

### IN PROGRESS
Material is still being added.

### CONTENT COMPLETE — BANK BUILDING
The user confirmed that the track curriculum is complete, but the question bank does not yet satisfy Final Exam requirements.

### FINAL READY
The curriculum is confirmed complete and the bank satisfies all required quotas.

## Final readiness
The Data Analysis Final can only unlock when all six required tracks are FINAL READY:
- Excel
- Power BI
- SQL & Databases
- Python
- Tableau
- Looker Studio

Statistics may exist as a learning track but is not currently part of the 100-question Final blueprint.

## Important
If new material is added after a track was marked complete, its curriculum status should return to `in-progress` (or a review-required state in a future admin workflow) until the new material is mapped and its bank is updated.
