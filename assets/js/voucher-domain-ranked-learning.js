const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const timestamp=value=>{const t=Date.parse(value||'');return Number.isFinite(t)?t:Number.MAX_SAFE_INTEGER;};

export function voucherDomainRankingActivityId(trackId,examId,domainId){
  const track=String(trackId||'').trim();
  const exam=String(examId||'').trim();
  const domain=String(domainId||'').trim();
  if(!track||!exam)throw new Error('Voucher domain ranking requires trackId and examId.');
  if(!domain)throw new Error('Voucher domain ranking requires domainId.');
  return `voucher::${track}::${exam}::domain::${domain}`;
}

export function firstPassPercentage({firstPassCorrect=0,totalQuestions=0}={}){
  const total=Math.max(0,num(totalQuestions));
  if(!total)return 0;
  return Math.round((Math.max(0,num(firstPassCorrect))/total)*1000)/10;
}

export function resolveVoucherDomainRankStatus(attempt={}, {expectedQuestions=0}={}){
  const expected=Math.max(0,num(expectedQuestions));
  const total=Math.max(0,num(attempt?.totalQuestions ?? attempt?.total_questions));
  const unanswered=Math.max(0,num(attempt?.unanswered));
  const completedQuestions=Math.max(0,Math.min(total,total-unanswered));
  return {official:Boolean(expected>0&&total===expected&&unanswered===0),completedQuestions,expectedQuestions:expected};
}

function betterAttempt(candidate,current){
  if(!current)return true;
  if(num(candidate.percentage)!==num(current.percentage))return num(candidate.percentage)>num(current.percentage);
  if(num(candidate.wrong)!==num(current.wrong))return num(candidate.wrong)<num(current.wrong);
  if(num(candidate.time_taken_seconds,Number.MAX_SAFE_INTEGER)!==num(current.time_taken_seconds,Number.MAX_SAFE_INTEGER))return num(candidate.time_taken_seconds,Number.MAX_SAFE_INTEGER)<num(current.time_taken_seconds,Number.MAX_SAFE_INTEGER);
  return timestamp(candidate.submitted_at)<timestamp(current.submitted_at);
}

export function buildVoucherDomainLeaderboard(rows=[], {expectedQuestions=0}={}){
  const expected=Math.max(0,num(expectedQuestions));
  const official=(rows||[]).filter(row=>row?.player_id&&resolveVoucherDomainRankStatus(row,{expectedQuestions:expected}).official);
  const byPlayer=new Map();
  for(const row of official){
    if(!byPlayer.has(row.player_id))byPlayer.set(row.player_id,[]);
    byPlayer.get(row.player_id).push(row);
  }
  const attemptNumber=new Map();
  for(const rowsForPlayer of byPlayer.values()){
    rowsForPlayer.sort((a,b)=>timestamp(a.submitted_at)-timestamp(b.submitted_at));
    rowsForPlayer.forEach((row,index)=>attemptNumber.set(row,index+1));
  }
  const best=new Map();
  for(const row of official){
    const current=best.get(row.player_id);
    if(betterAttempt(row,current?.row))best.set(row.player_id,{row,attemptCount:attemptNumber.get(row)||1});
  }
  return [...best.values()].map(({row,attemptCount})=>({
    ...row,
    attemptCount,
    firstPassCorrect:Math.max(0,expected-num(row.wrong)),
    firstPassPercentage:firstPassPercentage({firstPassCorrect:Math.max(0,expected-num(row.wrong)),totalQuestions:expected})
  })).sort((a,b)=>
    num(b.percentage)-num(a.percentage)||
    num(a.wrong)-num(b.wrong)||
    num(a.attemptCount)-num(b.attemptCount)||
    num(a.time_taken_seconds,Number.MAX_SAFE_INTEGER)-num(b.time_taken_seconds,Number.MAX_SAFE_INTEGER)||
    timestamp(a.submitted_at)-timestamp(b.submitted_at)
  ).map((row,index)=>({...row,rank:index+1}));
}


