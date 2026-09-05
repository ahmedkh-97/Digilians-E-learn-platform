#!/usr/bin/env python3
from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'assets/js/app.js'
CSS=ROOT/'assets/css/pl300.css'
app=APP.read_text(encoding='utf-8')
css=CSS.read_text(encoding='utf-8')

old_import='isStructuredQuestion,structuredFields,structuredFieldChoices,structuredAnswerFields,structuredAnswerComplete,structuredExpectedDisplay,structuredSelectedDisplay,structuredFieldCorrect,'
new_import='isStructuredQuestion,structuredFields,structuredFieldChoices,structuredChoicePool,structuredInteractionKind,structuredBinaryChoices,structuredAnswerFields,structuredAnswerComplete,structuredExpectedDisplay,structuredSelectedDisplay,structuredFieldCorrect,'
if old_import in app:
    app=app.replace(old_import,new_import,1)
elif new_import not in app:
    raise SystemExit('PL-300 structured helper import signature not found')

replacement=r'''function renderRankedStructuredInputs(question,list,{selected,confirmed,feedbackReady}={}){
  const values=structuredAnswerFields(selected);
  const showFieldFeedback=state.feedbackMode==='instant'&&feedbackReady&&structuredAnswerComplete(question,selected);
  const interaction=structuredInteractionKind(question);
  const locked=Boolean(confirmed)||(state.feedbackMode==='instant'&&!isCurrentVoucherRankedLearning()&&structuredAnswerComplete(question,selected));
  list.classList.add('ranked-structured-list');
  list.dataset.structuredInteraction=interaction;

  const appendFeedback=(row,field,value)=>{
    if(!showFieldFeedback)return;
    const correct=structuredFieldCorrect(field,value);
    row.classList.add(correct?'correct':'wrong');
    const note=document.createElement('small');
    note.className='ranked-structured-expected';
    note.textContent=correct?'Correct ✓':`Expected: ${String((field.expected||[])[0]??'')}`;
    row.appendChild(note);
  };

  if(interaction==='yes-no'){
    for(const field of structuredFields(question)){
      const row=document.createElement('div');
      row.className='ranked-structured-field ranked-structured-binary';
      row.innerHTML=`<span class="ranked-structured-label">${escapeHtml(field.label||field.id)}</span>`;
      const group=document.createElement('div');
      group.className='ranked-structured-binary-controls';
      group.setAttribute('role','group');
      for(const choice of structuredBinaryChoices(question,field)){
        const button=document.createElement('button');
        button.type='button';
        button.className='ranked-structured-binary-option';
        button.textContent=choice;
        button.dataset.rankedStructuredBinary=String(field.id);
        button.dataset.rankedStructuredValue=choice;
        const active=String(values?.[field.id]??'').toLowerCase()===String(choice).toLowerCase();
        button.classList.toggle('selected',active);
        button.setAttribute('aria-pressed',active?'true':'false');
        button.disabled=locked;
        button.addEventListener('click',()=>updateStructuredField(question,field.id,choice));
        group.appendChild(button);
      }
      row.appendChild(group);
      appendFeedback(row,field,values?.[field.id]);
      list.appendChild(row);
    }
    return;
  }

  let dragged='';
  if(interaction==='ordered-fields'){
    const pool=document.createElement('div');
    pool.className='ranked-structured-choice-pool';
    pool.innerHTML='<small>Drag a source-backed choice to a target, or use the dropdown for keyboard access.</small>';
    const choices=document.createElement('div');
    choices.className='ranked-structured-choice-list';
    for(const choice of structuredChoicePool(question)){
      const chip=document.createElement('button');
      chip.type='button';
      chip.className='ranked-structured-choice';
      chip.textContent=choice;
      chip.draggable=!locked;
      chip.disabled=locked;
      chip.dataset.rankedStructuredChoice=choice;
      chip.addEventListener('dragstart',event=>{
        dragged=choice;
        try{event.dataTransfer?.setData('text/plain',choice);event.dataTransfer.effectAllowed='copy';}catch{}
      });
      chip.addEventListener('dragend',()=>{dragged='';});
      choices.appendChild(chip);
    }
    pool.appendChild(choices);
    list.appendChild(pool);
  }

  for(const [fieldIndex,field] of structuredFields(question).entries()){
    const row=document.createElement('label');
    row.className=`ranked-structured-field${interaction==='ordered-fields'?' ranked-structured-drop-target':''}`;
    if(interaction==='ordered-fields')row.dataset.rankedStructuredDropField=String(field.id);
    const orderPrefix=interaction==='ordered-fields'?`<b>${fieldIndex+1}</b> `:'';
    row.innerHTML=`<span class="ranked-structured-label">${orderPrefix}${escapeHtml(field.label||field.id)}</span>`;
    const choices=structuredFieldChoices(field);
    const effectiveChoices=interaction==='ordered-fields'&&choices.length===0?structuredChoicePool(question):choices;
    const input=effectiveChoices.length?document.createElement('select'):document.createElement('input');
    if(effectiveChoices.length){
      const placeholder=document.createElement('option');
      placeholder.value='';
      placeholder.textContent='Select an answer';
      input.appendChild(placeholder);
      for(const choice of effectiveChoices){
        const option=document.createElement('option');
        option.value=choice;
        option.textContent=choice;
        input.appendChild(option);
      }
    }else{
      input.type='text';
      input.autocomplete='off';
      input.spellcheck=false;
      input.placeholder='Type the source answer';
    }
    input.setAttribute('data-ranked-structured-field',String(field.id));
    input.value=String(values?.[field.id]??'');
    input.disabled=locked;
    if(showFieldFeedback)input.classList.add(structuredFieldCorrect(field,input.value)?'correct':'wrong');
    input.addEventListener(effectiveChoices.length?'change':'input',event=>updateStructuredField(question,field.id,event.target.value));
    row.appendChild(input);
    if(interaction==='ordered-fields'){
      row.addEventListener('dragover',event=>{if(locked)return;event.preventDefault();row.classList.add('drag-over');});
      row.addEventListener('dragleave',()=>row.classList.remove('drag-over'));
      row.addEventListener('drop',event=>{
        if(locked)return;
        event.preventDefault();row.classList.remove('drag-over');
        const value=dragged||event.dataTransfer?.getData('text/plain')||'';
        if(!value)return;
        input.value=value;
        updateStructuredField(question,field.id,value);
      });
    }
    appendFeedback(row,field,input.value);
    list.appendChild(row);
  }
}
'''

