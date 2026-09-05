const toCount=value=>Math.max(0,Number.isFinite(Number(value))?Number(value):0);
const pct=(correct,total)=>total>0?Math.round((correct/total)*100):null;

function statusFor(percentage){
  if(percentage===null)return 'not-attempted';
  if(percentage>=80)return 'strong';
  if(percentage>=65)return 'developing';
  return 'needs-review';
}

export function buildVoucherSectionAnalytics({architecture,domainId,attempt=null}={}){
  const domain=String(domainId||'');
  const sessions=(architecture?.sessions||[])
    .filter(session=>String(session?.domainId||'')===domain)
    .slice()
    .sort((a,b)=>Number(a?.order||0)-Number(b?.order||0));
  const breakdown=attempt?.subjectBreakdown&&typeof attempt.subjectBreakdown==='object'?attempt.subjectBreakdown:{};
  const rows=sessions.map(session=>{
    const raw=breakdown?.[session.title]||null;
    if(!raw){
      return {
        id:String(session.id),title:String(session.title||session.shortTitle||'Section'),order:Number(session.order||0),
        correct:0,wrong:0,unanswered:0,total:0,percentage:null,status:'not-attempted'
      };
    }
    const correct=toCount(raw.correct),wrong=toCount(raw.wrong),unanswered=toCount(raw.unanswered);
    const total=Math.max(toCount(raw.total),correct+wrong+unanswered);
    const percentage=pct(correct,total);
    return {
      id:String(session.id),title:String(session.title||session.shortTitle||'Section'),order:Number(session.order||0),
      correct,wrong,unanswered,total,percentage,status:statusFor(percentage)
    };
  });
  const scored=rows.filter(row=>row.percentage!==null);
  const strongest=scored.slice().sort((a,b)=>b.percentage-a.percentage||a.order-b.order)[0]||null;
  const weakest=scored.slice().sort((a,b)=>a.percentage-b.percentage||a.order-b.order)[0]||null;
  return {rows,strongest,weakest,hasAttempt:scored.length>0};
}
