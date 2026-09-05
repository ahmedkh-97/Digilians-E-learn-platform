import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as rankedRuntime from '../assets/js/voucher-ranked-runtime.js';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const answersModule=fs.readFileSync(new URL('../assets/js/exam-answers.js',import.meta.url),'utf8');

test('Ranked Voucher requires explicit confirmation only for multi-select questions',()=>{
  assert.equal(typeof rankedRuntime.voucherRequiresExplicitAnswerConfirmation,'function');
  assert.equal(rankedRuntime.voucherRequiresExplicitAnswerConfirmation({feedbackMode:'instant',correctAnswerCount:1}),false);
  assert.equal(rankedRuntime.voucherRequiresExplicitAnswerConfirmation({feedbackMode:'instant',correctAnswerCount:2}),true);
  assert.equal(rankedRuntime.voucherRequiresExplicitAnswerConfirmation({feedbackMode:'exam',correctAnswerCount:2}),false);
});

test('Ranked single-choice selection delegates auto-confirm state to the answer engine',()=>{
  const select=app.match(/function selectAnswer\([\s\S]*?\n}\nfunction toggleMultiSelectAnswer/)?.[0]||'';
  assert.match(select,/isCurrentVoucherRankedLearning\(\)/);
  assert.match(select,/selectSingleAnswerState/);
  assert.match(select,/if\(result\.stopTimer\)stopTimer\(\)/);
  assert.match(answersModule,/voucherRequiresExplicitAnswerConfirmation/);
  assert.match(answersModule,/nextConfirmed\[questionId\]=true/);
  assert.match(answersModule,/VOUCHER_TIMER_PHASE_FEEDBACK/);
});

test('Ranked Confirm Answer control is limited to multi-select or structured questions',()=>{
  const render=app.match(/function renderQuestion\(\)[\s\S]*?\n}\nfunction isCurrentVoucherRankedLearning/)?.[0]||'';
  assert.match(render,/const show=state\.feedbackMode==="instant"&&\(multi\|\|structured\)/);
  assert.doesNotMatch(render,/rankedLearning\|\|multi/);
  assert.match(render,/isStructuredQuestion\(q\)/);
});

test('Voucher saved-attempt modal only intercepts an exact matching Voucher path',()=>{
  const launch=app.match(/async function launchPreparedVoucherExam\([\s\S]*?\n}\n\nasync function prepareExam/)?.[0]||'';
  assert.match(app,/voucherSavedAttemptMatches as matchesVoucherSavedAttempt/);
  assert.match(launch,/matchesVoucherSavedAttempt\(saved,ctx\)/);
  assert.match(launch,/if\(saved&&matchesVoucherSavedAttempt\(saved,ctx\)\)/);
});