pattern=re.compile(r"function renderRankedStructuredInputs\(question,list,\{selected,confirmed,feedbackReady\}=\{\}\)\{.*?\n\}\n(?=function renderQuestion\(\)\{)",re.S)
if pattern.search(app):
    app=pattern.sub(lambda _:replacement,app,count=1)
elif 'list.dataset.structuredInteraction=interaction' not in app:
    raise SystemExit('renderRankedStructuredInputs block not found')

marker='/* V0.22.3 RANKED NATIVE INTERACTIONS */'
if marker not in css:
    css+=r'''

/* V0.22.3 RANKED NATIVE INTERACTIONS */
.ranked-structured-list[data-structured-interaction="yes-no"],.ranked-structured-list[data-structured-interaction="ordered-fields"]{gap:12px}
.ranked-structured-binary-controls{display:grid;grid-template-columns:repeat(2,minmax(92px,1fr));gap:9px}
.ranked-structured-binary-option{min-height:44px;border:1px solid var(--line);border-radius:11px;background:var(--surface-soft);color:var(--text);font:inherit;font-weight:850;cursor:pointer}
.ranked-structured-binary-option.selected{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 12%,var(--surface));box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 10%,transparent)}
.ranked-structured-binary-option:disabled{cursor:default;opacity:1}
.ranked-structured-choice-pool{display:grid;gap:9px;padding:12px;border:1px dashed color-mix(in srgb,var(--primary) 35%,var(--line));border-radius:14px;background:color-mix(in srgb,var(--primary) 3%,var(--surface))}
.ranked-structured-choice-pool>small{color:var(--muted);font-weight:750}.ranked-structured-choice-list{display:flex;flex-wrap:wrap;gap:8px}
.ranked-structured-choice{padding:8px 11px;border:1px solid var(--line);border-radius:999px;background:var(--surface);color:var(--text);font:inherit;font-size:.78rem;font-weight:800;cursor:grab}
.ranked-structured-choice:disabled{cursor:default;opacity:.72}.ranked-structured-drop-target{transition:border-color .16s ease,background .16s ease,transform .16s ease}.ranked-structured-drop-target.drag-over{border-color:var(--primary)!important;background:color-mix(in srgb,var(--primary) 9%,var(--surface));transform:translateY(-1px)}
.ranked-structured-drop-target .ranked-structured-label b{display:inline-grid;place-items:center;min-width:23px;height:23px;margin-right:6px;border-radius:50%;background:var(--surface-soft);color:var(--primary)}
.ranked-structured-field.correct{border-color:color-mix(in srgb,var(--success) 50%,var(--line))!important}.ranked-structured-field.wrong{border-color:color-mix(in srgb,var(--danger) 48%,var(--line))!important}
@media(max-width:560px){.ranked-structured-choice{width:100%;border-radius:10px;text-align:left}}
'''

APP.write_text(app,encoding='utf-8')
CSS.write_text(css,encoding='utf-8')
print('V0.22.3 ranked native renderer patch applied.')
