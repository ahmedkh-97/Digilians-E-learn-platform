const asCount=value=>Math.max(0,Number.isFinite(Number(value))?Number(value):0);
const asId=value=>String(value??'').trim();
const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));

export const PL300_RETRY_DELAY_TRANSITIONS=4;

function normalizePendingItem(item={}){
  const questionId=asId(item?.questionId);
  if(!questionId)return null;
  return {
    questionId,
    dueAtSerial:asCount(item?.dueAtSerial),
    deferToPartReview:Boolean(item?.deferToPartReview),
    updatedAt:item?.updatedAt?String(item.updatedAt):null
  };
}

function normalizePartState(value={}){
  const seen=new Set();
  const pending=[];
  for(const raw of Array.isArray(value?.pending)?value.pending:[]){
    const item=normalizePendingItem(raw);
    if(!item||seen.has(item.questionId))continue;
    seen.add(item.questionId);
    pending.push(item);
  }
  return {
    transitionSerial:asCount(value?.transitionSerial),
    pending,
    updatedAt:value?.updatedAt?String(value.updatedAt):null
  };
}

export function normalizePl300LearningState(raw={}){
  const parts={};
  for(const [partId,value] of Object.entries(raw?.parts||{})){
    const id=asId(partId);
    if(!id)continue;
    parts[id]=normalizePartState(value);
  }
  return {version:1,parts};
}

function withPart(state,partId){
  const next=normalizePl300LearningState(state);
  const id=asId(partId);
  if(!id)return {state:next,partId:'',part:null};
  if(!next.parts[id])next.parts[id]=normalizePartState();
  return {state:next,partId:id,part:next.parts[id]};
}

function stamp(value,now){
  return now?String(now):value||null;
}

export function enqueuePl300DelayedRetry({state={},partId,questionId,remainingFirstPassCount=0,now=null}={}){
  const scoped=withPart(state,partId);
  const id=asId(questionId);
  if(!scoped.part||!id)return scoped.state;
  const existing=scoped.part.pending.find(item=>item.questionId===id);
  if(existing){
    existing.deferToPartReview=existing.deferToPartReview||asCount(remainingFirstPassCount)<PL300_RETRY_DELAY_TRANSITIONS;
    existing.updatedAt=stamp(existing.updatedAt,now);
    scoped.part.updatedAt=stamp(scoped.part.updatedAt,now);
    return scoped.state;
  }
  scoped.part.pending.push({
    questionId:id,
    dueAtSerial:scoped.part.transitionSerial+PL300_RETRY_DELAY_TRANSITIONS,
    deferToPartReview:asCount(remainingFirstPassCount)<PL300_RETRY_DELAY_TRANSITIONS,
    updatedAt:now?String(now):null
  });
  scoped.part.updatedAt=stamp(scoped.part.updatedAt,now);
  return scoped.state;
}

function maturedPending(part){
  return (part?.pending||[]).find(item=>!item.deferToPartReview&&item.dueAtSerial<=asCount(part?.transitionSerial))||null;
}

export function advancePl300RetryQueue({state={},partId,fromQuestionId,toQuestionId,transitions=1,now=null}={}){
  const scoped=withPart(state,partId);
  if(!scoped.part)return {state:scoped.state,maturedQuestionId:null};
  const from=asId(fromQuestionId),to=asId(toQuestionId);
  if(from&&to&&from!==to){
    scoped.part.transitionSerial+=Math.max(1,Math.floor(asCount(transitions)||1));
    scoped.part.updatedAt=stamp(scoped.part.updatedAt,now);
  }
  const matured=maturedPending(scoped.part);
  return {state:scoped.state,maturedQuestionId:matured?.questionId||null};
}

