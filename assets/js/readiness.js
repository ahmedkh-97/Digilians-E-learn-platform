function allocateCounts(total, ratios){
  const entries=Object.entries(ratios);
  const raw=entries.map(([key,ratio])=>({key,raw:total*ratio}));
  const base=raw.map(x=>({key:x.key,count:Math.floor(x.raw),frac:x.raw-Math.floor(x.raw)}));
  let used=base.reduce((s,x)=>s+x.count,0);
  base.sort((a,b)=>b.frac-a.frac);
  for(let i=0;used<total;i++,used++) base[i%base.length].count++;
  return Object.fromEntries(base.map(x=>[x.key,x.count]));
}

function activeBanksForTrack(bankRegistry,trackId){
  return (bankRegistry.banks||[]).filter(b=>
    b.trackId===trackId && b.status==="active" && b.finalEligible!==false && b.file
  );
}

function sumBankCounts(banks){
  const out={
    total:0,
    byDifficulty:{Easy:0,Medium:0,Hard:0},
    bySource:{"course":0,"external-similar":0},
    byTopic:{}
  };
  for(const bank of banks){
    out.total+=bank.questionCount||0;
    for(const k of Object.keys(out.byDifficulty)){
      out.byDifficulty[k]+=bank.counts?.byDifficulty?.[k]||0;
    }
    for(const k of Object.keys(out.bySource)){
      out.bySource[k]+=bank.counts?.bySource?.[k]||0;
    }
    for(const [topic,count] of Object.entries(bank.counts?.byTopic||{})){
      out.byTopic[topic]=(out.byTopic[topic]||0)+count;
    }
  }
  return out;
}

export function evaluateTrackReadiness({manifest,bankRegistry,finalCount,difficultyTarget,sourceTarget}){
  const banks=activeBanksForTrack(bankRegistry,manifest.trackId);
  const counts=sumBankCounts(banks);

  const difficultyNeed=allocateCounts(finalCount,difficultyTarget);
  const sourceNeed=allocateCounts(finalCount,sourceTarget);

  const checks={
    curriculumComplete:manifest.curriculumStatus==="complete" && manifest.completion?.confirmedByUser===true,
    topicsMapped:Array.isArray(manifest.topics) && manifest.topics.length>0 && manifest.topics.every(t=>t.status==="covered"),
    validActiveBanks:banks.length>0,
    enoughTotal:counts.total>=finalCount,
    enoughEasy:counts.byDifficulty.Easy>=difficultyNeed.Easy,
    enoughMedium:counts.byDifficulty.Medium>=difficultyNeed.Medium,
    enoughHard:counts.byDifficulty.Hard>=difficultyNeed.Hard,
    enoughCourse:counts.bySource.course>=sourceNeed.course,
    enoughExternal:counts.bySource["external-similar"]>=sourceNeed["external-similar"]
  };

  const bankReady = [
    "validActiveBanks","enoughTotal","enoughEasy","enoughMedium","enoughHard","enoughCourse","enoughExternal"
  ].every(k=>checks[k]);

  let status="in-progress";
  if(checks.curriculumComplete && !bankReady) status="content-complete-bank-building";
  if(checks.curriculumComplete && bankReady && checks.topicsMapped) status="final-ready";

  const missing=[];
  if(!checks.curriculumComplete) missing.push("Curriculum not confirmed complete");
  if(!checks.topicsMapped) missing.push("Topic map incomplete");
  if(!checks.validActiveBanks) missing.push("No active question bank");
  if(!checks.enoughTotal) missing.push(`${Math.max(0,finalCount-counts.total)} more total questions`);
  if(!checks.enoughEasy) missing.push(`${Math.max(0,difficultyNeed.Easy-counts.byDifficulty.Easy)} more Easy`);
  if(!checks.enoughMedium) missing.push(`${Math.max(0,difficultyNeed.Medium-counts.byDifficulty.Medium)} more Medium`);
  if(!checks.enoughHard) missing.push(`${Math.max(0,difficultyNeed.Hard-counts.byDifficulty.Hard)} more Hard`);
  if(!checks.enoughCourse) missing.push(`${Math.max(0,sourceNeed.course-counts.bySource.course)} more course-based`);
  if(!checks.enoughExternal) missing.push(`${Math.max(0,sourceNeed["external-similar"]-counts.bySource["external-similar"])} more external-similar`);

  return {
    trackId:manifest.trackId,
    track:manifest.track,
    status,
    checks,
    missing,
    counts,
    required:{
      finalCount,
      difficulty:difficultyNeed,
      source:sourceNeed
    },
    banks:banks.map(b=>b.id)
  };
}

export function finalStatusFromTracks(trackStatuses){
  const required=trackStatuses.filter(t=>t.requiredForFinal);
  const ready=required.filter(t=>t.readiness?.status==="final-ready");
  return {
    ready:required.length>0 && ready.length===required.length,
    readyTracks:ready.length,
    totalTracks:required.length
  };
}
