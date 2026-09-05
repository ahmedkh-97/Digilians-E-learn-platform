import {
  structuredInteractionKind,
  structuredBinaryChoices,
  structuredChoicePool,
  structuredFieldChoices
} from './exam-structured.js';

const normalize=value=>String(value??"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"");
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

export function ensureNativePracticeStyles(doc=globalThis.document){
  if(!doc?.head||doc.querySelector('link[data-source-native-practice]'))return;
  const link=doc.createElement('link');
  link.rel='stylesheet';
  link.href='assets/css/source-practice-native.css?v=0.22.3';
  link.dataset.sourceNativePractice='1';
  doc.head.append(link);
}

export function nativeInteractionKind(question){
  return structuredInteractionKind({...question,responseType:'structured'});
}

export function nativeAnswers(question,record,tempInputs={},options={}){
  const temp=tempInputs?.[question?.id];
  if(temp&&typeof temp==='object'&&!Array.isArray(temp))return {...temp};
  if(options?.retrying)return {};
  return record?.mode==='native'&&record.answers&&typeof record.answers==='object'?{...record.answers}:{};
}

function fieldChoices(field){
  return structuredFieldChoices(field);
}

export function nativeMatches(question,answers){
  const fields=Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
  if(!fields.length)return false;
  return fields.every(field=>{
    const actual=normalize(answers?.[field.id]);
    return !!actual&&(field.expected||[]).some(value=>normalize(value)===actual);
  });
}

function fieldClass({graded,value,field}){
  if(!graded)return '';
  const correct=value&&(field.expected||[]).some(expected=>normalize(expected)===normalize(value));
  return correct?'correct':'incorrect';
}

function renderChoiceSelect({field,value,locked,extra=''}){
  const choices=fieldChoices(field);
  return `<select data-source-native-field="${escapeHtml(field.id)}" ${extra} ${locked?'disabled':''}><option value="">Select an answer</option>${choices.map(choice=>`<option value="${escapeHtml(choice)}" ${normalize(choice)===normalize(value)?'selected':''}>${escapeHtml(choice)}</option>`).join('')}</select>`;
}

function renderTextField({field,value,locked}){
  return `<input type="text" data-source-native-field="${escapeHtml(field.id)}" value="${escapeHtml(value)}" autocomplete="off" spellcheck="false" placeholder="Type your answer" ${locked?'disabled':''}>`;
}

function renderBinaryField({question,field,value,locked,index,graded}){
  const cls=fieldClass({graded,value,field});
  const choices=structuredBinaryChoices({...question,responseType:'structured'},field);
  const controls=choices.map(choice=>{
    const selected=normalize(choice)===normalize(value);
    return `<button type="button" class="source-native-binary-option${selected?' selected':''}" data-source-native-binary="${escapeHtml(field.id)}" data-source-native-value="${escapeHtml(choice)}" aria-pressed="${selected?'true':'false'}" ${locked?'disabled':''}>${escapeHtml(choice)}</button>`;
  }).join('');
  return `<div class="source-native-field source-native-binary ${cls}" data-native-field="${escapeHtml(field.id)}"><span>${escapeHtml(field.label||`Statement ${index+1}`)}</span><div class="source-native-binary-controls" role="group" aria-label="${escapeHtml(field.label||`Statement ${index+1}`)}">${controls}</div></div>`;
}

function renderOrderedFields({question,fields,answers,locked,graded}){
  const pool=structuredChoicePool({...question,responseType:'structured'});
  const chips=pool.map(choice=>`<button type="button" class="source-native-choice" draggable="${locked?'false':'true'}" data-source-native-choice="${escapeHtml(choice)}" ${locked?'disabled':''}>${escapeHtml(choice)}</button>`).join('');
  const targets=fields.map((field,index)=>{
    const value=answers?.[field.id]||'';
    const cls=fieldClass({graded,value,field});
    const choices=fieldChoices(field);
    const safeField=choices.length?field:{...field,choices:pool};
    return `<label class="source-native-field source-native-drop-target ${cls}" data-source-native-drop-field="${escapeHtml(field.id)}"><span><b>${index+1}</b> ${escapeHtml(field.label||`Step ${index+1}`)}</span>${renderChoiceSelect({field:safeField,value,locked,extra:'data-native-order-select="1"'})}</label>`;
  }).join('');
  return `<div class="source-native-order"><div class="source-native-choice-pool" aria-label="Available choices"><span class="source-native-pool-label">Drag an option to a target, or use the dropdown for keyboard access.</span><div class="source-native-choice-list">${chips}</div></div><div class="source-native-fields source-native-order-targets">${targets}</div></div>`;
}

export function renderNativePractice(question,record,tempInputs={},options={}){
  if(question?.reviewMode!=='native-structured')return '';
  const fields=Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
  if(!fields.length)return '';
  const locked=Boolean(options?.locked);
  const answers=nativeAnswers(question,record,tempInputs,options);
  const graded=record?.mode==='native'&&!Object.prototype.hasOwnProperty.call(tempInputs||{},question.id)&&!options?.retrying;
  const interaction=nativeInteractionKind(question);

  let body='';
  if(interaction==='yes-no'){
    body=`<div class="source-native-fields">${fields.map((field,index)=>renderBinaryField({question,field,value:answers?.[field.id]||'',locked,index,graded})).join('')}</div>`;
  }else if(interaction==='ordered-fields'){
    body=renderOrderedFields({question,fields,answers,locked,graded});
  }else{
    const inputs=fields.map((field,index)=>{
      const value=answers?.[field.id]||'';
      const cls=fieldClass({graded,value,field});
      const choices=fieldChoices(field);
      const control=choices.length?renderChoiceSelect({field,value,locked}):renderTextField({field,value,locked});
      return `<label class="source-native-field ${cls}"><span>${escapeHtml(field.label||`Answer ${index+1}`)}</span>${control}</label>`;
    }).join('');
    body=`<div class="source-native-fields">${inputs}</div>`;
  }

  const complete=fields.every(field=>String(answers?.[field.id]||'').trim());
  const result=graded?`<div class="source-practice-result ${record.correct?'correct':'incorrect'}"><strong>${record.correct?'Correct':'Review'}</strong><span>${record.correct?'All structured answers match the preserved source evidence.':'One or more answers do not match the source evidence.'}</span></div>`:'';
  const instruction=interaction==='ordered-fields'?'Arrange the source-backed choices in the required positions.':interaction==='yes-no'?'Choose Yes or No for every statement.':'Complete each answer field.';
  const actions=locked?`<div class="source-practice-actions"><button type="button" class="secondary-btn" id="sourcePracticeNativeRetryBtn">Retry Question</button><small>Saved answer is locked. Retry starts a new attempt.</small></div>`:`<div class="source-practice-actions"><button type="button" class="primary-btn" id="sourcePracticeNativeCheckBtn" ${complete?'':'disabled'}>Check structured answer</button><small>Only explicit source-backed values are auto-scored.</small></div>`;
  return `<div class="source-native-practice" data-native-interaction="${interaction}"><div class="source-native-head"><span class="eyebrow">NATIVE / AUTO-SCORED</span><p>${instruction} Answers are checked against explicit source evidence; no distractors were invented.</p></div>${body}${actions}${result}</div>`;
}

export function renderNativeAnswer(question,renderRichText=value=>escapeHtml(value)){
  const fields=Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
  const answerLines=fields.map(field=>`<li><b>${escapeHtml(field.label||field.id||'Answer')}</b> — ${renderRichText((field.expected||[])[0]||'')}</li>`).join('');
  const visuals=(question?.answerVisuals||[]).map(path=>`<img src="${escapeHtml(path)}" alt="Source answer evidence for question ${escapeHtml(question.questionNumber||'')}" loading="lazy">`).join('');
  const explanation=String(question?.sourceExplanation||'').trim();
  const explicitArabic=[question?.explanationAr,question?.aiExplanation?.ar,question?.explanation?.ar].find(value=>typeof value==='string'&&value.trim());
  const fallbackAnswers=fields.map(field=>`${String(field.label||field.id||'Answer')}: ${String((field.expected||[])[0]||'—')}`).join('، ');
  const arabic=String(explicitArabic||`الإجابة المعتمدة في المصدر هي: ${fallbackAnswers}. تم تثبيت التصحيح على القيم الموجودة في دليل المصدر بدون إضافة اختيارات من خارج المادة.`).trim();
  const arabicHtml=arabic?`<div class="source-review-explanation source-review-explanation-ar" dir="rtl"><span class="eyebrow">شرح الإجابة بالعربي</span>${renderRichText(arabic)}</div>`:'';
  const original=explanation?`<details class="source-original-explanation"><summary>Original Source Explanation</summary><div class="source-review-explanation source-review-explanation-original" dir="ltr">${renderRichText(explanation)}</div></details>`:'';
  return `<div class="source-review-answer-key"><span class="eyebrow">SOURCE ANSWER</span><ul>${answerLines}</ul></div>${visuals?`<div class="source-review-visual-stack answer-evidence">${visuals}</div>`:''}${arabicHtml}${original}`;
}

export function wireNativePractice({root,question,record,tempInputs,onInput,onSave,toast}){
  if(!root||question?.reviewMode!=='native-structured')return;
  const fields=Array.isArray(question.nativeResponse?.fields)?question.nativeResponse.fields:[];
  const updateCheck=answers=>{
    const button=root.querySelector('#sourcePracticeNativeCheckBtn');
    if(button)button.disabled=!fields.every(field=>String(answers?.[field.id]||'').trim());
  };
  const setAnswer=(fieldId,value)=>{
    if(!fieldId)return;
    const answers={...nativeAnswers(question,record,tempInputs),[fieldId]:value};
    onInput?.(answers);
    updateCheck(answers);
    root.querySelectorAll(`[data-source-native-binary="${CSS.escape(fieldId)}"]`).forEach(button=>{
      const selected=normalize(button.dataset.sourceNativeValue)===normalize(value);
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',selected?'true':'false');
    });
  };

  root.querySelectorAll('[data-source-native-field]').forEach(input=>input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>setAnswer(String(input.dataset.sourceNativeField||''),input.value)));
  root.querySelectorAll('[data-source-native-binary]').forEach(button=>button.addEventListener('click',()=>setAnswer(String(button.dataset.sourceNativeBinary||''),String(button.dataset.sourceNativeValue||''))));

  let dragged='';
  root.querySelectorAll('[data-source-native-choice]').forEach(choice=>{
    choice.addEventListener('dragstart',event=>{
      dragged=String(choice.dataset.sourceNativeChoice||'');
      try{event.dataTransfer?.setData('text/plain',dragged);event.dataTransfer.effectAllowed='copy';}catch{}
    });
    choice.addEventListener('dragend',()=>{dragged='';});
  });
  root.querySelectorAll('[data-source-native-drop-field]').forEach(target=>{
    target.addEventListener('dragover',event=>{event.preventDefault();target.classList.add('drag-over');});
    target.addEventListener('dragleave',()=>target.classList.remove('drag-over'));
    target.addEventListener('drop',event=>{
      event.preventDefault();target.classList.remove('drag-over');
      const value=dragged||event.dataTransfer?.getData('text/plain')||'';
      const fieldId=String(target.dataset.sourceNativeDropField||'');
      const select=target.querySelector('[data-source-native-field]');
      if(select&&value){select.value=value;setAnswer(fieldId,value);}
    });
  });

  root.querySelector('#sourcePracticeNativeCheckBtn')?.addEventListener('click',()=>{
    const answers=nativeAnswers(question,record,tempInputs);
    if(!fields.length||!fields.every(field=>String(answers?.[field.id]||'').trim())){toast?.('Complete every answer field first.');return;}
    onSave?.({answers,correct:nativeMatches(question,answers)});
  });
}