export function resolvePl300PendingRetry({state={},partId,questionId,correct=false,now=null}={}){
  const scoped=withPart(state,partId);
  const id=asId(questionId);
  if(!scoped.part||!id)return scoped.state;
  const index=scoped.part.pending.findIndex(item=>item.questionId===id);
  if(index<0)return scoped.state;
  if(correct){
    scoped.part.pending.splice(index,1);
  }else{
    scoped.part.pending[index]={
      ...scoped.part.pending[index],
      deferToPartReview:true,
      updatedAt:stamp(scoped.part.pending[index].updatedAt,now)
    };
  }
  scoped.part.updatedAt=stamp(scoped.part.updatedAt,now);
  return scoped.state;
}

function indexRecords(index){return Array.isArray(index?.records)?index.records:[];}
function practiceRecord(records,id){
  const record=records?.[id];
  return record&&typeof record==='object'&&!Array.isArray(record)?record:null;
}
function isScored(record){return record?.mode==='auto'||record?.mode==='native';}
function firstPassCorrect(record){return record?.firstPassCorrect===true;}
function recovered(record){return isScored(record)&&record?.firstPassCorrect===false&&record?.everCorrect===true;}
function unresolved(record){return isScored(record)&&record?.firstPassCorrect===false&&record?.everCorrect!==true;}
function mastered(record){return isScored(record)&&(record?.everCorrect===true||record?.correct===true||record?.firstPassCorrect===true);}
function clusterKey(item){return asId(item?.equivalenceClusterId||item?.validatedQuestionId||item?.questionId);}

export function buildPl300PartStudyMetrics({part={},index={},records={}}={}){
  const ids=(Array.isArray(part?.questionIds)?part.questionIds:[]).map(asId).filter(Boolean);
  const wanted=new Set(ids);
  const byId=new Map(indexRecords(index).filter(item=>wanted.has(asId(item?.questionId))).map(item=>[asId(item.questionId),item]));
  let studied=0,scored=0,firstPass=0,recoveredCount=0,needReview=0,checkpoints=0;
  const needReviewQuestionIds=[];
  const masteredClusters=new Set();
  for(const id of ids){
    const record=practiceRecord(records,id);
    if(!record)continue;
    studied+=1;
    if(record.mode==='checkpoint')checkpoints+=1;
    if(isScored(record)){
      scored+=1;
      if(firstPassCorrect(record))firstPass+=1;
      if(recovered(record))recoveredCount+=1;
      if(unresolved(record)){
        needReview+=1;
        needReviewQuestionIds.push(id);
      }
    }
    const item=byId.get(id);
    if(item?.mode==='objective'&&Number(item?.ranking?.accuracyWeight)===1&&mastered(record)){
      const key=clusterKey(item);
      if(key)masteredClusters.add(key);
    }
  }
  return {
    total:ids.length,
    studied,
    scored,
    firstPassCorrect:firstPass,
    recovered:recoveredCount,
    needReview,
    checkpoints,
    firstPassAccuracy:scored?Math.round((firstPass/scored)*1000)/10:null,
    masteredConcepts:masteredClusters.size,
    needReviewQuestionIds
  };
}

export function buildPl300PartReviewModel(args={}){
  const metrics=buildPl300PartStudyMetrics(args);
  return {
    ...metrics,
    completeFirstPass:metrics.studied>=metrics.total&&metrics.total>0,
    weakQuestionIds:[...metrics.needReviewQuestionIds],
    primaryAction:metrics.needReview?`Review ${metrics.needReview} weak question${metrics.needReview===1?'':'s'}`:'Continue to next part',
    secondaryAction:metrics.needReview?'Continue to next part':null
  };
}

export function resolvePl300PartResume({part={},index={},records={}}={}){
  const ids=(Array.isArray(part?.questionIds)?part.questionIds:[]).map(asId).filter(Boolean);
  for(let i=0;i<ids.length;i++){
    if(!practiceRecord(records,ids[i]))return {mode:'question',questionId:ids[i],index:i};
  }
  const metrics=buildPl300PartStudyMetrics({part,index,records});
  if(metrics.needReviewQuestionIds.length)return {mode:'review',questionIds:[...metrics.needReviewQuestionIds]};
  return {mode:'complete'};
}

export const pl300LearningLoopTestApi={normalizePendingItem,normalizePartState,maturedPending,clone};
