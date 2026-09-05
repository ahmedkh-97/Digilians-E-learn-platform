const normalize=value=>String(value??"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"");
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

export function ensureNativePracticeStyles(doc=globalThis.document){
  if(!doc?.head||doc.querySelector('link[data-source-native-practice]'))return;
  const link=doc.createElement('link');
  link.rel='stylesheet';
  link.href='assets/css/source-practice-native.css?v=0.22.1';
  link.dataset.sourceNativePractice='1';
  doc.head.append(link);
}

export function nativeAnswers(question,record,tempInputs={}){
  const temp=tempInputs?.[question?.id];
  if(temp&&typeof temp==='object'&&!Array.isArray(temp))return {...temp};
  return record?.mode==='native'&&record.answers&&typeof record.answers==='object'?{...record.answers}:{};
}

export function nativeMatches(question,answers){
  const fields=Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
  if(!fields.length)return false;
  return fields.every(field=>{
    const actual=normalize(answers?.[field.id]);
    return !!actual&&(field.expected||[]).some(value=>normalize(value)===actual);
  });
}

export function renderNativePractice(question,record,tempInputs={}){
  if(question?.reviewMode!=='native-structured')return '';
  const fields=Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
  if(!fields.length)return '';
  const answers=nativeAnswers(question,record,tempInputs);
  const graded=record?.mode==='native'&&!Object.prototype.hasOwnProperty.call(tempInputs||{},question.id);
  const inputs=fields.map((field,index)=>{
    const value=answers?.[field.id]||'';
    const fieldCorrect=graded&&value&&(field.expected||[]).some(expected=>normalize(expected)===normalize(value));
    const cls=graded?(fieldCorrect?'correct':'incorrect'):'';
    return `<label class="source-native-field ${cls}"><span>${escapeHtml(field.label||`Answer ${index+1}`)}</span><input type="text" data-source-native-field="${escapeHtml(field.id)}" value="${escapeHtml(value)}" autocomplete="off" spellcheck="false" placeholder="Type your answer"></label>`;
  }).join('');
  const complete=fields.every(field=>String(answers?.[field.id]||'').trim());
  const result=graded?`<div class="source-practice-result ${record.correct?'correct':'incorrect'}"><strong>${record.correct?'Correct':'Review'}</strong><span>${record.correct?'All structured answers match the preserved source evidence.':'One or more answers do not match the source evidence.'}</span></div>`:'';
  const instruction=question.nativeResponse?.interaction==='ordered-fields'?'Complete the steps in order.':'Complete each answer field.';
  return `<div class="source-native-practice"><div class="source-native-head"><span class="eyebrow">NATIVE / AUTO-SCORED</span><p>${instruction} Answers are checked against explicit text in the source explanation; no distractors were invented.</p></div><div class="source-native-fields">${inputs}</div><div class="source-practice-actions"><button type="button" class="primary-btn" id="sourcePracticeNativeCheckBtn" ${complete?'':'disabled'}>Check structured answer</button><small>Case, spaces, and punctuation are ignored.</small></div>${result}</div>`;
}

export function renderNativeAnswer(question,renderRichText=value=>escapeHtml(value)){
  const fields=Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
  const answerLines=fields.map(field=>`<li><b>${escapeHtml(field.label||field.id||'Answer')}</b> — ${renderRichText((field.expected||[])[0]||'')}</li>`).join('');
  const visuals=(question?.answerVisuals||[]).map(path=>`<img src="${escapeHtml(path)}" alt="Source answer evidence for question ${escapeHtml(question.questionNumber||'')}" loading="lazy">`).join('');
  const explanation=String(question?.sourceExplanation||'').trim();
  return `<div class="source-review-answer-key"><span class="eyebrow">SOURCE ANSWER</span><ul>${answerLines}</ul></div>${visuals?`<div class="source-review-visual-stack answer-evidence">${visuals}</div>`:''}${explanation?`<div class="source-review-explanation"><span class="eyebrow">SOURCE EXPLANATION</span>${renderRichText(explanation)}</div>`:''}`;
}

export function wireNativePractice({root,question,record,tempInputs,onInput,onSave,toast}){
  if(!root||question?.reviewMode!=='native-structured')return;
  root.querySelectorAll('[data-source-native-field]').forEach(input=>input.addEventListener('input',()=>{
    const fieldId=String(input.dataset.sourceNativeField||'');
    if(!fieldId)return;
    const answers={...nativeAnswers(question,record,tempInputs),[fieldId]:input.value};
    onInput?.(answers);
    const button=root.querySelector('#sourcePracticeNativeCheckBtn');
    const fields=Array.isArray(question.nativeResponse?.fields)?question.nativeResponse.fields:[];
    if(button)button.disabled=!fields.every(field=>String(answers?.[field.id]||'').trim());
  }));
  root.querySelector('#sourcePracticeNativeCheckBtn')?.addEventListener('click',()=>{
    const answers=nativeAnswers(question,record,tempInputs);
    const fields=Array.isArray(question.nativeResponse?.fields)?question.nativeResponse.fields:[];
    if(!fields.length||!fields.every(field=>String(answers?.[field.id]||'').trim())){toast?.('Complete every answer field first.');return;}
    onSave?.({answers,correct:nativeMatches(question,answers)});
  });
}
