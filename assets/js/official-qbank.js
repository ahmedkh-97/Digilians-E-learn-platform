function resolveTracks(registry,levelId="junior-data-analysis"){
  const level=(registry.levels||[]).find(x=>x.levelId===levelId);
  return level?.tracks || registry.tracks || [];
}
export function getOfficialLevel(registry,levelId){
  return (registry.levels||[]).find(x=>x.levelId===levelId) || null;
}
export function getOfficialTrack(registry,levelId,trackId){
  return resolveTracks(registry,levelId).find(x=>x.trackId===trackId) || null;
}
export function getOfficialSection(registry,levelId,trackId,sectionId){
  return getOfficialTrack(registry,levelId,trackId)?.sections?.find(x=>x.sectionId===sectionId) || null;
}
export function officialSectionExamId(levelId,trackId,sectionNumber,sourceRevision="source-r1"){
  return `official-${levelId}-${trackId}-section-${String(sectionNumber).padStart(2,"0")}-${sourceRevision}`;
}
export function officialTrackRandomExamId(levelId,trackId,category="Official Practice",sourceRevision="source-r1"){
  const slug=category.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return `official-${levelId}-${trackId}-${slug}-${sourceRevision}`;
}
export async function loadOfficialTrack(registry,trackId,loadJson,levelId="junior-data-analysis"){
  const meta=getOfficialTrack(registry,levelId,trackId);
  if(!meta)return [];
  const out=[];
  for(const file of meta.files||[]){
    const payload=await loadJson(file);
    out.push(...(payload.questions||[]));
  }
  return out.sort((a,b)=>a.originalOrder-b.originalOrder);
}
export async function loadOfficialSection(registry,levelId,trackId,sectionId,loadJson){
  const section=getOfficialSection(registry,levelId,trackId,sectionId);
  if(!section)return [];
  const payload=await loadJson(section.file);
  return [...(payload.questions||[])].sort((a,b)=>a.originalOrder-b.originalOrder);
}
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
  return a;
}
export function pickOfficialQuestions(questions,count){
  const unique=[];const seen=new Set();
  for(const q of shuffle(questions.filter(x=>x.finalEligible!==false))){
    const key=q.fingerprint||q.id;if(seen.has(key))continue;seen.add(key);unique.push(q);if(unique.length>=count)break;
  }
  if(unique.length<count)throw new Error(`Official pool has only ${unique.length}/${count} unique questions.`);
  return unique;
}

