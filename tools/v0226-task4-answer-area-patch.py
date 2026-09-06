from pathlib import Path
import re

# Native structured practice copy and feedback sections.
native_path=Path('assets/js/voucher-source-practice-native.js')
native=native_path.read_text(encoding='utf-8')
native=native.replace("const instruction=interaction==='ordered-fields'?'Arrange the source-backed choices in the required positions.':interaction==='yes-no'?'Choose Yes or No for every statement.':'Complete each answer field.';",
"const instruction=interaction==='ordered-fields'?'Arrange the source-backed choices in the required order.':interaction==='yes-no'?'Choose Yes or No for every statement.':interaction==='choice-fields'?'Complete each field using the source-backed options.':'Enter the source-required value in every field.';",1)
native=native.replace('<span class="eyebrow">NATIVE / AUTO-SCORED</span>','<span class="eyebrow">Answer Area</span>',1)

native_answer=r'''function nativeExplicitRationales(question={}){
  const raw=question?.optionRationalesAr??question?.wrongOptionRationalesAr;
  if(Array.isArray(raw))return raw.map((text,index)=>[String(index+1),text]).filter(([,text])=>typeof text==='string'&&text.trim());
  if(raw&&typeof raw==='object')return Object.entries(raw).filter(([,text])=>typeof text==='string'&&text.trim());
  return [];
}

function nativeOptionalFeedbackMarkup(question,renderRichText){
  const rationales=nativeExplicitRationales(question);
  const rationaleHtml=rationales.length?`<div class="source-review-explanation source-review-rationales" dir="rtl"><span class="eyebrow">ليه الاختيارات التانية غلط؟</span><ul>${rationales.map(([key,text])=>`<li><b>${escapeHtml(key)}</b> — ${renderRichText(String(text).trim())}</li>`).join('')}</ul></div>`:'';
  const tip=[question?.examTipAr,question?.examTip,question?.sourceTipAr,question?.sourceTip].find(value=>typeof value==='string'&&value.trim());
  const tipHtml=tip?`<div class="source-review-explanation source-review-exam-tip"><span class="eyebrow">Exam Tip</span>${renderRichText(String(tip).trim())}</div>`:'';
  return `${rationaleHtml}${tipHtml}`;
}

export function renderNativeAnswer(question,renderRichText=value=>escapeHtml(value)){
  const fields=Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
  const answerLines=fields.map(field=>`<li><b>${escapeHtml(field.label||field.id||'Answer')}</b> — ${renderRichText((field.expected||[])[0]||'')}</li>`).join('');
  const visuals=(question?.answerVisuals||[]).map(path=>`<img src="${escapeHtml(path)}" alt="Source answer evidence for question ${escapeHtml(question.questionNumber||'')}" loading="lazy">`).join('');
  const explanation=String(question?.sourceExplanation||'').trim();
  const explicitArabic=[question?.explanationAr,question?.aiExplanation?.ar,question?.explanation?.ar].find(value=>typeof value==='string'&&value.trim());
  const fallbackAnswers=fields.map(field=>`${String(field.label||field.id||'Answer')}: ${String((field.expected||[])[0]||'—')}`).join('، ');
  const arabic=String(explicitArabic||`الإجابة المعتمدة في المصدر هي: ${fallbackAnswers}. تم تثبيت التصحيح على القيم الموجودة في دليل المصدر بدون إضافة اختيارات من خارج المادة.`).trim();
  const arabicHtml=arabic?`<div class="source-review-explanation source-review-explanation-ar" dir="rtl"><span class="eyebrow">الشرح بالعربي</span>${renderRichText(arabic)}</div>`:'';
  const optional=nativeOptionalFeedbackMarkup(question,renderRichText);
  const original=explanation?`<details class="source-original-explanation"><summary>Original Source Explanation</summary><div class="source-review-explanation source-review-explanation-original" dir="ltr">${renderRichText(explanation)}</div></details>`:'';
  return `<div class="source-review-answer-key"><span class="eyebrow">الإجابة الصحيحة</span><ul>${answerLines}</ul></div>${visuals?`<div class="source-review-visual-stack answer-evidence">${visuals}</div>`:''}${arabicHtml}${optional}${original}`;
}
'''
pattern=r"export function renderNativeAnswer\([\s\S]*?\n}\n\nexport function wireNativePractice"
if 'function nativeOptionalFeedbackMarkup' not in native:
    native,count=re.subn(pattern,native_answer+'\nexport function wireNativePractice',native,count=1)
    if count!=1: raise SystemExit('native answer renderer anchor missing')
