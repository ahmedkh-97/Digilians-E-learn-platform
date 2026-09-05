import {isStructuredQuestion,structuredAnswerComplete,structuredAnswerCorrect,structuredFields} from "./exam-structured.js";
import "./exam-context.js?v=0.22.2";

export function correctAnswerIds(question){
  const ids=Array.isArray(question?.correctAnswers)&&question.correctAnswers.length
    ?question.correctAnswers
    :question?.correctAnswer!==undefined&&question?.correctAnswer!==null&&String(question.correctAnswer)!==""
      ?[question.correctAnswer]
      :[];
  return [...new Set(ids.map(value=>String(value)))].sort();
}

export function selectedAnswerIds(selected){
  if(selected===null||selected===undefined||selected==="")return [];
  const values=Array.isArray(selected)?selected:[selected];
  return [...new Set(values.map(value=>String(value)).filter(Boolean))].sort();
}

export function isAnswered(selected){
  if(selected?.type==='structured')return Boolean(selected.complete);
  return selectedAnswerIds(selected).length>0;
}

export function isQuestionAnswered(question,selected){
  return isStructuredQuestion(question)?structuredAnswerComplete(question,selected):isAnswered(selected);
}

export function isAnswerCorrect(question,selected){
  if(isStructuredQuestion(question))return structuredAnswerCorrect(question,selected);
  const correct=correctAnswerIds(question);
  const actual=selectedAnswerIds(selected);
  return correct.length>0&&correct.length===actual.length&&correct.every((id,index)=>id===actual[index]);
}

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

    if(isStructuredQuestion(q)){
      const fields=structuredFields(q);
      if(!fields.length)errors.push(`Question ${q.id} has no structured fields`);
      for(const field of fields){
        if(!field?.id)errors.push(`Question ${q.id} has a structured field without id`);
        if(!Array.isArray(field?.expected)||!field.expected.some(value=>String(value??'').trim())){
          errors.push(`Question ${q.id}: structured field "${field?.id||'unknown'}" has no expected answer`);
        }
      }
    }else{
      const optionIds=(q.options || []).map(o=>String(o.id));
      if(optionIds.length<2) errors.push(`Question ${q.id} has too few options`);
      const correct=correctAnswerIds(q);
      if(!correct.length)errors.push(`Question ${q.id} has no correct answer`);
      for(const answerId of correct){
        if(!optionIds.includes(answerId)) errors.push(`Question ${q.id}: correct answer "${answerId}" does not exist`);
      }
    }
  }
  return errors;
}

export function calculateResult(questions,answers){
  let correct=0,wrong=0,unanswered=0;
  const detail=questions.map(q=>{
    const selected=answers[q.id] ?? null;
    const answered=isQuestionAnswered(q,selected);
    const isCorrect=answered&&isAnswerCorrect(q,selected);
    if(!answered) unanswered++;
    else if(isCorrect) correct++;
    else wrong++;
    const correctAnswers=correctAnswerIds(q);
    return {questionId:q.id,selected,correctAnswer:q.correctAnswer??correctAnswers[0]??null,correctAnswers,isCorrect};
  });
  const percentage=questions.length ? Math.round((correct/questions.length)*100) : 0;
  return {correct,wrong,unanswered,percentage,detail};
}

export function formatDuration(totalSeconds){
  const mins=Math.floor(totalSeconds/60);
  const secs=totalSeconds%60;
  return `${mins}m ${secs}s`;
}
