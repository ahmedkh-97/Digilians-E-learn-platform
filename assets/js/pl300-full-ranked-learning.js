const num=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const round1=value=>Math.round(num(value)*10)/10;
const timeValue=value=>{const parsed=Date.parse(value||'');return Number.isFinite(parsed)?parsed:Number.MAX_SAFE_INTEGER;};


export function sourceAttemptLocked(record,retrying=false){
  return Boolean(record&&typeof record==='object'&&!retrying);
}

export function sourceAttemptSelection({question,record,tempSelections={},retrying=false}={}){
  const id=String(question?.id||'');
  if(sourceAttemptLocked(record,retrying))return record?.mode==='auto'&&Array.isArray(record?.selected)?[...record.selected]:[];
  const temp=tempSelections?.[id];
  if(Array.isArray(temp))return [...temp];
  if(retrying)return [];
  return record?.mode==='auto'&&Array.isArray(record?.selected)?[...record.selected]:[];
}

export function buildSourcePracticeOptionsMarkup({question={},record=null,selected=[],locked=false,retrying=false,renderRichText=value=>htmlEscape(value)}={}){
  if(question?.reviewMode!=='scored-text'||!Array.isArray(question.options)||!question.options.length)return '';
  const correctIds=new Set((Array.isArray(question.correctAnswers)&&question.correctAnswers.length?question.correctAnswers:[question.correctAnswer]).filter(Boolean).map(String));
  const chosen=Array.isArray(selected)?selected.map(String):[];
  const graded=record?.mode==='auto'&&locked;
  const multi=correctIds.size>1;
  const options=question.options.map(option=>{
    const id=String(option.id),isSelected=chosen.includes(id),classes=['source-review-option'];
    if(isSelected)classes.push('selected');
    if(graded&&correctIds.has(id))classes.push('correct');
    if(graded&&isSelected&&!correctIds.has(id))classes.push('incorrect');
    return `<button type="button" class="${classes.join(' ')}" data-source-practice-option="${htmlEscape(id)}" aria-pressed="${isSelected?'true':'false'}" ${locked?'disabled':''}><b>${htmlEscape(id)}</b><div>${renderRichText(option.text||'')}</div></button>`;
  }).join('');
  const result=graded
    ?`<div class="source-practice-result ${record.correct?'correct':'incorrect'}"><strong>${record.correct?'Correct':'Not correct'}</strong><span>${record.correct?'Matches the source key.':'Review the source answer, then retry as a new attempt.'}</span></div>`
    :retrying?'<div class="source-practice-retry-note"><strong>Retry attempt</strong><span>Your saved first-pass answer stays unchanged until you submit this new attempt.</span></div>':'';
  const actions=locked
    ?'<div class="source-practice-actions"><button type="button" class="secondary-btn" id="sourcePracticeRetryBtn">Retry Question</button><small>Saved answer is locked. Retry creates a new attempt.</small></div>'
    :`<div class="source-practice-actions"><button type="button" class="primary-btn" id="sourcePracticeCheckBtn" ${chosen.length?'':'disabled'}>Check answer</button><small>${multi?`Select ${correctIds.size} answers.`:'Select one answer.'}</small></div>`;
  return `<div class="source-review-options ${multi?'multi':'single'}">${options}</div>${actions}${result}`;
}

export function pl300FullRankActivityId(trackId='data-analysis',examId='microsoft-pl-300'){
  return `voucher::${String(trackId||'data-analysis')}::${String(examId||'microsoft-pl-300')}::full-ranked-learning`;
}

function recordCompleted(record){
  return Boolean(record&&typeof record==='object');
}

function scoredRecord(record){
  return Boolean(record&&(record.mode==='auto'||record.mode==='native')&&(typeof record.correct==='boolean'||typeof record.firstPassCorrect==='boolean'||record.everCorrect===true));
}

function firstPassValue(record){
  if(typeof record?.firstPassCorrect==='boolean')return record.firstPassCorrect;
  if(typeof record?.correct==='boolean')return record.correct;
  return false;
}

function masteredValue(record){
  return Boolean(record?.everCorrect===true||record?.correct===true);
}

