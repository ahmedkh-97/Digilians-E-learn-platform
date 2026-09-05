import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildExamProgressSnapshot,
  getActiveExamProgress,
  effectiveSavedRemainingSeconds,
  voucherSavedAttemptMatches
} from '../assets/js/exam-persistence.js';

function baseInput(overrides={}){
  const currentExam={
    exam:{id:'exam-1',title:'Exam One'},
    questions:[
      {id:'q1',options:[{id:'a'},{id:'b'}]},
      {id:'q2',options:[{id:'c'},{id:'d'}]}
    ]
  };
  return {
    studentName:'Ahmed',
    currentExam,
    currentRegistryItem:{generator:'question-bank'},
    answers:{q1:'a'},
    confirmedMultiAnswers:{},
    confirmedVoucherAnswers:{},
    voucherTimerPhase:null,
    markedQuestions:['q2'],
    currentIndex:1,
    feedbackMode:'end',
    remainingSeconds:540,
    startedAt:1_000_000,
    timerPolicy:'paused',
    currentRankedActivity:true,
    nowEpoch:1_065_999,
    ...overrides
  };
}

test('buildExamProgressSnapshot preserves the existing v2 progress payload for generated exams',()=>{
  const input=baseInput();
  const progress=buildExamProgressSnapshot(input);
  assert.equal(progress.progressVersion,2);
  assert.equal(progress.studentName,'Ahmed');
  assert.equal(progress.examId,'exam-1');
  assert.equal(progress.examTitle,'Exam One');
  assert.deepEqual(progress.answers,{q1:'a'});
  assert.deepEqual(progress.markedQuestions,['q2']);
  assert.equal(progress.currentIndex,1);
  assert.equal(progress.totalQuestions,2);
  assert.equal(progress.feedbackMode,'end');
  assert.equal(progress.remainingSeconds,540);
  assert.equal(progress.elapsedSeconds,65);
  assert.equal(progress.timerPolicy,'paused');
  assert.equal(progress.rankedActivity,true);
  assert.equal(progress.savedAtEpoch,1_065_999);
  assert.equal(progress.voucherResume,null);
  assert.equal(progress.generatedExam,input.currentExam);
});

test('buildExamProgressSnapshot creates deterministic Voucher reconstruction metadata without embedding the exam',()=>{
  const voucherContext={
    trackId:'data-analysis',voucherExamId:'pl300',mockKind:'master',sourceId:null,sizeMode:'real',timed:true,
    rankedLearning:true,fullBankRanked:false,improvementSession:false,weakDomains:['DAX']
  };
  const input=baseInput({
    currentExam:{
      exam:{id:'voucher-pl300',title:'PL-300',generatedFromVoucher:voucherContext},
      questions:[
        {id:'vq1',options:[{id:'x2'},{id:'x1'}]},
        {id:'vq2',options:[{id:'y1'},{id:'y3'},{id:'y2'}]}
      ]
    },
    currentRegistryItem:{generator:'voucher'},
    feedbackMode:'instant'
  });
  const progress=buildExamProgressSnapshot(input);
  assert.equal(progress.generatedExam,null);
  assert.deepEqual(progress.voucherResume,{
    trackId:'data-analysis',voucherExamId:'pl300',mockKind:'master',sourceId:null,sizeMode:'real',timed:true,
    feedbackMode:'instant',rankedLearning:true,sessionRanked:false,sessionId:null,domainRanked:false,domainTitle:null,domainId:null,sectionIds:[],timerDisplay:true,fullBankRanked:false,improvementSession:false,weakDomains:['DAX'],
    questionIds:['vq1','vq2'],
    optionOrderByQuestion:{vq1:['x2','x1'],vq2:['y1','y3','y2']}
  });
});

test('getActiveExamProgress returns progress only for the active learner',()=>{
  const progress={studentName:'Ahmed',examId:'exam-1'};
  assert.equal(getActiveExamProgress(progress,'Ahmed'),progress);
  assert.equal(getActiveExamProgress(progress,'Mona'),null);
  assert.equal(getActiveExamProgress(null,'Ahmed'),null);
});

test('effectiveSavedRemainingSeconds only charges away time for continuous ranked attempts',()=>{
  assert.equal(effectiveSavedRemainingSeconds({remainingSeconds:120,timerPolicy:'continuous-ranked',savedAtEpoch:10_000},{nowEpoch:40_999}),90);
  assert.equal(effectiveSavedRemainingSeconds({remainingSeconds:120,timerPolicy:'paused',savedAtEpoch:10_000},{nowEpoch:40_999}),120);
  assert.equal(effectiveSavedRemainingSeconds({remainingSeconds:null,timerPolicy:'paused'},{nowEpoch:40_999}),null);
  assert.equal(effectiveSavedRemainingSeconds({remainingSeconds:10,timerPolicy:'continuous-ranked',savedAtEpoch:10_000},{nowEpoch:40_999}),0);
});

test('voucherSavedAttemptMatches requires the same track, exam, mock kind and size mode',()=>{
  const progress={voucherResume:{trackId:'data-analysis',voucherExamId:'pl300',mockKind:'master',sizeMode:'real'}};
  const same={trackId:'data-analysis',voucherExamId:'pl300',mockKind:'master',sizeMode:'real'};
  assert.equal(voucherSavedAttemptMatches(progress,same),true);
  assert.equal(voucherSavedAttemptMatches(progress,{...same,sizeMode:'full-ranked'}),false);
  assert.equal(voucherSavedAttemptMatches(progress,{...same,voucherExamId:'dp900'}),false);
  assert.equal(voucherSavedAttemptMatches({},same),false);
});
