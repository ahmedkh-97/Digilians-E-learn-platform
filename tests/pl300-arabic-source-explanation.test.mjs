import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as fullRank from '../assets/js/pl300-full-ranked-learning.js';
import * as native from '../assets/js/voucher-source-practice-native.js';

const src1=JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/source-01-review-bank.json',import.meta.url),'utf8'));
const q5=src1.questions.find(q=>String(q.questionNumber)==='5');

test('Arabic explanation resolver prefers reviewed Arabic explanation and supplies source-grounded fallbacks',()=>{
  assert.equal(typeof fullRank.resolvePl300ArabicExplanation,'function');
  const reviewed=fullRank.resolvePl300ArabicExplanation({question:{explanationAr:'شرح عربي معتمد'}});
  assert.equal(reviewed,'شرح عربي معتمد');
  const structured=fullRank.resolvePl300ArabicExplanation({question:{reviewMode:'native-structured',nativeResponse:{fields:[{label:'Box 1',expected:['Append Queries as New']}]}}});
  assert.match(structured,/الإجابة المعتمدة/);
  assert.match(structured,/Append Queries as New/);
  const checkpoint=fullRank.resolvePl300ArabicExplanation({question:{reviewMode:'source-reveal'}});
  assert.match(checkpoint,/Study Checkpoint|نقطة مذاكرة/);
});

test('observed Q5 has a source-grounded Arabic explanation',()=>{
  assert.match(q5.explanationAr||'',/Append Queries as New/);
  assert.match(q5.explanationAr||'',/Disable Load|تعطيل/);
});

test('source answer markup shows Arabic explanation first and keeps original English explanation collapsible',()=>{
  const html=fullRank.buildPl300FullRankedAnswerMarkup({question:{...q5,reviewMode:'scored-text',options:[{id:'A',text:'x'}],correctAnswer:'A'},renderRichText:v=>v});
  assert.match(html,/شرح الإجابة بالعربي/);
  assert.match(html,/dir="rtl"/);
  assert.match(html,/<details[^>]*class="source-original-explanation"/);
  assert.match(html,/Original Source Explanation/);
});

test('native structured answer markup also surfaces Arabic explanation before original source text',()=>{
  const html=native.renderNativeAnswer(q5,v=>v);
  assert.match(html,/شرح الإجابة بالعربي/);
  assert.match(html,/Original Source Explanation/);
});

test('source questions inherit reviewed Arabic explanation from their validated ranked concept',()=>{
  assert.equal(typeof fullRank.enrichPl300SourceQuestionsWithArabic,'function');
  const index=JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/full-ranked-index.json',import.meta.url),'utf8'));
  const master=JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/master-bank.json',import.meta.url),'utf8'));
  const source=src1.questions.find(question=>{
    const rec=index.records.find(r=>r.questionId===question.id&&r.validatedQuestionId);
    const mq=rec&&master.questions.find(item=>item.id===rec.validatedQuestionId);
    return mq?.explanationAr;
  });
  assert.ok(source);
  const enriched=fullRank.enrichPl300SourceQuestionsWithArabic({questions:[source],index,masterQuestions:master.questions});
  assert.match(enriched[0].explanationAr||'',/[\u0600-\u06ff]/);
});

const appSource=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
test('Full Ranked runtime enriches source questions from the reviewed master bank before rendering',()=>{
  assert.match(appSource,/masterBankFile/);
  assert.match(appSource,/enrichPl300SourceQuestionsWithArabic/);
});
