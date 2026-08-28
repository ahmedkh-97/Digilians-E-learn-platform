const KEYS = {
  studentName: "digilians.studentName",
  playerId: "digilians.playerId",
  theme: "digilians.theme",
  results: "digilians.results",
  progress: "digilians.examProgress",
  lastCourse: "digilians.lastCourse",
  pendingAttempts: "digilians.pendingAttempts",
  officialQbank: "digilians.officialQbank"
};

export function getStudentName(){ return localStorage.getItem(KEYS.studentName) || ""; }
export function setStudentName(name){ localStorage.setItem(KEYS.studentName, name.trim()); }
export function clearStudentName(){ localStorage.removeItem(KEYS.studentName); }

export function getPlayerId(){
  let id = localStorage.getItem(KEYS.playerId);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEYS.playerId, id);
  }
  return id;
}

export function getTheme(){ return localStorage.getItem(KEYS.theme) || "light"; }
export function setTheme(theme){ localStorage.setItem(KEYS.theme, theme); }

export function getResults(){
  try { return JSON.parse(localStorage.getItem(KEYS.results)) || []; }
  catch { return []; }
}

export function saveResult(result){
  const results = getResults();
  results.push(result);
  localStorage.setItem(KEYS.results, JSON.stringify(results));
}

export function markResultSynced(clientAttemptId){
  const results = getResults();
  const index = results.findIndex(x => x.clientAttemptId === clientAttemptId);
  if (index >= 0) {
    results[index].onlineSynced = true;
    localStorage.setItem(KEYS.results, JSON.stringify(results));
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
  localStorage.setItem(KEYS.progress, JSON.stringify(progress));
}
export function getExamProgress(){
  try { return JSON.parse(localStorage.getItem(KEYS.progress)) || null; }
  catch { return null; }
}
export function clearExamProgress(){ localStorage.removeItem(KEYS.progress); }

export function setLastCourse(course){ localStorage.setItem(KEYS.lastCourse, course); }
export function getLastCourse(){ return localStorage.getItem(KEYS.lastCourse) || ""; }

export function getPendingAttempts(){
  try { return JSON.parse(localStorage.getItem(KEYS.pendingAttempts)) || []; }
  catch { return []; }
}

export function queuePendingAttempt(attempt){
  const pending = getPendingAttempts();
  if (!pending.some(x => x.client_attempt_id === attempt.client_attempt_id)) {
    pending.push(attempt);
    localStorage.setItem(KEYS.pendingAttempts, JSON.stringify(pending));
  }
}

export function removePendingAttempt(clientAttemptId){
  const pending = getPendingAttempts().filter(x => x.client_attempt_id !== clientAttemptId);
  localStorage.setItem(KEYS.pendingAttempts, JSON.stringify(pending));
}


export function getOfficialQbankState(){
  try{return JSON.parse(localStorage.getItem(KEYS.officialQbank)) || {tracks:{}}}catch{return {tracks:{}}}
}
function saveOfficialState(state){localStorage.setItem(KEYS.officialQbank,JSON.stringify(state))}
export function getOfficialTrackState(trackId){
  const state=getOfficialQbankState();return state.tracks?.[trackId] || {lastIndex:0,reviewed:[],bookmarks:[],mistakes:[],answers:{}};
}
export function updateOfficialTrackState(trackId,patch){
  const state=getOfficialQbankState();state.tracks ||= {};const current=state.tracks[trackId] || {lastIndex:0,reviewed:[],bookmarks:[],mistakes:[],answers:{}};
  state.tracks[trackId]={...current,...patch};saveOfficialState(state);return state.tracks[trackId];
}
export function toggleOfficialBookmark(trackId,questionId){
  const current=getOfficialTrackState(trackId);const set=new Set(current.bookmarks||[]);set.has(questionId)?set.delete(questionId):set.add(questionId);return updateOfficialTrackState(trackId,{bookmarks:[...set]});
}
export function markOfficialReviewed(trackId,questionId,index){
  const current=getOfficialTrackState(trackId);const set=new Set(current.reviewed||[]);set.add(questionId);return updateOfficialTrackState(trackId,{reviewed:[...set],lastIndex:index});
}
export function saveOfficialMistakes(trackId,questionIds){
  const current=getOfficialTrackState(trackId);const set=new Set(current.mistakes||[]);questionIds.forEach(x=>set.add(x));return updateOfficialTrackState(trackId,{mistakes:[...set]});
}
