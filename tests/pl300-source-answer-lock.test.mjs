import test from 'node:test';
import assert from 'node:assert/strict';
import * as fullRank from '../assets/js/pl300-full-ranked-learning.js';
import * as native from '../assets/js/voucher-source-practice-native.js';

const q={id:'pl300-source-01-q003',reviewMode:'scored-text'};
const record={mode:'auto',selected:['A'],correct:true,attemptCount:1};

test('completed objective attempt is locked unless an explicit retry is active',()=>{
  assert.equal(typeof fullRank.sourceAttemptLocked,'function');
  assert.equal(fullRank.sourceAttemptLocked(record,false),true);
  assert.equal(fullRank.sourceAttemptLocked(record,true),false);
  assert.equal(fullRank.sourceAttemptLocked(null,false),false);
});

test('locked scored-text selection always comes from saved attempt, never a stale temporary click',()=>{
  assert.equal(typeof fullRank.sourceAttemptSelection,'function');
  assert.deepEqual(fullRank.sourceAttemptSelection({question:q,record,tempSelections:{[q.id]:['D']},retrying:false}),['A']);
  assert.deepEqual(fullRank.sourceAttemptSelection({question:q,record,tempSelections:{[q.id]:['D']},retrying:true}),['D']);
  assert.deepEqual(fullRank.sourceAttemptSelection({question:q,record,tempSelections:{},retrying:true}),[]);
});

test('native structured answer renderer disables fields and exposes Retry Question after grading',()=>{
  const nq={id:'native-1',reviewMode:'native-structured',nativeResponse:{interaction:'fields',fields:[{id:'box-1',label:'Box 1',expected:['A']} ]}};
  const html=native.renderNativePractice(nq,{mode:'native',answers:{'box-1':'A'},correct:true,attemptCount:1},{},{locked:true});
  assert.match(html,/data-source-native-field="box-1"[^>]*disabled/i);
  assert.match(html,/id="sourcePracticeNativeRetryBtn"/);
  assert.doesNotMatch(html,/id="sourcePracticeNativeCheckBtn"/);
});


test('native structured retry starts blank instead of reusing the saved answer',()=>{
  const nq={id:'native-2',reviewMode:'native-structured',nativeResponse:{interaction:'fields',fields:[{id:'box-1',label:'Box 1',expected:['A']} ]}};
  const html=native.renderNativePractice(nq,{mode:'native',answers:{'box-1':'A'},correct:true,attemptCount:1},{},{locked:false,retrying:true});
  assert.match(html,/data-source-native-field="box-1" value=""/i);
});

import fs from 'node:fs';
const appSource=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('PL-300 source review runtime wires locked saved attempts and explicit retry state',()=>{
  assert.match(appSource,/voucherSourcePracticeRetrying\s*:\s*new Set\(\)/);
  assert.match(appSource,/sourceAttemptLocked\(record,\s*retrying\)/);
  assert.match(appSource,/buildSourcePracticeOptionsMarkup/);
  assert.match(appSource,/sourcePracticeRetryBtn[^\n]*addEventListener|\$\("sourcePracticeRetryBtn"\)\?\.addEventListener/s);
});

test('lazy Full Ranked module renders locked scored-text answers and retry action',()=>{
  assert.equal(typeof fullRank.buildSourcePracticeOptionsMarkup,'function');
  const question={id:'q-lock',reviewMode:'scored-text',options:[{id:'A',text:'Alpha'},{id:'B',text:'Beta'}],correctAnswer:'A'};
  const html=fullRank.buildSourcePracticeOptionsMarkup({question,record:{mode:'auto',selected:['A'],correct:true},selected:['A'],locked:true,retrying:false,renderRichText:x=>String(x)});
  assert.match(html,/data-source-practice-option="A"[^>]*disabled/);
  assert.match(html,/id="sourcePracticeRetryBtn"/);
  assert.doesNotMatch(html,/id="sourcePracticeCheckBtn"/);
});
