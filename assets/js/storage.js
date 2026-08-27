const KEYS = {
  studentName: "digilians.studentName",
  theme: "digilians.theme",
  results: "digilians.results",
  progress: "digilians.examProgress",
  lastCourse: "digilians.lastCourse"
};

export function getStudentName(){ return localStorage.getItem(KEYS.studentName) || ""; }
export function setStudentName(name){ localStorage.setItem(KEYS.studentName, name.trim()); }
export function clearStudentName(){ localStorage.removeItem(KEYS.studentName); }

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
