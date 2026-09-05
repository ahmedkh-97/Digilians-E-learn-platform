export const VOUCHER_TIMER_PHASE_SOLVING='solving';
export const VOUCHER_TIMER_PHASE_FEEDBACK='feedback-paused';

export function isVoucherRankedLearningExam(exam){
  const ctx=exam?.generatedFromVoucher;
  return Boolean(ctx?.rankEligible===true&&(ctx?.rankedLearning===true||ctx?.domainRanked===true)&&(ctx?.sizeMode==='real'||ctx?.sessionRanked===true||ctx?.domainRanked===true||ctx?.runtimeMode==='ranked-session'||ctx?.runtimeMode==='ranked-domain'));
}


export function voucherRequiresExplicitAnswerConfirmation({feedbackMode='instant',correctAnswerCount=1}={}){
  return String(feedbackMode)==='instant' && Math.max(0,Number(correctAnswerCount)||0)>1;
}

export function voucherAnswerIsConfirmed({exam,questionId,confirmedAnswers={},confirmedMultiAnswers={}}={}){
  if(!isVoucherRankedLearningExam(exam))return false;
  return Boolean(confirmedAnswers?.[questionId]||confirmedMultiAnswers?.[questionId]);
}

export function voucherTimerPhaseForQuestion({exam,questionId,selected,confirmedAnswers={},confirmedMultiAnswers={}}={}){
  if(!isVoucherRankedLearningExam(exam))return null;
  return voucherAnswerIsConfirmed({exam,questionId,selected,confirmedAnswers,confirmedMultiAnswers})
    ?VOUCHER_TIMER_PHASE_FEEDBACK
    :VOUCHER_TIMER_PHASE_SOLVING;
}

export function applyVoucherRankedAwayTime({phase,remainingSeconds,savedAtEpoch,nowEpoch=Date.now()}={}){
  const remaining=Math.max(0,Number(remainingSeconds)||0);
  if(phase!==VOUCHER_TIMER_PHASE_SOLVING)return {remainingSeconds:remaining,awaySeconds:0};
  const saved=Number(savedAtEpoch)||0;
  const now=Number(nowEpoch)||saved;
  const awaySeconds=Math.max(0,Math.floor((now-saved)/1000));
  return {remainingSeconds:Math.max(0,remaining-awaySeconds),awaySeconds};
}

export function voucherRankedSolveTimeSeconds({allowedDurationMinutes,remainingSeconds}={}){
  const allowed=Math.max(0,Number(allowedDurationMinutes)||0)*60;
  const remaining=Math.max(0,Number(remainingSeconds)||0);
  return Math.max(0,Math.round(allowed-remaining));
}
