export const VOUCHER_STORAGE_KEY='digilians.voucher';

function resolveStorage(storage){
  if(storage)return storage;
  try{return globalThis.localStorage||null;}catch{return null;}
}

function emptyStore(){return {schemaVersion:1,owners:{}};}

function readStore(storage){
  const target=resolveStorage(storage);
  if(!target)return emptyStore();
  try{
    const raw=target.getItem(VOUCHER_STORAGE_KEY);
    if(!raw)return emptyStore();
    const parsed=JSON.parse(raw);
    if(!parsed||typeof parsed!=='object'||Number(parsed.schemaVersion)!==1||!parsed.owners||typeof parsed.owners!=='object')return emptyStore();
    return parsed;
  }catch{return emptyStore();}
}

function writeStore(store,storage){
  const target=resolveStorage(storage);
  if(!target)return false;
  try{target.setItem(VOUCHER_STORAGE_KEY,JSON.stringify(store));return true;}catch{return false;}
}

function ensureOwner(store,ownerId){
  const id=String(ownerId||'').trim();
  if(!id)throw new Error('Voucher ownerId is required');
  if(!store.owners[id]||typeof store.owners[id]!=='object'){
    store.owners[id]={attempts:[],seenByExam:{},sourcePractice:{},updatedAt:new Date().toISOString()};
  }
  const owner=store.owners[id];
  if(!Array.isArray(owner.attempts))owner.attempts=[];
  if(!owner.seenByExam||typeof owner.seenByExam!=='object')owner.seenByExam={};
  if(!owner.sourcePractice||typeof owner.sourcePractice!=='object'||Array.isArray(owner.sourcePractice))owner.sourcePractice={};
  return owner;
}

export function getVoucherState(ownerId,{storage}={}){
  const store=readStore(storage);
  const owner=store.owners?.[String(ownerId||'')];
  if(!owner)return {attempts:[],seenByExam:{},sourcePractice:{},updatedAt:null};
  return {
    attempts:Array.isArray(owner.attempts)?owner.attempts.map(x=>({...x})):[],
    seenByExam:Object.fromEntries(Object.entries(owner.seenByExam||{}).map(([k,v])=>[k,[...(Array.isArray(v)?v:[])]])),
    sourcePractice:Object.fromEntries(Object.entries(owner.sourcePractice||{}).map(([k,v])=>[k,{...(v||{}),selected:Array.isArray(v?.selected)?[...v.selected]:undefined,answers:v?.answers&&typeof v.answers==='object'&&!Array.isArray(v.answers)?{...v.answers}:undefined}])),
    updatedAt:owner.updatedAt||null
  };
}

export function saveVoucherAttempt(ownerId,attempt,{storage}={}){
  if(!attempt?.id)throw new Error('Voucher attempt id is required');
  if(!attempt?.examId)throw new Error('Voucher attempt examId is required');
  const store=readStore(storage);
  const owner=ensureOwner(store,ownerId);
  const next={...attempt};
  const index=owner.attempts.findIndex(x=>String(x?.id)===String(next.id));
  if(index>=0)owner.attempts[index]=next; else owner.attempts.push(next);
  owner.updatedAt=new Date().toISOString();
  return writeStore(store,storage);
}

export function getVoucherAttempts(ownerId,examId,{storage}={}){
  const attempts=getVoucherState(ownerId,{storage}).attempts;
  if(!examId)return attempts;
  return attempts.filter(x=>String(x?.examId)===String(examId));
}

function compareAttempts(a,b){
  const correctDiff=Number(b?.correct||0)-Number(a?.correct||0);
  if(correctDiff)return correctDiff;
  const percentageDiff=Number(b?.percentage||0)-Number(a?.percentage||0);
  if(percentageDiff)return percentageDiff;
  const timeA=Number.isFinite(Number(a?.timeTakenSeconds))?Number(a.timeTakenSeconds):Number.POSITIVE_INFINITY;
  const timeB=Number.isFinite(Number(b?.timeTakenSeconds))?Number(b.timeTakenSeconds):Number.POSITIVE_INFINITY;
  if(timeA!==timeB)return timeA-timeB;
  return String(a?.submittedAt||'').localeCompare(String(b?.submittedAt||''));
}

export function getBestVoucherAttempt(ownerId,examId,{storage,rankEligibleOnly=false,sizeMode=null}={}){
  let attempts=getVoucherAttempts(ownerId,examId,{storage});
  if(rankEligibleOnly)attempts=attempts.filter(x=>x?.rankEligible===true);
  if(sizeMode)attempts=attempts.filter(x=>String(x?.sizeMode||'')===String(sizeMode));
  return attempts.sort(compareAttempts)[0]||null;
}

export function markVoucherQuestionsSeen(ownerId,examId,questionIds,{storage}={}){
  const exam=String(examId||'').trim();
  if(!exam)throw new Error('Voucher examId is required');
  const store=readStore(storage);
  const owner=ensureOwner(store,ownerId);
  const current=new Set(Array.isArray(owner.seenByExam[exam])?owner.seenByExam[exam]:[]);
  for(const id of questionIds||[]){
    const value=String(id||'').trim();
    if(value)current.add(value);
  }
  owner.seenByExam[exam]=[...current];
  owner.updatedAt=new Date().toISOString();
  return writeStore(store,storage);
}

export function getVoucherSeenQuestionIds(ownerId,examId,{storage}={}){
  const state=getVoucherState(ownerId,{storage});
  return [...(state.seenByExam?.[String(examId||'')]||[])];
}


