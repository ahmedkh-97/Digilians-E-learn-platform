# Track Production Readiness Checklist V1

Use this checklist for every future Data Analysis track. A track is not marked **Production Ready** until every applicable blocking item is checked and supported by evidence.

## A. Source Intake & Audit
- [ ] All current source files are inventoried with stable source IDs.
- [ ] Exact filenames and source counts are recorded.
- [ ] Page/slide counts are recorded where applicable.
- [ ] Source ordering and dependencies are documented.
- [ ] Overlap/reuse decisions are documented.
- [ ] Known source inconsistencies are documented.
- [ ] Environment/version-dependent material is labelled.
- [ ] Assessment boundary is explicitly classified.
- [ ] Every production concept has a valid source mapping.

## B. Study Production
- [ ] Study structure is learner-oriented, not a raw file dump.
- [ ] Every approved lesson has a unique stable ID.
- [ ] Every approved concept is mapped exactly once unless reuse is explicitly documented.
- [ ] Beginner explanation is meaningful and not generic boilerplate.
- [ ] Important technical terms are preserved.
- [ ] Steps/formulas/code are included when supported by the source.
- [ ] Examples/visuals are included when required for understanding and supported by the source.
- [ ] Common mistakes/caveats are lesson-specific where relevant.
- [ ] Every lesson has a useful quick check or equivalent retrieval check.
- [ ] Every lesson has a valid source trace.
- [ ] Source trace references resolve to known sources and valid pages/slides where tracked.
- [ ] No placeholders, unfinished markers, undefined values, or null leakage is learner-facing.
- [ ] High-similarity/duplicate production content has been audited.
- [ ] Source issues are not silently converted into assessment facts.
- [ ] Study manual visual acceptance is complete.

## C. Practice Production
- [ ] Practice design is approved before production.
- [ ] Practice only uses the approved assessment boundary.
- [ ] Practice coverage target is explicit.
- [ ] Practice question IDs are unique and stable.
- [ ] Concept mapping has no unintended missing/duplicates.
- [ ] Question stems and options are learner-facing and clear.
- [ ] No correct-answer leakage appears in the stem.
- [ ] No weak/truncated/meta-source wording remains.
- [ ] Distractors are semantically plausible.
- [ ] Correct answer positions are reasonably balanced.
- [ ] Explanations are present according to platform contract.
- [ ] Source trace is preserved.
- [ ] Practice is non-ranked unless explicitly approved otherwise.
- [ ] My Mistakes integration passes.
- [ ] Resume/progress persistence passes.
- [ ] Practice manual browser acceptance passes.

## D. Independent Full-Track Exam Bank
- [ ] Exam bank is independent from Practice item identity/wording.
- [ ] Bank covers the intended assessment concepts/groups.
- [ ] Bank has sufficient depth for the approved exam form(s).
- [ ] Difficulty distribution is feasible.
- [ ] Question-family distribution is feasible.
- [ ] Distractors are source-grounded and concept-aligned.
- [ ] No duplicate stems.
- [ ] No answer leakage.
- [ ] No generic/truncated/meta-source wording.
- [ ] Track-only bank cannot leak into unrelated final-exam pools unless approved.

## E. Exam Blueprint & Fairness
- [ ] Total question count is fixed in the blueprint.
- [ ] Timer duration is fixed in the blueprint.
- [ ] Passing score is fixed in the blueprint.
- [ ] Difficulty quotas are explicit.
- [ ] Source policy is explicit.
- [ ] Week/module quotas are explicit where relevant.
- [ ] Group/topic coverage policy is explicit.
- [ ] Question-family quotas are explicit where relevant.
- [ ] Duplicate-concept behavior is explicit.
- [ ] Question shuffle policy is explicit.
- [ ] Option shuffle policy is explicit.
- [ ] Correct-answer remapping after shuffle is tested.
- [ ] Multiple generated forms preserve the approved profile.
- [ ] Ranking eligibility is explicit.

