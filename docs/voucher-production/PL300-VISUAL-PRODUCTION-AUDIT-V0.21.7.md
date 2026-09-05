# Microsoft PL-300 — Visual Production Audit V0.21.7

Release date: 2026-09-05

## Scope

Final pre-release audit of every released PL-300 question that depends on an exhibit, screenshot, answer area, or other visual context. The audit is fail-closed and is wired into `tools/pre-deploy-check.mjs`.

## Verified production counts

- Released PL-300 questions: **200**
- Released visual-backed questions: **45**
- Draft visual-backed questions: **53**
- Visual manifest items: **53**
- Released manual-review items: **45**
- Manual review disposition: **45 approved / 0 unresolved**
- Asset type mix: **29 source crops / 16 reconstructed exhibits**
- Released exhibit-dependent questions missing a visual asset: **0**

## Safety rules enforced

1. Every released `visualRequired` question must have a local `visualAsset` and non-empty `visualAlt`.
2. Every released visual must have matching manifest provenance.
3. Supported provenance policies are reviewed question-region crops or reconstructed-from-reviewed-source-data exhibits.
4. Large case-study source blocks are not automatically cropped into misleading answer-leaking snippets.
5. Every released visual must have an explicit manual review disposition of `approved`.
6. Any released question whose wording signals an exhibit/screenshot/answer area must not ship without a visual asset.

## Owner-approved Q184 correction

Source 01 Q184 (`pl300-56653824317c`) was the only visual-review blocker. The reconstructed exhibit clearly shows the same `DimAddress` table used through separate Billing Address and Mailing Address relationships. The owner approved **Correction C-016**, so production scoring is now **C — role-playing dimension**.

The original source answer (`A — Type 2 slowly changing dimension (SCD)`) remains preserved verbatim in `sourceRefs`, `sourceExplanation`, and `corrections.json` provenance. The correction affects scoring/explanatory guidance only.

## Verification command

```bash
node tools/pl300-visual-audit.mjs
```

Expected result: `PL-300 VISUAL AUDIT PASS`.
