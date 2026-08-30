const STORE_KEY="digilians.mistakes";
const SCHEMA_VERSION=1;
export const MASTERY_STREAK=2;

function safeClone(value){
  try{return structuredClone(value)}catch{return JSON.parse(JSON.stringify(value))}
}
function nowIso(value){
  if(value instanceof Date)return value.toISOString();
  if(typeof value==="string" && value)return value;
  return new Date().toISOString();
}
function readStore(storage=globalThis.localStorage){
  try{
    const parsed=JSON.parse(storage.getItem(STORE_KEY)||"null");
    if(parsed?.schemaVersion===SCHEMA_VERSION && parsed?.owners && typeof parsed.owners==="object")return parsed;
  }catch{}
  return {schemaVersion:SCHEMA_VERSION,owners:{}};
}
function writeStore(store,storage=globalThis.localStorage){
  storage.setItem(STORE_KEY,JSON.stringify(store));
  return store;
}
function normalizeOwnerId(ownerId){return String(ownerId||"local").trim()||"local"}
function ownerState(store,ownerId,studentName=""){
  const key=normalizeOwnerId(ownerId);
  store.owners[key] ||= {studentName:String(studentName||""),items:{},updatedAt:null};
  store.owners[key].items ||= {};
  if(studentName)store.owners[key].studentName=String(studentName);
  return store.owners[key];
}
function sourceFamily(context={},question={}){
  const raw=String(context.sourceType||question.sourceType||"").toLowerCase();
  if(raw==="official-qbank" || context.official || context.levelId || question.officialSource)return "official-qbank";
  return "course";
}
export function mistakeKeyForQuestion(question,context={}){
  const source=sourceFamily(context,question);
  const level=context.levelId||question.levelId||"";
  const track=context.trackId||question.trackId||question.track||"general";
  const qid=question.id||context.questionId||"unknown";
  return [source,level,track,qid].map(x=>String(x||"").replace(/\|/g,"-")).join("|");
}
function explanationSnapshot(question={}){
  const deep=question.deepExplanation||null;
  const summary=deep?.summary || question.aiExplanation?.ar || question.explanation?.ar || question.explanation?.en || "";
  const optionReasons=deep?.options && typeof deep.options==="object" ? safeClone(deep.options) : null;
  return {summary:String(summary||""),optionReasons};
}
function questionSnapshot(question={},context={}){
  const explanation=explanationSnapshot(question);
  return {
    id:String(question.id||""),
    question:String(question.question||""),
    options:safeClone(Array.isArray(question.options)?question.options:[]),
    correctAnswer:String(question.correctAnswer||""),
    topic:String(context.topic||question.topic||question.topicId||"General"),
    topicId:String(question.topicId||""),
    difficulty:String(question.difficulty||"Mixed"),
    trackId:String(context.trackId||question.trackId||""),
    track:String(context.track||question.track||context.module||"General"),
    course:String(context.course||question.course||""),
    module:String(context.module||question.module||""),
    sourceType:sourceFamily(context,question),
    levelId:String(context.levelId||question.levelId||""),
    officialSet:question.officialSet??null,
    originalQuestionNumber:question.originalQuestionNumber??null,
    officialSource:question.officialSource?safeClone(question.officialSource):null,
    explanationAr:explanation.summary,
    optionReasons:explanation.optionReasons
  };
}
function deriveStatus(streak){
  const value=Math.max(0,Number(streak)||0);
  if(value>=MASTERY_STREAK)return "mastered";
  if(value>=1)return "improving";
  return "needs-review";
}
export function recordMistakeOutcome({ownerId,studentName,question,selected,context={},answeredAt=null,storage=globalThis.localStorage}={}){
  if(!question?.id || selected===null || selected===undefined || selected==="")return null;
  const correct=String(selected)===String(question.correctAnswer);
  const store=readStore(storage);
  const owner=ownerState(store,ownerId,studentName);
  const key=mistakeKeyForQuestion(question,context);
  const existing=owner.items[key]||null;
  const timestamp=nowIso(answeredAt);

  if(correct && !existing)return null;

  const base=existing || {
    key,
    question:questionSnapshot(question,context),
    context:{
      sourceType:sourceFamily(context,question),
      courseId:String(context.courseId||""),
      course:String(context.course||question.course||""),
      trackId:String(context.trackId||question.trackId||""),
      track:String(context.track||question.track||context.module||"General"),
      moduleId:String(context.moduleId||""),
      module:String(context.module||question.module||""),
      levelId:String(context.levelId||""),
      examId:String(context.examId||""),
      examTitle:String(context.examTitle||"")
    },
    firstWrongAt:timestamp,
    lastWrongAt:null,
    lastCorrectAt:null,
    lastAnsweredAt:null,
    lastSelected:null,
    lastWrongSelected:null,
    wrongCount:0,
    recoveryCorrectCount:0,
    recoveryStreak:0,
    status:"needs-review",
    masteredAt:null,
    updatedAt:timestamp
  };

  // Refresh snapshot/context so display metadata stays current while the key remains stable.
  base.question=questionSnapshot(question,{...base.context,...context});
  base.context={...base.context,...context,sourceType:sourceFamily(context,question)};
  base.lastAnsweredAt=timestamp;
  base.lastSelected=String(selected);
  base.updatedAt=timestamp;

  if(correct){
    base.recoveryCorrectCount=Math.max(0,Number(base.recoveryCorrectCount)||0)+1;
    base.recoveryStreak=Math.max(0,Number(base.recoveryStreak)||0)+1;
    base.lastCorrectAt=timestamp;
    base.status=deriveStatus(base.recoveryStreak);
    if(base.status==="mastered" && !base.masteredAt)base.masteredAt=timestamp;
  }else{
    base.wrongCount=Math.max(0,Number(base.wrongCount)||0)+1;
    base.lastWrongSelected=String(selected);
    base.recoveryStreak=0;
    base.status="needs-review";
    base.lastWrongAt=timestamp;
    base.masteredAt=null;
    if(!base.firstWrongAt)base.firstWrongAt=timestamp;
  }

  owner.items[key]=base;
  owner.updatedAt=timestamp;
  writeStore(store,storage);
  return safeClone(base);
}

