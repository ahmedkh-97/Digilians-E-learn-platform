# Excel Intake Ready Workspace — 3 Weeks

Base runtime: **V0.19.4**

This is a development workspace, not a new Live release.

The platform core remains V0.19.4. This workspace only prepares the source-ingestion structure for the Excel course.

## Confirmed course scale

- **3 weeks**
- lecture count per week: **not assumed**
- exact source count, topic count, and sequence will be derived from the uploaded files

## Start here when files arrive

1. Upload all Week 1 source files.
2. Populate `data/excel-intake/source-manifest.json` from the actual files.
3. Run `node tools/excel-intake-check.mjs`.
4. Build/update Excel curriculum and syllabus map from source content.
5. Repeat for Week 2, then Week 3.
6. Only after all 3 weeks pass coverage QA can Excel move toward final-ready status.

## Source rule

Uploaded Excel course files are the educational source of truth. No lecture count, formula list, topic allocation, or missing curriculum content is invented before intake.



## Week 1 received

- 9 PPTX files
- 262 slides
- 6 Excel Core sources
- 3 Statistics Prerequisite sources
- Scope Decision: **B**

Statistics sources remain in the Week 1 learning journey but are excluded from Excel assessments and Excel Track Final.

See:
- `docs/excel-production/WEEK-1-SOURCE-INVENTORY.md`
- `docs/excel-production/WEEK-1-SCOPE-DECISION-B.md`


## Week 1 full audit complete

Week 1 is now:
- source-audited
- content-sequenced
- coverage-audited
- Decision B enforced

Coverage:
- 70 concept clusters
- 53 Excel Core
- 17 Statistics Prerequisite
- 8 source QA issues/gaps
- 5 overlap resolutions

Next gate: **Week 1 Study Production**.
