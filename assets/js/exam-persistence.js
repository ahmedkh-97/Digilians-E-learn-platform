const GENERATED_EXAM_GENERATORS=new Set(['question-bank','official-qbank','mistakes']);

export function buildVoucherResumeDescriptor({voucherContext=null,questions=[],feedbackMode='instant'}={}){
  if(!voucherContext)return null;
  return {
    trackId:voucherContext.trackId,
    voucherExamId:voucherContext.voucherExamId,
    mockKind:voucherContext.mockKind,
    sourceId:voucherContext.sourceId||null,
    sizeMode:voucherContext.sizeMode,
    timed:Boolean(voucherContext.timed),
    feedbackMode,
    rankedLearning:Boolean(voucherContext.rankedLearning),
    domainRanked:Boolean(voucherContext.domainRanked),
    domainTitle:voucherContext.domainTitle||null,
    sectionIds:Array.isArray(voucherContext.sectionIds)?voucherContext.sectionIds.map(String):[],
    sessionRanked:Boolean(voucherContext.sessionRanked),
    sessionId:voucherContext.sessionId||null,
    domainId:voucherContext.domainId||null,
    timerDisplay:voucherContext.timerDisplay!==false,
    fullBankRanked:Boolean(voucherContext.fullBankRanked),
    improvementSession:Boolean(voucherContext.improvementSession),
    weakDomains:Array.isArray(voucherContext.weakDomains)?voucherContext.weakDomains:[],
    questionIds:(questions||[]).map(question=>question.id),
    optionOrderByQuestion:Object.fromEntries((questions||[]).map(question=>[
      question.id,
      (question.options||[]).map(option=>option.id)
    ]))
  };
}

export function buildExamProgressSnapshot({
  studentName='',currentExam=null,currentRegistryItem=null,
  answers={},firstPassAnswers={},firstPassCommitted={},confirmedMultiAnswers={},confirmedVoucherAnswers={},voucherTimerPhase=null,
  markedQuestions=[],currentIndex=0,feedbackMode='instant',remainingSeconds=null,
  startedAt=null,timerPolicy='none',currentRankedActivity=false,nowEpoch=Date.now()
}={}){
  if(!currentExam?.exam)return null;
  const questions=currentExam.questions||[];
  const voucherContext=currentExam.exam.generatedFromVoucher||null;
  const voucherResume=buildVoucherResumeDescriptor({voucherContext,questions,feedbackMode});
  return {
    progressVersion:2,
    studentName,
    examId:currentExam.exam.id,
    examTitle:currentExam.exam.title,
    answers,
    firstPassAnswers,
    firstPassCommitted,
    confirmedMultiAnswers,
    confirmedVoucherAnswers,
    voucherTimerPhase,
    markedQuestions,
    currentIndex,
    totalQuestions:questions.length,
    feedbackMode,
    remainingSeconds,
    elapsedSeconds:Math.max(0,Math.floor((Number(nowEpoch)-Number(startedAt))/1000)),
    timerPolicy,
    rankedActivity:currentRankedActivity,
    savedAtEpoch:Number(nowEpoch),
    voucherResume,
    generatedExam:!voucherContext&&GENERATED_EXAM_GENERATORS.has(currentRegistryItem?.generator)?currentExam:null
  };
}

export function getActiveExamProgress(progress,studentName){
  return progress&&progress.studentName===studentName?progress:null;
}

export function effectiveSavedRemainingSeconds(progress,{nowEpoch=Date.now()}={}){
  if(progress?.remainingSeconds===null||progress?.remainingSeconds===undefined)return null;
  let remaining=Math.max(0,Number(progress.remainingSeconds)||0);
  if(progress.timerPolicy==='continuous-ranked'&&progress.savedAtEpoch){
    remaining=Math.max(0,remaining-Math.floor((Number(nowEpoch)-Number(progress.savedAtEpoch))/1000));
  }
  return remaining;
}

export function voucherSavedAttemptMatches(progress,context){
  const saved=progress?.voucherResume;
  if(!saved||!context)return false;
  const base=String(saved.trackId||'')===String(context.trackId||'')
    && String(saved.voucherExamId||'')===String(context.voucherExamId||'')
    && String(saved.mockKind||'')===String(context.mockKind||'')
    && String(saved.sizeMode||'')===String(context.sizeMode||'');
  if(!base)return false;
  if(String(saved.mockKind||'')==='domain')return String(saved.domainId||saved.sourceId||'')===String(context.domainId||context.sourceId||'');
  if(String(saved.mockKind||'')==='session')return String(saved.sessionId||saved.sourceId||'')===String(context.sessionId||context.sourceId||'');
  if(String(saved.mockKind||'')==='source')return String(saved.sourceId||'')===String(context.sourceId||'');
  return true;
}
