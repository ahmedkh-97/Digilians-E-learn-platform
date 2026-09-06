export function createPl300LearningController({
  state,
  getRecords,
  saveLearningState,
  learningLoop,
  fullRankedLearning,
  renderReview,
  scrollTop
}={}){
  function filteredQuestions(){
    const questions=state.voucherSourceReviewBank?.questions||[];
    let partQuestions=fullRankedLearning?.filterPl300QuestionsByPart
      ?fullRankedLearning.filterPl300QuestionsByPart({questions,partId:state.voucherSourceReviewPartId,parts:state.voucherSourceReviewParts})
      :questions;
    if(state.voucherSourceReviewWeakIds instanceof Set)partQuestions=partQuestions.filter(q=>state.voucherSourceReviewWeakIds.has(String(q.id)));
    if(state.voucherSourceReviewFilter==='source-01'||state.voucherSourceReviewFilter==='source-02')return partQuestions.filter(q=>String(q.sourceId)===state.voucherSourceReviewFilter);
    return partQuestions;
  }

  function startSolveTimer(question,{force=false}={}){
    if(!question?.id)return;
    const id=String(question.id);
    if(!force&&state.voucherSourceSolveQuestionId===id&&Number.isFinite(Number(state.voucherSourceSolveStartedAt)))return;
    state.voucherSourceSolveQuestionId=id;
    state.voucherSourceSolveStartedAt=Date.now();
  }

  function consumeSolveSeconds(question){
    const id=String(question?.id||'');
    if(!id||state.voucherSourceSolveQuestionId!==id||!Number.isFinite(Number(state.voucherSourceSolveStartedAt)))return 0;
    const elapsed=Math.max(0,Math.min(1800,Math.round((Date.now()-Number(state.voucherSourceSolveStartedAt))/1000)));
    state.voucherSourceSolveQuestionId=null;
    state.voucherSourceSolveStartedAt=null;
    return elapsed;
  }

  function resetSolveTimer(){
    state.voucherSourceSolveQuestionId=null;
    state.voucherSourceSolveStartedAt=null;
  }

  function activePart(){
    if(state.voucherSourceReviewPartId==='all')return null;
    return state.voucherSourceReviewParts.find(part=>String(part.id)===String(state.voucherSourceReviewPartId))||null;
  }

  function persist(nextState=state.voucherSourceLearningState){
    state.voucherSourceLearningState=nextState||{version:1,parts:{}};
    saveLearningState(state.voucherSourceLearningState);
    return state.voucherSourceLearningState;
  }

  function remainingFirstPass(part,records){
    return (part?.questionIds||[]).filter(id=>!records?.[id]).length;
  }

  function updateAfterScoredSave({question,correct,wasRetrying=false,hadRecord=false}={}){
    const part=activePart();
    if(!part||!question?.id||!learningLoop)return;
    const records=getRecords();
    let learning=state.voucherSourceLearningState;
    if(wasRetrying||hadRecord){
      learning=learningLoop.resolvePl300PendingRetry({state:learning,partId:part.id,questionId:question.id,correct});
    }else if(correct===false){
      learning=learningLoop.enqueuePl300DelayedRetry({state:learning,partId:part.id,questionId:question.id,remainingFirstPassCount:remainingFirstPass(part,records)});
    }
    persist(learning);
    if(correct===true&&state.voucherSourceReviewWeakIds instanceof Set){
      state.voucherSourceReviewWeakIds.delete(String(question.id));
      if(!state.voucherSourceReviewWeakIds.size){
        state.voucherSourceReviewWeakIds=null;
        state.voucherSourcePartReviewMode='complete';
      }
    }
  }

  function navigate(nextIndex,{countTransition=true}={}){
    const questions=filteredQuestions();
    if(!questions.length)return;
    const currentIndex=Math.max(0,Math.min(state.voucherSourceReviewIndex,questions.length-1));
    const bounded=Math.max(0,Math.min(Number(nextIndex)||0,questions.length-1));
    const from=questions[currentIndex],requested=questions[bounded];
    let targetIndex=bounded;
    const part=activePart();
    if(countTransition&&part&&learningLoop&&!(state.voucherSourceReviewWeakIds instanceof Set)&&from?.id&&requested?.id&&String(from.id)!==String(requested.id)){
      const advanced=learningLoop.advancePl300RetryQueue({state:state.voucherSourceLearningState,partId:part.id,fromQuestionId:from.id,toQuestionId:requested.id});
      persist(advanced.state);
      if(advanced.maturedQuestionId){
        const retryIndex=questions.findIndex(question=>String(question.id)===String(advanced.maturedQuestionId));
        if(retryIndex>=0){
          targetIndex=retryIndex;
          state.voucherSourcePracticeRetrying.add(String(advanced.maturedQuestionId));
        }
      }
    }
    resetSolveTimer();
    state.voucherSourceReviewIndex=targetIndex;
    state.voucherSourcePartReviewMode=null;
    renderReview();
    scrollTop();
  }

  function partReviewContext(part){
    const records=getRecords();
    const review=learningLoop.buildPl300PartReviewModel({part,index:state.voucherFullRankedIndex,records});
    const partIndex=state.voucherSourceReviewParts.findIndex(item=>String(item.id)===String(part?.id));
    const nextPart=partIndex>=0?state.voucherSourceReviewParts[partIndex+1]||null:null;
    return {records,review,nextPart};
  }

  function selectPart(partId='all'){
    resetSolveTimer();
    const requested=String(partId||'all');
    state.voucherSourceReviewPartId=requested==='all'||state.voucherSourceReviewParts.some(part=>String(part.id)===requested)?requested:'all';
    state.voucherSourceReviewWeakIds=null;
    state.voucherSourcePartReviewMode=null;
    state.voucherSourceReviewFilter='all';
    state.voucherSourceReviewIndex=0;
    const part=activePart();
    if(part&&learningLoop){
      const resume=learningLoop.resolvePl300PartResume({part,index:state.voucherFullRankedIndex,records:getRecords()});
      if(resume.mode==='question'){
        const questions=filteredQuestions();
        const index=questions.findIndex(question=>String(question.id)===String(resume.questionId));
        state.voucherSourceReviewIndex=index>=0?index:0;
      }else state.voucherSourcePartReviewMode=resume.mode;
    }
    renderReview();
    scrollTop();
  }

  function renderEndOfPartReview(body,part){
    const {review,nextPart}=partReviewContext(part);
    body.innerHTML=fullRankedLearning.buildPl300EndOfPartReviewMarkup({part,review,nextPart:nextPart?{id:nextPart.id,label:nextPart.label||nextPart.title||nextPart.id}:null});
    body.querySelector('[data-pl300-review-weak]')?.addEventListener('click',()=>{
      state.voucherSourceReviewWeakIds=new Set(review.weakQuestionIds.map(String));
      state.voucherSourcePartReviewMode=null;
      state.voucherSourceReviewIndex=0;
      renderReview();
      scrollTop();
    });
    body.querySelector('[data-pl300-continue-next-part]')?.addEventListener('click',event=>selectPart(String(event.currentTarget?.dataset?.pl300ContinueNextPart||'all')));
    body.querySelector('[data-pl300-parts-back]')?.addEventListener('click',()=>selectPart('all'));
  }

  return {filteredQuestions,startSolveTimer,consumeSolveSeconds,resetSolveTimer,activePart,persist,updateAfterScoredSave,navigate,partReviewContext,selectPart,renderEndOfPartReview};
}