function uniqueOfficialPool(questions){
  const out=[];const seen=new Set();
  for(const q of shuffle(questions.filter(x=>x.finalEligible!==false))){
    const key=q.fingerprint||q.id;
    if(seen.has(key))continue;
    seen.add(key);out.push(q);
  }
  return out;
}
function proportionalTopicQuotas(topicGroups,count){
  const entries=[...topicGroups.entries()].map(([topic,items])=>({topic,items,size:items.length,quota:0,remainder:0}));
  if(!entries.length)return entries;

  let remaining=count;
  if(count>=entries.length){
    for(const e of entries){e.quota=1;remaining--}
  }else{
    const ranked=shuffle(entries).sort((a,b)=>b.size-a.size);
    for(let i=0;i<count;i++)ranked[i].quota=1;
    return entries;
  }

  const residualTotal=entries.reduce((s,e)=>s+Math.max(0,e.size-e.quota),0);
  if(remaining>0 && residualTotal>0){
    let allocated=0;
    for(const e of entries){
      const raw=remaining*Math.max(0,e.size-e.quota)/residualTotal;
      const add=Math.min(Math.floor(raw),Math.max(0,e.size-e.quota));
      e.quota+=add;e.remainder=raw-Math.floor(raw);allocated+=add;
    }
    let left=remaining-allocated;
    for(const e of [...entries].sort((a,b)=>b.remainder-a.remainder || b.size-a.size)){
      if(left<=0)break;
      if(e.quota<e.size){e.quota++;left--}
    }
  }
  return entries;
}
export function pickOfficialQuestionsTopicAware(questions,count){
  const pool=uniqueOfficialPool(questions);
  if(pool.length<count)throw new Error(`Official pool has only ${pool.length}/${count} unique questions.`);

  const groups=new Map();
  for(const q of pool){
    const topic=q.topicId||q.topic||"general";
    if(!groups.has(topic))groups.set(topic,[]);
    groups.get(topic).push(q);
  }
  for(const [topic,items] of groups)groups.set(topic,shuffle(items));

  const quotas=proportionalTopicQuotas(groups,count);
  const selected=[];const selectedIds=new Set();
  for(const spec of quotas){
    for(const q of spec.items.slice(0,spec.quota)){
      selected.push(q);selectedIds.add(q.id);
    }
  }
  if(selected.length<count){
    for(const q of shuffle(pool)){
      if(selectedIds.has(q.id))continue;
      selected.push(q);selectedIds.add(q.id);
      if(selected.length>=count)break;
    }
  }
  return shuffle(selected.slice(0,count));
}
function examQuestion(q){
  const detailed=q.deepExplanation?.summary || q.aiExplanation?.ar;
  return {...q,explanation:{ar:detailed || `الإجابة الرسمية في بنك أسئلة الوزارة هي الاختيار ${q.correctAnswer}. الملف الرسمي لا يتضمن شرحًا تفصيليًا لهذا السؤال.`,en:''}};
}
export function buildOfficialSectionExam({levelId="junior-data-analysis",trackId,track,section,questions,sourceRevision="source-r1"}){
  const selected=[...questions]
    .filter(q=>q.integrityStatus!=="source-parse-review-required")
    .sort((a,b)=>a.originalOrder-b.originalOrder)
    .map(examQuestion);
  return {
    schemaVersion:'1.0',
    exam:{
      id:officialSectionExamId(levelId,trackId,section.sectionNumber,sourceRevision),
      title:`${track} — ${section.title}`,
      description:`Solve all ${selected.length} official questions in ${section.title}. Your best attempt counts on this section leaderboard.`,
      course:'Data Analysis',
      module:track,
      category:'Official Section',
      uploadedBy:'Official Ministry QBank',
      createdAt:new Date().toISOString().slice(0,10),
      version:'1.0',
      difficulty:'Mixed',
      settings:{
        timer:{enabled:false,durationMinutes:null},
        allowRetake:true,
        feedbackModes:['instant'],
        shuffleQuestions:false,
        shuffleOptions:false,
        passingScore:60
      },
      generatedFromOfficialQbank:{
        levelId,trackId,sectionId:section.sectionId,sectionNumber:section.sectionNumber,
        sourceType:'official-qbank',ranked:true,kind:'section'
      }
    },
    questions:selected
  };
}
export function buildOfficialTrackExam({levelId="junior-data-analysis",trackId,track,title,questions,count=50,feedbackModes=['instant','exam'],timerMinutes=null,category='Official QBank',sourceRevision="source-r1"}){
  const selected=pickOfficialQuestions(questions,Math.min(count,questions.length)).map(examQuestion);
  return {schemaVersion:'1.0',exam:{
    id:officialTrackRandomExamId(levelId,trackId,category,sourceRevision),
    title,description:'Questions selected only from the Official Ministry QBank.',course:'Data Analysis',module:track,category,
    uploadedBy:'Official Ministry QBank',createdAt:new Date().toISOString().slice(0,10),version:'1.0',difficulty:'Mixed',
    settings:{timer:{enabled:Boolean(timerMinutes),durationMinutes:timerMinutes},allowRetake:true,feedbackModes,shuffleQuestions:false,shuffleOptions:false,passingScore:60},
    generatedFromOfficialQbank:{levelId,trackId,sourceType:'official-qbank',ranked:true,kind:'track-random'}
  },questions:selected};
}
export async function buildOfficialFinal({registry,blueprint,loadJson}){
  const levelId=blueprint.levelId || "junior-data-analysis";
  const all=[];
  const useTopicAware=blueprint.selectionStrategy?.type==="topic-aware-proportional";
  for(const spec of blueprint.distribution){
    const pool=await loadOfficialTrack(registry,spec.trackId,loadJson,levelId);
    const picked=useTopicAware?pickOfficialQuestionsTopicAware(pool,spec.count):pickOfficialQuestions(pool,spec.count);
    all.push(...picked.map(examQuestion));
  }
  const questionCount=blueprint.questionCount || blueprint.distribution.reduce((sum,x)=>sum+x.count,0);
  return {schemaVersion:'1.0',exam:{
    id:blueprint.id,title:blueprint.title,
    description:`${questionCount} questions selected exclusively from the Official Ministry QBank. The simulation blueprint is platform-generated.`,
    course:'Data Analysis',module:`${levelId==="professional-data-analysis"?"Professional":"Junior"} Official QBank - All Tracks`,
    category:'Official Final',uploadedBy:'Official Ministry QBank',
    createdAt:new Date().toISOString().slice(0,10),version:'1.0',difficulty:'Mixed',
    settings:{timer:{enabled:true,durationMinutes:blueprint.timerMinutes},allowRetake:true,feedbackModes:blueprint.feedbackModes||['exam'],shuffleQuestions:false,shuffleOptions:false,passingScore:blueprint.passingScore||60},
    generatedFromOfficialQbank:{levelId,sourceRevision:blueprint.sourceRevision,sourceType:'official-qbank',distribution:blueprint.distribution,selectionStrategy:blueprint.selectionStrategy||null,ranked:true,kind:'final'},
    generatedFromBlueprint:{tracks:blueprint.distribution.map(x=>({trackId:x.trackId,label:x.label,count:x.count}))}
  },questions:shuffle(all)};
}
