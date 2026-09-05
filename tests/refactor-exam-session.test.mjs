import test from 'node:test';
import assert from 'node:assert/strict';
import {createFreshExamSession,restoreExamSession} from '../assets/js/exam-session.js';

const questions=[{id:'q1'},{id:'q2'},{id:'q3'}];
const rankedLearningExam={
  settings:{timer:{enabled:true,durationMinutes:120}},
  generatedFromVoucher:{rankEligible:true,rankedLearning:true,sizeMode:'real'}
};
const normalTimedExam={settings:{timer:{enabled:true,durationMinutes:60}}};
const untimedExam={settings:{timer:{enabled:false,durationMinutes:null}}};

test('fresh exam session resets mutable attempt state and derives timer defaults',()=>{
  const ranked=createFreshExamSession({exam:rankedLearningExam,feedbackMode:'instant',rankedActivity:true,nowEpoch:2_000_000});
  assert.deepEqual(ranked,{
    answers:{},firstPassAnswers:{},firstPassCommitted:{},confirmedMultiAnswers:{},confirmedVoucherAnswers:{},voucherTimerPhase:'solving',markedQuestions:[],
    currentIndex:0,feedbackMode:'instant',startedAt:2_000_000,remainingSeconds:7200,timerPolicy:'ranked-learning-solve'
  });

  const untimed=createFreshExamSession({exam:untimedExam,feedbackMode:'instant',rankedActivity:false,nowEpoch:2_000_000});
  assert.equal(untimed.remainingSeconds,null);
  assert.equal(untimed.timerPolicy,'none');
  assert.equal(untimed.voucherTimerPhase,null);
});

test('restored session preserves answers, deduplicates marked questions and clamps current index',()=>{
  const session=restoreExamSession({
    exam:normalTimedExam,questions,feedbackMode:'instant',rankedActivity:false,nowEpoch:2_000_000,
    restored:{
      answers:{q1:'a'},confirmedMultiAnswers:{q1:true},confirmedVoucherAnswers:{},markedQuestions:['q1','q1','q2'],
      currentIndex:99,feedbackMode:'exam',elapsedSeconds:45,remainingSeconds:3500,timerPolicy:'paused',savedAtEpoch:1_900_000
    }
  });
  assert.deepEqual(session.answers,{q1:'a'});
  assert.deepEqual(session.confirmedMultiAnswers,{q1:true});
  assert.deepEqual(session.markedQuestions,['q1','q2']);
  assert.equal(session.currentIndex,2);
  assert.equal(session.feedbackMode,'exam');
  assert.equal(session.timerPolicy,'paused');
  assert.equal(session.startedAt,1_955_000);
  assert.equal(session.remainingSeconds,3500);
});

test('restored continuous ranked session counts away time without changing saved data shape',()=>{
  const session=restoreExamSession({
    exam:normalTimedExam,questions,feedbackMode:'exam',rankedActivity:true,nowEpoch:2_030_000,
    restored:{currentIndex:1,feedbackMode:'exam',elapsedSeconds:50,remainingSeconds:600,timerPolicy:'continuous-ranked',savedAtEpoch:2_000_000}
  });
  assert.equal(session.startedAt,1_950_000);
  assert.equal(session.remainingSeconds,570);
  assert.equal(session.timerPolicy,'continuous-ranked');
});

test('restored ranked-learning session subtracts away time only in solving phase',()=>{
  const solving=restoreExamSession({
    exam:rankedLearningExam,questions,feedbackMode:'instant',rankedActivity:true,nowEpoch:2_030_000,
    restored:{elapsedSeconds:50,remainingSeconds:600,savedAtEpoch:2_000_000,voucherTimerPhase:'solving'}
  });
  assert.equal(solving.remainingSeconds,570);
  assert.equal(solving.timerPolicy,'ranked-learning-solve');

  const feedback=restoreExamSession({
    exam:rankedLearningExam,questions,feedbackMode:'instant',rankedActivity:true,nowEpoch:2_030_000,
    restored:{elapsedSeconds:50,remainingSeconds:600,savedAtEpoch:2_000_000,voucherTimerPhase:'feedback-paused'}
  });
  assert.equal(feedback.remainingSeconds,600);
  assert.equal(feedback.voucherTimerPhase,'feedback-paused');
});
