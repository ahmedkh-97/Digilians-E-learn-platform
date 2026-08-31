export function resolveModuleExamId(module,forcedMode=null){
  if(!module)return null;
  if(forcedMode==='instant')return module.practiceExamId || module.examId || null;
  return module.examId || null;
}

export function moduleAssessmentState(module){
  if(!module || module.assessmentStatus==='building-after-study-qa'){
    return {practiceReady:false,examReady:false};
  }
  return {
    practiceReady:Boolean(resolveModuleExamId(module,'instant')),
    examReady:Boolean(resolveModuleExamId(module,'exam'))
  };
}

export function shouldSyncAttemptOnline(rankedActivity){
  return rankedActivity===true;
}