export function seedMistake({ownerId,studentName,question,selected=null,context={},seededAt=null,storage=globalThis.localStorage}={}){
  if(!question?.id)return null;
  const store=readStore(storage);
  const owner=ownerState(store,ownerId,studentName);
  const key=mistakeKeyForQuestion(question,context);
  if(owner.items[key])return safeClone(owner.items[key]);
  const fallbackSelected=selected && String(selected)!==String(question.correctAnswer)
    ?String(selected)
    :(question.options||[]).find(o=>String(o.id)!==String(question.correctAnswer))?.id || "?";
  return recordMistakeOutcome({ownerId,studentName,question,selected:fallbackSelected,context,answeredAt:seededAt,storage});
}

export function getMistakes(ownerId,{includeMastered=true,storage=globalThis.localStorage}={}){
  const store=readStore(storage);
  const owner=store.owners?.[normalizeOwnerId(ownerId)];
  const items=Object.values(owner?.items||{}).map(safeClone);
  const priority={"needs-review":0,"improving":1,"mastered":2};
  return items
    .filter(item=>includeMastered || item.status!=="mastered")
    .sort((a,b)=>(priority[a.status]??9)-(priority[b.status]??9) || (Number(b.wrongCount)||0)-(Number(a.wrongCount)||0) || (Date.parse(b.updatedAt||0)||0)-(Date.parse(a.updatedAt||0)||0));
}

export function getMistake(ownerId,key,{storage=globalThis.localStorage}={}){
  const store=readStore(storage);
  const item=store.owners?.[normalizeOwnerId(ownerId)]?.items?.[key];
  return item?safeClone(item):null;
}

export function getMistakeSummary(ownerId,{storage=globalThis.localStorage}={}){
  const items=getMistakes(ownerId,{includeMastered:true,storage});
  const counts={total:items.length,"needs-review":0,improving:0,mastered:0,totalWrongAttempts:0};
  for(const item of items){
    counts[item.status]=(counts[item.status]||0)+1;
    counts.totalWrongAttempts+=Number(item.wrongCount)||0;
  }
  return counts;
}

export function topicWeakness(ownerId,{storage=globalThis.localStorage,limit=8}={}){
  const map=new Map();
  for(const item of getMistakes(ownerId,{includeMastered:false,storage})){
    const topic=item.question?.topic||"General";
    const row=map.get(topic)||{topic,count:0,wrongAttempts:0,needsReview:0,improving:0};
    row.count++;
    row.wrongAttempts+=Number(item.wrongCount)||0;
    if(item.status==="needs-review")row.needsReview++;
    if(item.status==="improving")row.improving++;
    map.set(topic,row);
  }
  return [...map.values()].sort((a,b)=>b.needsReview-a.needsReview || b.wrongAttempts-a.wrongAttempts || b.count-a.count || a.topic.localeCompare(b.topic)).slice(0,limit);
}

export function removeMistake(ownerId,key,{storage=globalThis.localStorage}={}){
  const store=readStore(storage);
  const owner=store.owners?.[normalizeOwnerId(ownerId)];
  if(!owner?.items?.[key])return false;
  delete owner.items[key];
  owner.updatedAt=new Date().toISOString();
  writeStore(store,storage);
  return true;
}

export function clearMistakesForOwner(ownerId,{storage=globalThis.localStorage}={}){
  const store=readStore(storage);
  const key=normalizeOwnerId(ownerId);
  const owner=store.owners?.[key];
  if(!owner)return 0;
  const cleared=Object.keys(owner.items||{}).length;
  owner.items={};
  owner.updatedAt=new Date().toISOString();
  writeStore(store,storage);
  return cleared;
}

export function questionFromMistake(item){
  const q=item?.question||{};
  return {
    id:q.id,
    question:q.question,
    options:safeClone(q.options||[]),
    correctAnswer:q.correctAnswer,
    topic:q.topic||"General",
    topicId:q.topicId||"",
    difficulty:q.difficulty||"Mixed",
    trackId:q.trackId||item?.context?.trackId||"",
    track:q.track||item?.context?.track||"",
    sourceType:q.sourceType||item?.context?.sourceType||"course",
    explanation:{ar:q.explanationAr||"",en:""},
    deepExplanation:q.optionReasons?{summary:q.explanationAr||"",options:safeClone(q.optionReasons)}:undefined,
    mistakeKey:item.key,
    mistakeContext:safeClone(item.context||{}),
    mistakeStatus:item.status,
    mistakeWrongCount:Number(item.wrongCount)||0
  };
}

export function exportMistakeStore(storage=globalThis.localStorage){return safeClone(readStore(storage))}
export function importMistakeStore(store,storage=globalThis.localStorage){
  if(!store || typeof store!=="object" || store.schemaVersion!==SCHEMA_VERSION || typeof store.owners!=="object")throw new Error("Invalid mistakes store");
  writeStore(safeClone(store),storage);
}