export function buildPl300FullRankMetrics({index,records={}}={}){
  const items=Array.isArray(index?.records)?index.records:[];
  const totalOccurrences=Math.max(0,num(index?.questionCount,items.length));
  const completedItems=items.filter(item=>recordCompleted(records?.[item.questionId]));
  const completedOccurrences=completedItems.length;
  const checkpointCompletions=completedItems.filter(item=>item.mode==='checkpoint').length;
  const activeSolveSeconds=completedItems.reduce((sum,item)=>sum+Math.max(0,num(records?.[item.questionId]?.activeSeconds)),0);

  const clusters=new Map();
  for(const item of items){
    if(item?.mode!=='objective'||num(item?.ranking?.accuracyWeight)!==1)continue;
    const key=String(item.equivalenceClusterId||item.validatedQuestionId||item.questionId||'');
    if(!key)continue;
    if(!clusters.has(key))clusters.set(key,[]);
    const record=records?.[item.questionId];
    if(scoredRecord(record))clusters.get(key).push({item,record});
  }

  let objectiveAttemptedClusters=0;
  let masteredClusters=0;
  let firstPassCorrectClusters=0;
  let attemptsToBest=0;
  for(const entries of clusters.values()){
    if(!entries.length)continue;
    objectiveAttemptedClusters+=1;
    if(entries.some(({record})=>masteredValue(record)))masteredClusters+=1;
    const earliest=[...entries].sort((a,b)=>timeValue(a.record?.firstAnsweredAt||a.record?.answeredAt)-timeValue(b.record?.firstAnsweredAt||b.record?.answeredAt))[0];
    if(firstPassValue(earliest?.record))firstPassCorrectClusters+=1;
    const masteredAttempts=entries.filter(({record})=>masteredValue(record)).map(({record})=>Math.max(1,num(record?.attemptCount,1)));
    const attempted=entries.map(({record})=>Math.max(1,num(record?.attemptCount,1)));
    attemptsToBest+=Math.min(...(masteredAttempts.length?masteredAttempts:attempted));
  }

  const validatedConceptCount=Math.max(0,num(index?.validatedConceptCount,new Set(items.filter(x=>x.mode==='objective').map(x=>x.validatedQuestionId).filter(Boolean)).size));
  return {
    totalOccurrences,
    completedOccurrences,
    remainingOccurrences:Math.max(0,totalOccurrences-completedOccurrences),
    completionPercentage:totalOccurrences?round1((completedOccurrences/totalOccurrences)*100):0,
    checkpointCompletions,
    objectiveAttemptedClusters,
    validatedConceptCount,
    masteredClusters,
    validatedAccuracy:objectiveAttemptedClusters?round1((masteredClusters/objectiveAttemptedClusters)*100):0,
    validatedMasteryPercentage:validatedConceptCount?round1((masteredClusters/validatedConceptCount)*100):0,
    firstPassCorrectClusters,
    firstPassPercentage:objectiveAttemptedClusters?round1((firstPassCorrectClusters/objectiveAttemptedClusters)*100):0,
    attemptsToBest,
    activeSolveSeconds
  };
}

export function encodePl300FullRankMeta({objectiveAttemptedClusters=0,firstPassCorrectClusters=0,attemptsToBest=0}={}){
  return `fr509:v1;o=${Math.max(0,Math.round(num(objectiveAttemptedClusters)))};fp=${Math.max(0,Math.round(num(firstPassCorrectClusters)))};a=${Math.max(0,Math.round(num(attemptsToBest)))}`;
}

export function parsePl300FullRankMeta(value){
  const text=String(value||'');
  const match=/^fr509:v1;o=(\d+);fp=(\d+);a=(\d+)$/.exec(text);
  if(!match)return {objectiveAttemptedClusters:0,firstPassCorrectClusters:0,attemptsToBest:0};
  return {objectiveAttemptedClusters:Number(match[1]),firstPassCorrectClusters:Number(match[2]),attemptsToBest:Number(match[3])};
}

export function buildPl300FullRankOnlineAttempt({playerId,studentName,examVersion='0.22.2',metrics={},submittedAt=new Date().toISOString(),trackId='data-analysis',examId='microsoft-pl-300'}={}){
  const total=Math.max(0,num(metrics.totalOccurrences,509));
  const completed=Math.max(0,Math.min(total,num(metrics.completedOccurrences)));
  const objectiveAttempted=Math.max(0,num(metrics.objectiveAttemptedClusters));
  const firstPass=Math.max(0,Math.min(objectiveAttempted,num(metrics.firstPassCorrectClusters)));
  return {
    player_id:String(playerId||''),
    student_name:String(studentName||'Learner'),
    exam_id:pl300FullRankActivityId(trackId,examId),
    exam_title:'Microsoft PL-300 Full Ranked Learning 509/509',
    exam_version:String(examVersion||'0.22.2'),
    score:Math.max(0,num(metrics.masteredClusters)),
    wrong:Math.max(0,objectiveAttempted-firstPass),
    unanswered:Math.max(0,total-completed),
    total_questions:total,
    percentage:round1(metrics.completionPercentage),
    time_taken_seconds:Math.max(0,Math.round(num(metrics.activeSolveSeconds))),
    feedback_mode:encodePl300FullRankMeta({objectiveAttemptedClusters:objectiveAttempted,firstPassCorrectClusters:firstPass,attemptsToBest:metrics.attemptsToBest}),
    submitted_at:submittedAt
  };
}

