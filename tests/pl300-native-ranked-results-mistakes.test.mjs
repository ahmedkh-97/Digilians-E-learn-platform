import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {recordMistakeOutcome,questionFromMistake,getMistakes,isPracticeableMistakeQuestion} from '../assets/js/mistakes.js';
import {structuredAnswerState} from '../assets/js/exam-engine.js';

function memoryStorage(){const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)}}
const q={
  id:'native-1',question:'Complete the answer area',responseType:'structured',options:[],
  visualAssets:['voucher/x/page.png','voucher/x/answer.png'],
  sourceExplanation:'Source explanation',
  nativeResponse:{interaction:'fields',scoring:'normalized-text',fields:[{id:'box-1',label:'Mode',expected:['Dual']}]},
  voucherSource:{sourceId:'source-01',questionNumber:'1'}
};

test('structured wrong answers enter My Mistakes and reconstruct native metadata',()=>{
  const storage=memoryStorage();
  const selected=structuredAnswerState(q,{'box-1':'Import'});
  const item=recordMistakeOutcome({ownerId:'p',studentName:'A',question:q,selected,context:{sourceType:'voucher',trackId:'microsoft-pl-300'},storage});
  assert.ok(item);
  assert.equal(item.question.responseType,'structured');
  assert.deepEqual(item.question.nativeResponse,q.nativeResponse);
  assert.deepEqual(item.question.visualAssets,q.visualAssets);
  const retry=questionFromMistake(item);
  assert.equal(retry.responseType,'structured');
  assert.deepEqual(retry.nativeResponse,q.nativeResponse);
  assert.deepEqual(retry.visualAssets,q.visualAssets);
});

test('incomplete structured answers never enter My Mistakes',()=>{
  const storage=memoryStorage();
  const incomplete={type:'structured',fields:{},complete:false};
  assert.equal(recordMistakeOutcome({ownerId:'p',question:q,selected:incomplete,context:{sourceType:'voucher'},storage}),null);
  assert.equal(getMistakes('p',{storage}).length,0);
});

test('app wires native structured fields, confirmation and question-aware answered state',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  assert.match(app,/data-ranked-structured-field/);
  assert.match(app,/updateStructuredField/);
  assert.match(app,/confirmStructuredRankedAnswer/);
  assert.match(app,/isQuestionAnswered/);
  assert.match(app,/visualAssets/);
});


test('app renders structured answers correctly in My Mistakes, review, and Domain section analytics',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  assert.match(app,/structuredMistake=isStructuredQuestion\(qLike\)/);
  assert.match(app,/structuredExpected=structuredMistake\?structuredExpectedDisplay\(qLike\)/);
  assert.match(app,/voucherDomainSectionBreakdown[\s\S]*!isQuestionAnswered\(q,selected\)/);
  assert.match(app,/function renderReview\(\)[\s\S]*isQuestionAnswered\(q,selected\)/);
});


test('structured My Mistakes questions remain practiceable without invented MCQ options',()=>{
  assert.equal(isPracticeableMistakeQuestion(q),true);
  assert.equal(isPracticeableMistakeQuestion({...q,id:'bad',nativeResponse:{interaction:'fields',fields:[]}}),false);
  assert.equal(isPracticeableMistakeQuestion({id:'mcq',options:[{id:'A'},{id:'B'}],correctAnswer:'A'}),true);
});
