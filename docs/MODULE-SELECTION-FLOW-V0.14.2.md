# Module Selection Flow Fix — V0.14.2

## User problem

After choosing a session in Learn, the selected module title changed but the viewport stayed around the session list. The user could not immediately see the intended next steps.

## Fixed behavior

When a session is clicked:

1. The clicked session receives a persistent selected state.
2. The module title and description are updated.
3. A `SELECTED SESSION` confirmation strip is updated.
4. The viewport smoothly scrolls to the `Study → Practice → Exam` learning path.
5. The learning path briefly receives a focus highlight so the next action is visually obvious.

Opening a track initially still selects the first module, but does not force-scroll the user to the path before they explicitly choose a session.

## Accessibility

- Module buttons expose `aria-pressed`.
- The selected-session confirmation uses `aria-live="polite"`.
- Smooth scrolling falls back to instant movement when `prefers-reduced-motion` is enabled.

## Regression QA

- All JSON files parse.
- All JavaScript files pass `node --check`.
- All direct JavaScript DOM IDs exist.
- SQL: 8 sessions / 13 banks / 520 questions preserved.
- SQL readability mode from V0.14.1 preserved.
- 8 SQL Session Practice exams and the 50Q SQL Track Exam preserved.
- Junior Official QBank remains 930.
- Professional Official QBank remains 1189.
- Ranking V2 remains present.
