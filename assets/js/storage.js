const KEYS = {
  studentName: "examHub.studentName",
  theme: "examHub.theme",
  results: "examHub.results"
};

export function getStudentName() {
  return localStorage.getItem(KEYS.studentName) || "";
}

export function setStudentName(name) {
  localStorage.setItem(KEYS.studentName, name.trim());
}

export function clearStudentName() {
  localStorage.removeItem(KEYS.studentName);
}

export function getTheme() {
  return localStorage.getItem(KEYS.theme) || "light";
}

export function setTheme(theme) {
  localStorage.setItem(KEYS.theme, theme);
}

export function getResults() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.results)) || [];
  } catch {
    return [];
  }
}

export function saveResult(result) {
  const results = getResults();
  results.push(result);
  localStorage.setItem(KEYS.results, JSON.stringify(results));
}

export function getBestForExam(examId, studentName) {
  const records = getResults().filter(
    item => item.examId === examId && item.studentName === studentName
  );
  if (!records.length) return null;
  return records.sort((a, b) => b.percentage - a.percentage || a.timeTakenSeconds - b.timeTakenSeconds)[0];
}
