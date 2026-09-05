const NAV_FILTERS=new Set(['all','unanswered','answered','marked']);

export function normalizeNavigatorFilter(filter){
  return NAV_FILTERS.has(filter)?filter:'all';
}

export function toggleMarkedQuestionState(markedQuestions=[],questionId){
  const normalized=[...new Set(Array.isArray(markedQuestions)?markedQuestions:[])];
  if(!questionId)return normalized;
  const set=new Set(normalized);
  if(set.has(questionId))set.delete(questionId);
  else set.add(questionId);
  return [...set];
}

export function setQuestionIndex({targetIndex=0,totalQuestions=0}={}){
  const total=Math.max(0,Number(totalQuestions)||0);
  if(total<=0)return 0;
  const target=Number.isFinite(Number(targetIndex))?Math.trunc(Number(targetIndex)):0;
  return Math.min(Math.max(0,target),total-1);
}

export function moveQuestionIndex({currentIndex=0,totalQuestions=0,direction=0}={}){
  const current=setQuestionIndex({targetIndex:currentIndex,totalQuestions});
  const step=Math.sign(Number(direction)||0);
  return setQuestionIndex({targetIndex:current+step,totalQuestions});
}
