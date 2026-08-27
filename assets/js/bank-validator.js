const DIFFICULTIES = new Set(["Easy","Medium","Hard"]);
const SOURCE_TYPES = new Set(["course","external-similar"]);
const QUESTION_TYPES = new Set([
  "direct-knowledge","scenario-application","code-tracing",
  "calculation-tracing","best-decision","troubleshooting"
]);
const OPTION_IDS = ["A","B","C","D"];

function isText(v){ return typeof v==="string" && v.trim().length>0; }
function push(list,path,message){ list.push({path,message}); }

export function validateQuestionBank(payload){
  const errors=[],warnings=[];
  if(!payload || typeof payload!=="object" || Array.isArray(payload)){
    push(errors,"root","The file must contain one JSON object.");
    return {valid:false,errors,warnings,summary:null};
  }
  if(payload.schemaVersion!=="2.0"){
    push(errors,"schemaVersion",'Question Bank schemaVersion must be exactly "2.0".');
  }

  const bank=payload.bank;
  if(!bank || typeof bank!=="object"){
    push(errors,"bank","Missing bank object.");
  }else{
    ["id","courseId","course","trackId","track","moduleId","module","title","version","status"].forEach(key=>{
      if(!isText(bank[key])) push(errors,`bank.${key}`,`${key} is required.`);
    });
    if(!Array.isArray(bank.sourceFiles) || bank.sourceFiles.length===0){
      push(errors,"bank.sourceFiles","At least one source file is required.");
    }
  }

  const questions=payload.questions;
  const ids=new Set();
  const counts={
    byDifficulty:{Easy:0,Medium:0,Hard:0},
    bySource:{"course":0,"external-similar":0},
    byQuestionType:{},
    byTopic:{}
  };

  if(!Array.isArray(questions) || questions.length===0){
    push(errors,"questions","At least one question is required.");
  }else{
    questions.forEach((q,index)=>{
      const path=`questions[${index}]`;
      if(!q || typeof q!=="object"){
        push(errors,path,"Question must be an object."); return;
      }

      if(!isText(q.id)) push(errors,`${path}.id`,"Question ID is required.");
      else{
        if(ids.has(q.id)) push(errors,`${path}.id`,`Duplicate question ID "${q.id}".`);
        ids.add(q.id);
      }

      if(!isText(q.question)) push(errors,`${path}.question`,"Question text is required.");

      if(!Array.isArray(q.options) || q.options.length!==4){
        push(errors,`${path}.options`,"Exactly four options A-D are required.");
      }else{
        const optionIds=q.options.map(o=>o?.id);
        OPTION_IDS.forEach(id=>{
          if(!optionIds.includes(id)) push(errors,`${path}.options`,`Missing option "${id}".`);
        });
        if(new Set(optionIds).size!==optionIds.length){
          push(errors,`${path}.options`,"Option IDs must be unique.");
        }
        q.options.forEach((o,oi)=>{
          if(!o || !OPTION_IDS.includes(o.id)) push(errors,`${path}.options[${oi}].id`,"Option ID must be A, B, C or D.");
          if(!isText(o?.text)) push(errors,`${path}.options[${oi}].text`,"Option text is required.");
        });
        if(!optionIds.includes(q.correctAnswer)){
          push(errors,`${path}.correctAnswer`,"correctAnswer must match one of A-D.");
        }
      }

      if(!q.explanation || !isText(q.explanation.ar)){
        push(errors,`${path}.explanation.ar`,"Arabic explanation is required.");
      }

      if(!isText(q.topic)) push(errors,`${path}.topic`,"Topic is required.");
      else counts.byTopic[q.topic]=(counts.byTopic[q.topic]||0)+1;

      if(!DIFFICULTIES.has(q.difficulty)){
        push(errors,`${path}.difficulty`,"Difficulty must be Easy, Medium or Hard.");
      }else counts.byDifficulty[q.difficulty]++;

      if(!isText(q.trackId)) push(errors,`${path}.trackId`,"trackId is required.");
      if(!isText(q.track)) push(errors,`${path}.track`,"track is required.");

      if(!QUESTION_TYPES.has(q.questionType)){
        push(errors,`${path}.questionType`,"Invalid questionType.");
      }else counts.byQuestionType[q.questionType]=(counts.byQuestionType[q.questionType]||0)+1;

      if(!SOURCE_TYPES.has(q.sourceType)){
        push(errors,`${path}.sourceType`,'sourceType must be "course" or "external-similar".');
      }else counts.bySource[q.sourceType]++;

      if(typeof q.trackExamEligible!=="boolean") push(errors,`${path}.trackExamEligible`,"Must be true or false.");
      if(typeof q.finalEligible!=="boolean") push(errors,`${path}.finalEligible`,"Must be true or false.");
      if(!isText(q.conceptKey)) push(warnings,`${path}.conceptKey`,"conceptKey is recommended to reduce concept repetition.");

      if(!q.source || typeof q.source!=="object"){
        push(errors,`${path}.source`,"Source object is required.");
      }else{
        if(!isText(q.source.file)) push(errors,`${path}.source.file`,"Source file is required.");
        if(!isText(q.source.reference)) push(warnings,`${path}.source.reference`,"Source reference is recommended.");
      }

      if(q.sourceType==="external-similar" && q.source?.file && q.source.file.toLowerCase().includes("external")){
        push(warnings,`${path}.source.file`,"External-similar questions should still reference the taught source concept they are based on.");
      }
    });
  }

  const total=Array.isArray(questions)?questions.length:0;
  if(total>=20){
    const hard=counts.byDifficulty.Hard/total;
    if(hard<0.15) push(warnings,"questions","Hard-question coverage is below 15%; the bank may not satisfy the V2 25% Hard target.");
    const external=counts.bySource["external-similar"]/total;
    if(external<0.15) push(warnings,"questions","External-similar coverage is below 15%; the bank may not satisfy the 20% Final target.");
  }

  return {
    valid:errors.length===0,
    errors,warnings,
    summary:{
      title:bank?.title||"",
      course:bank?.course||"",
      track:bank?.track||"",
      module:bank?.module||"",
      questionCount:total,
      topicCount:Object.keys(counts.byTopic).length,
      counts
    }
  };
}

export function buildBankRegistryEntry(payload){
  const b=payload.bank;
  const trackSlug=(b.trackId||"general").toLowerCase().replace(/[^a-z0-9]+/g,"-");
  const file=`question-banks/${b.courseId}/${trackSlug}/${b.id}.json`;
  const result=validateQuestionBank(payload);
  return {
    id:b.id,
    courseId:b.courseId,
    course:b.course,
    trackId:b.trackId,
    track:b.track,
    moduleId:b.moduleId,
    module:b.module,
    file,
    status:b.status,
    finalEligible:true,
    questionCount:payload.questions.length,
    counts:result.summary?.counts || {}
  };
}
