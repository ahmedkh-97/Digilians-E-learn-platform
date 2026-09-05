const normalize=value=>String(value??"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu,"");
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));

export function ensureNativePracticeStyles(doc=globalThis.document){
  if(!doc?.head||doc.querySelector('link[data-source-native-practice]'))return;
  const link=doc.createElement('link');
  link.rel='stylesheet';
  link.href='assets/css/source-practice-native.css?v=0.22.2';
  link.dataset.sourceNativePractice='1';
  doc.head.append(link);
}

export function nativeAnswers(question,record,tempInputs={},options={}){
  const temp=tempInputs?.[question?.id];
  if(temp&&typeof temp==='object'&&!Array.isArray(temp))return {...temp};
  if(options?.retrying)return {};
  return record?.mode==='native'&&record.answers&&typeof record.answers==='object'?{...record.answers}:{};
}

function fieldChoices(field){
  return Array.isArray(field?.choices)?[...new Set(field.choices.map(value=>String(value??'').trim()).filter(Boolean))]:[];
}

export function nativeMatches(question,answers){
  const fields=Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
  if(!fields.length)return false;
  return fields.every(field=>{
    const actual=normalize(answers?.[field.id]);
    return !!actual&&(field.expected||[]).some(value=>normalize(value)===actual);
  });
}

export function renderNativePractice(question,record,tempInputs={},options={}){
  if(question?.reviewMode!=='native-structured')return '';
  const fields=Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
  if(!fields.length)return '';
  const locked=Boolean(options?.locked);
  const answers=nativeAnswers(question,record,tempInputs,options);
  const graded=record?.mode==='native'&&!Object.prototype.hasOwnProperty.call(tempInputs||{},question.id)&&!options?.retrying;
  const inputs=fields.map((field,index)=>{
    const value=answers?.[field.id]||'';
    const fieldCorrect=graded&&value&&(field.expected||[]).some(expected=>normalize(expected)===normalize(value));
    const cls=graded?(fieldCorrect?'correct':'incorrect'):'';
    const choices=fieldChoices(field);
    const control=choices.length
      ?`<select data-source-native-field="${escapeHtml(field.id)}" ${locked?'disabled':''}><option value="">Select an answer</option>${choices.map(choice=>`<option value="${escapeHtml(choice)}" ${normalize(choice)===normalize(value)?'selected':''}>${escapeHtml(choice)}</option>`).join('')}</select>`
      :`<input type="text" data-source-native-field="${escapeHtml(field.id)}" value="${escapeHtml(value)}" autocomplete="off" spellcheck="false" placeholder="Type your answer" ${locked?'disabled':''}>`;
    return `<label class="source-native-field ${cls}"><span>${escapeHtml(field.label||`Answer ${index+1}`)}</span>${control}</label>`;
  }).join('');
  const complete=fields.every(field=>String(answers?.[field.id]||'').trim());
  const result=graded?`<div class="source-practice-result ${record.correct?'correct':'incorrect'}"><strong>${record.correct?'Correct':'Review'}</strong><span>${record.correct?'All structured answers match the preserved source evidence.':'One or more answers do not match the source evidence.'}</span></div>`:'';
  const instruction=question.nativeResponse?.interaction==='ordered-fields'?'Complete the steps in order.':'Complete each answer field.';
  const actions=locked?`<div class="source-practice-actions"><button type="button" class="secondary-btn" id="sourcePracticeNativeRetryBtn">Retry Question</button><small>Saved answer is locked. Retry starts a new attempt.</small></div>`:`<div class="source-practice-actions"><button type="button" class="primary-btn" id="sourcePracticeNativeCheckBtn" ${complete?'':'disabled'}>Check structured answer</button><small>Case, spaces, and punctuation are ignored.</small></div>`;
  return `<div class="source-native-practice"><div class="source-native-head"><span class="eyebrow">NATIVE / AUTO-SCORED</span><p>${instruction} Answers are checked against explicit text in the source explanation; no distractors were invented.</p></div><div class="source-native-fields">${inputs}</div>${actions}${result}</div>`;
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
