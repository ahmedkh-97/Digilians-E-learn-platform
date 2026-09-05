function num(value){return Number.isFinite(Number(value))?Number(value):0}
function timeValue(value){const parsed=Date.parse(value||'');return Number.isFinite(parsed)?parsed:Number.MAX_SAFE_INTEGER}

export function voucherRankingActivityId(trackId,examId,mode='real'){
  const track=String(trackId||'').trim();
  const exam=String(examId||'').trim();
  const scope=String(mode||'real').trim()==='full-bank'?'full-bank':'real';
  if(!track||!exam)throw new Error('Voucher ranking requires trackId and examId.');
  return `voucher::${track}::${exam}::${scope}`;
}

export function isVoucherRankEligibleAttempt(attempt={}){
  if(attempt?.rankEligible!==true)return false;
  const sizeMode=String(attempt?.sizeMode||'');
  if(sizeMode==='real')return true;
  return sizeMode==='full-ranked' && String(attempt?.rankingMode||'')==='full-bank';
}

function betterAttempt(candidate,current){
  if(!current)return true;
  if(num(candidate.score)!==num(current.score))return num(candidate.score)>num(current.score);
  if(num(candidate.percentage)!==num(current.percentage))return num(candidate.percentage)>num(current.percentage);
  if(num(candidate.time_taken_seconds)!==num(current.time_taken_seconds))return num(candidate.time_taken_seconds)<num(current.time_taken_seconds);
  return timeValue(candidate.submitted_at)<timeValue(current.submitted_at);
}

export function buildVoucherExamLeaderboard(rows=[]){
  const best=new Map();
  for(const row of rows||[]){
    if(!row?.player_id)continue;
    const current=best.get(row.player_id);
    if(betterAttempt(row,current))best.set(row.player_id,{...row});
  }
  return [...best.values()]
    .sort((a,b)=>num(b.score)-num(a.score) || num(b.percentage)-num(a.percentage) || num(a.time_taken_seconds)-num(b.time_taken_seconds) || timeValue(a.submitted_at)-timeValue(b.submitted_at))
    .map((row,index)=>({...row,rank:index+1}));
}

export function buildVoucherTrackOverallLeaderboard({trackId,exams=[],rows=[],primaryTracks=new Map()}={}){
  const normalizedExams=(exams||[]).filter(x=>x?.examId&&x?.activityId&&num(x?.totalQuestions)>0);
  const totalQuestions=normalizedExams.reduce((sum,x)=>sum+num(x.totalQuestions),0);
  if(!trackId||!normalizedExams.length||!totalQuestions)return [];
  const examByActivity=new Map(normalizedExams.map(x=>[x.activityId,x]));
  const bestByPlayerExam=new Map();
  for(const row of rows||[]){
    if(!row?.player_id || primaryTracks.get(row.player_id)!==trackId)continue;
    const exam=examByActivity.get(row.exam_id);if(!exam)continue;
    const key=`${row.player_id}::${exam.examId}`;
    const current=bestByPlayerExam.get(key);
    if(betterAttempt(row,current))bestByPlayerExam.set(key,{...row,_voucherExamId:exam.examId});
  }
  const byPlayer=new Map();
  for(const row of bestByPlayerExam.values()){
    const player=byPlayer.get(row.player_id)||{
      player_id:row.player_id,student_name:row.student_name||'Learner',totalCorrect:0,totalQuestions,
      totalTimeSeconds:0,completedExams:0,totalExams:normalizedExams.length,achievementAt:null,bestByExam:{}
    };
    player.totalCorrect+=num(row.score);
    player.totalTimeSeconds+=num(row.time_taken_seconds);
    player.completedExams+=1;
    player.bestByExam[row._voucherExamId]=row;
    if(!player.student_name&&row.student_name)player.student_name=row.student_name;
    const submitted=timeValue(row.submitted_at);
    if(submitted<Number.MAX_SAFE_INTEGER && (!player.achievementAt || submitted>timeValue(player.achievementAt)))player.achievementAt=row.submitted_at;
    byPlayer.set(row.player_id,player);
  }
  return [...byPlayer.values()].map(player=>({
    ...player,
    percentage:Math.round((player.totalCorrect/totalQuestions)*1000)/10
  })).sort((a,b)=>
    b.totalCorrect-a.totalCorrect || b.percentage-a.percentage || a.totalTimeSeconds-b.totalTimeSeconds || timeValue(a.achievementAt)-timeValue(b.achievementAt)
  ).map((row,index)=>({...row,rank:index+1}));
}
