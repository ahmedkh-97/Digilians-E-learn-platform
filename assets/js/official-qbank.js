export async function loadOfficialTrack(registry,trackId,loadJson){
  const meta=(registry.tracks||[]).find(x=>x.trackId===trackId);
  if(!meta)return [];
  const out=[];
  for(const file of meta.files||[]){
    const payload=await loadJson(file);
    out.push(...(payload.questions||[]));
  }
  return out.sort((a,b)=>a.originalOrder-b.originalOrder);
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
function examQuestion(q){
  return {...q,explanation:{ar:`الإجابة الرسمية في بنك أسئلة الوزارة هي الاختيار ${q.correctAnswer}. الملف الرسمي لا يتضمن شرحًا تفصيليًا لهذا السؤال.`,en:''}};
}
export function buildOfficialTrackExam({trackId,track,title,questions,count=50,feedbackModes=['instant','exam'],timerMinutes=null,category='Official QBank'}){
  const selected=pickOfficialQuestions(questions,Math.min(count,questions.length)).map(examQuestion);
  return {schemaVersion:'1.0',exam:{id:`official-${trackId}-${category.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`,title,description:'Questions selected only from the Official Ministry QBank.',course:'Data Analysis',module:track,category,uploadedBy:'Official Ministry QBank',createdAt:new Date().toISOString().slice(0,10),version:'1.0',difficulty:'Mixed',settings:{timer:{enabled:Boolean(timerMinutes),durationMinutes:timerMinutes},allowRetake:true,feedbackModes,shuffleQuestions:false,shuffleOptions:false,passingScore:60},generatedFromOfficialQbank:{trackId,sourceType:'official-qbank'}},questions:selected};
}
export async function buildOfficialFinal({registry,blueprint,loadJson}){
  const all=[];
  for(const spec of blueprint.distribution){
    const pool=await loadOfficialTrack(registry,spec.trackId,loadJson);
    all.push(...pickOfficialQuestions(pool,spec.count).map(examQuestion));
  }
  return {schemaVersion:'1.0',exam:{id:blueprint.id,title:blueprint.title,description:'100 questions selected exclusively from the Official Ministry QBank.',course:'Data Analysis',module:'Official QBank - All Tracks',category:'Official Final',uploadedBy:'Official Ministry QBank',createdAt:new Date().toISOString().slice(0,10),version:'1.0',difficulty:'Mixed',settings:{timer:{enabled:true,durationMinutes:blueprint.timerMinutes},allowRetake:true,feedbackModes:['exam'],shuffleQuestions:false,shuffleOptions:false,passingScore:blueprint.passingScore||60},generatedFromOfficialQbank:{sourceType:'official-qbank',distribution:blueprint.distribution}},questions:shuffle(all)};
}
