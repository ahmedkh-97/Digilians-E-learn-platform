from pathlib import Path

js_path=Path('assets/js/pl300-full-ranked-learning.js')
js=js_path.read_text(encoding='utf-8')
old='<div><i style="width:${progressModel.percentage}%"></i></div></section>'
new='<div class="source-review-progress-track"><i style="width:${progressModel.percentage}%"></i></div></section>'
if old in js:
    js=js.replace(old,new,1)
elif new not in js:
    raise SystemExit('progress track markup anchor missing')
js_path.write_text(js,encoding='utf-8')

css_path=Path('assets/css/pl300.css')
css=css_path.read_text(encoding='utf-8')
old_rule='.source-review-progress{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center;margin:10px 0 15px;color:var(--muted);font-size:.75rem;font-weight:850}.source-review-progress>div{grid-column:1/-1;height:6px;border-radius:999px;background:var(--line);overflow:hidden}.source-review-progress i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--primary),#7c5cff)}'
new_rule='.source-review-progress{display:grid;gap:7px;align-items:center;margin:10px 0 15px;color:var(--muted);font-size:.75rem;font-weight:850}.source-review-progress-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.source-review-progress>small{color:var(--muted);font-weight:800}.source-review-progress-track{height:6px;border-radius:999px;background:var(--line);overflow:hidden}.source-review-progress-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--primary),#7c5cff)}'
if old_rule in css:
    css=css.replace(old_rule,new_rule,1)
elif new_rule not in css:
    raise SystemExit('progress CSS anchor missing')
css_path.write_text(css,encoding='utf-8')
print('V0.22.6 Task 3 progress CSS patch applied or already present.')
