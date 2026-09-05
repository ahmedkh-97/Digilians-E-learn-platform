#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'assets/js/app.js'; CSS=ROOT/'assets/css/pl300.css'
app=APP.read_text(encoding='utf-8'); css=CSS.read_text(encoding='utf-8')
old='isStructuredQuestion,structuredFields,structuredFieldChoices,structuredAnswerFields,structuredAnswerComplete,structuredExpectedDisplay,structuredSelectedDisplay,structuredFieldCorrect,'
new='isStructuredQuestion,structuredFields,structuredFieldChoices,structuredChoicePool,structuredInteractionKind,structuredBinaryChoices,structuredAnswerFields,structuredAnswerComplete,structuredExpectedDisplay,structuredSelectedDisplay,structuredFieldCorrect,'
if old in app: app=app.replace(old,new,1)
elif new not in app: raise SystemExit('structured import not found')

replacement=r'''function renderRankedStructuredInputs(q,list,{selected,confirmed,feedbackReady}={}){
  const values=structuredAnswerFields(selected),fields=structuredFields(q),kind=structuredInteractionKind(q),pool=kind==='ordered-fields'?structuredChoicePool(q):[],locked=Boolean(confirmed)||(state.feedbackMode==='instant'&&!isCurrentVoucherRankedLearning()&&structuredAnswerComplete(q,selected)),feedback=state.feedbackMode==='instant'&&feedbackReady&&structuredAnswerComplete(q,selected);
  list.classList.add('ranked-structured-list');list.dataset.structuredInteraction=kind;
  const grade=(row,f,v)=>{if(!feedback)return;const ok=structuredFieldCorrect(f,v);row.classList.add(ok?'correct':'wrong');const n=document.createElement('small');n.className='ranked-structured-expected';n.textContent=ok?'Correct ✓':`Expected: ${String((f.expected||[])[0]??'')}`;row.append(n)};
  if(kind==='yes-no'){
    for(const f of fields){const row=document.createElement('div');row.className='ranked-structured-field ranked-structured-binary';row.innerHTML=`<span class="ranked-structured-label">${escapeHtml(f.label||f.id)}</span><div class="ranked-structured-binary-controls"></div>`;const group=row.lastElementChild;for(const c of structuredBinaryChoices(q,f)){const b=document.createElement('button'),on=String(values?.[f.id]??'').toLowerCase()===String(c).toLowerCase();b.type='button';b.className=`ranked-structured-binary-option${on?' selected':''}`;b.textContent=c;b.dataset.rankedStructuredBinary=f.id;b.dataset.rankedStructuredValue=c;b.ariaPressed=on;b.disabled=locked;b.onclick=()=>updateStructuredField(q,f.id,c);group.append(b)}grade(row,f,values?.[f.id]);list.append(row)}return;
  }
  let dragged='';
  if(pool.length){const box=document.createElement('div');box.className='ranked-structured-choice-pool';box.innerHTML='<small>Drag a source-backed choice to a target, or use the dropdown.</small><div class="ranked-structured-choice-list"></div>';for(const c of pool){const b=document.createElement('button');b.type='button';b.className='ranked-structured-choice';b.textContent=c;b.draggable=!locked;b.disabled=locked;b.dataset.rankedStructuredChoice=c;b.ondragstart=e=>{dragged=c;e.dataTransfer?.setData('text/plain',c)};b.ondragend=()=>dragged='';box.lastElementChild.append(b)}list.append(box)}
  fields.forEach((f,i)=>{const row=document.createElement('label'),choices=structuredFieldChoices(f),opts=pool.length&&!choices.length?pool:choices,input=opts.length?document.createElement('select'):document.createElement('input');row.className=`ranked-structured-field${pool.length?' ranked-structured-drop-target':''}`;row.innerHTML=`<span class="ranked-structured-label">${pool.length?`<b>${i+1}</b> `:''}${escapeHtml(f.label||f.id)}</span>`;if(opts.length){input.innerHTML='<option value="">Select an answer</option>'+opts.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}else{input.type='text';input.placeholder='Type the source answer'}input.setAttribute('data-ranked-structured-field',f.id);input.value=String(values?.[f.id]??'');input.disabled=locked;if(feedback)input.classList.add(structuredFieldCorrect(f,input.value)?'correct':'wrong');input.addEventListener(opts.length?'change':'input',e=>updateStructuredField(q,f.id,e.target.value));row.append(input);if(pool.length){row.dataset.rankedStructuredDropField=f.id;row.ondragover=e=>{if(!locked){e.preventDefault();row.classList.add('drag-over')}};row.ondragleave=()=>row.classList.remove('drag-over');row.ondrop=e=>{if(locked)return;e.preventDefault();row.classList.remove('drag-over');const v=dragged||e.dataTransfer?.getData('text/plain');if(v){input.value=v;updateStructuredField(q,f.id,v)}}}grade(row,f,input.value);list.append(row)})
}
'''
pattern=re.compile(r"function renderRankedStructuredInputs\(question,list,\{selected,confirmed,feedbackReady\}=\{\}\)\{.*?\n\}\n(?=function renderQuestion\(\)\{)",re.S)
if pattern.search(app): app=pattern.sub(lambda _:replacement,app,count=1)
elif 'list.dataset.structuredInteraction=kind' not in app: raise SystemExit('renderer block not found')

marker='/* V0.22.3 RANKED NATIVE INTERACTIONS */'
if marker not in css:
 css+=r'''

/* V0.22.3 RANKED NATIVE INTERACTIONS */
.ranked-structured-list[data-structured-interaction="yes-no"],.ranked-structured-list[data-structured-interaction="ordered-fields"]{gap:12px}.ranked-structured-binary-controls{display:grid;grid-template-columns:repeat(2,minmax(92px,1fr));gap:9px}.ranked-structured-binary-option{min-height:44px;border:1px solid var(--line);border-radius:11px;background:var(--surface-soft);color:var(--text);font:inherit;font-weight:850;cursor:pointer}.ranked-structured-binary-option.selected{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 12%,var(--surface))}.ranked-structured-choice-pool{display:grid;gap:9px;padding:12px;border:1px dashed color-mix(in srgb,var(--primary) 35%,var(--line));border-radius:14px}.ranked-structured-choice-list{display:flex;flex-wrap:wrap;gap:8px}.ranked-structured-choice{padding:8px 11px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--text);font:inherit;font-weight:800;cursor:grab}.ranked-structured-drop-target.drag-over{border-color:var(--primary)!important;background:color-mix(in srgb,var(--primary) 9%,var(--surface))}.ranked-structured-field.correct{border-color:var(--success)!important}.ranked-structured-field.wrong{border-color:var(--danger)!important}@media(max-width:560px){.ranked-structured-choice{width:100%;border-radius:10px}}
'''
APP.write_text(app,encoding='utf-8');CSS.write_text(css,encoding='utf-8')
print('V0.22.3 compact ranked native renderer patch applied.')
