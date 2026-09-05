const pct=(done,total)=>total>0?Math.round((done/total)*100):0;

export function validateVoucherContentArchitecture({architecture,questions,examId}={}){
  const errors=[];
  if(Number(architecture?.schemaVersion)!==1)errors.push('Voucher content architecture schemaVersion must be 1');
  if(String(architecture?.examId||'')!==String(examId||''))errors.push('Voucher content architecture examId mismatch');
  if(!Array.isArray(architecture?.domains)||!architecture.domains.length)errors.push('Voucher content architecture domains must be a non-empty array');
  if(!Array.isArray(architecture?.sessions)||!architecture.sessions.length)errors.push('Voucher content architecture sessions must be a non-empty array');
  if(!architecture?.questionSessionMap||typeof architecture.questionSessionMap!=='object'||Array.isArray(architecture.questionSessionMap))errors.push('Voucher content architecture questionSessionMap must be an object');

  const domainIds=new Set((architecture?.domains||[]).map(x=>String(x?.id||'')).filter(Boolean));
  const sessionIds=new Set();
  for(const session of architecture?.sessions||[]){
    const id=String(session?.id||'');
    if(!id)errors.push('Voucher content architecture session id is required');
    else if(sessionIds.has(id))errors.push(`duplicate session ${id}`);
    else sessionIds.add(id);
    if(!domainIds.has(String(session?.domainId||'')))errors.push(`session ${id||'unknown'} references unknown domain ${session?.domainId||''}`);
  }

  const questionIds=new Set((questions||[]).map(q=>String(q?.id||'')).filter(Boolean));
  const map=architecture?.questionSessionMap||{};
  for(const [questionId,sessionId] of Object.entries(map)){
    if(!questionIds.has(String(questionId)))errors.push(`unknown question ${questionId}`);
    if(!sessionIds.has(String(sessionId)))errors.push(`unknown session ${sessionId}`);
  }
  for(const questionId of questionIds){
    if(!Object.prototype.hasOwnProperty.call(map,questionId))errors.push(`missing canonical question ${questionId}`);
  }
  return errors;
}



export function findVoucherContentArchitectureDomain({architecture,domainId}={}){
  const id=String(domainId||'');
  if(!id)return null;
  return (architecture?.domains||[]).find(domain=>String(domain?.id||'')===id)||null;
}

export function sessionsForVoucherDomain({architecture,domainId}={}){
  const id=String(domainId||'');
  if(!id)return [];
  return (architecture?.sessions||[])
    .filter(session=>String(session?.domainId||'')===id)
    .slice()
    .sort((a,b)=>Number(a?.order||0)-Number(b?.order||0));
}

export function questionsForVoucherDomain({architecture,questions,domainId}={}){
  const sessions=sessionsForVoucherDomain({architecture,domainId});
  if(!sessions.length)return [];
  const map=architecture?.questionSessionMap||{};
  const source=questions||[];
  const grouped=[];
  for(const session of sessions){
    grouped.push(...source.filter(question=>String(map?.[question?.id]||'')===String(session.id)));
  }
  return grouped;
}
export function findVoucherContentArchitectureSession({architecture,sessionId}={}){
  const id=String(sessionId||'');
  if(!id)return null;
  return (architecture?.sessions||[]).find(session=>String(session?.id||'')===id)||null;
}

export function questionsForVoucherSession({architecture,questions,sessionId}={}){
  const id=String(sessionId||'');
  if(!id)return [];
  const map=architecture?.questionSessionMap||{};
  return (questions||[]).filter(q=>String(map?.[q?.id]||'')===id);
}

export function buildVoucherContentArchitectureView({architecture,questions,seenIds=[]}={}){
  const seen=new Set((seenIds||[]).map(String));
  const sessions=(architecture?.sessions||[])
    .slice()
    .sort((a,b)=>Number(a?.order||0)-Number(b?.order||0))
    .map(session=>{
      const items=questionsForVoucherSession({architecture,questions,sessionId:session.id});
      const seenCount=items.filter(q=>seen.has(String(q.id))).length;
      return {...session,questionCount:items.length,seenCount,progressPercentage:pct(seenCount,items.length)};
    });
  const domains=(architecture?.domains||[])
    .slice()
    .sort((a,b)=>Number(a?.order||0)-Number(b?.order||0))
    .map(domain=>{
      const children=sessions.filter(session=>String(session.domainId)===String(domain.id));
      const questionCount=children.reduce((sum,session)=>sum+session.questionCount,0);
      const seenCount=children.reduce((sum,session)=>sum+session.seenCount,0);
      return {...domain,sessionCount:children.length,questionCount,seenCount,progressPercentage:pct(seenCount,questionCount)};
    });
  const totalQuestions=(questions||[]).length;
  const seenQuestions=(questions||[]).filter(q=>seen.has(String(q?.id))).length;
  return {domains,sessions,totalQuestions,seenQuestions,progressPercentage:pct(seenQuestions,totalQuestions)};
}
