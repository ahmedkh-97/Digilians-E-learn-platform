export const EXAM_MODE_IDS=Object.freeze({
  COURSE_PRACTICE:'course-practice',
  COURSE_EXAM:'course-exam',
  OFFICIAL_PRACTICE:'official-practice',
  OFFICIAL_EXAM:'official-exam',
  MISTAKES_PRACTICE:'mistakes-practice',
  VOUCHER_PRACTICE:'voucher-practice',
  VOUCHER_RANKED_LEARNING:'voucher-ranked-learning',
  VOUCHER_RANKED_SESSION:'voucher-ranked-session',
  VOUCHER_RANKED_DOMAIN:'voucher-ranked-domain',
  VOUCHER_FULL_BANK_RANKED:'voucher-full-bank-ranked',
  VOUCHER_IMPROVEMENT:'voucher-improvement'
});

function analyticsEvents({mistakes=false,feedbackMode='instant'}={}){
  if(mistakes)return {analyticsStartEvent:'mistakes_practice_start',analyticsCompleteEvent:'mistakes_practice_complete'};
  const practice=feedbackMode==='instant';
  return {
    analyticsStartEvent:practice?'practice_start':'exam_start',
    analyticsCompleteEvent:practice?'practice_complete':'exam_complete'
  };
}

function profile({id,family,feedbackMode='instant',rankedActivity=false,resultMode=null,official=false,voucherRankedLearning=false,...extra}={}){
  return Object.freeze({
    id,family,feedbackMode,rankedActivity:Boolean(rankedActivity),resultMode,
    official:Boolean(official),voucherRankedLearning:Boolean(voucherRankedLearning),
    instantFeedback:feedbackMode==='instant',examFeedback:feedbackMode!=='instant',
    ...analyticsEvents({mistakes:family==='mistakes',feedbackMode}),
    ...extra
  });
}

export function resolveExamMode({exam=null,feedbackMode='instant',rankedActivity=false}={}){
  const resolvedFeedback=feedbackMode==='exam'?'exam':'instant';
  const voucher=exam?.generatedFromVoucher||null;
  if(voucher){
    const runtimeMode=String(voucher.runtimeMode||'');
    if(runtimeMode==='ranked-domain'||voucher.domainRanked===true){
      return profile({
        id:EXAM_MODE_IDS.VOUCHER_RANKED_DOMAIN,family:'voucher',feedbackMode:resolvedFeedback,rankedActivity:true,
        resultMode:'ranked-domain',voucherRankedLearning:true,domainRanked:true,rankingMode:'domain'
      });
    }
    if(runtimeMode==='ranked-session'||voucher.sessionRanked===true){
      return profile({
        id:EXAM_MODE_IDS.VOUCHER_RANKED_SESSION,family:'voucher',feedbackMode:resolvedFeedback,rankedActivity:true,
        resultMode:'ranked-session',voucherRankedLearning:true,sessionRanked:true,rankingMode:'session'
      });
    }
    if(runtimeMode==='ranked-learning'||(voucher.rankedLearning===true&&voucher.sessionRanked!==true)){
      return profile({
        id:EXAM_MODE_IDS.VOUCHER_RANKED_LEARNING,family:'voucher',feedbackMode:'instant',rankedActivity:true,
        resultMode:'ranked-learning',voucherRankedLearning:true,rankingMode:voucher.rankingMode||'real'
      });
    }
    if(runtimeMode==='full-bank-ranked'||voucher.fullBankRanked===true){
      return profile({
        id:EXAM_MODE_IDS.VOUCHER_FULL_BANK_RANKED,family:'voucher',feedbackMode:'exam',rankedActivity:true,
        resultMode:'full-bank-ranked',rankingMode:voucher.rankingMode||'full-bank'
      });
    }
    if(runtimeMode==='improvement'||voucher.improvementSession===true){
      return profile({
        id:EXAM_MODE_IDS.VOUCHER_IMPROVEMENT,family:'voucher',feedbackMode:'instant',rankedActivity:false,
        resultMode:'improvement',improvementSession:true
      });
    }
    return profile({
      id:EXAM_MODE_IDS.VOUCHER_PRACTICE,family:'voucher',feedbackMode:resolvedFeedback,rankedActivity:false,
      resultMode:'practice'
    });
  }

  if(exam?.generatedFromMistakes){
    return profile({
      id:EXAM_MODE_IDS.MISTAKES_PRACTICE,family:'mistakes',feedbackMode:'instant',rankedActivity:false,
      resultMode:'mistake-recovery'
    });
  }

  if(exam?.generatedFromOfficialQbank){
    return profile({
      id:resolvedFeedback==='instant'?EXAM_MODE_IDS.OFFICIAL_PRACTICE:EXAM_MODE_IDS.OFFICIAL_EXAM,
      family:'official',feedbackMode:resolvedFeedback,rankedActivity,official:true,
      resultMode:resolvedFeedback==='instant'?'official-practice':'official-exam'
    });
  }

  return profile({
    id:resolvedFeedback==='instant'?EXAM_MODE_IDS.COURSE_PRACTICE:EXAM_MODE_IDS.COURSE_EXAM,
    family:'course',feedbackMode:resolvedFeedback,rankedActivity,
    resultMode:resolvedFeedback==='instant'?'practice':'exam'
  });
}
