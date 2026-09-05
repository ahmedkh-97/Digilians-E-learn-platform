const normalizeFilter=value=>['all','unanswered','answered','marked'].includes(String(value||'').toLowerCase())?String(value).toLowerCase():'all';

export function buildVoucherDomainNavigatorModel({architecture,questions=[],currentIndex=0,statusForQuestion=()=> 'unanswered',filter='all'}={}){
  const sessionById=new Map((architecture?.sessions||[]).map(session=>[String(session?.id||''),session]));
  const map=architecture?.questionSessionMap||{};
  const normalizedFilter=normalizeFilter(filter);
  const entries=(questions||[]).map((question,globalIndex)=>{
    const sessionId=String(map?.[question?.id]||'');
    const raw=statusForQuestion(question,globalIndex);
    const status=typeof raw==='object'?String(raw?.status||'unanswered'):String(raw||'unanswered');
    const answered=typeof raw==='object'?Boolean(raw?.answered):['answered','correct','wrong'].includes(status);
    const marked=typeof raw==='object'?Boolean(raw?.marked):status==='marked';
    const visualStatus=status==='correct'||status==='wrong'?status:(answered?'answered-neutral':'unanswered');
    return {question,questionId:String(question?.id||''),globalIndex,sessionId,status,visualStatus,answered,marked,current:globalIndex===Number(currentIndex)};
  });
  const answeredCount=entries.filter(entry=>entry.answered).length;
  const markedCount=entries.filter(entry=>entry.marked).length;
  const visible=normalizedFilter==='all'
    ?entries
    :normalizedFilter==='marked'
      ?entries.filter(entry=>entry.marked)
      :normalizedFilter==='answered'
        ?entries.filter(entry=>entry.answered)
        :entries.filter(entry=>!entry.answered);
  const sectionOrder=[...new Set(entries.map(entry=>entry.sessionId).filter(Boolean))]
    .sort((a,b)=>Number(sessionById.get(a)?.order||0)-Number(sessionById.get(b)?.order||0));
  const sections=sectionOrder.map(sessionId=>{
    const session=sessionById.get(sessionId)||{id:sessionId,title:'Section',shortTitle:'Section'};
    const all=entries.filter(entry=>entry.sessionId===sessionId);
    const questionsVisible=visible.filter(entry=>entry.sessionId===sessionId);
    return {
      id:sessionId,
      title:String(session?.title||session?.shortTitle||'Section'),
      shortTitle:String(session?.shortTitle||session?.title||'Section'),
      order:Number(session?.order||0),
      total:all.length,
      answered:all.filter(entry=>entry.answered).length,
      marked:all.filter(entry=>entry.marked).length,
      current:all.some(entry=>entry.current),
      questions:questionsVisible
    };
  }).filter(section=>normalizedFilter==='all'||section.questions.length>0);
  const currentEntry=entries.find(entry=>entry.current)||entries[0]||null;
  const currentSession=currentEntry?sessionById.get(currentEntry.sessionId):null;
  const currentSection=currentEntry?(sections.find(section=>section.id===currentEntry.sessionId)||(currentSession?{...currentSession,id:String(currentSession.id)}:null)):null;
  return {sections,currentSection,totalQuestions:entries.length,answeredCount,markedCount,remainingCount:Math.max(0,entries.length-answeredCount),filter:normalizedFilter};
}
