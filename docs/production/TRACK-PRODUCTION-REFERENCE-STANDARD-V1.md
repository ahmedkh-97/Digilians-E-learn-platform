# Digilians E-Learn — Track Production Reference Standard V1

**Status:** Approved reference standard  
**Reference implementation:** Excel Track  
**Applies to:** Future Data Analysis tracks added to the platform  
**Runtime impact:** None — this document defines production/readiness rules only.

## 1. Purpose

This standard defines the minimum production quality a track must reach before it is called **Production Ready**. Excel is the reference implementation because it currently has the complete end-to-end flow: source audit, structured study, practice, an independent full-track exam, results analytics, My Mistakes, ranking, data-safety protection, accessibility/UX guardrails, portable QA, and package verification.

The goal is to avoid re-designing the production process for every future track and to prevent partial or superficially complete tracks from being treated as finished.

## 2. Non-Negotiable Production Principles

1. **Source-grounded content only.** Educational content must be traceable to the approved course sources. Unsupported content is not silently added.
2. **Study before assessment.** Study coverage and source mapping are closed before Practice or Exam production is considered final.
3. **Practice and Exam are different products.** Practice may teach/reinforce. The full-track Exam must use an independent question bank or independently authored exam wording; it must not simply replay Practice questions.
4. **Assessment boundary is explicit.** Concepts must be classified as assessment-eligible, supporting, bridge, source-issue, or otherwise excluded before assessment production.
5. **No hidden state damage.** Updates must preserve learner profile, progress, results, My Mistakes, ranking state, bookmarks/review state, and other protected local data unless the release explicitly changes one of those contracts.
6. **Targeted tests during development; full regression at the end.** Use Smart Workflow V3 rather than repeating the full platform suite after every small edit.
7. **Package verification is mandatory.** The final ZIP must be extracted to a fresh folder and tested as the deliverable itself. Tests must not depend on the development workspace or absolute local paths.
8. **Manual browser acceptance closes the release.** Automated tests do not replace final visual/navigation acceptance in a real browser.

## 3. Standard Production Lifecycle

### Gate A — Source Intake & Audit
A track cannot enter Study Production until all current source files are inventoried and audited.

Required evidence:
- source manifest with stable IDs and exact filenames;
- source counts and page/slide counts where applicable;
- source ordering/dependencies;
- known source inconsistencies and environment-dependent features;
- overlap/reuse decisions;
- assessment boundary decisions.

**Pass condition:** every production concept can be traced to an approved source or explicitly identified as bridge/supporting content derived from the approved source structure.

### Gate B — Study Production
Study must be organized for learning rather than mirroring raw file order when grouping improves comprehension.

Every approved lesson must provide, as supported by the source:
- clear title and learning purpose;
- beginner-first explanation;
- important English technical terms;
- workflow/steps/formulas/code when present in the material;
- meaningful examples or source-supported visuals when needed;
- common mistakes or caveats where relevant;
- quick check or equivalent retrieval check;
- source trace.

**Pass condition:** no missing lesson mappings, duplicate concept production, broken source traces, placeholders, generic boilerplate, or unresolved source issues presented as assessment facts.

### Gate C — Practice Production
Practice must cover the approved assessment boundary without becoming a copy of the final exam.

Required:
- explicit mapping to assessment-eligible concepts;
- deterministic IDs and traceability;
- valid MCQ structure;
- useful explanations for the correct answer and distractors when the platform mode requires it;
- balanced answer positions;
- no answer leakage in stems;
- no weak/truncated/generic stems;
- My Mistakes integration;
- resume/progress support where applicable;
- **non-ranked by default** unless a future product decision explicitly changes this rule.

**Pass condition:** all intended eligible concepts are covered according to the track's approved Practice design, with no missing/duplicate mapping and no regression to protected assessment data.

### Gate D — Independent Full-Track Exam Bank
The full-track exam bank must be independently authored from the same approved concepts/sources.

Required:
- no direct Practice item reuse by ID or wording;
- enough depth by concept/group/difficulty/question family to support fair alternate forms;
- source-grounded distractors;
- semantic alignment between clue, concept, and answer;
- explicit exclusion from unrelated/global final-exam pools unless separately approved.

**Pass condition:** bank quality gates pass and the bank is large/deep enough for the approved dynamic or fixed exam design.

### Gate E — Exam Blueprint & Fairness
Every dynamic exam must have an explicit validated blueprint.

A blueprint must specify:
- total question count;
- duration;
- pass score;
- difficulty profile;
- source policy;
- module/week quotas when relevant;
- group/topic quotas or coverage policy;
- question-family balance;
- duplicate-concept policy;
- shuffle policy;
- answer-position balance policy;
- ranking eligibility.

