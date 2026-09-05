const normalize=value=>String(value??'').trim().toLowerCase().replace(/\s+/g,' ');
const COMBINATION_PATTERN=/\b(?:all of the above|none of the above|both\s+[a-d]\s+(?:and|&)\s+[a-d]|[a-d]\s+(?:and|&)\s+[a-d]|option\s+[a-d]|choices?\s+[a-d])\b/i;

export function validateVoucherQuestion(question){
  const errors=[];
  if(!question?.id)errors.push('question.id is required');
  if(!question?.question)errors.push(`Question ${question?.id||'unknown'} is missing text`);
  const structured=String(question?.responseType||'').toLowerCase()==='structured';
  if(structured){
    const fields=Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
    if(!fields.length)errors.push(`Question ${question?.id||'unknown'} needs structured response fields`);
    for(const field of fields){
      if(!field?.id)errors.push(`Question ${question?.id||'unknown'} has a structured field without id`);
      if(!Array.isArray(field?.expected)||!field.expected.some(value=>String(value??'').trim()))errors.push(`Question ${question?.id||'unknown'} structured field ${field?.id||'unknown'} needs expected values`);
    }
  }else{
    if(!Array.isArray(question?.options)||question.options.length<2)errors.push(`Question ${question?.id||'unknown'} needs at least two options`);
    const optionIds=(question?.options||[]).map(x=>x?.id).filter(Boolean);
    if(optionIds.length!==(question?.options||[]).length)errors.push(`Question ${question?.id||'unknown'} has an option without id`);
    if(new Set(optionIds).size!==optionIds.length)errors.push(`Question ${question?.id||'unknown'} has duplicate option IDs`);
    const correctIds=Array.isArray(question?.correctAnswers)&&question.correctAnswers.length?question.correctAnswers.map(String):[question?.correctAnswer].filter(Boolean).map(String);
    if(!correctIds.length)errors.push(`Question ${question?.id||'unknown'} needs a correctAnswer or correctAnswers`);
    if(correctIds.some(id=>!optionIds.map(String).includes(id)))errors.push(`Question ${question?.id||'unknown'} correctAnswers must resolve to option IDs`);
  }
  if(question?.visualRequired&&!question?.visualAsset&&!(Array.isArray(question?.visualAssets)&&question.visualAssets.length))errors.push(`Question ${question?.id||'unknown'} requires a visualAsset`);
  return errors;
}

export function isVoucherOptionShuffleSafe(question){
  if(question?.shuffle?.options==='locked')return false;
  if(question?.shuffle?.options==='safe')return true;
  const text=[question?.question,...(question?.options||[]).map(x=>x?.text)].join(' ');
  return !COMBINATION_PATTERN.test(text);
}

function fisherYates(items,rng){
  const out=[...items];
  for(let i=out.length-1;i>0;i--){
    const raw=Number(rng());
    const unit=Number.isFinite(raw)?Math.max(0,Math.min(0.999999999,raw)):0;
    const j=Math.floor(unit*(i+1));
    [out[i],out[j]]=[out[j],out[i]];
  }
  return out;
}

export function shuffleVoucherOptions(question,{rng=Math.random}={}){
  if(!isVoucherOptionShuffleSafe(question))return {...question,options:[...(question?.options||[])]};
  return {...question,options:fisherYates(question?.options||[],rng)};
}

function questionFingerprint(question){
  if(question?.canonicalId)return String(question.canonicalId);
  return [normalize(question?.question),...(question?.options||[]).map(x=>normalize(x.text)).sort()].join('||');
}

function correctOptionText(question){
  const ids=Array.isArray(question?.correctAnswers)&&question.correctAnswers.length?question.correctAnswers:[question?.correctAnswer];
  return ids.map(id=>{const option=(question?.options||[]).find(x=>String(x.id)===String(id));return option?normalize(option.text):'';}).filter(Boolean).sort().join(' && ');
}