export function buildVoucherOverallLeaderboard(rows=[], {domains=[]}={}){
  const specs=(domains||[]).map(domain=>({
    domainId:String(domain?.domainId||domain?.id||''),
    activityId:String(domain?.activityId||''),
    totalQuestions:Math.max(0,num(domain?.totalQuestions??domain?.questionCount))
  })).filter(domain=>domain.domainId&&domain.activityId&&domain.totalQuestions>0);
  if(!specs.length)return [];

  const boards=specs.map(spec=>({
    spec,
    board:buildVoucherDomainLeaderboard((rows||[]).filter(row=>String(row?.exam_id||'')===spec.activityId),{expectedQuestions:spec.totalQuestions})
  }));
  const players=new Set(boards.flatMap(item=>item.board.map(row=>row.player_id)).filter(Boolean));
  const totalQuestions=specs.reduce((sum,spec)=>sum+spec.totalQuestions,0);
  const ranked=[];

  for(const playerId of players){
    const domainRows=boards.map(item=>item.board.find(row=>row.player_id===playerId)).filter(Boolean);
    if(domainRows.length!==specs.length)continue;
    const totalCorrect=domainRows.reduce((sum,row)=>{
      const fallback=Math.round((num(row.percentage)*num(row.total_questions))/100);
      return sum+Math.max(0,num(row.score??row.correct,fallback));
    },0);
    const firstPassCorrect=domainRows.reduce((sum,row)=>sum+Math.max(0,num(row.firstPassCorrect)),0);
    const attemptsToBest=domainRows.reduce((sum,row)=>sum+Math.max(1,num(row.attemptCount,1)),0);
    const totalTimeSeconds=domainRows.reduce((sum,row)=>sum+Math.max(0,num(row.time_taken_seconds)),0);
    const completedAt=domainRows.reduce((latest,row)=>Math.max(latest,Number.isFinite(Date.parse(row.submitted_at||''))?Date.parse(row.submitted_at):0),0);
    const identity=domainRows.slice().sort((a,b)=>timestamp(b.submitted_at)-timestamp(a.submitted_at))[0]||domainRows[0];
    ranked.push({
      player_id:playerId,
      student_name:identity?.student_name||'Learner',
      totalCorrect,
      totalQuestions,
      percentage:totalQuestions?Math.round((totalCorrect/totalQuestions)*1000)/10:0,
      firstPassCorrect,
      firstPassPercentage:firstPassPercentage({firstPassCorrect,totalQuestions}),
      attemptsToBest,
      totalTimeSeconds,
      completedDomains:specs.length,
      totalDomains:specs.length,
      completed_at:completedAt?new Date(completedAt).toISOString():''
    });
  }

  return ranked.sort((a,b)=>
    num(b.totalCorrect)-num(a.totalCorrect)||
    num(b.firstPassCorrect)-num(a.firstPassCorrect)||
    num(a.attemptsToBest)-num(b.attemptsToBest)||
    num(a.totalTimeSeconds,Number.MAX_SAFE_INTEGER)-num(b.totalTimeSeconds,Number.MAX_SAFE_INTEGER)||
    timestamp(a.completed_at)-timestamp(b.completed_at)
  ).map((row,index)=>({...row,rank:index+1}));
}

export function buildVoucherDomainAttemptMeta({domainId,domainTitle,sectionIds=[],result={},totalQuestions=0,firstPassCorrect=0,attemptNumber=1}={}){
  const total=Math.max(0,num(totalQuestions));
  const status=resolveVoucherDomainRankStatus({totalQuestions:total,unanswered:result?.unanswered},{expectedQuestions:total});
  const firstPass=Math.max(0,Math.min(total,num(firstPassCorrect)));
  return {
    voucherMode:'ranked-domain',
    domainId:String(domainId||''),
    domainTitle:String(domainTitle||''),
    sectionIds:Array.isArray(sectionIds)?sectionIds.map(String):[],
    firstPassCorrect:firstPass,
    firstPassPercentage:firstPassPercentage({firstPassCorrect:firstPass,totalQuestions:total}),
    officialRankEligible:status.official,
    attemptNumber:Math.max(1,num(attemptNumber,1)),
    solveTimePolicy:'active-solve'
  };
}

export function buildVoucherDomainOnlineOverrides({totalQuestions=0,firstPassCorrect=0}={}){
  const total=Math.max(0,num(totalQuestions));
  const firstPass=Math.max(0,Math.min(total,num(firstPassCorrect)));
  return {wrong:Math.max(0,total-firstPass),unanswered:0,total_questions:total};
}
