#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'assets/js/app.js'; CSS=ROOT/'assets/css/pl300.css'
app=APP.read_text(encoding='utf-8'); css=CSS.read_text(encoding='utf-8')
old='isStructuredQuestion,structuredFields,structuredFieldChoices,structuredAnswerFields,structuredAnswerComplete,structuredExpectedDisplay,structuredSelectedDisplay,structuredFieldCorrect,'
new='isStructuredQuestion,structuredFields,structuredFieldChoices,structuredInteractionKind,structuredBinaryChoices,structuredAnswerFields,structuredAnswerComplete,structuredExpectedDisplay,structuredSelectedDisplay,structuredFieldCorrect,'
if old in app: app=app.replace(old,new,1)
elif new not in app: raise SystemExit('structured import not found')

replacement=r'''function renderRankedStructuredInputs(q,list,{selected,confirmed,feedbackReady}={}){
  const values=structuredAnswerFields(selected),fields=structuredFields(q),kind=structuredInteractionKind(q),done=structuredAnswerComplete(q,selected),instant=state.feedbackMode==='instant',locked=Boolean(confirmed)||(instant&&!isCurrentVoucherRankedLearning()&&done),feedback=instant&&feedbackReady&&done;
  list.classList.add('ranked-structured-list');
  const grade=(row,f,v)=>{if(!feedback)return;const ok=structuredFieldCorrect(f,v),n=document.createElement('small');row.classList.add(ok?'correct':'wrong');n.className='ranked-structured-expected';n.textContent=ok?'Correct ✓':`Expected: ${String((f.expected||[])[0]??'')}`;row.append(n)};
  if(kind==='yes-no'){for(const f of fields){const row=document.createElement('div');row.className='ranked-structured-field';row.innerHTML=`<span class="ranked-structured-label">${escapeHtml(f.label||f.id)}</span><div class="ranked-structured-binary-controls"></div>`;for(const c of structuredBinaryChoices(q,f)){const b=document.createElement('button'),on=String(values?.[f.id]??'').toLowerCase()===String(c).toLowerCase();b.type='button';b.className=`ranked-structured-binary-option${on?' selected':''}`;b.textContent=c;b.ariaPressed=on;b.disabled=locked;b.onclick=()=>updateStructuredField(q,f.id,c);row.lastElementChild.append(b)}grade(row,f,values?.[f.id]);list.append(row)}return}
  for(const f of fields){const row=document.createElement('label'),choices=structuredFieldChoices(f),input=choices.length?document.createElement('select'):document.createElement('input');row.className='ranked-structured-field';row.innerHTML=`<span class="ranked-structured-label">${escapeHtml(f.label||f.id)}</span>`;if(choices.length)input.innerHTML='<option value="">Select</option>'+choices.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');else input.type='text';input.setAttribute('data-ranked-structured-field',f.id);input.value=String(values?.[f.id]??'');input.disabled=locked;if(feedback)input.classList.add(structuredFieldCorrect(f,input.value)?'correct':'wrong');input.addEventListener(choices.length?'change':'input',e=>updateStructuredField(q,f.id,e.target.value));row.append(input);grade(row,f,input.value);list.append(row)}
}
'''
pattern=re.compile(r"function renderRankedStructuredInputs\(question,list,\{selected,confirmed,feedbackReady\}=\{\}\)\{.*?\n\}\n(?=function renderQuestion\(\)\{)",re.S)
if pattern.search(app): app=pattern.sub(lambda _:replacement,app,count=1)
elif 'structuredInteractionKind(q)' not in app: raise SystemExit('renderer block not found')

marker='/* V0.22.3 RANKED NATIVE INTERACTIONS */'
if marker not in css:
 css+=r'''

/* V0.22.3 RANKED NATIVE INTERACTIONS */
.ranked-structured-binary-controls{display:grid;grid-template-columns:repeat(2,minmax(92px,1fr));gap:9px}.ranked-structured-binary-option{min-height:44px;border:1px solid var(--line);border-radius:11px;background:var(--surface-soft);color:var(--text);font:inherit;font-weight:850;cursor:pointer}.ranked-structured-binary-option.selected{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 12%,var(--surface))}.ranked-structured-field.correct{border-color:var(--success)!important}.ranked-structured-field.wrong{border-color:var(--danger)!important}
'''
APP.write_text(app,encoding='utf-8');CSS.write_text(css,encoding='utf-8')
print('V0.22.3 compact ranked native renderer patch applied.')