**Pass condition:** multiple generated forms preserve the approved profile and do not create materially easier/harder attempts.

### Gate F — Runtime Integration
Integrate the approved assessment without breaking existing flows.

Required checks:
- correct track/module routing;
- Timer behavior;
- Resume/pause behavior;
- MARK/review behavior;
- navigator state;
- submit behavior;
- immediate vs end-of-exam feedback contract;
- result persistence;
- My Mistakes persistence;
- correct cache/version loading;
- no accidental opening of locked assessment gates.

### Gate G — Results, Ranking & Analytics
Results must be useful to the learner and safe for shared ranking.

For a ranked full-track exam, require:
- overall score;
- correct/wrong count;
- pass/fail status;
- breakdown at the approved curriculum level (for Excel: Week + Learning Group);
- result persistence;
- My Mistakes compatibility;
- ranking only when the exam is explicitly ranked;
- stable player/attempt identity with compatibility-safe UUID generation.

Practice attempts must not leak into ranked leaderboards unless the product explicitly changes that contract.

### Gate H — Data Safety & Compatibility
Every production release must protect learner state.

Required:
- versioned storage schema;
- future-schema guard;
- compatibility-safe runtime IDs;
- localStorage failure resilience;
- backup/restore compatibility;
- rollback on failed restore/migration writes;
- owner isolation for user-specific reset operations;
- benign browser noise separated from real platform errors.

### Gate I — UX, Accessibility & Performance
Do not redesign for the sake of redesign. Fix proven UX risks.

Minimum requirements:
- logical Back/Next/Home destinations;
- track exam returns to its track context;
- keyboard-visible focus;
- usable dark-mode contrast;
- dynamic feedback exposed as live updates where relevant;
- loading/error states for startup-critical flows;
- no startup race allowing actions before core data is ready;
- performance budget gate for critical startup payload.

### Gate J — Final Regression & Package Verification
Run the full platform gate only after the feature is complete.

Required final checks:
- full automated tests;
- Pre-Deploy gate;
- track intake/readiness gate;
- all JSON parse;
- all JS/MJS syntax;
- registry file references resolve;
- HTTP smoke from a local server;
- protected-file hash comparison;
- no absolute development-workspace paths in tests/tools;
- build one ZIP;
- extract the ZIP to a fresh folder;
- repeat critical verification on the extracted package.

### Gate K — Manual Browser Acceptance
A release is not finally approved until the actual package is tested manually in a browser for the critical learner journey.

Minimum manual flow:
1. first visit / returning learner;
2. theme and profile state;
3. Study navigation;
4. Practice start → answer → resume → submit;
5. full-track Exam start → timer → mark → exit/resume → submit;
6. result breakdown;
7. My Mistakes;
8. Ranking for ranked exams;
9. refresh/update behavior.

## 4. Smart Workflow V3 — Execution Rule

Use this sequence for future production work:

`Approved Baseline → Short Design → Data/Content → Targeted QA → Logic/Engine → Targeted Tests → Runtime Integration → Feature Regression → Full Regression → Version/Cache/Changelog → Package → Fresh-Package Verification → Manual Browser Acceptance`

### Testing rule
- During a stage: run only the tests that prove that stage plus directly affected regressions.
- At milestone boundaries: run the feature regression.
- Before release: run the full regression once.
- If a test fails: reproduce → identify root cause → add/confirm regression → fix root cause → rerun targeted gate.
- Never weaken a test only to obtain a green build.

## 5. Protected Areas

Unless the feature explicitly targets them, treat the following as protected:
- Official QBank;
- historical Question Banks;
- historical Exams;
- approved Study content from previously closed tracks/weeks;
- Practice banks from previously closed releases;
- Results/Ranking contracts;
- My Mistakes contracts;
- learner storage schema/data;
- source manifests and curriculum mappings.

Final package QA must prove unintended protected changes = **0**.

## 6. Definition of Production Ready

A track is **Production Ready** only when:
- all applicable Gates A–K are complete;
- no blocking source ambiguity remains hidden;
- Study, Practice, and Full-Track Exam status are explicitly known;
- all automated release gates pass on the final extracted package;
- manual browser acceptance passes;
- known non-blocking limitations are documented.

A track with only Study content is **Study Ready**, not Production Ready.  
A track with Study + Practice but no approved full-track assessment is **Practice Ready**, not fully Production Ready.

## 7. Excel as the Reference Implementation

Excel is the reference track for this standard. Exact current evidence is documented in:

`docs/production/EXCEL-REFERENCE-TRACK-EVIDENCE-V1.md`

The reusable approval checklist is:

`docs/production/TRACK-PRODUCTION-READINESS-CHECKLIST-V1.md`
