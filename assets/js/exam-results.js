import {isAnswered,isAnswerCorrect} from './exam.js';

export function buildSubjectBreakdown(questions=[],answers={}){
  const groups={};
  for(const question of questions||[]){
    const label=question.track||question.trackId;
    if(!label)continue;
    groups[label] ||= {total:0,correct:0,wrong:0,unanswered:0};
    groups[label].total++;
    const selected=answers?.[question.id]??null;
    if(!isAnswered(selected))groups[label].unanswered++;
    else if(isAnswerCorrect(question,selected))groups[label].correct++;
    else groups[label].wrong++;
  }
  return groups;
}

export function buildStandardResultRecord({exam,result,studentName,timeTakenSeconds,submittedAt,autoSubmitted,clientAttemptId,subjectBreakdown,topicBreakdown,excelBreakdown,officialContext,feedbackMode}={}){
  return {
    examId:exam?.id,examTitle:exam?.title,studentName,
    percentage:result?.percentage||0,correct:result?.correct||0,wrong:result?.wrong||0,unanswered:result?.unanswered||0,
    timeTakenSeconds:Number(timeTakenSeconds)||0,submittedAt,autoSubmitted:Boolean(autoSubmitted),
    clientAttemptId,onlineSynced:false,subjectBreakdown:subjectBreakdown||{},topicBreakdown:topicBreakdown||[],excelBreakdown:excelBreakdown||null,officialContext:officialContext||null,
    feedbackMode:feedbackMode||'instant',examCategory:exam?.category||'Exam'
  };
}

export function buildOnlineAttemptPayload({playerId,studentName,exam,result,totalQuestions,timeTakenSeconds,feedbackMode,clientAttemptId,examId=null,examTitle=null}={}){
  return {
    player_id:playerId,
    student_name:studentName,
    exam_id:examId||exam?.id,
    exam_title:examTitle||exam?.title,
    exam_version:exam?.version||'1.0',
    score:result?.correct||0,
    wrong:result?.wrong||0,
    unanswered:result?.unanswered||0,
    total_questions:Number(totalQuestions)||0,
    percentage:result?.percentage||0,
    time_taken_seconds:Number(timeTakenSeconds)||0,
    feedback_mode:feedbackMode||'instant',
    client_attempt_id:clientAttemptId
  };
}

export function resultHeadline({percentage=0,passingScore=60,officialKind=null}={}){
  if(officialKind==='section')return 'Section Completed';
  if(Number(percentage)>=90)return 'Excellent work';
  if(Number(percentage)>=80)return 'Great job';
  if(Number(percentage)>=Number(passingScore||60))return 'Good progress';
  return 'Keep practicing';
}
