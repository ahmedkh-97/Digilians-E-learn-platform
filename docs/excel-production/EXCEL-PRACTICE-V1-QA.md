# Excel Practice V1 — Final QA

**Release:** V0.20.7 — Excel Practice Production V1  
**Date:** 2026-08-31  
**Scope:** Local production only; no GitHub operations.

## Production Contract

- Week 1: **53** Practice questions.
- Week 2: **89** Practice questions.
- Week 3: **86** Practice questions.
- Total: **228** questions = exactly one question for every `practiceEligible` Excel concept.
- Every question uses `sourceType: course` and retains the owning Study lesson source trace.
- Practice is **non-ranked** and instant-feedback only.
- Excel Exam remains **locked** (`examId: null`).
- My Mistakes / resume behavior uses the existing exam runtime without enabling Ranking.

## Educational QA

- English-only question stems and options.
- Arabic summary explanation plus A/B/C/D option-level reasons.
- No answer text may be exposed verbatim in the question stem.
- Correct-answer positions are balanced per week.
- No truncated fallback contexts or dangling connectors are allowed.
- High-risk lexical mappings have explicit source-grounded semantic overrides, including VLOOKUP, Dynamic Arrays, Outlier IF/OR, dashboard storytelling/design, Power Query workflow, M, relationship types, model filtering, Filled Map customization, Bland–Altman, Ogive, Survival Curve, and Macro workflows.
- Source/environment caveats stay outside assessment where the curriculum marks them ineligible.

## Distribution

### Week 1 — 53
- Difficulty: **23 Easy / 30 Medium / 0 Hard**
- Question types: **38 Direct Knowledge / 11 Calculation Tracing / 4 Scenario Application**
- Correct positions: **A14 / B13 / C13 / D13**

### Week 2 — 89
- Difficulty: **45 Easy / 43 Medium / 1 Hard**
- Question types: **69 Direct Knowledge / 9 Scenario Application / 6 Calculation Tracing / 4 Best Decision / 1 Troubleshooting**
- Correct positions: **A23 / B22 / C22 / D22**

### Week 3 — 86
- Difficulty: **40 Easy / 38 Medium / 8 Hard**
- Question types: **60 Direct Knowledge / 13 Scenario Application / 8 Calculation Tracing / 4 Best Decision / 1 Troubleshooting**
- Correct positions: **A22 / B22 / C21 / D21**

## Known V1 Boundary

Practice V1 prioritizes **complete source coverage** over a forced difficulty ratio. Some source concepts are recognition/direct-knowledge topics, so the difficulty distribution is intentionally not normalized. A later Practice V2 may add additional scenario variants after V1 learner review, but V1 does not invent unsupported cases merely to increase difficulty.

## Final Gates Required Before Release

1. Deterministic builder hashes remain stable across consecutive runs.
2. Full Node regression suite passes with zero failures.
3. Excel Intake check passes.
4. Full Pre-Deploy check passes.
5. Existing Official QBank / Question Banks / non-Excel exams remain byte-identical to the approved V0.20.6 baseline.
6. Only the three Excel Practice files are added under `exams/`.
7. Exact packaged ZIP is unpacked and re-verified before delivery.
