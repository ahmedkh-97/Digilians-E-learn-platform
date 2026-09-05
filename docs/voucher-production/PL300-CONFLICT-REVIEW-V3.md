# Microsoft PL-300 — Conflict Review V3

Status: reviewed-bank V2 prepared for V0.20.30.

## Approved scoring corrections

The original PDF answer ID/text remains preserved in `voucher/tracks/data-analysis/microsoft-pl-300/corrections.json` and in each question's `sourceRefs`. Approved corrections change scoring only for the exact reviewed variant.

- C-001 — Source 02 Q227: reuse the existing Power BI semantic model/dataset rather than rebuilding from the SharePoint folder.
- C-002 — Source 02 Q296: enable report-reader visual personalization rather than create a duplicate report page.
- C-003 — Source 02 Q310: enable report personalization for changing measures, visual type, and legend.
- C-004 — Source 02 Q244: reusable custom report theme is imported from JSON.
- C-005 — Source 02 Q410: malformed legacy variant excluded; Source 01 canonical SharePoint Folder → Transform → Folder Path filter retained.
- C-007 — Source 02 Q407: merge Orders with Order Line Items to flatten the header/detail fact structure.
- C-008 — Source 02 Q147: `Could not find file` canonical causes are moved/wrong location and inaccessible/permissions.
- C-010 — Source 02 Q71: sync the Country slicer across pages 1–3 rather than use page-level filters.
- C-011 — Source 02 Q123: legacy PII-classification variant excluded; Source 01 sensitivity-label canonical variant retained.
- C-013 — Source 02 Q42: pin a supported card tile to a dashboard and set the data alert on the tile.
- C-014 — Source 02 Q102: Analyze in Excel uses Build permission while report Export data can remain disabled.
- C-015 — Source 02 Q307: use an RLS role that enforces both United States and Clothing; report filters are not a security boundary.
- C-016 — Source 01 Q184: score `role-playing dimension` because DimAddress is reused as Billing Address and Mailing Address; preserve the original Type 2 SCD source key as provenance.

## Withheld conflicts — owner approval still required

These variants remain `productionReady:false`; no scoring correction has been applied.

- Source 01 Q327 — monthly refresh wording conflicts with current standard scheduled-refresh intervals; requires a source-faithful adaptation decision.
- Source 01 Q289 — asks specifically for a visual calculation while the supplied answer key uses a model-measure style `CALCULATE(...)`; requires current visual-calculation adaptation review.
- Source 01 Q335 — group-sharing answer is tied to older group terminology/behavior and needs current direct-sharing wording review.
- Source 01 Q53 — DIMCountries uniqueness answer is ambiguous because replacing empty values is not inherently the same requirement as producing unique countries.
- Source 02 Q184 — conflicts with the matching IoT DateTime scenario in Source 01 about preserving hour-level analysis.
- Source 02 Q187 — claims a Power Query filter necessarily loads the full SQL table first and does not account for query folding; requires wording-level review.
- Source 02 Q204 — answer key conflicts with its own explanation around Q&A synonyms.
- Source 02 Q260 — app-to-organization answer appears tied to legacy behavior and remains excluded pending current workflow review.
- Source 02 Q370 — dashboard edit/publish permission answer requires current workspace-role validation.
- Source 02 Q173 — custom-visual security wording requires current tenant-boundary review.
- C-009 — custom report tooltip family: excluded pending current, source-faithful adaptation because neither legacy option set cleanly represents the full current workflow.
- C-012 — 10M-row scatter-plot family: excluded pending final wording-level review because source variants disagree between high-density sampling and trend line.

## Production rule

1. Unapproved or unresolved conflicts remain `productionReady:false`.
2. Retired/malformed variants remain traceable in provenance but are not eligible for Random or Real Exam generation.
3. Source answer keys are never silently overwritten; approved scoring corrections carry a correction ID.
4. Full Source mocks remain withheld until Hotspot / Drag & Drop / visual answer areas can be normalized without leaking solutions.
