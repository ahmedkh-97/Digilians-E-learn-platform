import {correctAnswerIds,isAnswered,selectedAnswerIds} from './exam.js';
import {isStructuredQuestion,structuredAnswerFields,structuredAnswerState,structuredAnswerComplete} from './exam-structured.js';
import {VOUCHER_TIMER_PHASE_FEEDBACK,voucherRequiresExplicitAnswerConfirmation} from './voucher-ranked-runtime.js?v=0.22.2';

function copyMap(value){
  return {...(value||{})};
}

export function selectSingleAnswerState({
  question,optionId,answers={},confirmedVoucherAnswers={},rankedLearning=false,
  feedbackMode='instant',alreadyConfirmed=false
}={}){
  const questionId=question?.id;
  if(!questionId)return {answers,confirmedVoucherAnswers,voucherTimerPhase:null,stopTimer:false,changed:false};
  if(rankedLearning&&alreadyConfirmed)return {answers,confirmedVoucherAnswers,voucherTimerPhase:null,stopTimer:false,changed:false};
  if(!rankedLearning&&feedbackMode==='instant'&&isAnswered(answers?.[questionId])){
    return {answers,confirmedVoucherAnswers,voucherTimerPhase:null,stopTimer:false,changed:false};
  }

  const nextAnswers=copyMap(answers);
  nextAnswers[questionId]=optionId;
  const nextConfirmed=copyMap(confirmedVoucherAnswers);
  const requiresConfirm=voucherRequiresExplicitAnswerConfirmation({
    feedbackMode,
    correctAnswerCount:correctAnswerIds(question).length
  });
  const autoConfirm=rankedLearning&&feedbackMode==='instant'&&!requiresConfirm;
  if(autoConfirm)nextConfirmed[questionId]=true;
  return {
    answers:nextAnswers,
    confirmedVoucherAnswers:nextConfirmed,
    voucherTimerPhase:autoConfirm?VOUCHER_TIMER_PHASE_FEEDBACK:null,
    stopTimer:autoConfirm,
    changed:true,
    requiresConfirm
  };
}

export function toggleMultiSelectAnswerState({
  question,optionId,answers={},rankedLearning=false,feedbackMode='instant',confirmed=false
}={}){
  const questionId=question?.id;
  if(!questionId)return {answers,changed:false};
  if(rankedLearning&&confirmed)return {answers,changed:false};
  if(!rankedLearning&&feedbackMode==='instant'&&confirmed)return {answers,changed:false};

  const set=new Set(selectedAnswerIds(answers?.[questionId]));
  const id=String(optionId);
  if(set.has(id))set.delete(id);
  else{
    const max=correctAnswerIds(question).length;
    if(max>0&&set.size>=max)return {answers,changed:false};
    set.add(id);
  }

  const nextAnswers=copyMap(answers);
  if(set.size)nextAnswers[questionId]=[...set];
  else delete nextAnswers[questionId];
  return {answers:nextAnswers,changed:true};
}

export function confirmMultiSelectAnswerState({question,answers={},confirmedMultiAnswers={}}={}){
  const questionId=question?.id;
  if(!questionId||correctAnswerIds(question).length<=1||!isAnswered(answers?.[questionId])){
    return {confirmedMultiAnswers,changed:false};
  }
  if(selectedAnswerIds(answers?.[questionId]).length!==correctAnswerIds(question).length){
    return {confirmedMultiAnswers,changed:false};
  }
  const nextConfirmed=copyMap(confirmedMultiAnswers);
  nextConfirmed[questionId]=true;
  return {confirmedMultiAnswers:nextConfirmed,changed:true};
}

export function confirmVoucherRankedAnswerState({
  question,answers={},confirmedMultiAnswers={},confirmedVoucherAnswers={},rankedLearning=false,alreadyConfirmed=false
}={}){
  const questionId=question?.id;
  if(!questionId||!rankedLearning||correctAnswerIds(question).length<=1||alreadyConfirmed||!isAnswered(answers?.[questionId])){
    return {confirmedMultiAnswers,confirmedVoucherAnswers,voucherTimerPhase:null,stopTimer:false,changed:false};
  }
  if(selectedAnswerIds(answers?.[questionId]).length!==correctAnswerIds(question).length){
    return {confirmedMultiAnswers,confirmedVoucherAnswers,voucherTimerPhase:null,stopTimer:false,changed:false};
  }
  const nextVoucher=copyMap(confirmedVoucherAnswers);
  nextVoucher[questionId]=true;
  const nextMulti=copyMap(confirmedMultiAnswers);
  nextMulti[questionId]=true;
  return {
    confirmedMultiAnswers:nextMulti,
    confirmedVoucherAnswers:nextVoucher,
    voucherTimerPhase:VOUCHER_TIMER_PHASE_FEEDBACK,
    stopTimer:true,
    changed:true
  };
}


export function updateStructuredAnswerState({
  question,fieldId,value,answers={},rankedLearning=false,feedbackMode='instant',confirmed=false
}={}){
  const questionId=question?.id;
  if(!questionId||!isStructuredQuestion(question))return {answers,changed:false,complete:false};
  const currentComplete=structuredAnswerComplete(question,answers?.[questionId]);
  if(rankedLearning&&feedbackMode==='instant'&&confirmed)return {answers,changed:false,complete:currentComplete};
  if(!rankedLearning&&feedbackMode==='instant'&&currentComplete)return {answers,changed:false,complete:true};
  const fieldExists=(question?.nativeResponse?.fields||[]).some(field=>String(field?.id)===String(fieldId));
  if(!fieldExists)return {answers,changed:false,complete:structuredAnswerComplete(question,answers?.[questionId])};
  const current=structuredAnswerFields(answers?.[questionId]);
  const nextFields={...current,[String(fieldId)]:String(value??'')};
  const nextAnswers=copyMap(answers);
  nextAnswers[questionId]=structuredAnswerState(question,nextFields);
  return {answers:nextAnswers,changed:true,complete:nextAnswers[questionId].complete};
}

export function confirmStructuredAnswerState({
  question,answers={},confirmedVoucherAnswers={},rankedLearning=false,alreadyConfirmed=false
}={}){
  const questionId=question?.id;
  if(!questionId||!isStructuredQuestion(question)||!rankedLearning||alreadyConfirmed||!structuredAnswerComplete(question,answers?.[questionId])){
    return {confirmedVoucherAnswers,voucherTimerPhase:null,stopTimer:false,changed:false};
  }
  const nextConfirmed=copyMap(confirmedVoucherAnswers);
  nextConfirmed[questionId]=true;
  return {
    confirmedVoucherAnswers:nextConfirmed,
    voucherTimerPhase:VOUCHER_TIMER_PHASE_FEEDBACK,
    stopTimer:true,
    changed:true
  };
}