native_path.write_text(native,encoding='utf-8')

# Full-ranked answer semantics and structured reference/answer split.
full_path=Path('assets/js/pl300-full-ranked-learning.js')
full=full_path.read_text(encoding='utf-8')
full=full.replace('<span class="eyebrow">شرح الإجابة بالعربي</span>','<span class="eyebrow">الشرح بالعربي</span>',1)

optional_helper=r'''
function explicitPl300Rationales(question={}){
  const raw=question?.optionRationalesAr??question?.wrongOptionRationalesAr;
  if(Array.isArray(raw))return raw.map((text,index)=>[String(index+1),text]).filter(([,text])=>typeof text==='string'&&text.trim());
  if(raw&&typeof raw==='object')return Object.entries(raw).filter(([,text])=>typeof text==='string'&&text.trim());
  return [];
}

function optionalPl300FeedbackMarkup(question,renderRichText){
  const rationales=explicitPl300Rationales(question);
  const rationaleHtml=rationales.length?`<div class="source-review-explanation source-review-rationales" dir="rtl"><span class="eyebrow">ليه الاختيارات التانية غلط؟</span><ul>${rationales.map(([key,text])=>`<li><b>${htmlEscape(key)}</b> — ${renderRichText(String(text).trim())}</li>`).join('')}</ul></div>`:'';
  const tip=[question?.examTipAr,question?.examTip,question?.sourceTipAr,question?.sourceTip].find(value=>typeof value==='string'&&value.trim());
  const tipHtml=tip?`<div class="source-review-explanation source-review-exam-tip"><span class="eyebrow">Exam Tip</span>${renderRichText(String(tip).trim())}</div>`:'';
  return `${rationaleHtml}${tipHtml}`;
}
'''
anchor="function originalExplanationMarkup(explanation,renderRichText){"
if 'function optionalPl300FeedbackMarkup' not in full:
    idx=full.find(anchor)
    if idx<0: raise SystemExit('full-rank original explanation anchor missing')
    # place helper immediately before original explanation helper
    full=full[:idx]+optional_helper+'\n'+full[idx:]

answer_function=r'''export function buildPl300FullRankedAnswerMarkup({question={},completed=false,revealed=false,nativeAnswerHtml='',renderRichText=value=>htmlEscape(value)}={}){
  const explanation=String(question?.sourceExplanation||'').trim();
  const arabic=arabicExplanationMarkup(question,renderRichText);
  const optional=optionalPl300FeedbackMarkup(question,renderRichText);
  const original=originalExplanationMarkup(explanation,renderRichText);
  if(question?.reviewMode==='scored-text'){
    const ids=(Array.isArray(question?.correctAnswers)&&question.correctAnswers.length?question.correctAnswers:[question?.correctAnswer]).filter(Boolean).map(String);
    const answerLines=ids.map(id=>{
      const option=(question.options||[]).find(item=>String(item.id)===id);
      return `<li><b>${htmlEscape(id)}</b>${option?` — ${renderRichText(option.text||'')}`:''}</li>`;
    }).join('');
    return `<div class="source-review-answer-key"><span class="eyebrow">الإجابة الصحيحة</span><ul>${answerLines||'<li>Answer key unavailable in parsed text.</li>'}</ul></div>${arabic}${optional}${original}`;
  }
  if(question?.reviewMode==='native-structured')return nativeAnswerHtml||`${arabic}${optional}${original}`;
  const visuals=(question?.answerVisuals||[]).map(path=>`<img src="${htmlEscape(path)}" alt="Source answer evidence for question ${htmlEscape(question.questionNumber||'')}" loading="lazy">`).join('');
  return `<div class="source-review-answer-key source-reveal-note"><span class="eyebrow">SOURCE EVIDENCE</span><p>دليل المصدر محفوظ كما هو. السؤال ده لا يتم منحه Correct تنافسي من غير تصحيح موثوق.</p></div>${visuals?`<div class="source-review-visual-stack answer-evidence">${visuals}</div>`:''}${arabic}${optional}${original}<div class="source-practice-checkpoint"><span class="eyebrow">RANKED STUDY CHECKPOINT</span><p dir="rtl">إكمال المراجعة يتحسب ضمن 509/509، لكنه لا يضيف إجابة صحيحة وهمية إلى Validated Accuracy.</p><button type="button" class="primary-btn" id="sourcePracticeCheckpointBtn" ${revealed&&!completed?'':'disabled'}>${completed?'تمت مراجعة السؤال':'إكمال نقطة المذاكرة'}</button>${completed?'<small>تم الحفظ كمُراجع، والـAccuracy التنافسي لم يتغير.</small>':'<small>افتح دليل المصدر أولًا ثم أكمل نقطة المذاكرة.</small>'}</div>`;
}
'''
pattern=r"export function buildPl300FullRankedAnswerMarkup\([\s\S]*?\n}\n\nexport function buildPl300FullRankedReviewMarkup"
full,count=re.subn(pattern,answer_function+'\nexport function buildPl300FullRankedReviewMarkup',full,count=1)
if count!=1 and 'الإجابة الصحيحة' not in full: raise SystemExit('full-rank answer renderer anchor missing')

