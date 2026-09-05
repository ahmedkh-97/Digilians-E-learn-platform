import test from 'node:test';
import assert from 'node:assert/strict';
import {buildVoucherExamPayload} from '../assets/js/voucher-bank-engine.js';
import {resolveExamMode,EXAM_MODE_IDS} from '../assets/js/exam-modes.js';
import {inferExamTimerPolicy,examTimerPolicyLabel,restoreTimerAfterAway} from '../assets/js/exam-timer.js';
import {isVoucherRankedLearningExam} from '../assets/js/voucher-ranked-runtime.js';

const config={
  id:'microsoft-pl-300',trackId:'data-analysis',trackTitle:'Data Analysis',title:'Microsoft PL-300',passingScore:70,
  realExam:{questionCount:60,durationMinutes:120,rankEligible:true}
};
const questions=[{id:'q1',question:'Q?',options:[{id:'a',text:'A'},{id:'b',text:'B'}],correctAnswer:'a'}];

test('ranked session payload uses the complete session with dynamic feedback and no countdown',()=>{
  const payload=buildVoucherExamPayload({
    examConfig:config,questions,
    runtime:{attemptKey:'x',mockKind:'session',sizeMode:'session',sessionRanked:true,sessionId:'d2-s5',domainId:'d2',feedbackMode:'exam',timerDisplay:true}
  });
  const ctx=payload.exam.generatedFromVoucher;
  assert.equal(ctx.sessionRanked,true);
  assert.equal(ctx.sessionId,'d2-s5');
  assert.equal(ctx.domainId,'d2');
  assert.equal(ctx.rankEligible,true);
  assert.equal(ctx.runtimeMode,'ranked-session');
  assert.equal(ctx.rankedLearning,true);
  assert.equal(payload.exam.settings.timer.enabled,false);
  assert.equal(payload.exam.settings.timer.durationMinutes,0);
  assert.deepEqual(payload.exam.settings.feedbackModes,['instant','exam']);
});

test('ranked session mode preserves learner-selected feedback style',()=>{
  const exam={generatedFromVoucher:{runtimeMode:'ranked-session',sessionRanked:true,rankedLearning:true,rankEligible:true}};
  const instant=resolveExamMode({exam,feedbackMode:'instant',rankedActivity:true});
  const end=resolveExamMode({exam,feedbackMode:'exam',rankedActivity:true});
  assert.equal(instant.id,EXAM_MODE_IDS.VOUCHER_RANKED_SESSION);
  assert.equal(end.id,EXAM_MODE_IDS.VOUCHER_RANKED_SESSION);
  assert.equal(instant.feedbackMode,'instant');
  assert.equal(end.feedbackMode,'exam');
  assert.equal(instant.rankedActivity,true);
  assert.equal(end.rankedActivity,true);
  assert.equal(instant.voucherRankedLearning,true);
});

test('ranked session uses active-solve timer policy and away time does not count',()=>{
  const exam={settings:{timer:{enabled:false,durationMinutes:0}},generatedFromVoucher:{runtimeMode:'ranked-session',sessionRanked:true,rankedLearning:true,rankEligible:true}};
  assert.equal(isVoucherRankedLearningExam(exam),true);
  assert.equal(inferExamTimerPolicy({exam,feedbackMode:'instant',rankedActivity:true}),'active-solve');
  assert.match(examTimerPolicyLabel({policy:'active-solve'}),/active solve time/i);
  assert.deepEqual(restoreTimerAfterAway({policy:'active-solve',remainingSeconds:null,elapsedSeconds:80,savedAtEpoch:1000,nowEpoch:31000}),{remainingSeconds:null,elapsedSeconds:80,awaySeconds:0});
});
