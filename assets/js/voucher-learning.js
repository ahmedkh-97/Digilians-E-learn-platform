export function voucherReadinessLevel(value){
  if(value===null||value===undefined||!Number.isFinite(Number(value)))return {id:'unmeasured',label:'Not measured yet',min:0,max:null};
  const pct=Number(value);
  if(pct<50)return {id:'foundations',label:'Building Foundations',min:0,max:49};
  if(pct<70)return {id:'developing',label:'Developing',min:50,max:69};
  if(pct<85)return {id:'ready',label:'Exam Ready',min:70,max:84};
  return {id:'advanced',label:'Advanced Readiness',min:85,max:100};
}

export function voucherRankedImprovement(attempts=[]){
  const ranked=(Array.isArray(attempts)?attempts:[])
    .filter(x=>x?.rankEligible===true&&Number.isFinite(Number(x?.percentage)))
    .sort((a,b)=>Date.parse(a.submittedAt||0)-Date.parse(b.submittedAt||0));
  if(!ranked.length)return {kind:'none',firstPercentage:null,bestPercentage:null,delta:null};
  const first=Number(ranked[0].percentage);
  const best=Math.max(...ranked.map(x=>Number(x.percentage)));
  if(ranked.length===1)return {kind:'baseline',firstPercentage:first,bestPercentage:best,delta:null};
  return {kind:'improved',firstPercentage:first,bestPercentage:best,delta:best-first};
}

export function voucherWeakDomains(attempt,limit=2){
  const rows=Array.isArray(attempt?.topicBreakdown)?attempt.topicBreakdown:[];
  const seen=new Set();
  return rows
    .filter(row=>Number.isFinite(Number(row?.percentage))&&(row?.topic||row?.topicId||row?.domainId))
    .sort((a,b)=>Number(a.percentage)-Number(b.percentage))
    .map(row=>String(row.topic||row.topicId||row.domainId))
    .filter(id=>id&&!seen.has(id)&&(seen.add(id),true))
    .slice(0,Math.max(0,Number(limit)||0));
}

export function voucherNextRankTarget(board=[],playerId=''){
  if(!Array.isArray(board)||!board.length)return {kind:'unavailable',message:'Ranking is not available yet.',additionalCorrect:null,targetRank:null};
  const index=board.findIndex(row=>String(row?.player_id||row?.playerId||'')===String(playerId||''));
  if(index<0)return {kind:'unranked',message:'Complete a Ranked Challenge to enter the leaderboard.',additionalCorrect:null,targetRank:null};
  const current=board[index];
  if(Number(current.rank||index+1)===1||index===0)return {kind:'leader',message:'You are currently #1.',additionalCorrect:null,targetRank:null};
  const higher=board[index-1];
  const currentScore=Number(current.score??current.totalCorrect??0);
  const higherScore=Number(higher.score??higher.totalCorrect??0);
  const currentPct=Number(current.percentage??0);
  const higherPct=Number(higher.percentage??0);
  const targetRank=Number(higher.rank||index);
  if(higherScore>currentScore){
    const additionalCorrect=higherScore-currentScore+1;
    return {kind:'score-gap',message:`${additionalCorrect} more correct answers to move to #${targetRank}.`,additionalCorrect,targetRank};
  }
  if(higherScore===currentScore&&higherPct===currentPct){
    return {kind:'time-tie',message:'Same score — improve your solve time to move up.',additionalCorrect:null,targetRank};
  }
  return {kind:'score-gap',message:`1 more correct answer to move to #${targetRank}.`,additionalCorrect:1,targetRank};
}

function questionTopicId(question){
  return String(question?.topicId||question?.domainId||question?.topic||question?.domain||'');
}

export function selectVoucherImprovementQuestions({questions=[],weakDomains=[],mistakeQuestionIds=[],seenIds=[],count=25,rng=Math.random}={}){
  const requested=Number(count);
  if(!Number.isFinite(requested)||requested<1)throw new Error('count must be at least 1');
  const weakSet=new Set((weakDomains||[]).map(String));
  const mistakeSet=new Set((mistakeQuestionIds||[]).map(String));
  const seenSet=new Set((seenIds||[]).map(String));
  const eligible=(Array.isArray(questions)?questions:[]).filter(q=>q&&q.id&&q.productionReady!==false&&q.status!=='conflict');
  const scored=eligible.map(q=>{
    const weak=weakSet.has(questionTopicId(q));
    const mistake=mistakeSet.has(String(q.id));
    const unseen=!seenSet.has(String(q.id));
    return {q,weak,score:(weak?6:0)+(mistake?4:0)+(unseen?2:0),tie:Number(rng?.()??Math.random())};
  });
  scored.sort((a,b)=>b.score-a.score||a.tie-b.tie||String(a.q.id).localeCompare(String(b.q.id)));
  const target=Math.min(Math.floor(requested),eligible.length);
  const weakQuota=Math.min(Math.round(target*0.60),scored.filter(x=>x.weak).length);
  const chosen=[];
  const used=new Set();
  for(const item of scored){
    if(chosen.length>=weakQuota)break;
    if(!item.weak)continue;
    chosen.push(item.q);used.add(String(item.q.id));
  }
  for(const item of scored){
    if(chosen.length>=target)break;
    if(used.has(String(item.q.id)))continue;
    chosen.push(item.q);used.add(String(item.q.id));
  }
  return chosen;
}
