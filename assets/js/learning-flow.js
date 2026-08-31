export function resolveLearningFlowExam({module,track,registry=[]}={}){
  if(!module)return {scope:'module',examId:null,item:null};

  const moduleExamId=module.examId || null;
  if(moduleExamId){
    return {
      scope:'module',
      examId:moduleExamId,
      item:registry.find(item=>item.id===moduleExamId) || null
    };
  }

  const trackExamId=track?.id==='excel' ? (track.trackExamId || null) : null;
  if(trackExamId){
    return {
      scope:'track',
      examId:trackExamId,
      item:registry.find(item=>item.id===trackExamId) || null
    };
  }

  return {scope:'module',examId:null,item:null};
}

export function buildLearningFlowExamCard({scope='module',item=null,bestResult=null,savedProgress=null,blueprint=null}={}){
  if(scope!=='track' || !item)return null;

  const inProgress=Boolean(savedProgress && savedProgress.examId===item.id);
  const questions=Number(item.questionCount || blueprint?.questionCount || 50);
  const minutes=Number(blueprint?.timerMinutes || 60);
  const ranked=item.ranked!==false;

  return {
    pill:'FULL TRACK EXAM',
    title:'Test your Excel readiness',
    description:`${questions} Questions · ${minutes} Minutes · ${ranked?'Ranked':'Unranked'} · Covers all 3 Excel weeks`,
    status:inProgress?'In progress':bestResult?`Best ${bestResult.percentage}%`:'Not attempted',
    buttonLabel:inProgress?'Resume Full Track Exam':'Start Full Track Exam',
    resume:inProgress,
    ready:true
  };
}

export function shouldRenderStandaloneTrackExamRow(track){
  return Boolean(track?.trackExamId) && track?.id!=="excel";
}