## F. Runtime Integration
- [ ] Track/Exam registry linkage is valid.
- [ ] Locked gates remain locked.
- [ ] Start flow works.
- [ ] Timer works.
- [ ] Pause/Resume behavior works.
- [ ] MARK/review behavior works.
- [ ] Question navigator works.
- [ ] Submit works.
- [ ] Result persistence works.
- [ ] Feedback mode follows the approved contract.
- [ ] Cache/version imports are current.
- [ ] Startup works on a new profile and returning profile.

## G. Results / My Mistakes / Ranking
- [ ] Overall score is correct.
- [ ] Correct/wrong counts are correct.
- [ ] Pass/fail state is correct.
- [ ] Curriculum breakdown is useful at the approved level.
- [ ] Result persists after refresh.
- [ ] Wrong answers flow into My Mistakes correctly.
- [ ] Reset My Mistakes does not erase unrelated learner state.
- [ ] Practice attempts do not enter ranking unless explicitly approved.
- [ ] Ranked Exam attempts enter ranking correctly.
- [ ] Attempt/player IDs use compatibility-safe generation.

## H. Data Safety
- [ ] Learner storage schema is versioned.
- [ ] Future-schema guard is active.
- [ ] localStorage failures do not crash startup.
- [ ] Backup export contains required learner state.
- [ ] Restore validates input.
- [ ] Failed restore/migration writes roll back safely.
- [ ] Owner-specific state operations are isolated.
- [ ] Updating the track does not erase previous Study/Practice/Result/Mistake state.

## I. UX / Accessibility / Performance
- [ ] Back/Next/Home destinations are context-correct.
- [ ] Full-track Exam returns to the originating track context.
- [ ] Keyboard focus is visible.
- [ ] Dark-mode contrast is acceptable for critical controls/text.
- [ ] Dynamic feedback/status is exposed accessibly where needed.
- [ ] Loading states prevent premature interaction.
- [ ] Error states are useful and non-destructive.
- [ ] Empty states are understandable.
- [ ] Mobile layout is usable on critical flows.
- [ ] Critical startup payload remains inside the project performance budget.

## J. Final Automated Release Gate
- [ ] Feature regression passes.
- [ ] Full platform regression passes.
- [ ] Pre-Deploy passes.
- [ ] Track intake/readiness gate passes.
- [ ] All JSON files parse.
- [ ] All JS/MJS files pass syntax checks.
- [ ] Registry file references resolve.
- [ ] HTTP smoke passes.
- [ ] Tests/tools contain no environment-specific absolute workspace paths.
- [ ] Protected-file comparison shows zero unintended changes.
- [ ] Version/cache/changelog are consistent.

## K. Package Verification
- [ ] Exactly one final package is built after Full Regression passes.
- [ ] Final package checksum is generated.
- [ ] Package is extracted into a fresh folder.
- [ ] Full/critical automated verification is rerun from the extracted package.
- [ ] Portable tests run from outside the project working directory.
- [ ] HTTP smoke is run against files resolved from project registries, not hard-coded QA paths.

## L. Manual Browser Acceptance
- [ ] First-visit flow passes.
- [ ] Returning learner flow passes.
- [ ] Theme/profile state passes.
- [ ] Study navigation passes.
- [ ] Practice start/resume/submit passes.
- [ ] Full-track Exam timer/MARK/resume/submit passes.
- [ ] Results breakdown passes.
- [ ] My Mistakes passes.
- [ ] Ranking passes for ranked exams.
- [ ] Refresh/update behavior passes.

## Final Status
Only use one of these labels:
- **INTAKE INCOMPLETE**
- **STUDY IN PRODUCTION**
- **STUDY READY**
- **PRACTICE READY**
- **FULL-TRACK EXAM READY**
- **PRODUCTION READY**

`PRODUCTION READY` requires all applicable sections above plus manual browser acceptance.