old="""      ${visualHtml?`<div class=\"source-review-visual-stack\">${visualHtml}</div>`:''}\n      ${optionsHtml||''}\n      ${nativeHtml||''}\n"""
new="""      ${nativeHtml?(visualHtml?`<div class=\"pl300-structured-study-layout\"><section class=\"pl300-source-reference\"><div class=\"pl300-source-reference-head\"><strong>Original source view</strong><span>Reference only</span></div><div class=\"source-review-visual-stack\">${visualHtml}</div></section><section class=\"pl300-answer-area\">${nativeHtml}</section></div>`:`<section class=\"pl300-answer-area\">${nativeHtml}</section>`):`${visualHtml?`<div class=\"source-review-visual-stack\">${visualHtml}</div>`:''}${optionsHtml||''}`}\n"""
if old in full:
    full=full.replace(old,new,1)
elif 'pl300-structured-study-layout' not in full:
    raise SystemExit('structured review layout anchor missing')
full_path.write_text(full,encoding='utf-8')

# Layout/style isolation.
css_path=Path('assets/css/pl300.css')
css=css_path.read_text(encoding='utf-8')
marker='/* V0.22.6 structured source reference + Answer Area */'
if marker not in css:
    css += '''\n\n/* V0.22.6 structured source reference + Answer Area */\n.pl300-structured-study-layout{display:grid;grid-template-columns:minmax(0,1.08fr) minmax(320px,.92fr);gap:18px;align-items:start;margin:18px 0}.pl300-source-reference,.pl300-answer-area{min-width:0;padding:14px;border:1px solid var(--line);border-radius:18px;background:var(--surface-soft)}.pl300-source-reference-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.pl300-source-reference-head strong{font-size:.82rem}.pl300-source-reference-head span{padding:5px 8px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:.68rem;font-weight:900}.pl300-source-reference .source-review-visual-stack{margin:0}.pl300-answer-area .source-native-practice{margin:0;border:0;padding:0;background:transparent}.source-review-rationales ul{margin:10px 0 0;padding-right:20px}.source-review-rationales li{margin:7px 0;line-height:1.65}.source-review-exam-tip{border-color:color-mix(in srgb,var(--primary) 28%,var(--line));background:color-mix(in srgb,var(--primary) 5%,var(--surface))}@media(max-width:900px){.pl300-structured-study-layout{grid-template-columns:1fr}.pl300-source-reference{order:1}.pl300-answer-area{order:2}}\n'''
css_path.write_text(css,encoding='utf-8')

native_css_path=Path('assets/css/source-practice-native.css')
ncss=native_css_path.read_text(encoding='utf-8')
if '.source-native-head>.eyebrow{' not in ncss:
    ncss=ncss.replace('.source-native-head{display:grid;gap:7px}', '.source-native-head{display:grid;gap:7px}.source-native-head>.eyebrow{width:max-content}',1)
native_css_path.write_text(ncss,encoding='utf-8')

# Migrate focused legacy expectations to the learner-facing V0.22.6 copy.
legacy=Path('tests/pl300-native-source-practice.test.mjs')
t=legacy.read_text(encoding='utf-8')
t=t.replace("assert.match(nativeUi,/NATIVE \\/ AUTO-SCORED/);","assert.match(nativeUi,/Answer Area/);\n  assert.doesNotMatch(nativeUi,/NATIVE \\/ AUTO-SCORED/);")
legacy.write_text(t,encoding='utf-8')

arabic_test=Path('tests/pl300-arabic-source-explanation.test.mjs')
t=arabic_test.read_text(encoding='utf-8').replace('/شرح الإجابة بالعربي/','/الشرح بالعربي/')
arabic_test.write_text(t,encoding='utf-8')

print('V0.22.6 Task 4 Answer Area patch applied or already present.')
