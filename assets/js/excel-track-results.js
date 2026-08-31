const EXCEL_TRACK_EXAM_ID="data-analysis-excel-track-v1";

function bucketStats(items){
  const total=items.length;
  const correct=items.filter(x=>x.outcome==="correct").length;
  const wrong=items.filter(x=>x.outcome==="wrong").length;
  const unanswered=items.filter(x=>x.outcome==="unanswered").length;
  return {total,correct,wrong,unanswered,percentage:total?Math.round((correct/total)*100):0};
}

function outcomeFor(question,answers){
  const selected=answers?.[question.id] ?? null;
  if(selected===null)return "unanswered";
  return selected===question.correctAnswer?"correct":"wrong";
}

export function buildExcelTrackBreakdown(questions=[],answers={}){
  const normalized=(questions||[]).map(q=>({...q,outcome:outcomeFor(q,answers)}));

  const weekMap=new Map();
  const groupMap=new Map();
  for(const q of normalized){
    const weekNumber=Number(q.weekNumber);
    if(Number.isFinite(weekNumber)){
      if(!weekMap.has(weekNumber))weekMap.set(weekNumber,[]);
      weekMap.get(weekNumber).push(q);
    }
    if(q.groupId){
      if(!groupMap.has(q.groupId))groupMap.set(q.groupId,[]);
      groupMap.get(q.groupId).push(q);
    }
  }

  const weeks=[...weekMap.entries()]
    .sort((a,b)=>a[0]-b[0])
    .map(([weekNumber,items])=>({weekNumber,label:`Week ${weekNumber}`,...bucketStats(items)}));

  const groups=[...groupMap.entries()]
    .map(([groupId,items])=>{
      const first=items[0]||{};
      return {
        groupId,
        groupNumber:String(first.groupNumber ?? ""),
        groupTitle:first.groupTitle || groupId,
        weekNumber:Number(first.weekNumber)||null,
        ...bucketStats(items)
      };
    })
    .sort((a,b)=>{
      const an=Number(a.groupNumber),bn=Number(b.groupNumber);
      if(Number.isFinite(an)&&Number.isFinite(bn)&&an!==bn)return an-bn;
      return a.groupTitle.localeCompare(b.groupTitle);
    });

  return {weeks,groups};
}

export function buildExcelTrackResultMetadata(exam,questions=[],answers={}){
  if(exam?.id!==EXCEL_TRACK_EXAM_ID)return null;
  return buildExcelTrackBreakdown(questions,answers);
}
