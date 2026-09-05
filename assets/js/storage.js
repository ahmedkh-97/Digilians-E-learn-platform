import {createUuid} from "./runtime-compat.js?v=0.22.3";
import {ensureStorageSchema} from "./storage-safety.js?v=0.22.3";


const storageWarningKeys=new Set();
function emitStorageWarning(operation,key,error){
  const signature=`${operation}:${key}`;
  if(storageWarningKeys.has(signature))return;
  storageWarningKeys.add(signature);
  try{
    if(typeof globalThis.dispatchEvent==="function" && typeof CustomEvent==="function"){
      globalThis.dispatchEvent(new CustomEvent("digilians:storage-warning",{detail:{operation,key,errorName:String(error?.name||"StorageError")}}));
    }
  }catch{}
}
function safeGetRaw(key){
  try{return globalThis.localStorage?.getItem?.(key)??null}catch(error){emitStorageWarning("read",key,error);return null}
}
function safeSetRaw(key,value){
  try{globalThis.localStorage?.setItem?.(key,String(value));return true}catch(error){emitStorageWarning("write",key,error);return false}
}
function safeRemoveRaw(key){
  try{globalThis.localStorage?.removeItem?.(key);return true}catch(error){emitStorageWarning("remove",key,error);return false}
}
export function initializeStorageSafety(){
  const result=ensureStorageSchema(globalThis.localStorage);
  if(!result.ok && result.reason!=="future-schema")emitStorageWarning("schema","digilians.storageSchemaVersion",new Error(result.reason));
  return result;
}

const KEYS = {
  studentName: "digilians.studentName",
  playerId: "digilians.playerId",
  theme: "digilians.theme",
  results: "digilians.results",
  progress: "digilians.examProgress",
  lastCourse: "digilians.lastCourse",
  pendingAttempts: "digilians.pendingAttempts",
  officialQbank: "digilians.officialQbank",
  studyProgress: "digilians.studyProgress",
  quickChecks: "digilians.quickChecks",
  primaryTrack: "digilians.primaryTrack",
  rankingMode: "digilians_ranking_mode",
  rankingTrackLevel: "digilians_ranking_track_level",
  rankingTrack: "digilians_ranking_track",
  lastRankingExamId: "digilians_last_ranking_exam_id",
  voucherRankingTrack: "digilians_voucher_ranking_track",
  voucherRankingExam: "digilians_voucher_ranking_exam",
  avatarProfile: "digilians.avatarProfile"
};


export function getStoredAvatarProfile(){ return safeGetRaw(KEYS.avatarProfile) || ""; }
export function setStoredAvatarProfile(value){ return safeSetRaw(KEYS.avatarProfile,value||""); }
export function clearStoredAvatarProfile(){ return safeRemoveRaw(KEYS.avatarProfile); }

export function getStudentName(){ return safeGetRaw(KEYS.studentName) || ""; }
export function setStudentName(name){ return safeSetRaw(KEYS.studentName, name.trim()); }
export function clearStudentName(){ return safeRemoveRaw(KEYS.studentName); }

export function getPrimaryTrack(){ return safeGetRaw(KEYS.primaryTrack) || ""; }
export function setPrimaryTrack(trackId){
  const allowed=new Set(["data-analysis","marketing","graphic-design","ui-ux","media-production"]);
  const value=String(trackId||"");
  if(!allowed.has(value))return false;
  return safeSetRaw(KEYS.primaryTrack,value);
}
export function clearPrimaryTrack(){ return safeRemoveRaw(KEYS.primaryTrack); }

export function getRankingPreferences(){
  return {
    mode:safeGetRaw(KEYS.rankingMode)||"",
    trackLevelId:safeGetRaw(KEYS.rankingTrackLevel)||"",
    trackId:safeGetRaw(KEYS.rankingTrack)||"",
    lastExamId:safeGetRaw(KEYS.lastRankingExamId)||"",
    voucherTrackId:safeGetRaw(KEYS.voucherRankingTrack)||"",
    voucherExamId:safeGetRaw(KEYS.voucherRankingExam)||""
  };
}
export function setRankingMode(mode){ return safeSetRaw(KEYS.rankingMode,mode||""); }
export function setRankingTrackPreference(levelId,trackId){
  const levelSaved=safeSetRaw(KEYS.rankingTrackLevel,levelId||"");
  const trackSaved=safeSetRaw(KEYS.rankingTrack,trackId||"");
  return levelSaved && trackSaved;
}
export function setLastRankingExamId(examId){ return safeSetRaw(KEYS.lastRankingExamId,examId||""); }
export function setVoucherRankingTrackPreference(trackId){ return safeSetRaw(KEYS.voucherRankingTrack,trackId||""); }
export function setVoucherRankingExamPreference(examId){ return safeSetRaw(KEYS.voucherRankingExam,examId||""); }

