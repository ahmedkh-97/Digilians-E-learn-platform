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

function navigatorTrackForQuestion(q){
  return clean(
    q?.mistakeContext?.track ||
    q?.track ||
    q?.module ||
    q?.mistakeContext?.module ||
    q?.trackId
  );
}
function navigatorTopicForQuestion(q){
  return clean(
    q?.topic ||
    q?.sectionTitle ||
    q?.section ||
    q?.topicId ||
    "General"
  );
}
function navigatorGroupLabel(track){
  return clean(track) || "Questions";
}
export function buildNavigatorGroups(items=[]){
  const groups=[];
  const byTrack=new Map();
  for(const raw of items||[]){
    const index=Number(raw?.index);
    if(!Number.isInteger(index) || index<0)continue;
    const track=clean(raw?.track);
    const key=normalizeContextText(track) || "questions";
    let group=byTrack.get(key);
    if(!group){
      group={
        id:`track-${key.replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80) || "questions"}`,
        key,
        track,
        label:navigatorGroupLabel(track),
        indexes:[]
      };
      byTrack.set(key,group);
      groups.push(group);
    }
    group.indexes.push(index);
  }
  return groups;
}
function navigatorItemsFromProgress(progress,nav=null){
  const buttons=nav?[...nav.querySelectorAll(".nav-number")]:[];
  if(buttons.length && buttons.some(btn=>btn.dataset.navTrack || btn.dataset.navTopic)){
    return buttons.map((btn,domIndex)=>({
      index:Number.isInteger(Number(btn.dataset.navIndex))?Number(btn.dataset.navIndex):domIndex,
      track:clean(btn.dataset.navTrack),
      topic:clean(btn.dataset.navTopic || "General")
    }));
  }
  const questions=progress?.generatedExam?.questions||[];
  return questions.map((q,index)=>({
    index,
    track:navigatorTrackForQuestion(q),
    topic:navigatorTopicForQuestion(q)
  }));
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
  const voucher=exam?.generatedFromVoucher||progress?.voucherResume||null;
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

  if(voucher){
    const track=clean(exam?.module || voucher.trackId || "Data Analysis");
    const rawTitle=clean(exam?.title || progress?.examTitle || voucher.voucherExamId || "Voucher Exam");
    const examLabel=clean(rawTitle.split(/\s*•\s*/)[0].replace(/\s+Exam$/i,"")) || "Voucher Exam";
    const domainTitle=clean(voucher.domainTitle || "");
    const sectionTitle=clean(visibleTopic || q?.sectionTitle || q?.section || q?.topic || q?.topicId || "Question");
    if(domainTitle){
      return {
        kind:"voucher",
        activitySegments:unique(["Voucher",examLabel,domainTitle]),
        questionSegments:unique([domainTitle,sectionTitle]),
        navigatorTitle:`${examLabel} · ${domainTitle}`,
        navigatorSubtitle:sectionTitle
      };
    }
    return {
      kind:"voucher",
      activitySegments:unique(["Voucher",track,examLabel]),
      questionSegments:unique([examLabel,sectionTitle]),
      navigatorTitle:`${examLabel} · Questions`,
      navigatorSubtitle:sectionTitle
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
const navigatorCollapsedGroups=new Map();
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
      .question-navigator.navigator-grouped{display:block}
      .question-nav-group{padding:9px 0 11px;border-top:1px solid var(--line)}
      .question-nav-group:first-child{padding-top:0;border-top:0}
      .question-nav-group.current-group{margin-left:-7px;margin-right:-7px;padding-left:7px;padding-right:7px;border-radius:12px;background:color-mix(in srgb,var(--primary) 7%,transparent)}
      .question-nav-group-toggle{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:6px;padding:0 1px 8px;border:0;background:transparent;color:var(--text);text-align:left}
      .question-nav-group-copy{min-width:0}
      .question-nav-group-copy small,.question-nav-group-copy strong{display:block}
      .question-nav-group-copy small{margin-bottom:3px;color:var(--primary);font-size:7px;font-weight:900;letter-spacing:.13em}
      .question-nav-group-copy strong{font-size:9px;line-height:1.35;overflow-wrap:anywhere}
      .question-nav-group-count{min-width:20px;padding:3px 5px;border:1px solid var(--line);border-radius:999px;background:var(--surface-soft);color:var(--muted);font-size:7px;font-weight:900;text-align:center}
      .question-nav-group-chevron{color:var(--muted);font-size:11px;transition:transform .18s var(--ease)}
      .question-nav-group.collapsed .question-nav-group-chevron{transform:rotate(-90deg)}
      .question-nav-group-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
      .question-nav-group.collapsed .question-nav-group-grid{display:none}
      @media(max-width:1050px){.question-nav-group-grid{grid-template-columns:repeat(8,1fr)}}
      @media(max-width:560px){.question-nav-group-grid{grid-template-columns:repeat(6,1fr)}}
      @media(max-width:760px){.exam-activity-context{margin:10px 0 12px;padding:10px 12px}.current-question-source{width:100%;margin:8px 0 0}.exam-activity-context strong{font-size:11px}}
    `;
    doc.head?.appendChild(style);
  }
  return {activity,source,navHead,navSubtitle};
}

function currentNavigatorIndex(nav,progress){
  const buttons=[...nav.querySelectorAll(".nav-number")];
  const currentButton=buttons.find(btn=>btn.classList.contains("current"));
  if(currentButton){
    const stableIndex=Number(currentButton.dataset.navIndex);
    if(Number.isInteger(stableIndex))return stableIndex;
  }
  return Math.max(0,Number(progress?.currentIndex)||0);
}
function syncNavigatorGroupState(nav,progress){
  const currentIndex=currentNavigatorIndex(nav,progress);
  nav.querySelectorAll(".question-nav-group").forEach(group=>{
    const indexes=String(group.dataset.indexes||"").split(",").map(Number).filter(Number.isInteger);
    const current=indexes.includes(currentIndex);
    group.classList.toggle("current-group",current);
    if(current && group.classList.contains("collapsed")){
      group.classList.remove("collapsed");
      group.querySelector(".question-nav-group-toggle")?.setAttribute("aria-expanded","true");
      navigatorCollapsedGroups.set(group.dataset.groupStoreKey||group.dataset.groupId,false);
    }
  });
}
function refreshQuestionNavigatorGroups(progress){
  const nav=byId("questionNavigator");
  if(!nav)return false;

  const buttons=[...nav.querySelectorAll(".nav-number")];
  if(!buttons.length)return false;
  const items=navigatorItemsFromProgress(progress,nav);
  if(items.length!==buttons.length)return false;

  const groups=buildNavigatorGroups(items);
  if(!groups.length)return false;
  const signature=groups.map(g=>`${g.id}:${g.indexes.join(",")}`).join("|");
  const alreadyBuilt=nav.classList.contains("navigator-grouped") &&
    nav.dataset.groupSignature===signature &&
    nav.querySelectorAll(".question-nav-group").length===groups.length;

  if(alreadyBuilt){
    syncNavigatorGroupState(nav,progress);
    return true;
  }

  const examKey=clean(progress?.examId || progress?.generatedExam?.exam?.id || "exam");
  nav.innerHTML="";
  nav.classList.add("navigator-grouped");
  nav.dataset.groupSignature=signature;

  for(const group of groups){
    const section=document.createElement("section");
    section.className="question-nav-group";
    section.dataset.groupId=group.id;
    section.dataset.indexes=group.indexes.join(",");
    const storeKey=`${examKey}::${group.id}`;
    section.dataset.groupStoreKey=storeKey;

    const toggle=document.createElement("button");
    toggle.type="button";
    toggle.className="question-nav-group-toggle";
    const collapsed=Boolean(navigatorCollapsedGroups.get(storeKey));
    toggle.setAttribute("aria-expanded",String(!collapsed));
    toggle.setAttribute("aria-label",`${collapsed?"Expand":"Collapse"} section ${group.label}`);
    toggle.innerHTML=`
      <span class="question-nav-group-copy">
        <small>TRACK</small>
        <strong>${escapeHtml(group.label)}</strong>
      </span>
      <span class="question-nav-group-count">${group.indexes.length}</span>
      <span class="question-nav-group-chevron" aria-hidden="true">⌄</span>`;
    section.classList.toggle("collapsed",collapsed);

    const grid=document.createElement("div");
    grid.className="question-nav-group-grid";
    group.indexes.forEach(index=>{
      const button=buttons[index];
      if(button)grid.appendChild(button);
    });

    toggle.addEventListener("click",()=>{
      const nextCollapsed=!section.classList.contains("collapsed");
      section.classList.toggle("collapsed",nextCollapsed);
      toggle.setAttribute("aria-expanded",String(!nextCollapsed));
      toggle.setAttribute("aria-label",`${nextCollapsed?"Expand":"Collapse"} section ${group.label}`);
      navigatorCollapsedGroups.set(storeKey,nextCollapsed);
    });

    section.append(toggle,grid);
    nav.appendChild(section);
  }
  syncNavigatorGroupState(nav,progress);
  return true;
}

export function refreshExamContextUi(){
  const view=byId("examView");
  if(!view?.classList.contains("active"))return null;
  const ui=ensureExamContextUi();
  if(!ui)return null;

  const progress=readProgress();
  const model=buildExamContextModel({
    progress,
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
  refreshQuestionNavigatorGroups(progress);
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