function rowModel(row,{totalOccurrences=509,validatedConceptCount=265}={}){
  const meta=parsePl300FullRankMeta(row?.feedback_mode);
  const total=Math.max(0,num(row?.total_questions,totalOccurrences));
  const completed=Math.max(0,Math.min(total,total-Math.max(0,num(row?.unanswered))));
  const objectiveAttempted=Math.max(0,Math.min(validatedConceptCount,num(meta.objectiveAttemptedClusters)));
  const mastered=Math.max(0,Math.min(validatedConceptCount,num(row?.score)));
  const firstPass=Math.max(0,Math.min(objectiveAttempted,num(meta.firstPassCorrectClusters)));
  return {
    ...row,
    completedOccurrences:completed,
    totalOccurrences:totalOccurrences,
    completionPercentage:totalOccurrences?round1((completed/totalOccurrences)*100):0,
    objectiveAttemptedClusters:objectiveAttempted,
    validatedConceptCount,
    masteredClusters:mastered,
    validatedAccuracy:objectiveAttempted?round1((mastered/objectiveAttempted)*100):0,
    validatedMasteryPercentage:validatedConceptCount?round1((mastered/validatedConceptCount)*100):0,
    firstPassCorrectClusters:firstPass,
    firstPassPercentage:objectiveAttempted?round1((firstPass/objectiveAttempted)*100):0,
    attemptsToBest:Math.max(0,num(meta.attemptsToBest)),
    activeSolveSeconds:Math.max(0,num(row?.time_taken_seconds))
  };
}

function compareModels(a,b){
  return num(b.completedOccurrences)-num(a.completedOccurrences)||
    num(b.masteredClusters)-num(a.masteredClusters)||
    num(b.firstPassCorrectClusters)-num(a.firstPassCorrectClusters)||
    num(a.attemptsToBest,Number.MAX_SAFE_INTEGER)-num(b.attemptsToBest,Number.MAX_SAFE_INTEGER)||
    num(a.activeSolveSeconds,Number.MAX_SAFE_INTEGER)-num(b.activeSolveSeconds,Number.MAX_SAFE_INTEGER)||
    timeValue(a.submitted_at)-timeValue(b.submitted_at);
}

export function buildPl300FullRankLeaderboard(rows=[],options={}){
  const byPlayer=new Map();
  for(const row of rows||[]){
    if(!row?.player_id)continue;
    const candidate=rowModel(row,options);
    const current=byPlayer.get(row.player_id);
    if(!current||compareModels(candidate,current)<0)byPlayer.set(row.player_id,candidate);
  }
  return [...byPlayer.values()].sort(compareModels).map((row,index)=>({...row,rank:index+1}));
}

const htmlEscape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const durationLabel=seconds=>{const total=Math.max(0,Math.round(num(seconds)));const h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;return h?`${h}h ${String(m).padStart(2,'0')}m`:`${m}m ${String(s).padStart(2,'0')}s`;};

function balancedPartSizes(total,{targetSize=18,maxSize=20}={}){
  const count=Math.max(0,Math.round(num(total)));
  if(!count)return [];
  const max=Math.max(1,Math.round(num(maxSize,20)));
  const target=Math.max(1,Math.min(max,Math.round(num(targetSize,18))));
  if(count<=max)return [count];
  let partCount=Math.max(1,Math.ceil(count/target));
  while(Math.ceil(count/partCount)>max)partCount+=1;
  const base=Math.floor(count/partCount);
  const extra=count%partCount;
  return Array.from({length:partCount},(_,index)=>base+(index<extra?1:0));
}