export function getPlayerId(){
  let id = safeGetRaw(KEYS.playerId);
  if (!id) {
    id = createUuid();
    safeSetRaw(KEYS.playerId, id);
  }
  return id;
}

export function getTheme(){ return safeGetRaw(KEYS.theme) || "light"; }
export function setTheme(theme){ return safeSetRaw(KEYS.theme, theme); }

export function getResults(){
  try { return JSON.parse(safeGetRaw(KEYS.results)) || []; }
  catch { return []; }
}

export function saveResult(result){
  const results = getResults();
  results.push(result);
  return safeSetRaw(KEYS.results, JSON.stringify(results));
}

export function markResultSynced(clientAttemptId){
  const results = getResults();
  const index = results.findIndex(x => x.clientAttemptId === clientAttemptId);
  if (index >= 0) {
    results[index].onlineSynced = true;
    safeSetRaw(KEYS.results, JSON.stringify(results));
  }
}

export function getBestForExam(examId, studentName){
  const records = getResults().filter(x => x.examId === examId && x.studentName === studentName);
  if (!records.length) return null;
  return [...records].sort((a,b) => b.percentage-a.percentage || a.timeTakenSeconds-b.timeTakenSeconds)[0];
}
export function getPreviousBestForExam(examId, studentName){
  return getBestForExam(examId, studentName);
}

export function saveExamProgress(progress){
  return safeSetRaw(KEYS.progress, JSON.stringify(progress));
}
export function getExamProgress(){
  try { return JSON.parse(safeGetRaw(KEYS.progress)) || null; }
  catch { return null; }
}
export function clearExamProgress(){ return safeRemoveRaw(KEYS.progress); }

function getStudyProgressState(){
  try{return JSON.parse(safeGetRaw(KEYS.studyProgress)) || {users:{}}}
  catch{return {users:{}}}
}
function saveStudyProgressState(state){
  safeSetRaw(KEYS.studyProgress,JSON.stringify(state));
}
function emptyStudyProgress(){
  return {completedSections:[],completed:false,lastSectionId:null,updatedAt:null};
}
export function getStudyProgress(studentName,moduleId){
  if(!studentName || !moduleId)return emptyStudyProgress();
  const state=getStudyProgressState();
  return state.users?.[studentName]?.[moduleId] || emptyStudyProgress();
}
export function updateStudyProgress(studentName,moduleId,patch){
  if(!studentName || !moduleId)return emptyStudyProgress();
  const state=getStudyProgressState();
  state.users ||= {};
  state.users[studentName] ||= {};
  const current=state.users[studentName][moduleId] || emptyStudyProgress();
  const next={...current,...patch,updatedAt:new Date().toISOString()};
  next.completedSections=[...new Set(next.completedSections||[])];
  state.users[studentName][moduleId]=next;
  saveStudyProgressState(state);
  return next;
}
export function clearStudyProgress(studentName,moduleId){
  if(!studentName || !moduleId)return;
  const state=getStudyProgressState();
  if(state.users?.[studentName]?.[moduleId]){
    delete state.users[studentName][moduleId];
    if(!Object.keys(state.users[studentName]).length)delete state.users[studentName];
    saveStudyProgressState(state);
  }
}

function getQuickCheckStateStore(){
  try{return JSON.parse(safeGetRaw(KEYS.quickChecks)) || {users:{}}}
  catch{return {users:{}}}
}
function saveQuickCheckStateStore(state){
  safeSetRaw(KEYS.quickChecks,JSON.stringify(state));
}
export function getQuickCheckState(studentName,moduleId,sectionId){
  if(!studentName || !moduleId || !sectionId)return null;
  const store=getQuickCheckStateStore();
  return store.users?.[studentName]?.[moduleId]?.[sectionId] || null;
}
export function saveQuickCheckState(studentName,moduleId,sectionId,record){
  if(!studentName || !moduleId || !sectionId)return null;
  const store=getQuickCheckStateStore();
  store.users ||= {};
  store.users[studentName] ||= {};
  store.users[studentName][moduleId] ||= {};
  const next={
    selected:record?.selected ?? null,
    correct:Boolean(record?.correct),
    answeredAt:record?.answeredAt || new Date().toISOString()
  };
  store.users[studentName][moduleId][sectionId]=next;
  saveQuickCheckStateStore(store);
  return next;
}
export function clearQuickCheckState(studentName,moduleId,sectionId){
  if(!studentName || !moduleId || !sectionId)return;
  const store=getQuickCheckStateStore();
  const moduleState=store.users?.[studentName]?.[moduleId];
  if(moduleState?.[sectionId]){
    delete moduleState[sectionId];
    if(!Object.keys(moduleState).length)delete store.users[studentName][moduleId];
    if(store.users?.[studentName] && !Object.keys(store.users[studentName]).length)delete store.users[studentName];
    saveQuickCheckStateStore(store);
  }
}

