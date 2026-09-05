import {VOUCHER_TIMER_PHASE_SOLVING,isVoucherRankedLearningExam} from './voucher-ranked-runtime.js?v=0.22.1';
import {inferExamTimerPolicy,restoreTimerAfterAway} from './exam-timer.js?v=0.22.1';

function timerRemainingForExam(exam){
  const timer=exam?.settings?.timer;
  return timer?.enabled?timer.durationMinutes*60:null;
}

export function createFreshExamSession({exam,feedbackMode='instant',rankedActivity=false,nowEpoch=Date.now()}={}){
  return {
    answers:{},
    firstPassAnswers:{},
    firstPassCommitted:{},
    confirmedMultiAnswers:{},
    confirmedVoucherAnswers:{},
    voucherTimerPhase:isVoucherRankedLearningExam(exam)?VOUCHER_TIMER_PHASE_SOLVING:null,
    markedQuestions:[],
    currentIndex:0,
    feedbackMode,
    startedAt:Number(nowEpoch),
    remainingSeconds:timerRemainingForExam(exam),
    timerPolicy:inferExamTimerPolicy({exam,feedbackMode,rankedActivity})
  };
}

export function restoreExamSession({exam,questions=[],restored={},feedbackMode='instant',rankedActivity=false,nowEpoch=Date.now()}={}){
  const restoredFeedbackMode=restored.feedbackMode||'instant';
  const voucherTimerPhase=restored.voucherTimerPhase || (isVoucherRankedLearningExam(exam)?VOUCHER_TIMER_PHASE_SOLVING:null);
  const timerPolicy=restored.timerPolicy || inferExamTimerPolicy({exam,feedbackMode:restoredFeedbackMode||feedbackMode,rankedActivity});
  const elapsedSeconds=Math.max(0,Number(restored.elapsedSeconds)||0);
  const restoredTimer=restoreTimerAfterAway({
    policy:timerPolicy,
    voucherTimerPhase,
    remainingSeconds:restored.remainingSeconds??null,
    elapsedSeconds,
    savedAtEpoch:restored.savedAtEpoch,
    nowEpoch
  });
  const maxIndex=Math.max(0,(Array.isArray(questions)?questions.length:0)-1);
  return {
    answers:restored.answers||{},
    firstPassAnswers:restored.firstPassAnswers||{},
    firstPassCommitted:restored.firstPassCommitted||{},
    confirmedMultiAnswers:restored.confirmedMultiAnswers||{},
    confirmedVoucherAnswers:restored.confirmedVoucherAnswers||{},
    voucherTimerPhase,
    markedQuestions:[...new Set(restored.markedQuestions||[])],
    currentIndex:Math.min(Math.max(0,restored.currentIndex||0),maxIndex),
    feedbackMode:restoredFeedbackMode,
    startedAt:Number(nowEpoch)-restoredTimer.elapsedSeconds*1000,
    remainingSeconds:restoredTimer.remainingSeconds,
    timerPolicy
  };
}