export function saveVoucherSourcePracticeResult(ownerId,questionId,result,{storage}={}){
  const id=String(questionId||'').trim();
  if(!id)throw new Error('Voucher source practice questionId is required');
  const examId=String(result?.examId||'').trim();
  if(!examId)throw new Error('Voucher source practice examId is required');
  const mode=String(result?.mode||'').trim();
  if(!['auto','self','native','checkpoint'].includes(mode))throw new Error('Voucher source practice mode must be auto, self, native, or checkpoint');
  const store=readStore(storage);
  const owner=ensureOwner(store,ownerId);
  const previous=owner.sourcePractice[id]&&String(owner.sourcePractice[id]?.examId||'')===examId?owner.sourcePractice[id]:null;
  const answeredAt=result?.answeredAt||new Date().toISOString();
  const scored=mode==='auto'||mode==='native';
  const previousWasScored=previous?.mode==='auto'||previous?.mode==='native';
  const previousAttempts=Math.max(0,Number(previous?.attemptCount)||((previousWasScored&&typeof previous?.correct==='boolean')?1:0));
  const activeDelta=Math.max(0,Number(result?.activeSeconds)||0);
  const previousActive=Math.max(0,Number(previous?.activeSeconds)||0);
  const firstPassCorrect=typeof previous?.firstPassCorrect==='boolean'
    ?previous.firstPassCorrect
    :previousWasScored&&typeof previous?.correct==='boolean'
      ?previous.correct
      :scored&&typeof result?.correct==='boolean'
        ?result.correct
        :undefined;
  const next={
    examId,
    sourceId:String(result?.sourceId||previous?.sourceId||''),
    mode,
    selected:Array.isArray(result?.selected)?[...new Set(result.selected.map(String).filter(Boolean))]:undefined,
    answers:result?.answers&&typeof result.answers==='object'&&!Array.isArray(result.answers)?Object.fromEntries(Object.entries(result.answers).map(([k,v])=>[String(k),String(v??'').trim()]).filter(([,v])=>v)):undefined,
    correct:scored&&typeof result?.correct==='boolean'?result.correct:undefined,
    selfGrade:mode==='self'&&['correct','incorrect'].includes(String(result?.selfGrade||''))?String(result.selfGrade):undefined,
    reviewStatus:mode==='checkpoint'&&['reviewed','revisit'].includes(String(result?.reviewStatus||''))?String(result.reviewStatus):undefined,
    attemptCount:scored?previousAttempts+1:previousAttempts||undefined,
    firstPassCorrect,
    everCorrect:scored?Boolean(previous?.everCorrect===true||previous?.correct===true||result?.correct===true):previous?.everCorrect===true||undefined,
    firstAnsweredAt:previous?.firstAnsweredAt||previous?.answeredAt||answeredAt,
    activeSeconds:previousActive+activeDelta,
    answeredAt
  };
  if(mode==='auto' && !next.selected?.length)throw new Error('Auto-scored source practice requires selected option IDs');
  if(mode==='self' && !next.selfGrade)throw new Error('Self-graded source practice requires a selfGrade');
  if(mode==='native' && (!next.answers||!Object.keys(next.answers).length))throw new Error('Native-scored source practice requires structured answers');
  if(mode==='checkpoint' && !next.reviewStatus)throw new Error('Ranked study checkpoint requires a reviewStatus');
  owner.sourcePractice[id]=Object.fromEntries(Object.entries(next).filter(([,value])=>value!==undefined));
  owner.updatedAt=new Date().toISOString();
  return writeStore(store,storage);
}

export function getVoucherSourcePracticeState(ownerId,examId,{storage}={}){
  const sourcePractice=getVoucherState(ownerId,{storage}).sourcePractice||{};
  const filterExam=String(examId||'').trim();
  const records=Object.fromEntries(Object.entries(sourcePractice).filter(([,record])=>!filterExam||String(record?.examId||'')===filterExam));
  const values=Object.values(records);
  const answered=values.length;
  const correct=values.filter(record=>record?.correct===true || record?.selfGrade==='correct').length;
  const incorrect=values.filter(record=>record?.correct===false || record?.selfGrade==='incorrect').length;
  return {records,summary:{answered,correct,incorrect}};
}

export function exportVoucherStore({storage}={}){
  return readStore(storage);
}

export function importVoucherStore(store,{storage}={}){
  if(!store||typeof store!=='object'||Number(store.schemaVersion)!==1||!store.owners||typeof store.owners!=='object')return false;
  const clean={schemaVersion:1,owners:{}};
  for(const [ownerId,value] of Object.entries(store.owners)){
    clean.owners[ownerId]={
      attempts:Array.isArray(value?.attempts)?value.attempts.map(x=>({...x})):[],
      seenByExam:Object.fromEntries(Object.entries(value?.seenByExam||{}).map(([examId,ids])=>[examId,[...new Set((Array.isArray(ids)?ids:[]).map(String).filter(Boolean))]])),
      sourcePractice:Object.fromEntries(Object.entries(value?.sourcePractice||{}).map(([questionId,record])=>[questionId,{
        ...(record||{}),
        selected:Array.isArray(record?.selected)?[...new Set(record.selected.map(String).filter(Boolean))]:undefined,
        answers:record?.answers&&typeof record.answers==='object'&&!Array.isArray(record.answers)?Object.fromEntries(Object.entries(record.answers).map(([k,v])=>[String(k),String(v??'').trim()]).filter(([,v])=>v)):undefined
      }])),
      updatedAt:value?.updatedAt||null
    };
  }
  return writeStore(clean,storage);
}
