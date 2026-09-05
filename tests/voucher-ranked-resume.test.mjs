import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyVoucherRankedAwayTime,VOUCHER_TIMER_PHASE_SOLVING,VOUCHER_TIMER_PHASE_FEEDBACK} from '../assets/js/voucher-ranked-runtime.js';
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const answersModule=fs.readFileSync(new URL('../assets/js/exam-answers.js',import.meta.url),'utf8');
const persistenceModule=fs.readFileSync(new URL('../assets/js/exam-persistence.js',import.meta.url),'utf8');

test('Ranked Voucher confirmation state persists while Confirm Answer is reserved for multi-select or structured responses',()=>{
  assert.match(app,/confirmedVoucherAnswers:\{\}/);
  assert.match(app,/confirmedVoucherAnswers:state\.confirmedVoucherAnswers/);
  assert.match(app,/function confirmVoucherRankedAnswer\(/);
  assert.match(app,/isCurrentQuestionConfirmed/);
  assert.match(app,/const show=state\.feedbackMode==="instant"&&\(multi\|\|structured\)/);
  assert.match(app,/function confirmStructuredRankedAnswer\(/);
  assert.match(app,/selectSingleAnswerState/);
  assert.match(answersModule,/voucherRequiresExplicitAnswerConfirmation/);
});

test('Ranked timer persists solving vs feedback-paused phase',()=>{
  assert.match(app,/voucherTimerPhase/);
  assert.match(app,/VOUCHER_TIMER_PHASE_SOLVING/);
  assert.match(app,/VOUCHER_TIMER_PHASE_FEEDBACK/);
  assert.match(app,/applyVoucherRankedAwayTime/);
  assert.match(app,/voucherRankedSolveTimeSeconds/);
});

test('Ranked away time subtracts only during solving phase',()=>{
  assert.equal(applyVoucherRankedAwayTime({phase:VOUCHER_TIMER_PHASE_SOLVING,remainingSeconds:600,savedAtEpoch:1000,nowEpoch:31000}).remainingSeconds,570);
  assert.equal(applyVoucherRankedAwayTime({phase:VOUCHER_TIMER_PHASE_FEEDBACK,remainingSeconds:600,savedAtEpoch:1000,nowEpoch:31000}).remainingSeconds,600);
});

test('Voucher resume descriptor persists ranked-learning runtime identity',()=>{
  assert.match(persistenceModule,/rankedLearning:Boolean\(voucherContext\.rankedLearning\)/);
  assert.match(persistenceModule,/feedbackMode,/);
  assert.match(persistenceModule,/improvementSession:Boolean\(voucherContext\.improvementSession\)/);
});