export function setLastCourse(course){ return safeSetRaw(KEYS.lastCourse, course); }
export function getLastCourse(){ return safeGetRaw(KEYS.lastCourse) || ""; }

export function getPendingAttempts(){
  try { return JSON.parse(safeGetRaw(KEYS.pendingAttempts)) || []; }
  catch { return []; }
}

export function queuePendingAttempt(attempt){
  const pending = getPendingAttempts();
  if (!pending.some(x => x.client_attempt_id === attempt.client_attempt_id)) {
    pending.push(attempt);
    safeSetRaw(KEYS.pendingAttempts, JSON.stringify(pending));
  }
}

export function removePendingAttempt(clientAttemptId){
  const pending = getPendingAttempts().filter(x => x.client_attempt_id !== clientAttemptId);
  safeSetRaw(KEYS.pendingAttempts, JSON.stringify(pending));
}


export function getOfficialQbankState(){
  try{return JSON.parse(safeGetRaw(KEYS.officialQbank)) || {tracks:{}}}catch{return {tracks:{}}}
}
function saveOfficialState(state){safeSetRaw(KEYS.officialQbank,JSON.stringify(state))}
function officialTrackKey(trackId,levelId="junior-data-analysis",sourceRevision="source-r1"){return `${levelId}::${sourceRevision}::${trackId}`}
function emptyOfficialTrack(){return {lastIndex:0,reviewed:[],bookmarks:[],mistakes:[],answers:{}}}
export function getOfficialTrackState(trackId,levelId="junior-data-analysis",sourceRevision="source-r1"){
  const state=getOfficialQbankState();state.tracks ||= {};
  const key=officialTrackKey(trackId,levelId,sourceRevision);
  // Safe migration is allowed only for unchanged r1 sources.
  if(!state.tracks[key] && sourceRevision.endsWith("-r1")){
    const prior=state.tracks[`${levelId}::${trackId}`] || state.tracks[trackId];
    if(prior){state.tracks[key]=prior;saveOfficialState(state)}
  }
  return state.tracks[key] || emptyOfficialTrack();
}
export function updateOfficialTrackState(trackId,patch,levelId="junior-data-analysis",sourceRevision="source-r1"){
  const state=getOfficialQbankState();state.tracks ||= {};
  const key=officialTrackKey(trackId,levelId,sourceRevision);
  let current=state.tracks[key];
  if(!current && sourceRevision.endsWith("-r1")){
    current=state.tracks[`${levelId}::${trackId}`] || state.tracks[trackId];
  }
  current=current || emptyOfficialTrack();
  state.tracks[key]={...current,...patch};saveOfficialState(state);return state.tracks[key];
}
export function toggleOfficialBookmark(trackId,questionId,levelId="junior-data-analysis",sourceRevision="source-r1"){
  const current=getOfficialTrackState(trackId,levelId,sourceRevision);const set=new Set(current.bookmarks||[]);
  set.has(questionId)?set.delete(questionId):set.add(questionId);
  return updateOfficialTrackState(trackId,{bookmarks:[...set]},levelId,sourceRevision);
}
export function markOfficialReviewed(trackId,questionId,index,levelId="junior-data-analysis",sourceRevision="source-r1"){
  const current=getOfficialTrackState(trackId,levelId,sourceRevision);const set=new Set(current.reviewed||[]);
  set.add(questionId);
  return updateOfficialTrackState(trackId,{reviewed:[...set],lastIndex:index},levelId,sourceRevision);
}
export function saveOfficialMistakes(trackId,questionIds,levelId="junior-data-analysis",sourceRevision="source-r1"){
  const current=getOfficialTrackState(trackId,levelId,sourceRevision);const set=new Set(current.mistakes||[]);
  questionIds.forEach(x=>set.add(x));
  return updateOfficialTrackState(trackId,{mistakes:[...set]},levelId,sourceRevision);
}
export function clearOfficialMistakeFlags(){
  const state=getOfficialQbankState();
  let cleared=0;
  Object.values(state.tracks||{}).forEach(record=>{
    if(!record || typeof record!=="object")return;
    cleared+=Array.isArray(record.mistakes)?record.mistakes.length:0;
    record.mistakes=[];
  });
  saveOfficialState(state);
  return cleared;
}
