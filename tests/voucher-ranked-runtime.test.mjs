import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VOUCHER_TIMER_PHASE_SOLVING,
  VOUCHER_TIMER_PHASE_FEEDBACK,
  isVoucherRankedLearningExam,
  voucherAnswerIsConfirmed,
  voucherTimerPhaseForQuestion,
  applyVoucherRankedAwayTime,
  voucherRankedSolveTimeSeconds
} from '../assets/js/voucher-ranked-runtime.js';

const exam={generatedFromVoucher:{rankEligible:true,rankedLearning:true,sizeMode:'real'}};

test('Ranked-learning context is explicit metadata',()=>{
  assert.equal(isVoucherRankedLearningExam(exam),true);
  assert.equal(isVoucherRankedLearningExam({generatedFromVoucher:{rankEligible:true,sizeMode:'real'}}),false);
});

test('Away time counts only while ranked phase is solving',()=>{
  assert.deepEqual(applyVoucherRankedAwayTime({phase:VOUCHER_TIMER_PHASE_SOLVING,remainingSeconds:7000,savedAtEpoch:100000,nowEpoch:130000}),{remainingSeconds:6970,awaySeconds:30});
  assert.deepEqual(applyVoucherRankedAwayTime({phase:VOUCHER_TIMER_PHASE_FEEDBACK,remainingSeconds:7000,savedAtEpoch:100000,nowEpoch:130000}),{remainingSeconds:7000,awaySeconds:0});
});

test('Ranked solve time derives from consumed solving countdown only',()=>{
  assert.equal(voucherRankedSolveTimeSeconds({allowedDurationMinutes:120,remainingSeconds:6600}),600);
});

test('Ranked timer phase follows the persisted confirmation state',()=>{
  const args={exam,questionId:'q1',selected:'a',confirmedAnswers:{},confirmedMultiAnswers:{}};
  assert.equal(voucherAnswerIsConfirmed(args),false);
  assert.equal(voucherTimerPhaseForQuestion(args),VOUCHER_TIMER_PHASE_SOLVING);
  args.confirmedAnswers.q1=true;
  assert.equal(voucherAnswerIsConfirmed(args),true);
  assert.equal(voucherTimerPhaseForQuestion(args),VOUCHER_TIMER_PHASE_FEEDBACK);
});

test('Previously confirmed ranked question stays feedback-paused when revisited',()=>{
  assert.equal(voucherTimerPhaseForQuestion({exam,questionId:'q2',selected:null,confirmedAnswers:{q2:true}}),VOUCHER_TIMER_PHASE_FEEDBACK);
});

test('Non-ranked Voucher question does not enter ranked-learning timer policy',()=>{
  const normal={generatedFromVoucher:{rankEligible:false,rankedLearning:false,sizeMode:'25'}};
  assert.equal(isVoucherRankedLearningExam(normal),false);
  assert.equal(voucherTimerPhaseForQuestion({exam:normal,questionId:'q1',selected:'a',confirmedAnswers:{q1:true}}),null);
});
