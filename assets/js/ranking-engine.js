function numeric(value,fallback=0){
  const n=Number(value);
  return Number.isFinite(n)?n:fallback;
}
function timestamp(value){
  const t=Date.parse(value||"");
  return Number.isFinite(t)?t:Number.MAX_SAFE_INTEGER;
}
function isBetterAttempt(candidate,current){
  if(!current)return true;
  const cp=numeric(candidate.percentage),op=numeric(current.percentage);
  if(cp!==op)return cp>op;
  const cs=numeric(candidate.score),os=numeric(current.score);
  if(cs!==os)return cs>os;
  const ct=numeric(candidate.time_taken_seconds,Number.MAX_SAFE_INTEGER);
  const ot=numeric(current.time_taken_seconds,Number.MAX_SAFE_INTEGER);
  if(ct!==ot)return ct<ot;
  return timestamp(candidate.submitted_at)<timestamp(current.submitted_at);
}
export function buildAggregateLeaderboard(rows,sections){
  const sectionMap=new Map((sections||[]).map(s=>[s.examId,s]));
  const bestByExamPlayer=new Map();

  for(const row of rows||[]){
    if(!row?.player_id || !sectionMap.has(row.exam_id))continue;
    const key=`${row.exam_id}::${row.player_id}`;
    const current=bestByExamPlayer.get(key);
    if(isBetterAttempt(row,current))bestByExamPlayer.set(key,row);
  }

  const maxScore=(sections||[]).reduce((sum,s)=>sum+numeric(s.questionCount),0);
  const totalSections=(sections||[]).length;
  const players=new Map();

  for(const row of bestByExamPlayer.values()){
    let player=players.get(row.player_id);
    if(!player){
      player={
        player_id:row.player_id,
        student_name:row.student_name||"Student",
        completedSections:0,
        totalScore:0,
        totalTimeSeconds:0,
        latestSubmittedAt:null,
        sectionResults:{}
      };
      players.set(row.player_id,player);
    }

    player.completedSections+=1;
    player.totalScore+=numeric(row.score);
    player.totalTimeSeconds+=numeric(row.time_taken_seconds);
    player.sectionResults[row.exam_id]=row;

    const rowTs=timestamp(row.submitted_at);
    const currentTs=timestamp(player.latestSubmittedAt);
    if(!player.latestSubmittedAt || rowTs>=currentTs){
      player.student_name=row.student_name||player.student_name;
      player.latestSubmittedAt=row.submitted_at||player.latestSubmittedAt;
    }
  }

  const board=[...players.values()].map(player=>({
    ...player,
    maxScore,
    totalSections,
    percentage:maxScore?Math.round((player.totalScore/maxScore)*1000)/10:0,
    completionPercentage:totalSections?Math.round((player.completedSections/totalSections)*1000)/10:0
  })).sort((a,b)=>
    b.completedSections-a.completedSections ||
    b.totalScore-a.totalScore ||
    b.percentage-a.percentage ||
    a.totalTimeSeconds-b.totalTimeSeconds ||
    timestamp(a.latestSubmittedAt)-timestamp(b.latestSubmittedAt)
  ).map((row,index)=>({...row,rank:index+1}));

  return {board,maxScore,totalSections};
}
