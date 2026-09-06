import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as native from '../assets/js/voucher-source-practice-native.js';
import * as fullRank from '../assets/js/pl300-full-ranked-learning.js';

const ROOT=new URL('../',import.meta.url);
const readJson=path=>JSON.parse(fs.readFileSync(new URL(path,ROOT),'utf8'));
const src1=readJson('voucher/tracks/data-analysis/microsoft-pl-300/source-01-review-bank.json');
const src2=readJson('voucher/tracks/data-analysis/microsoft-pl-300/source-02-review-bank.json');
const all=[...src1.questions,...src2.questions];
const q54=all.find(q=>q.id==='pl300-source-01-q054');

test('Q54 Answer Area keeps exactly two source-backed dropdowns and removes developer-facing terminology',()=>{
  assert.ok(q54);
  const html=native.renderNativePractice(q54,null,{},{});
  assert.equal((html.match(/<select\b/g)||[]).length,2);
  assert.match(html,/Answer Area/);
  assert.match(html,/Complete each field using the source-backed options\./);
  assert.doesNotMatch(html,/NATIVE \/ AUTO-SCORED/);
  assert.doesNotMatch(html,/Type your answer/);
});

test('native interaction instructions match dropdown, yes-no and ordering controls',()=>{
  const yesNo=all.find(q=>q.reviewMode==='native-structured'&&native.nativeInteractionKind(q)==='yes-no');
  const ordering=all.find(q=>q.reviewMode==='native-structured'&&native.nativeInteractionKind(q)==='ordered-fields');
  assert.ok(yesNo,'expected a source-backed Yes/No interaction');
  assert.ok(ordering,'expected a source-backed ordering interaction');
  assert.match(native.renderNativePractice(yesNo,null,{},{}),/Choose Yes or No for every statement\./);
  assert.match(native.renderNativePractice(ordering,null,{},{}),/Arrange the source-backed choices in the required order\./);
});

test('structured question presentation clearly separates non-interactive source reference from Answer Area',()=>{
  const nativeHtml=native.renderNativePractice(q54,null,{},{});
  const visualHtml='<img src="q54.webp" alt="Q54 source">';
  const html=fullRank.buildPl300FullRankedReviewMarkup({
    source01Count:369,source02Count:140,objectiveCount:317,checkpointCount:192,totalAll:509,
    metrics:{completedOccurrences:0,totalOccurrences:509,completionPercentage:0,validatedAccuracy:0,masteredClusters:0,validatedConceptCount:265,firstPassPercentage:0},
    questionsLength:14,currentIndex:0,objective:true,question:q54,sourceLabel:'Source 01',questionNumber:'54',pageLabel:'Page 65',
    questionHtml:'QUESTION',visualHtml,nativeHtml,activePartLabel:'Prepare the Data → Data Sources · Part 1 · 14 Questions',partCompleted:0,partTotal:14
  });
  assert.match(html,/class="pl300-structured-study-layout"/);
  assert.match(html,/class="pl300-source-reference"/);
  assert.match(html,/Original source view/);
  assert.match(html,/Reference only/);
  assert.match(html,/class="pl300-answer-area"/);
  assert.match(html,/<img src="q54\.webp" alt="Q54 source">/);
  assert.equal((html.match(/data-source-native-field=/g)||[]).length,2);
  assert.ok(html.indexOf('Original source view')<html.indexOf('Answer Area'),'source reference should appear before interactive Answer Area in document order');
});

test('structured study layout is two-column on desktop and stacks source before answer on smaller screens',()=>{
  const css=fs.readFileSync(new URL('assets/css/pl300.css',ROOT),'utf8');
  assert.match(css,/\.pl300-structured-study-layout\{[^}]*display:grid[^}]*grid-template-columns:[^}]*\}/);
  assert.match(css,/@media\(max-width:\s*\d+px\)[^{]*\{[\s\S]*?\.pl300-structured-study-layout\{[^}]*grid-template-columns:1fr[^}]*\}/);
  assert.match(css,/\.pl300-source-reference-head\{[^}]*display:flex[^}]*\}/);
});

test('scored feedback renders correct answer and Arabic explanation with optional rationale and tip only when explicitly stored',()=>{
  const base={
    id:'feedback',reviewMode:'scored-text',options:[{id:'A',text:'Correct option'},{id:'B',text:'Wrong option'}],correctAnswer:'A',
    explanationAr:'شرح عربي محفوظ في البيانات.'
  };
  const plain=fullRank.buildPl300FullRankedAnswerMarkup({question:base,renderRichText:v=>String(v)});
  assert.match(plain,/الإجابة الصحيحة/);
  assert.match(plain,/الشرح بالعربي/);
  assert.match(plain,/شرح عربي محفوظ/);
  assert.doesNotMatch(plain,/ليه الاختيارات التانية غلط؟/);
  assert.doesNotMatch(plain,/Exam Tip/);

  const enriched=fullRank.buildPl300FullRankedAnswerMarkup({question:{
    ...base,
    optionRationalesAr:{B:'الاختيار B غير صحيح لأن المصدر يحدد A.'},
    examTipAr:'ركّز على الكلمة المفتاحية في السيناريو.'
  },renderRichText:v=>String(v)});
  assert.match(enriched,/ليه الاختيارات التانية غلط؟/);
  assert.match(enriched,/الاختيار B غير صحيح/);
  assert.match(enriched,/Exam Tip/);
  assert.match(enriched,/ركّز على الكلمة المفتاحية/);
});

test('native structured feedback uses the same Arabic section semantics without inventing optional subsections',()=>{
  const question={...q54,explanationAr:'شرح عربي معتمد للسؤال 54.'};
  const plain=native.renderNativeAnswer(question,v=>String(v));
  assert.match(plain,/الإجابة الصحيحة/);
  assert.match(plain,/الشرح بالعربي/);
  assert.doesNotMatch(plain,/ليه الاختيارات التانية غلط؟/);
  assert.doesNotMatch(plain,/Exam Tip/);

  const enriched=native.renderNativeAnswer({...question,optionRationalesAr:{'field-1':'سبب محفوظ من المصدر.'},examTip:'Stored source tip.'},v=>String(v));
  assert.match(enriched,/ليه الاختيارات التانية غلط؟/);
  assert.match(enriched,/سبب محفوظ من المصدر/);
  assert.match(enriched,/Exam Tip/);
  assert.match(enriched,/Stored source tip/);
});