export function buildVoucherMasterBank({examId,sourceBanks,approvedCorrections={}}={}){
  const groups=new Map();
  for(const bank of sourceBanks||[]){
    for(const question of bank?.questions||[]){
      const errors=validateVoucherQuestion(question);
      if(errors.length)throw new Error(errors.join('; '));
      const key=questionFingerprint(question);
      const row=groups.get(key)||[];
      row.push({...question,sourceRef:question.sourceRef||{sourceId:bank?.sourceId||null,questionNumber:null}});
      groups.set(key,row);
    }
  }

  const questions=[];
  const conflicts=[];
  for(const [key,items] of groups){
    const answerTexts=new Set(items.map(correctOptionText));
    const approvedText=normalize(approvedCorrections?.[key]?.answerText||'');
    if(answerTexts.size>1&&!approvedText){
      conflicts.push({
        key,
        examId,
        sourceAnswers:items.map(x=>({sourceRef:x.sourceRef,correctAnswer:x.correctAnswer,answerText:correctOptionText(x)}))
      });
      continue;
    }

    const selectedText=approvedText||correctOptionText(items[0]);
    const safeKey=String(key).replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,80)||'question';
    const base={...items[0],id:`voucher-${examId}-${safeKey}`};
    if(Array.isArray(base.correctAnswers)&&base.correctAnswers.length>1 && !approvedText){
      delete base.correctAnswer;
    }else{
      const selectedOption=(base.options||[]).find(x=>normalize(x.text)===selectedText);
      if(!selectedOption)throw new Error(`Approved answer text does not resolve for ${key}`);
      base.correctAnswer=selectedOption.id;
      delete base.correctAnswers;
    }
    base.sourceRefs=items.map(x=>x.sourceRef).filter(Boolean);
    delete base.sourceRef;
    base.status='approved';
    questions.push(base);
  }
  return {schemaVersion:1,examId,questions,conflicts};
}

export function calculateVoucherDurationMinutes({realQuestionCount,realDurationMinutes,requestedCount}){
  const rq=Number(realQuestionCount),rm=Number(realDurationMinutes),count=Number(requestedCount);
  if(!(rq>0)||!(rm>0)||!(count>0))throw new Error('Real Exam timing metadata is required for timed simulation');
  return Math.max(1,Math.round((rm/rq)*count));
}

function quotaPlan(topicIds,count,blueprint){
  const available=[...new Set(topicIds.map(String))];
  if(blueprint?.length){
    const filtered=blueprint
      .filter(x=>available.includes(String(x?.topicId)))
      .map(x=>({topicId:String(x.topicId),exact:(Number(x.weight)||0)*count/100}));
    if(filtered.length){
      const base=filtered.map(x=>({...x,count:Math.floor(x.exact),remainder:x.exact-Math.floor(x.exact)}));
      let left=count-base.reduce((s,x)=>s+x.count,0);
      base.sort((a,b)=>b.remainder-a.remainder||String(a.topicId).localeCompare(String(b.topicId)));
      for(let i=0;left>0&&base.length;i=(i+1)%base.length,left--)base[i].count++;
      return base.map(({topicId,count:quota})=>({topicId,count:quota}));
    }
  }
  if(!available.length)return [];
  const per=Math.floor(count/available.length),extra=count%available.length;
  return available.map((topicId,index)=>({topicId,count:per+(index<extra?1:0)}));
}

export function selectVoucherQuestions({questions,count,seenIds=[],blueprint=null,allowedQuestionIds=null,rng=Math.random}={}){
  const allowed=Array.isArray(allowedQuestionIds)?new Set(allowedQuestionIds.map(String)):null;
  const eligible=(questions||[]).filter(q=>q?.status!=='conflict'&&q?.productionReady!==false&&(!allowed||allowed.has(String(q?.id||''))));
  const requested=Number(count);
  if(!Number.isInteger(requested)||requested<1)throw new Error('Mock question count must be a positive integer');
  if(requested>eligible.length)throw new Error(`Requested ${requested} questions but only ${eligible.length} are eligible`);

  const seen=new Set(seenIds||[]);
  const byTopic=new Map();
  for(const item of eligible){
    const topicId=String(item?.topicId||item?.topic||'general');
    const row=byTopic.get(topicId)||[];
    row.push(item);
    byTopic.set(topicId,row);
  }

  const plan=quotaPlan([...byTopic.keys()],requested,blueprint);
  const chosen=[];
  const used=new Set();
  const take=(pool,n)=>{
    if(n<=0)return;
    const unseen=fisherYates((pool||[]).filter(x=>!seen.has(x.id)&&!used.has(x.id)),rng);
    const reused=fisherYates((pool||[]).filter(x=>seen.has(x.id)&&!used.has(x.id)),rng);
    for(const item of [...unseen,...reused].slice(0,n)){
      used.add(item.id);
      chosen.push(item);
    }
  };

  for(const quota of plan)take(byTopic.get(String(quota.topicId))||[],quota.count);
  if(chosen.length<requested)take(eligible,requested-chosen.length);
  return fisherYates(chosen,rng);
}