export function buildPl300MiniParts({index={},architecture={},targetSize=18,maxSize=20}={}){
  const records=Array.isArray(index?.records)?index.records:[];
  const domains=Array.isArray(architecture?.domains)?architecture.domains:[];
  const sessions=Array.isArray(architecture?.sessions)?architecture.sessions:[];
  const domainById=new Map(domains.map(domain=>[String(domain?.id||''),domain]));
  const sessionById=new Map(sessions.map(session=>[String(session?.id||''),session]));
  const domainOrder=new Map(domains.map((domain,index)=>[String(domain?.id||''),num(domain?.order,index+1)]));
  const sessionOrder=new Map(sessions.map((session,index)=>[String(session?.id||''),num(session?.order,index+1)]));
  const groups=new Map();

  for(const record of records){
    const rawSectionId=String(record?.sectionId||'');
    const knownSession=rawSectionId?sessionById.get(rawSectionId):null;
    const rawDomainId=String(record?.domainId||'');
    let domainId='source-review';
    let domainTitle='Source Review';
    let sectionId='unclassified-source';
    let sectionTitle='Unclassified Source Questions';
    let groupOrder=10000;
    let sectionSort=10000;

    if(knownSession){
      sectionId=String(knownSession.id);
      sectionTitle=String(knownSession.title||knownSession.shortTitle||knownSession.id);
      domainId=String(knownSession.domainId||rawDomainId||'source-review');
      const domain=domainById.get(domainId);
      domainTitle=String(domain?.title||domain?.shortTitle||domainId);
      groupOrder=domainOrder.get(domainId)??9000;
      sectionSort=sessionOrder.get(sectionId)??9000;
    }else if(rawDomainId&&domainById.has(rawDomainId)){
      const domain=domainById.get(rawDomainId);
      domainId=rawDomainId;
      domainTitle=String(domain?.title||domain?.shortTitle||rawDomainId);
      sectionId=`${rawDomainId}-general-review`;
      sectionTitle='General Domain Review';
      groupOrder=domainOrder.get(rawDomainId)??9000;
      sectionSort=9500;
    }

    const key=`${domainId}::${sectionId}`;
    if(!groups.has(key))groups.set(key,{domainId,domainTitle,sectionId,sectionTitle,groupOrder,sectionSort,questionIds:[]});
    groups.get(key).questionIds.push(String(record?.questionId||''));
  }

  const ordered=[...groups.values()].sort((a,b)=>a.groupOrder-b.groupOrder||a.sectionSort-b.sectionSort||a.sectionTitle.localeCompare(b.sectionTitle));
  const parts=[];
  for(const group of ordered){
    const sizes=balancedPartSizes(group.questionIds.length,{targetSize,maxSize});
    let offset=0;
    sizes.forEach((size,index)=>{
      const questionIds=group.questionIds.slice(offset,offset+size);
      offset+=size;
      const partNumber=index+1;
      parts.push({
        id:`${group.domainId}::${group.sectionId}::part-${partNumber}`,
        domainId:group.domainId,
        domainTitle:group.domainTitle,
        sectionId:group.sectionId,
        sectionTitle:group.sectionTitle,
        partNumber,
        count:questionIds.length,
        questionIds,
        label:`${group.domainTitle} → ${group.sectionTitle} · Part ${partNumber} · ${questionIds.length} Questions`
      });
    });
  }
  return parts;
}

export function filterPl300QuestionsByPart({questions=[],partId='all',parts=[]}={}){
  const list=Array.isArray(questions)?questions:[];
  if(!partId||partId==='all')return list;
  const part=(Array.isArray(parts)?parts:[]).find(item=>String(item?.id||'')===String(partId));
  if(!part)return list;
  const byId=new Map(list.map(question=>[String(question?.id||''),question]));
  return part.questionIds.map(id=>byId.get(String(id))).filter(Boolean);
}

export function buildPl300PartOptionsMarkup({parts=[],activePartId='all'}={}){
  const active=String(activePartId||'all');
  const options=[`<option value="all"${active==='all'?' selected':''}>All 509 Questions</option>`];
  for(const part of Array.isArray(parts)?parts:[]){
    const id=String(part?.id||'');
    options.push(`<option value="${htmlEscape(id)}"${active===id?' selected':''}>${htmlEscape(part?.label||id)}</option>`);
  }
  return options.join('');
}

