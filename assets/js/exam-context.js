const PROGRESS_KEY="digilians.examProgress";

export function normalizeContextText(value){
  return String(value??"").replace(/\s+/g," ").trim().toLowerCase();
}
function clean(value){
  return String(value??"").replace(/\s+/g," ").trim();
}
function unique(values){
  return [...new Set(values.map(clean).filter(Boolean))];
}
function levelLabel(levelId){
  if(String(levelId||"").toLowerCase().includes("professional"))return "Professional";
  if(String(levelId||"").toLowerCase().includes("junior"))return "Junior";
  return "";
}
function questionCountLabel(count){
  const n=Math.max(0,Number(count)||0);
  return n?`${n} Question${n===1?"":"s"}`:"";
}
function officialScopeLabel(exam,official,track){
  if(official?.kind==="track-random"){
    return String(exam?.category||"").toLowerCase().includes("practice")?"Random Practice":"Random Exam";
  }
  if(official?.kind==="final")return "Final Simulation";
  if(official?.kind==="section"){
    const title=clean(exam?.title);
    const prefix=clean(track);
    if(title && prefix && title.toLowerCase().startsWith(`${prefix.toLowerCase()} — `)){
      return clean(title.slice(prefix.length+3));
    }
    if(title && prefix && title.toLowerCase().startsWith(`${prefix.toLowerCase()} - `)){
      return clean(title.slice(prefix.length+3));
    }
    return title || "Section";
  }
  return clean(exam?.category)||"Official QBank";
}
function breadcrumbSegments(value){
  return unique(String(value||"").split(/\s*\/\s*/));
}
function currentQuestion(progress){
  const generated=progress?.generatedExam;
  const questions=generated?.questions||[];
  const index=Math.max(0,Math.min(questions.length-1,Number(progress?.currentIndex)||0));
  return questions[index]||null;
}
function mistakeTrack(q){
  return clean(q?.mistakeContext?.track || q?.track || q?.mistakeContext?.module || q?.trackId);
}
function mistakeTopic(q,visibleTopic){
  return clean(visibleTopic || q?.topic || q?.topicId || "General");
}

export function buildExamContextModel({
  progress=null,
  setupTitle="",
  setupBreadcrumb="",
  setupCategory="",
  visibleTopic=""
}={}){
  const generated=progress?.generatedExam||null;
  const exam=generated?.exam||null;
  const q=currentQuestion(progress);
  const official=exam?.generatedFromOfficialQbank||null;
  const mistakes=exam?.generatedFromMistakes||null;

  if(official){
    const level=levelLabel(official.levelId);
    const track=clean(q?.track || exam?.module || official.trackId || "Data Analysis");
    const topic=clean(visibleTopic || q?.topic || q?.topicId || "General");
    const scope=officialScopeLabel(exam,official,track);
    return {
      kind:"official-qbank",
      activitySegments:unique(["Official QBank",level,track,scope]),
      questionSegments:unique(["Official QBank",level,track,topic]),
      navigatorTitle:`${track} · Official QBank`,
      navigatorSubtitle:level?`${level} · ${topic}`:topic
    };
  }

  if(mistakes || clean(exam?.course).toLowerCase()==="my mistakes"){
    const questions=generated?.questions||[];
    const tracks=unique(questions.map(mistakeTrack));
    const activityTrack=tracks.length===1?tracks[0]:tracks.length<=3?tracks.join(" + "):"Mixed Tracks";
    const track=mistakeTrack(q)||activityTrack||"Mixed Topics";
    const topic=mistakeTopic(q,visibleTopic);
    const sourceType=clean(q?.mistakeContext?.sourceType || q?.sourceType).toLowerCase();
    const sourceLabel=sourceType==="official-qbank"?"Official QBank":sourceType==="course"?"Course":"";
    return {
      kind:"my-mistakes",
      activitySegments:unique(["My Mistakes",activityTrack||"Mixed Topics",questionCountLabel(questions.length)]),
      questionSegments:unique(["My Mistakes",sourceLabel,track,topic]),
      navigatorTitle:`${track} · My Mistakes`,
      navigatorSubtitle:sourceLabel?`${sourceLabel} · ${topic}`:topic
    };
  }

  const crumbs=breadcrumbSegments(setupBreadcrumb);
  const course=crumbs[0]||clean(exam?.course)||"Exam";
  const track=clean(q?.track || crumbs[1] || exam?.module || "");
  const activity=crumbs.length?crumbs:unique([course,track,setupCategory||exam?.category||setupTitle]);
  const topic=clean(visibleTopic || q?.topic || q?.topicId || "");
  return {
    kind:"course",
    activitySegments:activity,
    questionSegments:unique([course,track,topic||setupCategory||exam?.category||"Question"]),
    navigatorTitle:track?`${track} · Questions`:"Questions",
    navigatorSubtitle:topic
  };
}

