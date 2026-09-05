import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inferExamTimerPolicy,
  examTimerPolicyLabel,
  restoreTimerAfterAway
} from '../assets/js/exam-timer.js';

const rankedLearningExam={
  settings:{timer:{enabled:true,durationMinutes:120}},
  generatedFromVoucher:{rankEligible:true,rankedLearning:true,sizeMode:'real'}
};
const voucherRankedExam={
  settings:{timer:{enabled:true,durationMinutes:360}},
  generatedFromVoucher:{rankEligible:true,fullBankRanked:true,sizeMode:'full-ranked'}
};
const normalTimedExam={settings:{timer:{enabled:true,durationMinutes:60}}};
const untimedExam={settings:{timer:{enabled:false,durationMinutes:null}}};

test('exam timer policy preserves ranked learning, ranked exam, paused and untimed behavior',()=>{
  assert.equal(inferExamTimerPolicy({exam:rankedLearningExam,feedbackMode:'instant',rankedActivity:true}),'ranked-learning-solve');
  assert.equal(inferExamTimerPolicy({exam:voucherRankedExam,feedbackMode:'exam',rankedActivity:true}),'continuous-ranked');
  assert.equal(inferExamTimerPolicy({exam:normalTimedExam,feedbackMode:'instant',rankedActivity:false}),'paused');
  assert.equal(inferExamTimerPolicy({exam:untimedExam,feedbackMode:'instant',rankedActivity:false}),'none');
  assert.equal(inferExamTimerPolicy({exam:untimedExam,feedbackMode:'exam',rankedActivity:true}),'continuous-ranked');
});

test('timer policy labels preserve learner-facing wording',()=>{
  assert.match(examTimerPolicyLabel({policy:'ranked-learning-solve',voucherTimerPhase:'feedback-paused'}),/paused while you review feedback/i);
  assert.match(examTimerPolicyLabel({policy:'ranked-learning-solve',voucherTimerPhase:'solving'}),/runs while you answer/i);
  assert.equal(examTimerPolicyLabel({policy:'continuous-ranked'}),'Ranked exam time continues while you are away.');
  assert.equal(examTimerPolicyLabel({policy:'paused'}),'Timer pauses while you are away.');
  assert.equal(examTimerPolicyLabel({policy:'none'}),'No countdown timer; your active-session time is saved.');
});

test('ranked learning restore subtracts away time only while solving',()=>{
  const solving=restoreTimerAfterAway({
    policy:'ranked-learning-solve',voucherTimerPhase:'solving',remainingSeconds:600,elapsedSeconds:50,
    savedAtEpoch:1_000_000,nowEpoch:1_030_000
  });
  assert.deepEqual(solving,{remainingSeconds:570,elapsedSeconds:50,awaySeconds:30});

  const feedback=restoreTimerAfterAway({
    policy:'ranked-learning-solve',voucherTimerPhase:'feedback-paused',remainingSeconds:600,elapsedSeconds:50,
    savedAtEpoch:1_000_000,nowEpoch:1_030_000
  });
  assert.deepEqual(feedback,{remainingSeconds:600,elapsedSeconds:50,awaySeconds:0});
});

test('continuous ranked restore counts away time in elapsed and countdown while paused practice does not',()=>{
  const ranked=restoreTimerAfterAway({
    policy:'continuous-ranked',remainingSeconds:600,elapsedSeconds:50,
    savedAtEpoch:1_000_000,nowEpoch:1_030_000
  });
  assert.deepEqual(ranked,{remainingSeconds:570,elapsedSeconds:80,awaySeconds:30});

  const paused=restoreTimerAfterAway({
    policy:'paused',remainingSeconds:600,elapsedSeconds:50,
    savedAtEpoch:1_000_000,nowEpoch:1_030_000
  });
  assert.deepEqual(paused,{remainingSeconds:600,elapsedSeconds:50,awaySeconds:0});
});