export function buildPl300PartViewState({parts=[],activePartId='all',records={},totalAll=509,completedAll=0,activeFilter='all'}={}){
  const list=Array.isArray(parts)?parts:[];
  const activePart=list.find(part=>String(part?.id||'')===String(activePartId||'all'))||null;
  const partTotal=activePart?.count||Math.max(0,num(totalAll,509));
  const partCompleted=activePart
    ?activePart.questionIds.filter(id=>Boolean(records?.[id])).length
    :Math.max(0,Math.min(partTotal,num(completedAll)));
  const activePartLabel=activePart?.label||'All 509 Questions';
  const partOptionsHtml=buildPl300PartOptionsMarkup({parts:list,activePartId});
  const typeFilterLabel=activeFilter==='source-01'?'Source 01':activeFilter==='source-02'?'Source 02':activeFilter==='objective'?'Validated Objective':activeFilter==='checkpoint'?'Study Checkpoints':'All Types';
  const filterLabel=activePart
    ?`${activePart.domainTitle} → ${activePart.sectionTitle} · Part ${activePart.partNumber}${activeFilter!=='all'?` · ${typeFilterLabel}`:''}`
    :(activeFilter==='all'?'All 509':typeFilterLabel);
  return {activePart,partTotal,partCompleted,activePartLabel,partOptionsHtml,filterLabel};
}

export function enrichPl300SourceQuestionsWithArabic({questions=[],index={},masterQuestions=[]}={}){
  const recordByQuestion=new Map((Array.isArray(index?.records)?index.records:[]).map(record=>[String(record?.questionId||''),record]));
  const masterById=new Map((Array.isArray(masterQuestions)?masterQuestions:[]).map(question=>[String(question?.id||''),question]));
  return (Array.isArray(questions)?questions:[]).map(question=>{
    const direct=resolvePl300ArabicExplanation({question});
    const record=recordByQuestion.get(String(question?.id||''));
    const validated=record?.validatedQuestionId?masterById.get(String(record.validatedQuestionId)):null;
    const reviewed=validated?resolvePl300ArabicExplanation({question:{},validatedQuestion:validated}):'';
    const explanationAr=String(question?.explanationAr||reviewed||direct||'').trim();
    return explanationAr?{...question,explanationAr}:{...question};
  });
}

export function resolvePl300ArabicExplanation({question={},validatedQuestion=null}={}){
  const candidates=[
    question?.explanationAr,
    question?.aiExplanation?.ar,
    question?.explanation?.ar,
    validatedQuestion?.explanationAr,
    validatedQuestion?.aiExplanation?.ar,
    validatedQuestion?.explanation?.ar
  ];
  const reviewed=candidates.find(value=>typeof value==='string'&&value.trim());
  if(reviewed)return reviewed.trim();
  if(question?.reviewMode==='native-structured'){
    const fields=Array.isArray(question?.nativeResponse?.fields)?question.nativeResponse.fields:[];
    const answers=fields.map(field=>`${String(field.label||field.id||'Answer')}: ${String((field.expected||[])[0]||'—')}`).join('، ');
    return answers
      ?`الإجابة المعتمدة في المصدر هي: ${answers}. هذا السؤال من نوع Answer Area، وتم تثبيت التصحيح على القيم الظاهرة في دليل المصدر بدون اختراع اختيارات إضافية. راجع الشرح الأصلي بالأسفل لو محتاج تفاصيل المصدر كاملة.`
      :'السؤال من نوع Answer Area. راجع دليل الإجابة الأصلي المحفوظ من المصدر قبل إكمال نقطة المذاكرة.';
  }
  if(question?.reviewMode==='source-reveal'){
    return 'دي نقطة مذاكرة (Study Checkpoint) لأن دليل المصدر المتاح لا يسمح بتصحيح تنافسي تلقائي بشكل موثوق من غير افتراضات. راجع صورة/دليل الإجابة الأصلي وافهم الفكرة، ثم علّم السؤال كمُراجع. إكماله يدخل ضمن 509/509 لكن لا يضيف Correct وهمي للـAccuracy.';
  }
  return 'راجع الإجابة المعتمدة ودليل المصدر بالأسفل. الشرح العربي التفصيلي لهذا السؤال غير متوفر في النسخة المراجَعة حاليًا، لذلك لم تتم إضافة تفسير من خارج المصدر.';
}

function arabicExplanationMarkup(question,renderRichText){
  const text=resolvePl300ArabicExplanation({question});
  return text?`<div class="source-review-explanation source-review-explanation-ar" dir="rtl"><span class="eyebrow">شرح الإجابة بالعربي</span>${renderRichText(text)}</div>`:'';
}

function originalExplanationMarkup(explanation,renderRichText){
  if(!String(explanation||'').trim())return '';
  return `<details class="source-original-explanation"><summary>Original Source Explanation</summary><div class="source-review-explanation source-review-explanation-original" dir="ltr">${renderRichText(String(explanation).trim())}</div></details>`;
}

