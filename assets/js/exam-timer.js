import {
  VOUCHER_TIMER_PHASE_FEEDBACK,
  isVoucherRankedLearningExam,
  applyVoucherRankedAwayTime
} from './voucher-ranked-runtime.js?v=0.22.2';

export function inferExamTimerPolicy({exam,feedbackMode='instant',rankedActivity=false}={}){
  const enabled=Boolean(exam?.settings?.timer?.enabled);
  if(exam?.generatedFromVoucher?.sessionRanked===true||exam?.generatedFromVoucher?.domainRanked===true||exam?.generatedFromVoucher?.runtimeMode==='ranked-session'||exam?.generatedFromVoucher?.runtimeMode==='ranked-domain')return 'active-solve';
  if(isVoucherRankedLearningExam(exam))return 'ranked-learning-solve';
  if(rankedActivity && exam?.generatedFromVoucher)return 'continuous-ranked';
  if(rankedActivity && feedbackMode==='exam')return 'continuous-ranked';
  if(!enabled)return 'none';
  return 'paused';
}

export function examTimerPolicyLabel({policy='none',voucherTimerPhase=null}={}){
  if(policy==='ranked-learning-solve'){
    return voucherTimerPhase===VOUCHER_TIMER_PHASE_FEEDBACK
      ?'Solve timer paused while you review feedback.'
      :'Solve timer runs while you answer; time away still counts until you confirm.';
  }
  if(policy==='active-solve')return 'Active solve time counts only while you are solving; feedback and time away are paused.';
  if(policy==='continuous-ranked')return 'Ranked exam time continues while you are away.';
  if(policy==='paused')return 'Timer pauses while you are away.';
  return 'No countdown timer; your active-session time is saved.';
}

export function restoreTimerAfterAway({
  policy='none',voucherTimerPhase=null,remainingSeconds=null,elapsedSeconds=0,
  savedAtEpoch=null,nowEpoch=Date.now()
}={}){
  let remaining=remainingSeconds;
  let elapsed=Math.max(0,Number(elapsedSeconds)||0);
  if(!savedAtEpoch)return {remainingSeconds:remaining,elapsedSeconds:elapsed,awaySeconds:0};

  if(policy==='ranked-learning-solve'){
    const adjusted=applyVoucherRankedAwayTime({
      phase:voucherTimerPhase,
      remainingSeconds:remaining,
      savedAtEpoch:Number(savedAtEpoch),
      nowEpoch:Number(nowEpoch)
    });
    return {remainingSeconds:adjusted.remainingSeconds,elapsedSeconds:elapsed,awaySeconds:adjusted.awaySeconds};
  }

  if(policy==='continuous-ranked'){
    const awaySeconds=Math.max(0,Math.floor((Number(nowEpoch)-Number(savedAtEpoch))/1000));
    elapsed+=awaySeconds;
    if(remaining!==null)remaining=Math.max(0,Number(remaining)-awaySeconds);
    return {remainingSeconds:remaining,elapsedSeconds:elapsed,awaySeconds};
  }

  return {remainingSeconds:remaining,elapsedSeconds:elapsed,awaySeconds:0};
}
