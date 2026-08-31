import "./exam-context.js?v=0.20.20";

export function validateExamPayload(payload){
  const errors=[];
  if(!payload?.exam?.id) errors.push("Missing exam.id");
  if(!payload?.exam?.title) errors.push("Missing exam.title");
  if(!Array.isArray(payload?.questions) || payload.questions.length===0) errors.push("Exam has no questions");

  const ids=new Set();
  for(const q of payload?.questions || []){
    if(!q.id) errors.push("A question is missing id");
    if(ids.has(q.id)) errors.push(`Duplicate question id: ${q.id}`);
    ids.add(q.id);
    if(!q.question) errors.push(`Question ${q.id || "unknown"} is missing text`);

    const optionIds=(q.options || []).map(o=>o.id);
    if(optionIds.length<2) errors.push(`Question ${q.id} has too few options`);
    if(!optionIds.includes(q.correctAnswer)) errors.push(`Question ${q.id}: correctAnswer "${q.correctAnswer}" does not exist`);
  }
  return errors;
}

export function calculateResult(questions,answers){
  let correct=0,wrong=0,unanswered=0;
  const detail=questions.map(q=>{
    const selected=answers[q.id] ?? null;
    const isCorrect=selected===q.correctAnswer;
    if(selected===null) unanswered++;
    else if(isCorrect) correct++;
    else wrong++;
    return {questionId:q.id,selected,correctAnswer:q.correctAnswer,isCorrect};
  });
  const percentage=questions.length ? Math.round((correct/questions.length)*100) : 0;
  return {correct,wrong,unanswered,percentage,detail};
}

export function formatDuration(totalSeconds){
  const mins=Math.floor(totalSeconds/60);
  const secs=totalSeconds%60;
  return `${mins}m ${secs}s`;
}
