function shuffled(array){
  const a=[...array];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function importanceRank(v){
  return v==="core"?3:v==="important"?2:1;
}

export function evaluateCoverageReadiness({syllabus,coverage,questions}){
  const result={
    ready:true,
    topicChecks:[],
    missing:[],
    mappedTopics:syllabus?.topics?.length || 0,
    configuredTopics:coverage?.topics?.length || 0
  };

  if(!coverage || !Array.isArray(coverage.topics) || coverage.topics.length===0){
    result.ready=false;
    result.missing.push("Coverage blueprint is not configured.");
    return result;
  }

  const syllabusIds=new Set((syllabus?.topics||[]).map(t=>t.id));
  for(const spec of coverage.topics){
    const pool=questions.filter(q=>q.topicId===spec.topicId && q.finalEligible!==false);
    const ok=pool.length>=spec.min;
    if(!ok) result.ready=false;
    result.topicChecks.push({
      topicId:spec.topicId,
      target:spec.target,
      min:spec.min,
      max:spec.max,
      available:pool.length,
      ready:ok
    });
    if(!syllabusIds.has(spec.topicId)){
      result.ready=false;
      result.missing.push(`Topic "${spec.topicId}" is not present in the syllabus map.`);
    }
    if(!ok){
      result.missing.push(`${spec.topicId}: needs ${Math.max(0,spec.min-pool.length)} more eligible question(s).`);
    }
  }

  if(coverage.rules?.requireEveryMajorTopic){
    const configuredIds=new Set(coverage.topics.map(x=>x.topicId));
    for(const topic of syllabus?.topics||[]){
      if(topic.importance==="core" && !configuredIds.has(topic.id)){
        result.ready=false;
        result.missing.push(`Core topic "${topic.title}" is missing from the coverage blueprint.`);
      }
    }
  }

  return result;
}

function selectTopicQuestions(pool,spec,usedIds,usedSubtopics,maxPerSubtopic){
  const eligible=shuffled(pool.filter(q=>!usedIds.has(q.id)));
  const picked=[];
  for(const q of eligible){
    const sub=q.subtopicId || "__none__";
    const used=usedSubtopics.get(sub)||0;
    if(maxPerSubtopic && used>=maxPerSubtopic) continue;
    picked.push(q);
    usedIds.add(q.id);
    usedSubtopics.set(sub,used+1);
    if(picked.length>=spec.target) break;
  }
  return picked;
}

function arrangeAvoidingTopicRepeats(questions){
  const remaining=shuffled(questions);
  const out=[];
  while(remaining.length){
    const prev=out[out.length-1]?.topicId;
    let idx=remaining.findIndex(q=>q.topicId!==prev);
    if(idx<0) idx=0;
    out.push(remaining.splice(idx,1)[0]);
  }
  return out;
}

export function selectByCoverage({questions,coverage,questionCount}){
  const usedIds=new Set();
  const usedSubtopics=new Map();
  const selected=[];
  const maxPerSubtopic=coverage.rules?.maxPerSubtopic || null;

  const ordered=[...(coverage.topics||[])].sort((a,b)=>b.target-a.target);
  for(const spec of ordered){
    const topicPool=questions.filter(q=>q.topicId===spec.topicId && q.finalEligible!==false);
    const picks=selectTopicQuestions(topicPool,spec,usedIds,usedSubtopics,maxPerSubtopic);
    selected.push(...picks);
  }

  // If target allocation undershoots questionCount, fill from remaining eligible
  if(selected.length<questionCount){
    const remaining=shuffled(
      questions.filter(q=>q.finalEligible!==false && !usedIds.has(q.id))
    ).sort((a,b)=>importanceRank(b.importance)-importanceRank(a.importance));

    for(const q of remaining){
      const spec=coverage.topics.find(x=>x.topicId===q.topicId);
      if(!spec) continue;
      const current=selected.filter(x=>x.topicId===q.topicId).length;
      if(current>=spec.max) continue;
      const sub=q.subtopicId || "__none__";
      const used=usedSubtopics.get(sub)||0;
      if(maxPerSubtopic && used>=maxPerSubtopic) continue;
      selected.push(q);
      usedIds.add(q.id);
      usedSubtopics.set(sub,used+1);
      if(selected.length>=questionCount) break;
    }
  }

  if(selected.length<questionCount){
    throw new Error(`Coverage selection could only select ${selected.length}/${questionCount} questions.`);
  }

  const trimmed=selected.slice(0,questionCount);
  return coverage.rules?.avoidAdjacentSameTopic
    ? arrangeAvoidingTopicRepeats(trimmed)
    : shuffled(trimmed);
}

export function topicPerformance(questions,answers){
  const groups={};
  for(const q of questions||[]){
    const key=q.topicId || q.topic || "other";
    const label=q.topic || q.topicId || "Other";
    groups[key] ||= {topicId:key,label,total:0,correct:0,wrong:0,unanswered:0};
    const g=groups[key];
    g.total++;
    const selected=answers[q.id] ?? null;
    if(selected===null)g.unanswered++;
    else if(selected===q.correctAnswer)g.correct++;
    else g.wrong++;
  }
  return Object.values(groups).map(g=>({
    ...g,
    percentage:g.total?Math.round(g.correct/g.total*100):0
  })).sort((a,b)=>a.percentage-b.percentage || b.total-a.total);
}