function safeJson(value){
  try{return JSON.parse(value||"null")}catch{return null}
}
function readProgress(storage=globalThis.localStorage){
  try{return safeJson(storage?.getItem?.(PROGRESS_KEY))}catch{return null}
}
function byId(id){return globalThis.document?.getElementById?.(id)||null}
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}
function segmentsHtml(segments){
  return segments.map((segment,index)=>`${index?'<span class="exam-context-sep">›</span>':""}<strong>${escapeHtml(segment)}</strong>`).join("");
}
function ensureExamContextUi(){
  const doc=globalThis.document;
  const view=byId("examView");
  if(!doc||!view)return null;

  let activity=byId("examActivityContext");
  if(!activity){
    activity=doc.createElement("div");
    activity.id="examActivityContext";
    activity.className="exam-activity-context";
    activity.setAttribute("aria-live","polite");
    const anchor=view.querySelector(".exam-context");
    anchor?.insertAdjacentElement("afterend",activity);
  }

  let source=byId("currentQuestionSource");
  if(!source){
    source=doc.createElement("div");
    source.id="currentQuestionSource";
    source.className="current-question-source";
    source.setAttribute("aria-live","polite");
    const tags=byId("questionTopic")?.closest(".question-tags");
    tags?.insertAdjacentElement("afterend",source);
  }

  const navHead=view.querySelector(".question-nav-card .nav-card-head > div");
  let navSubtitle=byId("questionNavigatorContext");
  if(navHead && !navSubtitle){
    navSubtitle=doc.createElement("small");
    navSubtitle.id="questionNavigatorContext";
    navSubtitle.className="question-navigator-context";
    navHead.appendChild(navSubtitle);
  }

  if(!byId("examContextStyles")){
    const style=doc.createElement("style");
    style.id="examContextStyles";
    style.textContent=`
      .exam-activity-context{margin:14px 0 16px;padding:12px 16px;border:1px solid var(--line);border-radius:16px;background:color-mix(in srgb,var(--surface-solid) 84%,var(--primary-soft));display:flex;align-items:center;gap:8px;flex-wrap:wrap;box-shadow:var(--shadow-sm)}
      .exam-activity-context::before{content:"YOU ARE SOLVING";font-size:9px;font-weight:900;letter-spacing:.14em;color:var(--primary);margin-right:4px}
      .exam-activity-context strong{font-size:12px;color:var(--text)}
      .exam-context-sep{color:var(--muted);font-weight:800}
      .current-question-source{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-left:auto;padding:7px 10px;border:1px solid var(--line);border-radius:11px;background:var(--surface-soft);font-size:10px;color:var(--muted)}
      .current-question-source::before{content:"THIS QUESTION:";font-size:8px;font-weight:900;letter-spacing:.12em;color:var(--primary)}
      .current-question-source strong{color:var(--text);font-size:10px}
      .question-navigator-context{display:block;margin-top:4px;max-width:170px;color:var(--muted);font-size:9px;line-height:1.35}
      @media(max-width:760px){.exam-activity-context{margin:10px 0 12px;padding:10px 12px}.current-question-source{width:100%;margin:8px 0 0}.exam-activity-context strong{font-size:11px}}
    `;
    doc.head?.appendChild(style);
  }
  return {activity,source,navHead,navSubtitle};
}
export function refreshExamContextUi(){
  const view=byId("examView");
  if(!view?.classList.contains("active"))return null;
  const ui=ensureExamContextUi();
  if(!ui)return null;

  const model=buildExamContextModel({
    progress:readProgress(),
    setupTitle:byId("setupTitle")?.textContent||"",
    setupBreadcrumb:byId("setupBreadcrumb")?.textContent||"",
    setupCategory:byId("setupCategory")?.textContent||"",
    visibleTopic:byId("questionTopic")?.textContent||""
  });

  ui.activity.innerHTML=segmentsHtml(model.activitySegments);
  ui.source.innerHTML=segmentsHtml(model.questionSegments);

  const heading=ui.navHead?.querySelector("h4");
  if(heading)heading.textContent=model.navigatorTitle;
  if(ui.navSubtitle)ui.navSubtitle.textContent=model.navigatorSubtitle||"";
  return model;
}
function scheduleRefresh(){
  [0,40,160].forEach(delay=>globalThis.setTimeout?.(refreshExamContextUi,delay));
}
function initBrowser(){
  if(!globalThis.document)return;
  globalThis.addEventListener?.("digilians:routechange",event=>{
    if(event?.detail?.viewId==="examView")scheduleRefresh();
  });
  const target=byId("questionText")||byId("examView");
  if(target && typeof MutationObserver!=="undefined"){
    new MutationObserver(scheduleRefresh).observe(target,{subtree:true,childList:true,characterData:true});
  }
  if(byId("questionTopic") && typeof MutationObserver!=="undefined"){
    new MutationObserver(scheduleRefresh).observe(byId("questionTopic"),{subtree:true,childList:true,characterData:true});
  }
  scheduleRefresh();
}
if(typeof window!=="undefined" && typeof document!=="undefined")initBrowser();