export function buildVoucherExamPayload({examConfig,questions,runtime}){
  const domainRanked=Boolean(runtime?.domainRanked===true&&runtime?.domainId);
  const sessionRanked=Boolean(runtime?.sessionRanked===true&&runtime?.sessionId);
  const rankedLearning=Boolean((runtime?.rankedLearning===true && runtime?.sizeMode==='real')||sessionRanked||domainRanked);
  const fullBankRanked=Boolean(runtime?.fullBankRanked===true && runtime?.sizeMode==='full-ranked');
  const timed=(sessionRanked||domainRanked)?false:(rankedLearning||fullBankRanked?true:Boolean(runtime?.timed));
  const durationMinutes=timed
    ? rankedLearning
      ? Number(examConfig?.realExam?.durationMinutes)
      : fullBankRanked
        ? Number(examConfig?.fullBankExam?.durationMinutes)||calculateVoucherDurationMinutes({
            realQuestionCount:examConfig?.realExam?.questionCount,
            realDurationMinutes:examConfig?.realExam?.durationMinutes,
            requestedCount:(questions||[]).length
          })
        : calculateVoucherDurationMinutes({
            realQuestionCount:examConfig?.realExam?.questionCount,
            realDurationMinutes:examConfig?.realExam?.durationMinutes,
            requestedCount:(questions||[]).length
          })
    : null;
  const rankEligible=domainRanked
    ?true
    :sessionRanked
    ?true
    :rankedLearning
      ?Boolean(examConfig?.realExam?.rankEligible===true)
    :fullBankRanked
      ?Boolean(examConfig?.fullBankExam?.rankEligible===true)
      :false;
  return {
    exam:{
      id:`voucher-${examConfig.trackId}-${examConfig.id}-${runtime.attemptKey}`,
      title:domainRanked?`${examConfig.title} • ${runtime?.domainTitle||'Ranked Domain'}`:sessionRanked?`${examConfig.title} • ${runtime?.sessionTitle||'Ranked Session'}`:fullBankRanked?`${examConfig.title} • Full Bank Ranked Exam`:examConfig.title,
      course:'Voucher',
      module:examConfig.trackTitle||examConfig.trackId,
      category:'Voucher Mock',
      difficulty:'Mixed',
      settings:{
        passingScore:Number(examConfig?.passingScore)||70,
        feedbackModes:(domainRanked||sessionRanked)?['instant','exam']:rankedLearning?['instant']:fullBankRanked?['exam']:['instant','exam'],
        timer:{enabled:timed,durationMinutes:durationMinutes||0}
      },
      generatedFromVoucher:{
        trackId:examConfig.trackId,
        voucherExamId:examConfig.id,
        mockKind:runtime.mockKind,
        sourceId:runtime.sourceId||null,
        sizeMode:runtime.sizeMode,
        realExamSize:runtime.sizeMode==='real',
        rankEligible,
        rankedLearning,
        domainRanked,
        domainTitle:domainRanked?String(runtime?.domainTitle||''):null,
        sectionIds:domainRanked&&Array.isArray(runtime?.sectionIds)?runtime.sectionIds.map(String):[],
        sessionRanked,
        sessionId:sessionRanked?String(runtime?.sessionId):null,
        domainId:domainRanked?String(runtime?.domainId||''):sessionRanked?String(runtime?.domainId||''):null,
        timerDisplay:(domainRanked||sessionRanked)?runtime?.timerDisplay!==false:null,
        fullBankRanked,
        rankingMode:domainRanked?'domain':sessionRanked?'session':fullBankRanked?'full-bank':rankedLearning?'real':null,
        runtimeMode:domainRanked?'ranked-domain':sessionRanked?'ranked-session':rankedLearning?'ranked-learning':fullBankRanked?'full-bank-ranked':runtime?.improvementSession?'improvement':'practice',
        improvementSession:Boolean(runtime?.improvementSession),
        weakDomains:Array.isArray(runtime?.weakDomains)?runtime.weakDomains:[],
        timed
      }
    },
    questions:questions||[]
  };
}