export function buildPl300FullRankLeaderboardPresentation({board=[],currentPlayerId='',studentName='Learner',avatarHtmlByPlayer={}}={}){
  const summaryHtml='<div><span>Full Bank</span><strong>509 Source Questions</strong></div><div><span>Validated</span><strong>265 Concepts</strong></div><div><span>Rank Priority</span><strong>Completion First</strong></div><div><span>Accuracy</span><strong>Duplicate-Safe</strong></div>';
  const listHtml=board.length?board.map(row=>{
    const name=row.student_name||'Learner',mine=String(row.player_id||'')===String(currentPlayerId||'');
    const avatar=avatarHtmlByPlayer?.[row.player_id]||`<span class="voucher-ranking-avatar"><span>${htmlEscape(name.slice(0,2).toUpperCase())}</span></span>`;
    return `<div class="voucher-ranking-row${mine?' current-user':''}"><span class="voucher-ranking-rank">#${row.rank}</span><div class="voucher-ranking-student">${avatar}<div><strong>${htmlEscape(name)}</strong><small>${mine?'You':'PL-300 learner'}</small></div></div><div class="voucher-ranking-score"><strong>${row.completedOccurrences}/509</strong><small>${row.completionPercentage}% Completion · ${row.masteredClusters}/265 Mastered</small></div><div class="voucher-ranking-time"><strong>${row.firstPassPercentage}% First Pass</strong><small>${row.attemptsToBest} attempts-to-best · ${htmlEscape(durationLabel(row.activeSolveSeconds))}</small></div></div>`;
  }).join(''):'<div class="voucher-inline-empty">Start the 509-question Full Ranked Bank to join this leaderboard.</div>';
  const me=board.find(row=>String(row.player_id||'')===String(currentPlayerId||''));
  const personalHtml=me
    ?`<div><span class="eyebrow">YOUR FULL BANK POSITION</span><h3>${htmlEscape(studentName||me.student_name||'Learner')}</h3><small>${me.completedOccurrences}/509 studied · ${me.masteredClusters}/265 validated concepts mastered · ${me.validatedAccuracy}% Validated Accuracy</small></div><div class="rank-local-stats"><div><span>Rank</span><strong>#${me.rank}</strong></div><div><span>Completion</span><strong>${me.completionPercentage}%</strong></div></div>`
    :`<div><span class="eyebrow">YOUR FULL BANK POSITION</span><h3>${htmlEscape(studentName||'Learner')}</h3><small>Study your first source question to enter the leaderboard.</small></div><div class="rank-local-stats"><div><span>Rank</span><strong>—</strong></div></div>`;
  return {summaryHtml,listHtml,personalHtml};
}



export function buildPl300FullRankedAnswerMarkup({question={},completed=false,revealed=false,nativeAnswerHtml='',renderRichText=value=>htmlEscape(value)}={}){
  const explanation=String(question?.sourceExplanation||'').trim();
  const arabic=arabicExplanationMarkup(question,renderRichText);
  const original=originalExplanationMarkup(explanation,renderRichText);
  if(question?.reviewMode==='scored-text'){
    const ids=(Array.isArray(question?.correctAnswers)&&question.correctAnswers.length?question.correctAnswers:[question?.correctAnswer]).filter(Boolean).map(String);
    const answerLines=ids.map(id=>{
      const option=(question.options||[]).find(item=>String(item.id)===id);
      return `<li><b>${htmlEscape(id)}</b>${option?` — ${renderRichText(option.text||'')}`:''}</li>`;
    }).join('');
    return `<div class="source-review-answer-key"><span class="eyebrow">SOURCE ANSWER</span><ul>${answerLines||'<li>Answer key unavailable in parsed text.</li>'}</ul></div>${arabic}${original}`;
  }
  if(question?.reviewMode==='native-structured')return nativeAnswerHtml||`${arabic}${original}`;
  const visuals=(question?.answerVisuals||[]).map(path=>`<img src="${htmlEscape(path)}" alt="Source answer evidence for question ${htmlEscape(question.questionNumber||'')}" loading="lazy">`).join('');
  return `<div class="source-review-answer-key source-reveal-note"><span class="eyebrow">SOURCE EVIDENCE</span><p>دليل المصدر محفوظ كما هو. السؤال ده لا يتم منحه Correct تنافسي من غير تصحيح موثوق.</p></div>${visuals?`<div class="source-review-visual-stack answer-evidence">${visuals}</div>`:''}${arabic}${original}<div class="source-practice-checkpoint"><span class="eyebrow">RANKED STUDY CHECKPOINT</span><p dir="rtl">إكمال المراجعة يتحسب ضمن 509/509، لكنه لا يضيف إجابة صحيحة وهمية إلى Validated Accuracy.</p><button type="button" class="primary-btn" id="sourcePracticeCheckpointBtn" ${revealed&&!completed?'':'disabled'}>${completed?'تمت مراجعة السؤال':'إكمال نقطة المذاكرة'}</button>${completed?'<small>تم الحفظ كمُراجع، والـAccuracy التنافسي لم يتغير.</small>':'<small>افتح دليل المصدر أولًا ثم أكمل نقطة المذاكرة.</small>'}</div>`;
}

