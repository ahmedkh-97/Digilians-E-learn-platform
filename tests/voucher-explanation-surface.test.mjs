import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8');
const bank=JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/master-bank.json',import.meta.url),'utf8'));
const forbidden=/\b(option ids?|safe shuffle|sourceanswerids?|provenance|scoring implementation|runtime metadata|engine wording)\b/i;

function learnerTexts(q){
  const out=[];
  if(typeof q.explanationAr==='string')out.push(['explanationAr',q.explanationAr]);
  const de=q.deepExplanation||{};
  if(typeof de.summary==='string')out.push(['deepExplanation.summary',de.summary]);
  if(typeof de.examTip==='string')out.push(['deepExplanation.examTip',de.examTip]);
  for(const [id,text] of Object.entries(de.options||{}))if(typeof text==='string')out.push([`deepExplanation.options.${id}`,text]);
  for(const key of ['examTip','reviewedTip'])if(typeof q[key]==='string')out.push([key,q[key]]);
  return out;
}

test('production PL-300 learner-facing explanations contain no internal implementation wording',()=>{
  const hits=[];
  for(const q of bank.questions.filter(q=>q.productionReady!==false)){
    for(const [field,text] of learnerTexts(q))if(forbidden.test(text))hits.push(`${q.id}:${field}`);
  }
  assert.deepEqual(hits,[]);
});

test('Voucher instant feedback uses a structured learner-safe explanation renderer',()=>{
  assert.match(app,/function renderVoucherLearningExplanation\(question,selected\)/);
  assert.match(app,/generatedFromVoucher[\s\S]{0,900}renderVoucherLearningExplanation\(q,selected\)/);
  assert.match(app,/CORRECT ANSWER/);
  assert.match(app,/Why this is correct|لماذا هذه الإجابة صحيحة/);
  assert.match(app,/Why the other options are wrong|لماذا الخيارات الأخرى غير صحيحة/);
  assert.doesNotMatch(app,/sourceAnswerIds[\s\S]{0,400}instantFeedback/);
});

test('Voucher explanation layout isolates RTL prose and LTR technical content',()=>{
  assert.match(css,/\.voucher-learning-explanation[^}]*direction:rtl/);
  assert.match(css,/\.voucher-explanation-tech[^}]*direction:ltr[^}]*unicode-bidi:isolate/);
  assert.match(css,/\.voucher-learning-explanation[^}]*max-width/);
});
