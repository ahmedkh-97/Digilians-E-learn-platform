const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const timestamp=value=>{const t=Date.parse(value||'');return Number.isFinite(t)?t:Number.MAX_SAFE_INTEGER;};

export function voucherSessionRankingActivityId(trackId,examId,sessionId){
  const track=String(trackId||'').trim();
  const exam=String(examId||'').trim();
  const session=String(sessionId||'').trim();
  if(!track||!exam)throw new Error('Voucher session ranking requires trackId and examId.');
  if(!session)throw new Error('Voucher session ranking requires sessionId.');
  return `voucher::${track}::${exam}::session::${session}`;
}

export function firstPassPercentage({firstPassCorrect=0,totalQuestions=0}={}){
  const total=Math.max(0,num(totalQuestions));
  if(!total)return 0;
  return Math.round((Math.max(0,num(firstPassCorrect))/total)*1000)/10;
}

export function resolveVoucherSessionRankStatus(attempt={}, {expectedQuestions=0}={}){
  const expected=Math.max(0,num(expectedQuestions));
  const total=Math.max(0,num(attempt?.totalQuestions ?? attempt?.total_questions));
  const unanswered=Math.max(0,num(attempt?.unanswered));
  const completedQuestions=Math.max(0,Math.min(total,total-unanswered));
  return {
    official:Boolean(expected>0 && total===expected && unanswered===0),
    completedQuestions,
    expectedQuestions:expected
  };
}

function betterAttempt(candidate,current){
  if(!current)return true;
  if(num(candidate.percentage)!==num(current.percentage))return num(candidate.percentage)>num(current.percentage);
  if(num(candidate.wrong)!==num(current.wrong))return num(candidate.wrong)<num(current.wrong);
  if(num(candidate.time_taken_seconds,Number.MAX_SAFE_INTEGER)!==num(current.time_taken_seconds,Number.MAX_SAFE_INTEGER))return num(candidate.time_taken_seconds,Number.MAX_SAFE_INTEGER)<num(current.time_taken_seconds,Number.MAX_SAFE_INTEGER);
  return timestamp(candidate.submitted_at)<timestamp(current.submitted_at);
}

export function buildVoucherSessionLeaderboard(rows=[], {expectedQuestions=0}={}){
  const expected=Math.max(0,num(expectedQuestions));
  const official=(rows||[]).filter(row=>row?.player_id&&resolveVoucherSessionRankStatus(row,{expectedQuestions:expected}).official);
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
    num(b.percentage)-num(a.percentage) ||
    num(a.wrong)-num(b.wrong) ||
    num(a.attemptCount)-num(b.attemptCount) ||
    num(a.time_taken_seconds,Number.MAX_SAFE_INTEGER)-num(b.time_taken_seconds,Number.MAX_SAFE_INTEGER) ||
    timestamp(a.submitted_at)-timestamp(b.submitted_at)
  ).map((row,index)=>({...row,rank:index+1}));
}

export function buildVoucherSessionAttemptMeta({sessionId,domainId,sessionTitle,result={},totalQuestions=0,firstPassCorrect=0,attemptNumber=1}={}){
  const total=Math.max(0,num(totalQuestions));
  const status=resolveVoucherSessionRankStatus({totalQuestions:total,unanswered:result?.unanswered},{expectedQuestions:total});
  const firstPass=Math.max(0,Math.min(total,num(firstPassCorrect)));
  return {
    voucherMode:'ranked-session',
    sessionId:String(sessionId||''),
    domainId:String(domainId||''),
    sessionTitle:String(sessionTitle||''),
    firstPassCorrect:firstPass,
    firstPassPercentage:firstPassPercentage({firstPassCorrect:firstPass,totalQuestions:total}),
    officialRankEligible:status.official,
    attemptNumber:Math.max(1,num(attemptNumber,1)),
    solveTimePolicy:'active-solve'
  };
}

export function buildVoucherSessionOnlineOverrides({totalQuestions=0,firstPassCorrect=0}={}){
  const total=Math.max(0,num(totalQuestions));
  const firstPass=Math.max(0,Math.min(total,num(firstPassCorrect)));
  return {wrong:Math.max(0,total-firstPass),unanswered:0,total_questions:total};
}