export function buildPl300FullRankedReviewMarkup({
  sourceTitle='Full Ranked Bank — 509 Questions',source01Count=0,source02Count=0,objectiveCount=0,checkpointCount=0,
  metrics={},activeFilter='all',totalAll=509,questionsLength=0,currentIndex=0,filterLabel='All 509',objective=false,
  typeLabel='',sourceLabel='',questionNumber='',occurrence=1,pageLabel='',domainId='',recordStatus='NOT STUDIED',
  questionHtml='',visualHtml='',optionsHtml='',nativeHtml='',revealOpen=false,answerHtml='',
  partOptionsHtml='<option value="all">All 509 Questions</option>',activePartLabel='All 509 Questions',partCompleted=0,partTotal=509
}={}){
  const filterButton=(id,label,count)=>`<button type="button" data-source-review-filter="${id}" class="${activeFilter===id?'active':''}">${label} <b>${count}</b></button>`;
  const index=Math.max(0,num(currentIndex));
  const length=Math.max(0,num(questionsLength));
  const progress=length?((index+1)/length)*100:0;
  const copy=num(occurrence,1)>1?` · Copy ${num(occurrence,1)}`:'';
  const domain=domainId?` · ${htmlEscape(domainId)}`:' · Unclassified Source Review';
  const studyPartTotal=Math.max(0,num(partTotal,509));
  const studyPartCompleted=Math.max(0,Math.min(studyPartTotal,num(partCompleted)));
  const studyPartProgress=studyPartTotal?(studyPartCompleted/studyPartTotal)*100:0;
  return `
    <section class="source-review-hero full-ranked-source-hero">
      <div><span class="eyebrow">FULL RANKED LEARNING · 509/509</span><h2>${htmlEscape(sourceTitle)}</h2><p>Every source occurrence counts toward Completion. Only validated concepts affect competitive accuracy; checkpoints keep uncertain source items studyable without fake scoring.</p></div>
      <div class="source-review-stats"><span><strong>${num(source01Count)}</strong>Source 01</span><span><strong>${num(source02Count)}</strong>Source 02</span><span><strong>${num(objectiveCount)}</strong>Objective occurrences</span><span><strong>${num(checkpointCount)}</strong>Study checkpoints</span></div>
    </section>
    <section class="source-practice-summary full-ranked-summary"><span>Completion <strong>${num(metrics.completedOccurrences)} / ${num(metrics.totalOccurrences,509)}</strong> · ${num(metrics.completionPercentage)}%</span><span>Validated Accuracy <strong>${num(metrics.validatedAccuracy)}%</strong></span><span>Mastered <strong>${num(metrics.masteredClusters)} / ${num(metrics.validatedConceptCount,265)}</strong></span><span>First Pass <strong>${num(metrics.firstPassPercentage)}%</strong></span><small>Study Checkpoint completion never counts as Correct. Duplicate source copies are required for coverage but collapse to one validated concept for mastery.</small></section>
    <section class="pl300-study-part-picker" aria-label="PL-300 study parts">
      <div class="pl300-study-part-copy"><span class="eyebrow">STUDY IN SMALL PARTS</span><label for="sourceReviewPart">Domain → Section → Mini Part</label><small>Choose a focused part of roughly 15–20 questions. Every part still contributes to the same 509/509 ranked completion.</small></div>
      <div class="pl300-study-part-control"><select id="sourceReviewPart" aria-label="Choose PL-300 study part">${partOptionsHtml}</select><div class="pl300-study-part-progress"><span>Part Progress</span><strong>${studyPartCompleted} / ${studyPartTotal}</strong><div><i style="width:${studyPartProgress}%"></i></div></div></div>
      <p>${htmlEscape(activePartLabel)}</p>
    </section>
    <section class="source-review-toolbar">
      <div class="source-review-filters" role="group" aria-label="Full ranked learning filter">
        ${filterButton('all','All',totalAll)}
        ${filterButton('source-01','Source 01',source01Count)}
        ${filterButton('source-02','Source 02',source02Count)}
        ${filterButton('objective','Objective',objectiveCount)}
        ${filterButton('checkpoint','Checkpoints',checkpointCount)}
      </div>
      <div class="source-review-jump"><label for="sourceReviewJump">Jump</label><input id="sourceReviewJump" type="number" min="1" max="${length}" value="${index+1}"><button type="button" class="secondary-btn" id="sourceReviewJumpBtn">Go</button></div>
    </section>
    <section class="source-review-progress"><span>${htmlEscape(filterLabel)}</span><strong>${index+1} / ${length}</strong><div><i style="width:${progress}%"></i></div></section>
    <article class="source-review-card ${objective?'is-ranked-objective':'is-ranked-checkpoint'}">
      <div class="source-review-card-head"><div><span class="source-review-type">${htmlEscape(typeLabel)}</span><h3>${htmlEscape(sourceLabel)} · Question ${htmlEscape(questionNumber)}${copy}</h3><small>${htmlEscape(pageLabel)}${domain}</small></div><span class="source-review-status">${htmlEscape(recordStatus)}</span></div>
      <div class="source-review-question">${questionHtml}</div>
      ${visualHtml?`<div class="source-review-visual-stack">${visualHtml}</div>`:''}
      ${optionsHtml||''}
      ${nativeHtml||''}
      <details class="source-review-reveal" id="sourceReviewReveal" ${revealOpen?'open':''}><summary>Reveal source answer & explanation</summary><div class="source-review-reveal-body">${answerHtml||''}</div></details>
    </article>
    <nav class="source-review-nav" aria-label="Source question navigation"><button type="button" class="secondary-btn" id="sourceReviewPrev" ${index<=0?'disabled':''}>← Previous</button><span>Question ${index+1} of ${length} · Full Bank 509</span><button type="button" class="primary-btn" id="sourceReviewNext" ${index>=length-1?'disabled':''}>Next →</button></nav>`;
}

