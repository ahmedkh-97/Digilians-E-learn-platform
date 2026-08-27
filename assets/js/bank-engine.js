function allocateCounts(total, ratios){
  const entries=Object.entries(ratios);
  const raw=entries.map(([key,ratio])=>({key,raw:total*ratio}));
  const base=raw.map(x=>({key:x.key,count:Math.floor(x.raw),frac:x.raw-Math.floor(x.raw)}));
  let used=base.reduce((s,x)=>s+x.count,0);
  base.sort((a,b)=>b.frac-a.frac);
  for(let i=0;used<total;i++,used++) base[i%base.length].count++;
  return Object.fromEntries(base.map(x=>[x.key,x.count]));
}

function shuffled(array){
  const a=[...array];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function combinedQuotas(total,difficultyTarget,sourceTarget){
  const weights={};
  for(const [source,sr] of Object.entries(sourceTarget)){
    for(const [difficulty,dr] of Object.entries(difficultyTarget)){
      weights[`${source}|||${difficulty}`]=sr*dr;
    }
  }
  return allocateCounts(total,weights);
}

function relevantBanks(bankRegistry,trackId){
  return (bankRegistry.banks||[]).filter(b=>
    b.status==="active" && b.finalEligible!==false && b.trackId===trackId && b.file
  );
}

function summedCounts(banks){
  const result={
    total:0,
    byDifficulty:{Easy:0,Medium:0,Hard:0},
    bySource:{"course":0,"external-similar":0}
  };
  for(const bank of banks){
    result.total+=bank.questionCount||0;
    for(const key of Object.keys(result.byDifficulty)){
      result.byDifficulty[key]+=bank.counts?.byDifficulty?.[key]||0;
    }
    for(const key of Object.keys(result.bySource)){
      result.bySource[key]+=bank.counts?.bySource?.[key]||0;
    }
  }
  return result;
}

export function getBlueprintReadiness(bankRegistry,blueprint){
  const tracks=[];
  let readyTracks=0;

  for(const spec of blueprint.tracks||[]){
    const banks=relevantBanks(bankRegistry,spec.trackId);
    const counts=summedCounts(banks);
    const difficultyNeed=allocateCounts(spec.count,blueprint.difficultyTarget);
    const sourceNeed=allocateCounts(spec.count,blueprint.sourceTarget);

    const shortages=[];
    if(counts.total<spec.count) shortages.push(`${spec.count-counts.total} total questions`);
    for(const [difficulty,need] of Object.entries(difficultyNeed)){
      const have=counts.byDifficulty[difficulty]||0;
      if(have<need) shortages.push(`${need-have} ${difficulty}`);
    }
    for(const [source,need] of Object.entries(sourceNeed)){
      const have=counts.bySource[source]||0;
      if(have<need) shortages.push(`${need-have} ${source}`);
    }

    const ready=shortages.length===0;
    if(ready) readyTracks++;
    tracks.push({
      ...spec,ready,shortages,available:counts.total,
      counts,difficultyNeed,sourceNeed,banks:banks.map(b=>b.id)
    });
  }

  return {
    ready:readyTracks===(blueprint.tracks||[]).length,
    readyTracks,
    totalTracks:(blueprint.tracks||[]).length,
    tracks
  };
}

async function loadTrackQuestions(trackId,bankRegistry,loadJson){
  const banks=relevantBanks(bankRegistry,trackId);
  const all=[];
  for(const bank of banks){
    const payload=await loadJson(bank.file);
    for(const q of payload.questions||[]){
      if(q.finalEligible!==false) all.push({...q,_bankId:bank.id});
    }
  }
  return all;
}

function pickFromBucket(pool,count,usedIds){
  const available=shuffled(pool.filter(q=>!usedIds.has(q.id)));
  if(available.length<count) return null;
  const picked=available.slice(0,count);
  picked.forEach(q=>usedIds.add(q.id));
  return picked;
}

function arrangeAvoidingTopicRepeats(questions){
  const remaining=shuffled(questions);
  const out=[];
  while(remaining.length){
    const previous=out[out.length-1]?.topic;
    let index=remaining.findIndex(q=>q.topic!==previous);
    if(index<0) index=0;
    out.push(remaining.splice(index,1)[0]);
  }
  return out;
}

export async function buildExamFromBlueprint({blueprint,bankRegistry,loadJson}){
  const readiness=getBlueprintReadiness(bankRegistry,blueprint);
  if(!readiness.ready){
    const first=readiness.tracks.find(t=>!t.ready);
    const message=first
      ? `${first.label}: needs ${first.shortages.join(", ")}`
      : "Question banks are not ready.";
    const error=new Error(message);
    error.readiness=readiness;
    throw error;
  }

  let selected=[];
  for(const spec of blueprint.tracks){
    const pool=await loadTrackQuestions(spec.trackId,bankRegistry,loadJson);
    const quotas=combinedQuotas(spec.count,blueprint.difficultyTarget,blueprint.sourceTarget);
    const usedIds=new Set();
    const trackSelected=[];

    for(const [bucket,count] of Object.entries(quotas)){
      const [sourceType,difficulty]=bucket.split("|||");
      const bucketPool=pool.filter(q=>
        q.sourceType===sourceType && q.difficulty===difficulty
      );
      const picked=pickFromBucket(bucketPool,count,usedIds);
      if(!picked){
        throw new Error(`${spec.label}: insufficient ${sourceType} / ${difficulty} questions for runtime selection.`);
      }
      trackSelected.push(...picked);
    }

    selected.push(...trackSelected.map(q=>({
      ...q,
      trackId:q.trackId||spec.trackId,
      track:q.track||spec.label
    })));
  }

  if(blueprint.selection?.avoidAdjacentTopicRepeats){
    selected=arrangeAvoidingTopicRepeats(selected);
  }else if(blueprint.selection?.shuffleQuestions){
    selected=shuffled(selected);
  }

  return {
    schemaVersion:"1.0",
    exam:{
      id:blueprint.id,
      title:blueprint.title,
      description:blueprint.description,
      course:blueprint.course,
      module:"All Final Tracks",
      category:blueprint.category||"Final Exam",
      uploadedBy:"Digilians E-Learn Question Bank Engine",
      createdAt:new Date().toISOString().slice(0,10),
      version:blueprint.version||"1.0",
      difficulty:blueprint.difficulty||"Mixed",
      settings:{
        timer:{enabled:Boolean(blueprint.timerMinutes),durationMinutes:blueprint.timerMinutes||null},
        allowRetake:true,
        feedbackModes:blueprint.feedbackModes||["exam"],
        shuffleQuestions:false,
        shuffleOptions:false,
        passingScore:blueprint.passingScore??60
      },
      generatedFromBlueprint:{
        id:blueprint.id,
        kind:blueprint.kind,
        tracks:blueprint.tracks,
        difficultyTarget:blueprint.difficultyTarget,
        sourceTarget:blueprint.sourceTarget
      }
    },
    questions:selected
  };
}