export function buildPl300FullRankedLandingMarkup({domainCount=4,sessionCount=10}={}){
  return `<section class="voucher-exam-hero voucher-exam-hero-v2 ranked-learning-hero"><div class="voucher-exam-hero-copy"><span class="eyebrow">POWER BI VOUCHER</span><h2>Microsoft PL-300 — Ranked Learning</h2><p>Every source question is part of one continuous ranked study journey. Completion covers all 509 source occurrences; Validated Accuracy scores only evidence-backed concepts.</p><div class="voucher-exam-hero-stats"><span><strong>509</strong> Full Source Bank</span><span><strong>265</strong> Validated Concepts</span><span><strong>${domainCount}</strong> Ranked Domains</span><span><strong>${sessionCount}</strong> Study Sections</span></div></div><div class="voucher-exam-hero-actions"><span class="voucher-ranked-badge">509 / 509 RANKED STUDY</span><small>Completion first. No self-awarded correctness and no invented answer keys.</small></div></section><section class="pl300-full-ranked-card" aria-label="PL-300 Full Ranked Bank"><div class="pl300-full-ranked-copy"><span class="eyebrow">PRIMARY PL-300 JOURNEY</span><h3>Full Ranked Bank — 509 Questions</h3><p>Study every question from both source PDFs. Objective questions build Validated Accuracy; uncertain source blocks become required Study Checkpoints without fake scoring.</p><div class="pl300-full-ranked-source-stats"><span><strong>369</strong> Source 01</span><span><strong>140</strong> Source 02</span><span><strong>265</strong> Validated Concepts</span></div></div><div class="pl300-full-ranked-metrics"><div><span>COMPLETION</span><strong id="pl300FullRankCompletion">0 / 509</strong><small>Every source occurrence</small></div><div><span>VALIDATED ACCURACY</span><strong id="pl300FullRankAccuracy">0%</strong><small>Objective concepts only</small></div><div><span>MASTERED</span><strong id="pl300FullRankMastery">0 / 265</strong><small>Duplicate-safe concept score</small></div></div><div class="pl300-full-ranked-actions"><button type="button" class="primary-btn large-btn" id="pl300FullRankStartBtn">Start Full Ranked Bank →</button><button type="button" class="secondary-btn" id="pl300FullRankRankingBtn">View Full Bank Ranking →</button></div></section>`;
}
