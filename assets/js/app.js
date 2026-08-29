import {
  getStudentName,setStudentName,clearStudentName,getPlayerId,getTheme,setTheme,getResults,saveResult,
  markResultSynced,getBestForExam,getPreviousBestForExam,saveExamProgress,getExamProgress,clearExamProgress,
  getStudyProgress,updateStudyProgress,clearStudyProgress,
  getQuickCheckState,saveQuickCheckState,clearQuickCheckState,
  setLastCourse,getPendingAttempts,queuePendingAttempt,removePendingAttempt,
  getOfficialQbankState,getOfficialTrackState,updateOfficialTrackState,toggleOfficialBookmark,markOfficialReviewed,saveOfficialMistakes
} from "./storage.js";

import {validateExamPayload,calculateResult,formatDuration} from "./exam.js";
import {submitAttemptOnline,getLeaderboard,fetchAttemptsForExamIds} from "./online.js";
import {buildAggregateLeaderboard} from "./ranking-engine.js";
import {validateExamJson,buildRegistryEntry} from "./json-validator.js";
import {validateQuestionBank,buildBankRegistryEntry} from "./bank-validator.js";
import {getBlueprintReadiness,buildExamFromBlueprint} from "./bank-engine.js";
import {evaluateTrackReadiness,finalStatusFromTracks} from "./readiness.js";
import {evaluateCoverageReadiness,topicPerformance} from "./coverage-engine.js";
import {loadOfficialTrack,loadOfficialSection,buildOfficialSectionExam,buildOfficialTrackExam,buildOfficialFinal,officialSectionExamId,officialTrackRandomExamId} from "./official-qbank.js";
import {normalizeStudyText,formatStudyMixedText} from "./study-format.js";
import {renderPythonLessonV2,chartDecisionOptions,chartSvg} from "./python-study-render.js";
import {renderSqlStudySectionHtml} from "./sql-study-render.js";
import {renderTechnicalQuestion,renderTechnicalOption,renderTechnicalRichText,analyzeTechnicalContent,displayTopicForQuestion} from "./technical-content.js";

const state={
  studentName:"",
  registry:[],
  learning:{courses:[]},
  bankRegistry:{banks:[]},
  blueprints:{blueprints:[]},
  curriculumRegistry:{tracks:[]},
  manifests:{},
  syllabusRegistry:{maps:[]},
  syllabusMaps:{},
  coverageRegistry:{blueprints:[]},
  coverageMaps:{},
  selectedCourse:null,
  selectedTrack:null,
  selectedModule:null,
  currentExam:null,
  currentRegistryItem:null,
  answers:{},
  markedQuestions:[],
  currentIndex:0,
  feedbackMode:"instant",
  startedAt:null,
  remainingSeconds:null,
  timerId:null,
  timerPolicy:"none",
  timerSuspendedAt:null,
  studyObserver:null,
  activeStudySectionId:null,
  lastResult:null,
  previousBest:null,
  filter:"All",
  playerId:null,
  rankingExamId:null,
  rankingMode:"junior-overall",
  rankingTrackLevelId:"junior-data-analysis",
  rankingTrackId:"excel",
  rankingRequestId:0,
  lastValidatorRoute:"dashboardView",
  validatorPayload:null,
  validatorRegistryEntry:null,
  officialRegistry:{tracks:[],levels:[]},officialFinalBlueprints:[],
  officialLevelId:"junior-data-analysis",officialTrackId:null,officialSectionId:null,officialQuestions:[],officialFiltered:[],officialIndex:0,
  currentRankedActivity:false,identityContinuation:null
};

const $=id=>document.getElementById(id);
const views=["welcomeView","dashboardView","learnView","studyView","officialQbankView","officialJuniorView","officialTrackView","officialStudyView","examsView","setupView","examView","resultView","reviewView","rankingView","validatorView"];

function initials(name){
  return (name || "Guest").trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join("") || "G";
}

function routeTo(id){
  window.__DIGILIANS_EXAM_ACTIVE__=id==="examView";
  window.dispatchEvent(new CustomEvent("digilians:routechange",{detail:{viewId:id,examActive:id==="examView"}}));

  if(id!=="studyView" && state.studyObserver){
    state.studyObserver.disconnect();
    state.studyObserver=null;
    state.activeStudySectionId=null;
  }
  if(id==="rankingView" && !state.studentName){
    requireRankedIdentity(()=>routeTo("rankingView"),"A saved name is required to view or join ranked leaderboards.");
    return;
  }
  views.forEach(v=>$(v)?.classList.toggle("active",v===id));
  updateNav(id);
  window.scrollTo({top:0,behavior:"smooth"});
  if(id==="dashboardView") renderDashboard();
  if(id==="learnView") renderLearn();
  if(id==="officialQbankView") renderOfficialHub();
  if(id==="officialJuniorView") renderOfficialJuniorHub();
  if(id==="officialTrackView") renderOfficialTrackHub();
  if(id==="examsView") renderExamLibrary($("examSearch")?.value || "");
  if(id==="rankingView"){renderRankedResumeBanner();renderRanking()}
}

function updateNav(viewId){
  const map={dashboardView:"dashboardView",learnView:"learnView",officialQbankView:"officialQbankView",officialJuniorView:"officialQbankView",officialTrackView:"officialQbankView",officialStudyView:"officialQbankView",examsView:"examsView",rankingView:"rankingView"};
  document.querySelectorAll("[data-route]").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.route===map[viewId]);
  });
  document.querySelectorAll(".bottom-nav-item").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.route===map[viewId]);
  });
}

function applyTheme(theme){
  document.documentElement.dataset.theme=theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content",theme==="dark"?"#07101f":"#eef4ff");
  setTheme(theme);
}
$("themeToggle").addEventListener("click",()=>applyTheme((document.documentElement.dataset.theme||"light")==="dark"?"light":"dark"));

document.querySelectorAll("[data-route]").forEach(btn=>btn.addEventListener("click",()=>routeTo(btn.dataset.route)));

$("brandHome").addEventListener("click",e=>{
  e.preventDefault();
  if(state.studentName) routeTo("dashboardView");
  else routeTo("welcomeView");
});

function syncUserUI(){
  const name=state.studentName || "Guest";
  const ini=initials(name);
  ["profileAvatar","drawerAvatar"].forEach(id=>$(id).textContent=ini);
  $("profileName").textContent=name;
  $("drawerName").textContent=name;
  $("rankingLocalName").textContent=name;
}

function closeRankedIdentity(){
  const modal=$("rankedIdentityModal");
  if(!modal)return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
  $("rankedIdentityError").textContent="";
  state.identityContinuation=null;
}
function requireRankedIdentity(continuation,reason="Your name is required before any ranked activity."){
  if(state.studentName){
    continuation?.();
    return true;
  }
  state.identityContinuation=continuation || null;
  $("rankedIdentityReason").textContent=reason;
  $("rankedIdentityName").value="";
  $("rankedIdentityError").textContent="";
  $("rankedIdentityModal").classList.remove("hidden");
  $("rankedIdentityModal").setAttribute("aria-hidden","false");
  setTimeout(()=>$("rankedIdentityName")?.focus(),40);
  return false;
}
function saveRankedIdentity(){
  const name=$("rankedIdentityName").value.trim();
  if(name.length<2){
    $("rankedIdentityError").textContent="Please enter a valid name before continuing.";
    return;
  }
  setStudentName(name);
  state.studentName=name;
  syncUserUI();
  $("returningUserName").textContent=name;
  $("returningUserEntry").classList.remove("hidden");
  $("newUserEntry").classList.add("hidden");
  const continuation=state.identityContinuation;
  $("rankedIdentityModal").classList.add("hidden");
  $("rankedIdentityModal").setAttribute("aria-hidden","true");
  $("rankedIdentityError").textContent="";
  state.identityContinuation=null;
  showToast(`Ranked profile saved: ${name}`);
  continuation?.();
}
$("rankedIdentitySaveBtn")?.addEventListener("click",saveRankedIdentity);
$("rankedIdentityCancelBtn")?.addEventListener("click",closeRankedIdentity);
$("rankedIdentityName")?.addEventListener("keydown",e=>{if(e.key==="Enter")saveRankedIdentity();if(e.key==="Escape")closeRankedIdentity()});
$("rankedIdentityModal")?.addEventListener("click",e=>{if(e.target===$("rankedIdentityModal"))closeRankedIdentity()});

function handleNameSubmit(){
  const name=$("studentName").value.trim();
  if(name.length<2){
    $("nameError").textContent="Please enter a valid name.";
    return;
  }
  $("nameError").textContent="";
  setStudentName(name);
  state.studentName=name;
  syncUserUI();
  showToast(`Welcome, ${name}`);
  routeTo("dashboardView");
}
$("startBtn").addEventListener("click",handleNameSubmit);
$("studentName").addEventListener("keydown",e=>{if(e.key==="Enter")handleNameSubmit()});
$("continueUserBtn").addEventListener("click",()=>routeTo("dashboardView"));

async function loadJson(path){
  const res=await fetch(path,{cache:"no-store"});
  if(!res.ok) throw new Error(`Could not load ${path}`);
  return res.json();
}

async function loadData(){
  const [registry,learning,bankRegistry,blueprints,curriculumRegistry,syllabusRegistry,coverageRegistry,officialRegistry,officialFinalBlueprintRegistry]=await Promise.all([
    loadJson("data/exams.json"),
    loadJson("data/learning.json"),
    loadJson("data/question-banks.json"),
    loadJson("data/exam-blueprints.json"),
    loadJson("data/curriculum.json"),
    loadJson("data/syllabus-maps.json"),
    loadJson("data/coverage-blueprints.json"),
    loadJson("data/official-qbank.json"),
    loadJson("data/official-final-blueprints.json")
  ]);
  state.registry=registry.exams || [];
  state.learning=learning;
  state.bankRegistry=bankRegistry;
  state.blueprints=blueprints;
  state.curriculumRegistry=curriculumRegistry;
  state.syllabusRegistry=syllabusRegistry;
  state.coverageRegistry=coverageRegistry;
  state.officialRegistry=officialRegistry;
  state.officialFinalBlueprints=officialFinalBlueprintRegistry.blueprints || [];
  try{
    const savedMode=localStorage.getItem("digilians_ranking_mode");
    const savedTrackLevel=localStorage.getItem("digilians_ranking_track_level");
    const savedTrack=localStorage.getItem("digilians_ranking_track");
    if(["junior-overall","professional-overall","track","exam"].includes(savedMode))state.rankingMode=savedMode;
    if(savedTrackLevel)state.rankingTrackLevelId=savedTrackLevel;
    if(savedTrack)state.rankingTrackId=savedTrack;
  }catch{}

  const manifests={},syllabusMaps={},coverageMaps={};
  await Promise.all((curriculumRegistry.tracks||[]).map(async item=>{
    try{ manifests[item.trackId]=await loadJson(item.file); }
    catch(e){ console.warn("Could not load curriculum manifest",item.trackId,e); }
  }));
  await Promise.all((syllabusRegistry.maps||[]).map(async item=>{
    try{ syllabusMaps[item.trackId]=await loadJson(item.file); }
    catch(e){ console.warn("Could not load syllabus map",item.trackId,e); }
  }));
  await Promise.all((coverageRegistry.blueprints||[]).map(async item=>{
    try{ coverageMaps[item.id]=await loadJson(item.file); }
    catch(e){ console.warn("Could not load coverage blueprint",item.id,e); }
  }));
  state.manifests=manifests;
  state.syllabusMaps=syllabusMaps;
  state.coverageMaps=coverageMaps;
}

function getUserResults(){
  return getResults().filter(r=>r.studentName===state.studentName);
}
function getStats(){
  const results=getUserResults();
  const completed=new Set(results.map(r=>r.examId)).size;
  const best=results.length?Math.max(...results.map(r=>r.percentage)):null;
  const badges=getAchievements(results);
  return {results,completed,best,attempts:results.length,badges};
}

const achievementDefs=[
  {id:"first-step",icon:"✦",title:"First Step",desc:"Complete your first exam.",test:r=>r.length>=1},
  {id:"club-90",icon:"🏆",title:"90% Club",desc:"Score 90% or higher.",test:r=>r.some(x=>x.percentage>=90)},
  {id:"perfect",icon:"◆",title:"Perfect Score",desc:"Reach 100% on an exam.",test:r=>r.some(x=>x.percentage===100)},
  {id:"five-attempts",icon:"🔥",title:"Momentum",desc:"Complete 5 exam attempts.",test:r=>r.length>=5},
  {id:"comeback",icon:"↗",title:"Comeback",desc:"Improve an exam score by 10% or more.",test:r=>{
    const byExam={};
    for(const x of r){
      byExam[x.examId] ||= [];
      byExam[x.examId].push(x.percentage);
    }
    return Object.values(byExam).some(scores=>scores.some((s,i)=>i>0 && s-Math.max(...scores.slice(0,i))>=10));
  }},
  {id:"speed",icon:"⚡",title:"Speed Solver",desc:"Finish an exam in under 3 minutes with 80%+.",test:r=>r.some(x=>x.timeTakenSeconds<180 && x.percentage>=80)}
];
function getAchievements(results){
  return achievementDefs.map(a=>({...a,unlocked:a.test(results)}));
}

function renderDashboard(){
  if(!state.studentName)return;
  const stats=getStats();
  $("welcomeTitle").textContent=`Welcome back, ${state.studentName}`;
  $("completedCount").textContent=stats.completed;
  $("bestScore").textContent=stats.best===null?"—":`${stats.best}%`;
  $("achievementCount").textContent=stats.badges.filter(b=>b.unlocked).length;
  $("attemptCount").textContent=stats.attempts;

  renderContinueCard();
  if($("officialHomeCount")){
    const officialTotal=(state.officialRegistry.levels||[]).filter(x=>x.available!==false).reduce((sum,x)=>sum+(Number(x.questionCount)||0),0);
    $("officialHomeCount").textContent=officialTotal || state.officialRegistry.totalQuestions || 0;
  }
  renderCourses("homeCourseGrid",true);
  renderHomeExams();
  renderMiniAchievements();
  renderProfile();
}

function activeSavedExamProgress(){
  const progress=getExamProgress();
  return progress && progress.studentName===state.studentName ? progress : null;
}
function effectiveSavedRemaining(progress){
  if(progress?.remainingSeconds===null || progress?.remainingSeconds===undefined)return null;
  let remaining=Math.max(0,Number(progress.remainingSeconds)||0);
  if(progress.timerPolicy==="continuous-ranked" && progress.savedAtEpoch){
    remaining=Math.max(0,remaining-Math.floor((Date.now()-Number(progress.savedAtEpoch))/1000));
  }
  return remaining;
}
function formatResumeRemaining(progress){
  const remaining=effectiveSavedRemaining(progress);
  if(remaining===null)return "No timer";
  const mins=Math.floor(remaining/60),secs=remaining%60;
  return `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")} remaining`;
}
function savedProgressTitle(progress){
  return state.registry.find(x=>x.id===progress.examId)?.title
    || progress.examTitle
    || progress.generatedExam?.exam?.title
    || "Saved Exam";
}
function savedProgressMeta(progress){
  const total=progress.totalQuestions || progress.generatedExam?.questions?.length || 0;
  const answered=Object.keys(progress.answers||{}).length;
  const policy=progress.timerPolicy==="continuous-ranked"
    ?"Ranked timer continues while away"
    :progress.timerPolicy==="paused"
      ?"Timer paused while away"
      :"No timer";
  return `${answered}/${total} answered • ${formatResumeRemaining(progress)} • ${policy}`;
}
function renderExamResumeBanner(){
  const banner=$("examResumeBanner");if(!banner)return;
  const progress=activeSavedExamProgress();
  if(!progress){banner.classList.add("hidden");banner.innerHTML="";return}
  banner.innerHTML=`
    <div class="resume-attempt-icon">↻</div>
    <div class="resume-attempt-copy">
      <span>IN-PROGRESS ATTEMPT</span>
      <strong>${escapeHtml(savedProgressTitle(progress))}</strong>
      <small>${escapeHtml(savedProgressMeta(progress))}</small>
    </div>
    <button class="primary-btn">Resume Exam <span>→</span></button>`;
  banner.querySelector("button").addEventListener("click",()=>resumeProgress(progress));
  banner.classList.remove("hidden");
}
function renderRankedResumeBanner(){
  const banner=$("rankedResumeBanner");if(!banner)return;
  const progress=activeSavedExamProgress();
  if(!progress?.rankedActivity){banner.classList.add("hidden");banner.innerHTML="";return}
  banner.innerHTML=`
    <div class="resume-attempt-icon">↻</div>
    <div class="resume-attempt-copy">
      <span>IN-PROGRESS RANKED ATTEMPT · NOT COUNTED YET</span>
      <strong>${escapeHtml(savedProgressTitle(progress))}</strong>
      <small>${escapeHtml(savedProgressMeta(progress))}. It enters Ranking only after submission.</small>
    </div>
    <button class="primary-btn">Resume Ranked Exam <span>→</span></button>`;
  banner.querySelector("button").addEventListener("click",()=>resumeProgress(progress));
  banner.classList.remove("hidden");
}

function renderContinueCard(){
  const progress=getExamProgress();
  if(progress && progress.studentName===state.studentName){
    const registryItem=state.registry.find(x=>x.id===progress.examId);
    const total=registryItem?.questionCount || progress.totalQuestions || progress.generatedExam?.questions?.length || 1;
    const answered=Object.keys(progress.answers||{}).length;
    const percent=Math.round((answered/total)*100);
    $("continueTitle").textContent=savedProgressTitle(progress);
    $("continueSubtitle").textContent=`Question ${Math.min(total,(progress.currentIndex||0)+1)} of ${total} • ${savedProgressMeta(progress)}`;
    $("continuePercent").textContent=`${percent}%`;
    $("continueAction").innerHTML='Resume Exam <span>→</span>';
    $("continueAction").onclick=()=>resumeProgress(progress);
    return;
  }

  const latest=[...getUserResults()].sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt))[0];
  if(latest){
    const exam=state.registry.find(x=>x.id===latest.examId);
    $("continueTitle").textContent=`Improve ${exam?.title || latest.examTitle || "your personal best"}`;
    $("continueSubtitle").textContent=`Last score: ${latest.percentage}% • Try again and improve your best.`;
    $("continuePercent").textContent=`${latest.percentage}%`;
    $("continueAction").innerHTML='Practice Again <span>→</span>';

    if(latest.officialContext){
      $("continueAction").onclick=()=>{
        const ctx=latest.officialContext;
        state.officialLevelId=ctx.levelId || "junior-data-analysis";
        state.officialTrackId=ctx.trackId || null;
        state.officialSectionId=ctx.sectionId || null;

        if(ctx.kind==="final"){
          requireRankedIdentity(prepareOfficialFinalExam,"Your saved name is required for this ranked Official Final.");
          return;
        }
        if(ctx.kind==="section" && ctx.sectionId){
          requireRankedIdentity(()=>prepareOfficialSection(ctx.sectionId),"Your saved name is required for this ranked section.");
          return;
        }
        if(ctx.kind==="track-random" && ctx.trackId){
          const mode=latest.feedbackMode || (String(latest.examCategory||latest.examTitle||"").toLowerCase().includes("exam")?"exam":"instant");
          requireRankedIdentity(()=>prepareOfficialTrack(mode),"Your saved name is required for this ranked Official QBank attempt.");
          return;
        }
        routeTo("officialJuniorView");
      };
    }else{
      $("continueAction").onclick=()=>exam?prepareExam(exam):routeTo("examsView");
    }
  }else{
    $("continueTitle").textContent="Start your first exam";
    $("continueSubtitle").textContent="Choose a course and begin building your progress.";
    $("continuePercent").textContent="0%";
    $("continueAction").innerHTML='Explore Exams <span>→</span>';
    $("continueAction").onclick=()=>routeTo("examsView");
  }
}


function officialLevelMeta(levelId=state.officialLevelId){
  return (state.officialRegistry.levels||[]).find(x=>x.levelId===levelId)||null;
}
function officialFinalBlueprintForLevel(levelId=state.officialLevelId){
  return (state.officialFinalBlueprints||[]).find(x=>x.levelId===levelId)||null;
}
function officialTracks(){
  return officialLevelMeta()?.tracks || [];
}
function officialTrackMeta(trackId=state.officialTrackId,levelId=state.officialLevelId){
  return (officialLevelMeta(levelId)?.tracks||[]).find(x=>x.trackId===trackId)||null;
}
function officialTrackRevision(trackId=state.officialTrackId,levelId=state.officialLevelId){
  return officialTrackMeta(trackId,levelId)?.sourceRevision || "source-r1";
}
function officialSectionMeta(sectionId=state.officialSectionId){
  return officialTrackMeta()?.sections?.find(x=>x.sectionId===sectionId)||null;
}
function officialReviewedTotal(){
  let total=0;
  for(const meta of officialTracks()){
    const st=getOfficialTrackState(meta.trackId,state.officialLevelId,officialTrackRevision(meta.trackId));
    total+=new Set(st.reviewed||[]).size;
  }
  return total;
}
function renderOfficialHub(){
  const grid=$("officialLevelGrid");if(!grid)return;
  grid.innerHTML="";
  const levels=state.officialRegistry.levels?.length?state.officialRegistry.levels:[
    {levelId:"junior-data-analysis",title:"Junior Data Analysis",description:"Official Junior Data Analysis Ministry Question Bank.",available:true,status:"active",questionCount:state.officialRegistry.totalQuestions||0,tracks:state.officialRegistry.tracks||[]},
    {levelId:"professional-data-analysis",title:"Professional Data Analysis",description:"Official Professional Data Analysis Ministry Question Bank.",available:true,status:"active",questionCount:0,tracks:[]}
  ];
  for(const level of levels){
    const trackCount=level.tracks?.length||0;
    const sectionCount=(level.tracks||[]).reduce((sum,t)=>sum+(t.sections?.length||0),0);
    const card=document.createElement("article");
    card.className=`official-level-card ${level.available?"available":"coming-soon"}`;
    card.innerHTML=`
      <div class="level-card-top">
        <span class="official-source-badge">${level.available?"OFFICIAL":"COMING SOON"}</span>
        <span class="level-status-dot"></span>
      </div>
      <div class="level-icon">${level.levelId.startsWith("junior")?"J":"P"}</div>
      <h3>${escapeHtml(level.title)}</h3>
      <p>${escapeHtml(level.description||"")}</p>
      <div class="level-stats">
        <div><span>Questions</span><strong>${level.questionCount||0}</strong></div>
        <div><span>Tracks</span><strong>${trackCount}</strong></div>
        <div><span>Sections</span><strong>${sectionCount}</strong></div>
      </div>
      <button class="${level.available?"primary-btn":"secondary-btn"} wide" ${level.available?"":"disabled"}>
        ${level.available?"Open Level →":"Level unavailable"}
      </button>`;
    if(level.available){
      card.querySelector("button").addEventListener("click",()=>{
        state.officialLevelId=level.levelId;
        state.officialTrackId=null;state.officialSectionId=null;
        routeTo("officialJuniorView");
      });
    }
    grid.appendChild(card);
  }
}
function renderOfficialJuniorHub(){
  const level=officialLevelMeta();if(!level)return;
  const isJunior=level.levelId==="junior-data-analysis";
  const levelShort=isJunior?"Junior":"Professional";
  $("officialLevelBreadcrumb").textContent=`Official QBank / ${level.title}`;
  $("officialLevelBadge").textContent=levelShort.toUpperCase();
  $("officialLevelEyebrow").textContent=level.title.toUpperCase();
  $("officialLevelTitle").textContent=`Official ${levelShort} Question Bank`;
  $("officialLevelDescription").textContent=isJunior
    ?"Choose a track, then solve each official section separately. Every ranked section keeps its own result, retakes and leaderboard."
    :"Professional is isolated from Junior. Source-preserved sections, progress, retakes and rankings are tracked separately.";
  $("officialLevelQuestionBadge").textContent=`${level.questionCount||0} QUESTIONS`;
  $("officialTrackCountLabel").textContent=level.title;
  $("officialTrackChooserTitle").textContent=`Choose a ${levelShort} question bank`;
  const finalBlueprint=officialFinalBlueprintForLevel(level.levelId);
  $("officialFinalCard").classList.toggle("hidden",!finalBlueprint);
  if(finalBlueprint){
    $("officialFinalEyebrow").textContent=`${levelShort.toUpperCase()} OFFICIAL QBANK FINAL — RANKED`;
    $("officialFinalTitle").textContent=`${finalBlueprint.questionCount} Questions · ${finalBlueprint.timerMinutes} Minutes`;
    $("officialFinalDescription").textContent=`${finalBlueprint.distribution.map(x=>`${x.count} ${x.label}`).join(" · ")}. Platform-generated simulation using official questions; a saved name is required.`;
    $("startOfficialFinalBtn").textContent=`Start ${levelShort} Final →`;
    $("officialLevelOverallRankingBtn").textContent=`${levelShort} Overall Ranking ↗`;
  }
  $("officialTotalQuestions").textContent=level.questionCount||0;
  $("officialTrackCount").textContent=level.tracks?.length||0;
  const sectionCount=(level.tracks||[]).reduce((sum,t)=>sum+(t.sections?.length||0),0);
  $("officialSectionCount").textContent=sectionCount;
  const reviewed=officialReviewedTotal(),total=level.questionCount||1;
  $("officialOverallProgress").textContent=`${Math.round(reviewed/total*100)}%`;

  const colors={excel:'#1f9d63','power-bi':'#d9a51f',sql:'#1caee8',python:'#7c5ce7',tableau:'#4d8fd6',looker:'#7656d6','web-scraping':'#ec7a35','machine-learning':'#d252a0'};
  const grid=$("officialTrackGrid");grid.innerHTML="";
  for(const meta of officialTracks()){
    const st=getOfficialTrackState(meta.trackId,state.officialLevelId,officialTrackRevision(meta.trackId));
    const pct=Math.round(new Set(st.reviewed||[]).size/Math.max(1,meta.questionCount)*100);
    const sectionDone=(meta.sections||[]).filter(s=>getBestForExam(officialSectionExamId(state.officialLevelId,meta.trackId,s.sectionNumber,meta.sourceRevision||"source-r1"),state.studentName)).length;
    const card=document.createElement('button');card.className='official-track-card';
    card.style.setProperty('--track-accent',colors[meta.trackId]||'var(--primary)');
    card.innerHTML=`
      <span class="official-source-badge">OFFICIAL</span>
      <h4>${escapeHtml(meta.track)}</h4>
      <p>${meta.sections?.length||0} sections • ${Object.keys(meta.topics||{}).length} mapped topics</p>
      <div class="official-card-count">${meta.questionCount}</div>
      <div class="official-card-footer"><span>${pct}% studied</span><span>${sectionDone}/${meta.sections?.length||0} ranked sections →</span></div>`;
    card.addEventListener('click',()=>{
      state.officialTrackId=meta.trackId;state.officialSectionId=null;
      routeTo("officialTrackView");
    });
    grid.appendChild(card);
  }
}
function renderOfficialTrackHub(){
  const meta=officialTrackMeta();if(!meta)return;
  $("officialTrackBreadcrumb").textContent=`${officialLevelMeta()?.title || "Data Analysis"} / ${meta.track}`;
  $("officialTrackBackBtn").textContent=`← ${state.officialLevelId==="junior-data-analysis"?"Junior":"Professional"} QBank`;
  $("officialTrackTitle").textContent=meta.track;
  $("officialTrackMeta").textContent=`${meta.questionCount} official questions • ${meta.sections?.length||0} sections • original wording preserved`;
  const st=getOfficialTrackState(meta.trackId,state.officialLevelId,officialTrackRevision(meta.trackId));
  const reviewed=new Set(st.reviewed||[]).size;
  $("officialTrackHubReviewed").textContent=`${reviewed} / ${meta.questionCount}`;
  const completed=(meta.sections||[]).filter(s=>getBestForExam(officialSectionExamId(state.officialLevelId,meta.trackId,s.sectionNumber,meta.sourceRevision||"source-r1"),state.studentName)).length;
  $("officialTrackHubCompleted").textContent=`${completed} / ${meta.sections?.length||0}`;

  const grid=$("officialSectionGrid");grid.innerHTML="";
  for(const section of meta.sections||[]){
    const examId=officialSectionExamId(state.officialLevelId,meta.trackId,section.sectionNumber,meta.sourceRevision||"source-r1");
    const best=state.studentName?getBestForExam(examId,state.studentName):null;
    const attempts=state.studentName?getUserResults().filter(r=>r.examId===examId).length:0;
    const card=document.createElement("article");
    card.className="official-section-card";
    card.innerHTML=`
      <div class="section-card-head">
        <span class="section-number">${String(section.sectionNumber).padStart(2,"0")}</span>
        <span class="official-source-badge">OFFICIAL</span>
      </div>
      <h3>${escapeHtml(section.title)}</h3>
      <p>${section.questionCount} questions • ${escapeHtml(section.questionRange||"")}</p>
      <div class="section-score-strip">
        <div><span>Best</span><strong>${best?`${best.percentage}%`:"—"}</strong></div>
        <div><span>Attempts</span><strong>${attempts}</strong></div>
        <div><span>Status</span><strong>${best?"Completed":"New"}</strong></div>
      </div>
      <div class="section-card-actions">
        <button class="ghost-btn section-study-btn">Study</button>
        <button class="primary-btn section-solve-btn">Solve & Rank →</button>
        <button class="secondary-btn section-rank-btn">Ranking ↗</button>
      </div>`;
    card.querySelector(".section-study-btn").addEventListener("click",()=>openOfficialStudyScope(section.sectionId));
    card.querySelector(".section-solve-btn").addEventListener("click",()=>requireRankedIdentity(()=>prepareOfficialSection(section.sectionId),"Enter your name before solving a ranked Official QBank section."));
    card.querySelector(".section-rank-btn").addEventListener("click",()=>requireRankedIdentity(()=>{
      state.rankingMode="exam";
      state.rankingExamId=examId;
      try{localStorage.setItem("digilians_ranking_mode","exam");localStorage.setItem("digilians_last_ranking_exam_id",examId)}catch{}
      routeTo("rankingView");
    },"Enter your name before opening a section leaderboard."));
    grid.appendChild(card);
  }
}
async function openOfficialStudyScope(sectionId=null){
  const meta=officialTrackMeta();if(!meta)return;
  state.officialSectionId=sectionId;
  if(sectionId){
    state.officialQuestions=await loadOfficialSection(state.officialRegistry,state.officialLevelId,meta.trackId,sectionId,loadJson);
  }else{
    state.officialQuestions=await loadOfficialTrack(state.officialRegistry,meta.trackId,loadJson,state.officialLevelId);
  }
  const st=getOfficialTrackState(meta.trackId,state.officialLevelId,officialTrackRevision(meta.trackId));
  const lastId=st.lastQuestionId;
  const savedIndex=lastId?state.officialQuestions.findIndex(q=>q.id===lastId):-1;
  state.officialIndex=savedIndex>=0?savedIndex:0;

  const section=officialSectionMeta(sectionId);
  const levelShort=state.officialLevelId==="junior-data-analysis"?"Junior":"Professional";
  $("officialStudyBreadcrumb").textContent=section
    ?`Official QBank / ${levelShort} / ${meta.track} / ${section.title}`
    :`Official QBank / ${levelShort} / ${meta.track} / Study All`;
  $("officialStudyTitle").textContent=section?`${meta.track} — ${section.title}`:`${meta.track} Official QBank`;
  $("officialStudyMeta").textContent=section
    ?`${section.questionCount} official questions • ${section.questionRange} • study mode is not ranked`
    :`${meta.questionCount} official questions • original order • study mode is not ranked`;

  $("officialProgressLabel").textContent=section?`${section.title.toUpperCase()} PROGRESS`:"TRACK STUDY PROGRESS";
  $("officialPracticeBtn").textContent=section?"Solve Section & Rank →":"Random Practice 40 →";
  $("officialExamBtn").classList.toggle("hidden",Boolean(section));
  if(!section)$("officialExamBtn").textContent="Random Exam 50 →";

  const topicSelect=$("officialTopicFilter");topicSelect.innerHTML='<option value="all">All topics</option>';
  const topics=[...new Set(state.officialQuestions.map(q=>displayTopicForQuestion(q)))].sort();
  for(const topic of topics){const o=document.createElement('option');o.value=topic;o.textContent=topic;topicSelect.appendChild(o)}
  $("officialSearch").value='';$("officialStateFilter").value='all';
  applyOfficialFilters();routeTo('officialStudyView');
}
function applyOfficialFilters(){
  const query=($("officialSearch")?.value||'').trim().toLowerCase(),topic=$("officialTopicFilter")?.value||'all',kind=$("officialStateFilter")?.value||'all';
  const st=getOfficialTrackState(state.officialTrackId,state.officialLevelId,officialTrackRevision(state.officialTrackId));
  const reviewed=new Set(st.reviewed||[]),bookmarks=new Set(st.bookmarks||[]),mistakes=new Set(st.mistakes||[]);
  state.officialFiltered=state.officialQuestions.filter(q=>{
    if(query && !(`${q.question} ${q.options.map(o=>o.text).join(' ')}`).toLowerCase().includes(query))return false;
    if(topic!=='all' && displayTopicForQuestion(q)!==topic)return false;
    if(kind==='unseen' && reviewed.has(q.id))return false;
    if(kind==='reviewed'&&!reviewed.has(q.id))return false;
    if(kind==='bookmarks'&&!bookmarks.has(q.id))return false;
    if(kind==='mistakes'&&!mistakes.has(q.id))return false;
    return true;
  });
  if(!state.officialFiltered.length){state.officialIndex=0;renderOfficialQuestionList();renderOfficialEmpty();return}
  const currentId=state.officialQuestions[state.officialIndex]?.id;
  let idx=state.officialFiltered.findIndex(q=>q.id===currentId);if(idx<0)idx=0;
  state.officialIndex=state.officialQuestions.findIndex(q=>q.id===state.officialFiltered[idx].id);
  renderOfficialQuestionList();renderOfficialStudyQuestion();
}
function renderOfficialEmpty(){
  $("officialQuestionText").textContent='No questions match the current filters.';
  $("officialOptions").innerHTML='';$("officialAnswerBox").classList.add('hidden');$("officialSourceLine").textContent='';
}
function renderOfficialQuestionList(){
  const list=$("officialQuestionList");if(!list)return;list.innerHTML='';
  const st=getOfficialTrackState(state.officialTrackId,state.officialLevelId,officialTrackRevision(state.officialTrackId)),rev=new Set(st.reviewed||[]),bm=new Set(st.bookmarks||[]);
  const visible=state.officialFiltered.length?state.officialFiltered:[];
  for(const q of visible){
    const btn=document.createElement('button');btn.className='official-qnum';btn.textContent=q.originalOrder;
    if(q.id===state.officialQuestions[state.officialIndex]?.id)btn.classList.add('current');
    if(rev.has(q.id))btn.classList.add('reviewed');if(bm.has(q.id))btn.classList.add('bookmarked');
    btn.addEventListener('click',()=>{state.officialIndex=state.officialQuestions.findIndex(x=>x.id===q.id);renderOfficialQuestionList();renderOfficialStudyQuestion()});
    list.appendChild(btn);
  }
}
function officialVisibleQuestions(){return state.officialFiltered.length?state.officialFiltered:state.officialQuestions}
function officialVisiblePosition(){
  const currentId=state.officialQuestions[state.officialIndex]?.id;
  return officialVisibleQuestions().findIndex(q=>q.id===currentId);
}
function renderOfficialAnswerBox(q,selected=null,revealOnly=false){
  const correct=q.options.find(o=>o.id===q.correctAnswer);
  const selectedOption=q.options.find(o=>o.id===selected);
  const box=$("officialAnswerBox");
  const deep=q.deepExplanation || null;
  let heading=`Official Answer: ${escapeHtml(q.correctAnswer)}`;
  let statusClass="official-answer-neutral";
  let verdict="";
  if(selected){
    const isCorrect=selected===q.correctAnswer;
    heading=isCorrect?`Correct ✓ — Official Answer: ${escapeHtml(q.correctAnswer)}`:`Incorrect ✕ — Official Answer: ${escapeHtml(q.correctAnswer)}`;
    statusClass=isCorrect?"official-answer-correct":"official-answer-wrong";
    const exactReason=deep?.options?.[selected];
    if(isCorrect){
      verdict=`<div class="official-arabic-verdict correct-note"><strong>ليه إجابتك صح؟</strong><p>${renderTechnicalRichText(exactReason || "اختيارك يطابق الإجابة الرسمية المنشورة.",q)}</p></div>`;
    }else{
      verdict=`<div class="official-arabic-verdict wrong-note"><strong>ليه إجابتك غلط؟</strong><p><b>اختيارك ${escapeHtml(selected)}:</b> ${renderTechnicalRichText(exactReason || selectedOption?.text || "",q)}</p></div>`;
    }
  }
  let explanationHtml="";
  if(deep){
    explanationHtml=`<div class="official-ai-explanation deep"><span class="official-ai-label">DETAILED EXPLANATION — ARABIC</span><p dir="rtl">${renderTechnicalRichText(deep.summary,q)}</p>
      <details class="official-option-analysis" open><summary>تحليل كل الاختيارات A / B / C / D</summary><div class="official-option-analysis-grid">
      ${q.options.map(o=>{const isCorrect=o.id===q.correctAnswer;return `<div class="official-option-reason ${isCorrect?"is-correct":"is-wrong"}"><div class="reason-head"><span>${o.id}</span><strong>${isCorrect?"✓ صح":"✕ غلط"}</strong></div><p dir="rtl">${renderTechnicalRichText(deep.options?.[o.id] || "",q)}</p></div>`}).join("")}
      </div></details></div>`;
  }else{
    const aiAr=q.aiExplanation?.ar || "الشرح التفصيلي لهذا السؤال لم يتم إضافته بعد.";
    explanationHtml=`<div class="official-ai-explanation"><span class="official-ai-label">AI EXPLANATION — ARABIC</span><p dir="rtl">${renderTechnicalRichText(aiAr,q)}</p><small class="deep-pilot-note">الشرح Option-by-Option قيد الإضافة لهذا الجزء من البنك.</small></div>`;
  }
  box.className=`official-answer-box ${statusClass}`;
  box.innerHTML=`<strong>${heading}</strong>
    <div class="official-answer-text">${renderTechnicalOption(correct?.text||"",q)}</div>
    ${verdict}${explanationHtml}
    <small>الإجابة أعلاه من المصدر الرسمي. الشرح التفصيلي العربي إضافة تعليمية من Digilians E-Learn وليس جزءًا من ملف الوزارة.</small>`;
}

function answerOfficialQuestion(q,optionId){
  const st=getOfficialTrackState(state.officialTrackId,state.officialLevelId,officialTrackRevision(state.officialTrackId));
  const answers={...(st.answers||{})};if(answers[q.id])return;
  answers[q.id]=optionId;
  const reviewed=new Set(st.reviewed||[]),mistakes=new Set(st.mistakes||[]);
  reviewed.add(q.id);if(optionId!==q.correctAnswer)mistakes.add(q.id);
  updateOfficialTrackState(state.officialTrackId,{answers,reviewed:[...reviewed],mistakes:[...mistakes],lastIndex:state.officialIndex,lastQuestionId:q.id},state.officialLevelId,officialTrackRevision());
  renderOfficialQuestionList();renderOfficialStudyQuestion();
}
function renderOfficialStudyQuestion(){
  const q=state.officialQuestions[state.officialIndex];if(!q)return renderOfficialEmpty();
  const st=getOfficialTrackState(state.officialTrackId,state.officialLevelId,officialTrackRevision(state.officialTrackId));
  const bm=new Set(st.bookmarks||[]),selected=st.answers?.[q.id]||null;
  {
    const displayTopic=displayTopicForQuestion(q);
    $("officialQuestionTopic").textContent=displayTopic;
    const inferred=displayTopic!==(q.topic||"");
    $("officialQuestionTopic").dataset.topicInferred=inferred?"true":"false";
    $("officialQuestionTopic").title=inferred?`Display classification: ${displayTopic} • stored metadata: ${q.topic||"General"}`:"";
  }
  $("officialSourceLine").textContent=`Source: ${q.officialSource.file} • Page ${q.officialSource.page}${q.originalQuestionNumber?` • Original Q${q.originalQuestionNumber}`:''} • Set ${q.officialSet}`;
  const officialTechnical=analyzeTechnicalContent(q.question,q);
  $("officialQuestionText").innerHTML=renderTechnicalQuestion(q.question,q);
  $("officialQuestionText").classList.toggle("has-code-question",officialTechnical.hasCode);
  const opts=$("officialOptions");opts.innerHTML="";
  if(q.integrityStatus==="source-parse-review-required"){
    const warn=document.createElement("div");
    warn.className="official-integrity-warning";
    warn.innerHTML="<strong>Source parsing review required</strong><span>This official item was merged with following source text during extraction. It remains visible for source completeness but is temporarily excluded from ranked exams until reparsed.</span>";
    opts.appendChild(warn);
  }
  for(const o of q.options){
    const btn=document.createElement("button");btn.type="button";btn.className="official-option";
    const letter=document.createElement("span");letter.className="option-letter";letter.textContent=o.id;
    const text=document.createElement("span");text.className="option-content";text.innerHTML=renderTechnicalOption(o.text,q);btn.append(letter,text);
    if(selected){btn.classList.add("locked");if(o.id===selected)btn.classList.add("selected");if(o.id===q.correctAnswer)btn.classList.add("correct");if(o.id===selected&&selected!==q.correctAnswer)btn.classList.add("wrong")}
    btn.addEventListener("click",()=>answerOfficialQuestion(q,o.id));opts.appendChild(btn);
  }
  if(selected)renderOfficialAnswerBox(q,selected,false);else{$("officialAnswerBox").className="official-answer-box hidden";$("officialAnswerBox").innerHTML=""}
  $("officialShowAnswerBtn").textContent=selected?"Official Answer Shown":"Show Official Answer";
  $("officialBookmarkBtn").classList.toggle("active",bm.has(q.id));$("officialBookmarkBtn").textContent=bm.has(q.id)?"★":"☆";
  const pos=officialVisiblePosition(),visible=officialVisibleQuestions();
  $("officialPrevBtn").disabled=pos<=0;$("officialNextBtn").disabled=pos<0||pos>=visible.length-1;
  updateOfficialProgress();
}
function updateOfficialProgress(){
  const st=getOfficialTrackState(state.officialTrackId,state.officialLevelId,officialTrackRevision(state.officialTrackId));
  const reviewedSet=new Set(st.reviewed||[]);
  const scopeIds=new Set(state.officialQuestions.map(q=>q.id));
  const reviewed=[...reviewedSet].filter(id=>scopeIds.has(id)).length;
  const total=Math.max(1,state.officialQuestions.length);
  const pct=Math.round(reviewed/total*100);
  $("officialTrackProgress").textContent=`${pct}%`;$("officialTrackProgressFill").style.width=`${pct}%`;
  $("officialReviewedCount").textContent=`${reviewed} of ${state.officialQuestions.length} reviewed`;
}
function moveOfficial(delta){
  const visible=officialVisibleQuestions();if(!visible.length)return;
  let pos=officialVisiblePosition();if(pos<0)pos=0;
  const nextPos=Math.max(0,Math.min(visible.length-1,pos+delta)),target=visible[nextPos];
  const next=state.officialQuestions.findIndex(q=>q.id===target.id);if(next<0)return;
  state.officialIndex=next;
  updateOfficialTrackState(state.officialTrackId,{lastIndex:next,lastQuestionId:target.id},state.officialLevelId,officialTrackRevision());
  renderOfficialQuestionList();renderOfficialStudyQuestion();
}
async function prepareOfficialSection(sectionId=state.officialSectionId){
  const meta=officialTrackMeta();const section=(meta?.sections||[]).find(x=>x.sectionId===sectionId);if(!meta||!section)return;
  const questions=await loadOfficialSection(state.officialRegistry,state.officialLevelId,meta.trackId,section.sectionId,loadJson);
  const payload=buildOfficialSectionExam({levelId:state.officialLevelId,trackId:meta.trackId,track:meta.track,section,questions,sourceRevision:meta.sourceRevision||"source-r1"});
  const item={id:payload.exam.id,title:payload.exam.title,course:'Data Analysis',module:meta.track,questionCount:payload.questions.length,generator:'official-qbank',ranked:true};
  state.officialSectionId=section.sectionId;
  configureExamSetup(payload,item,'instant');
}
async function prepareOfficialTrack(mode){
  const meta=officialTrackMeta();if(!meta)return;
  const questions=await loadOfficialTrack(state.officialRegistry,meta.trackId,loadJson,state.officialLevelId);
  const payload=buildOfficialTrackExam({levelId:state.officialLevelId,trackId:meta.trackId,track:meta.track,title:`${meta.track} - Official Ministry QBank ${mode==='instant'?'Practice':'Exam'}`,questions,count:mode==='instant'?40:50,feedbackModes:[mode],timerMinutes:mode==='exam'?60:null,category:mode==='instant'?'Official Practice':'Official Exam',sourceRevision:meta.sourceRevision||'source-r1'});
  const item={id:payload.exam.id,title:payload.exam.title,course:'Data Analysis',module:meta.track,questionCount:payload.questions.length,generator:'official-qbank',ranked:true};
  configureExamSetup(payload,item,mode);
}
async function prepareOfficialFinalExam(){
  const blueprint=officialFinalBlueprintForLevel();
  if(!blueprint){showToast("No final blueprint is active for this level yet.");return}
  const payload=await buildOfficialFinal({registry:state.officialRegistry,blueprint,loadJson});
  const level=officialLevelMeta();
  const item={id:payload.exam.id,title:payload.exam.title,course:'Data Analysis',module:`${level?.title||"Official QBank"} Final`,questionCount:payload.questions.length,generator:'official-qbank',ranked:true};
  configureExamSetup(payload,item,'exam');
}

function renderCourses(targetId,compact=false){
  const target=$(targetId); if(!target)return;
  target.innerHTML="";
  state.learning.courses.forEach(course=>{
    const moduleCount=course.modules.length;
    const trackCount=Array.isArray(course.tracks)?course.tracks.length:0;
    const countLabel=trackCount?`${trackCount} track${trackCount===1?"":"s"}`:(moduleCount?`${moduleCount} module${moduleCount===1?"":"s"}`:"Coming soon");
    const card=document.createElement("button");
    card.className="course-card";
    card.style.setProperty("--course-accent",course.accent || "var(--primary)");
    card.innerHTML=`
      <div class="course-icon">${course.icon || course.title[0]}</div>
      <h4>${course.title}</h4>
      <p>${course.description}</p>
      <div class="course-footer"><span>${countLabel}</span><span class="course-arrow">→</span></div>
    `;
    card.addEventListener("click",()=>openCourse(course));
    target.appendChild(card);
  });
}

function openCourse(course){
  state.selectedCourse=course;
  state.selectedTrack=null;
  state.selectedModule=null;
  setLastCourse(course.id);
  routeTo("learnView");

  if(Array.isArray(course.tracks) && course.tracks.length){
    renderTrackPanel(course);
  }else{
    renderModulePanel(course,null);
  }
}

function renderLearn(){
  renderCourses("learnCourseGrid");

  if(state.selectedCourse){
    if(Array.isArray(state.selectedCourse.tracks) && state.selectedCourse.tracks.length){
      renderTrackPanel(state.selectedCourse);
    }else{
      renderModulePanel(state.selectedCourse,null);
    }
  }
}

function statusLabel(status){
  if(status==="final-ready") return "FINAL READY";
  if(status==="content-complete-bank-building") return "CONTENT COMPLETE — BANK BUILDING";
  return "IN PROGRESS";
}
function statusClass(status){
  if(status==="final-ready") return "status-final-ready";
  if(status==="content-complete-bank-building") return "status-bank-building";
  return "status-in-progress";
}
function trackFinalCount(trackId){
  const bp=getBlueprint("data-analysis-final-v1");
  return bp?.tracks?.find(t=>t.trackId===trackId)?.count || 0;
}
function getTrackReadiness(trackId){
  const manifest=state.manifests[trackId];
  const bp=getBlueprint("data-analysis-final-v1");
  if(!manifest || !bp)return null;
  const finalCount=trackFinalCount(trackId);
  if(!finalCount)return null;
  return evaluateTrackReadiness({
    manifest,
    bankRegistry:state.bankRegistry,
    finalCount,
    difficultyTarget:bp.difficultyTarget,
    sourceTarget:bp.sourceTarget
  });
}
function getFinalCoverageForTrack(trackId){
  const meta=(state.coverageRegistry.blueprints||[]).find(x=>x.trackId===trackId && x.examKind==="final-share");
  return meta?state.coverageMaps[meta.id]:null;
}

async function loadQuestionsForTrack(trackId){
  const banks=(state.bankRegistry.banks||[]).filter(b=>b.trackId===trackId && b.status==="active" && b.file);
  const all=[];
  for(const bank of banks){
    try{
      const payload=await loadJson(bank.file);
      all.push(...(payload.questions||[]));
    }catch(e){ console.warn("Could not load bank for coverage",bank.id,e); }
  }
  return all;
}

async function renderCoverageStatus(course){
  const panel=$("coverageStatusPanel");
  if(!panel)return;
  if(course.id!=="data-analysis"){
    panel.classList.add("hidden");panel.innerHTML="";return;
  }

  const trackId=state.selectedTrack?.id || "sql";
  const syllabus=state.syllabusMaps[trackId];
  const coverage=getFinalCoverageForTrack(trackId);
  if(!syllabus){
    panel.classList.add("hidden");panel.innerHTML="";return;
  }

  const questions=await loadQuestionsForTrack(trackId);
  const readiness=evaluateCoverageReadiness({syllabus,coverage,questions});
  const title=state.selectedTrack?.title || syllabus.track;
  const configured=coverage?.topics?.length || 0;

  panel.innerHTML=`
    <div class="coverage-status-head">
      <div>
        <span class="eyebrow">SYLLABUS MAP & COVERAGE</span>
        <h4>${title}</h4>
        <p>${syllabus.topics.length} major topic${syllabus.topics.length===1?"":"s"} mapped • ${configured} topic${configured===1?"":"s"} configured for Final coverage.</p>
      </div>
      <span class="pool-chip ${readiness.ready?"ready":"building"}">${readiness.ready?"COVERAGE READY":"COVERAGE BUILDING"}</span>
    </div>

    <div class="coverage-topic-grid">
      ${(syllabus.topics||[]).map(topic=>{
        const spec=coverage?.topics?.find(x=>x.topicId===topic.id);
        const available=questions.filter(q=>q.topicId===topic.id && q.finalEligible!==false).length;
        const target=spec?.target || 0;
        const ratio=target?Math.min(100,Math.round(available/target*100)):0;
        return `<article class="coverage-topic-card">
          <strong>${topic.title}</strong>
          <span>${topic.importance.toUpperCase()}</span>
          <small>${topic.subtopics?.length||0} subtopics • ${available} eligible questions${target?` • target ${target}`:""}</small>
          <div class="coverage-bar"><i style="width:${ratio}%"></i></div>
        </article>`;
      }).join("") || `<article class="coverage-topic-card"><strong>No topics mapped yet</strong><small>Topics will appear here as material is processed.</small></article>`}
    </div>
  `;
  panel.classList.remove("hidden");
}

function renderCurriculumStatus(course){
  const panel=$("curriculumStatusPanel");
  if(!panel)return;
  if(course.id!=="data-analysis"){
    panel.classList.add("hidden");panel.innerHTML="";return;
  }

  const required=(state.curriculumRegistry.tracks||[]).filter(x=>x.requiredForFinal);
  const statuses=required.map(meta=>({
    ...meta,
    readiness:getTrackReadiness(meta.trackId)
  }));
  const finalState=finalStatusFromTracks(statuses);

  panel.innerHTML=`
    <div class="curriculum-status-head">
      <div>
        <span class="eyebrow">CURRICULUM READINESS</span>
        <h4>Data Analysis Final Coverage</h4>
        <p>The system separates curriculum completion from question-bank readiness.</p>
      </div>
      <span class="pool-chip ${finalState.ready?"ready":"building"}">${finalState.ready?"FINAL READY":`${finalState.readyTracks}/${finalState.totalTracks} READY`}</span>
    </div>

    <div class="curriculum-status-grid">
      ${statuses.map(item=>{
        const r=item.readiness;
        const manifest=state.manifests[item.trackId];
        const srcCount=manifest?.processedSources?.length || 0;
        const topicCount=manifest?.topics?.length || 0;
        const status=r?.status || "in-progress";
        const detail=r?.missing?.[0] || "Ready";
        return `<article class="curriculum-status-card">
          <strong>${item.track}</strong>
          <span class="${statusClass(status)}"><i class="status-dot"></i>${statusLabel(status)}</span>
          <small>${srcCount} source${srcCount===1?"":"s"} processed • ${topicCount} mapped topic${topicCount===1?"":"s"}</small>
          <div class="readiness-checks">
            <div class="readiness-check ${r?.checks?.curriculumComplete?"ok":"bad"}">✓ Curriculum</div>
            <div class="readiness-check ${r?.checks?.validActiveBanks?"ok":"bad"}">✓ Bank</div>
            <div class="readiness-check ${r?.checks?.enoughHard?"ok":"bad"}">✓ Hard pool</div>
            <div class="readiness-check ${r?.checks?.enoughExternal?"ok":"bad"}">✓ External pool</div>
          </div>
          <small>${detail}</small>
        </article>`;
      }).join("")}
    </div>

    <div class="curriculum-summary-line">
      The Final Exam unlocks only when all 6 required tracks are curriculum-complete and their banks satisfy the configured coverage, difficulty and source quotas.
    </div>`;
  panel.classList.remove("hidden");
}

function trackCardSummary(track){
  const summaries={
    excel:"Spreadsheets, formulas, analysis workflows and dashboards.",
    sql:"SQL querying, relational databases, joins, subqueries and analytical workflows.",
    python:"Python foundations, NumPy, Pandas and data visualization.",
    "power-bi":"Data modeling, reports, dashboards and business intelligence.",
    statistics:"Descriptive statistics and analytical foundations.",
    tableau:"Visual analytics, dashboards, actions and filters.",
    looker:"Reporting, calculated fields, blending and dashboard design."
  };
  return summaries[track.id] || track.description || "";
}
function trackCardMeta(track){
  const stats=track.productionStats || {};
  if(stats.status==="FINAL READY"){
    const sessions=stats.sessions ?? track.modules?.length ?? 0;
    const questions=stats.questions ?? 0;
    return {
      ready:true,
      primary:`${sessions} Session${sessions===1?"":"s"}`,
      secondary:questions?`${questions} Questions`:"Production Ready",
      status:"Final Ready"
    };
  }
  if(track.modules?.length){
    return {
      ready:false,
      primary:`${track.modules.length} Module${track.modules.length===1?"":"s"}`,
      secondary:"In progress",
      status:"Building"
    };
  }
  return {ready:false,primary:"Coming soon",secondary:"",status:"Coming Soon"};
}

function renderTrackPanel(course){
  const panel=$("trackPanel");
  const modulePanel=$("modulePanel");
  modulePanel.classList.add("hidden");

  $("trackBreadcrumb").textContent=`Learn / ${course.title}`;
  $("trackPanelTitle").textContent=`${course.title} Tracks`;
  $("trackPanelDescription").textContent="Choose a track, then open one of its modules.";

  const grid=$("trackGrid");
  grid.innerHTML="";

  course.tracks.forEach(track=>{
    const meta=trackCardMeta(track);
    const card=document.createElement("button");
    card.className=`track-card ${meta.ready?"track-ready":"track-building"}`;
    card.style.setProperty("--track-accent",track.accent || "var(--primary)");
    card.innerHTML=`
      <div class="track-card-head">
        <div class="track-icon">${escapeHtml(track.icon || track.title[0])}</div>
        <span class="track-status-chip ${meta.ready?"ready":"building"}">${escapeHtml(meta.status)}</span>
      </div>

      <div class="track-card-body">
        <h4>${escapeHtml(track.title)}</h4>
        <p>${escapeHtml(trackCardSummary(track))}</p>
      </div>

      <div class="track-footer">
        <div class="track-footer-meta">
          <strong>${escapeHtml(meta.primary)}</strong>
          ${meta.secondary?`<span>•</span><strong>${escapeHtml(meta.secondary)}</strong>`:""}
        </div>
        <span class="track-arrow">→</span>
      </div>
    `;
    card.addEventListener("click",()=>openTrack(course,track));
    grid.appendChild(card);
  });

  renderCurriculumStatus(course);
  renderCoverageStatus(course);
  renderCourseFinalExamSlot(course);
  const diagnostics=$("adminDiagnosticsPanel");
  if(diagnostics){
    diagnostics.classList.toggle("hidden",course.id!=="data-analysis");
    diagnostics.open=false;
  }
  panel.classList.remove("hidden");
  panel.scrollIntoView({behavior:"smooth",block:"start"});
}

function getBlueprint(id){
  return state.blueprints.blueprints?.find(b=>b.id===id) || null;
}

function readinessShortText(readiness){
  const missing=readiness.tracks.filter(t=>!t.ready);
  if(!missing.length) return "All six subject pools are ready.";
  const first=missing[0];
  return `${first.label}: ${first.shortages.slice(0,2).join(", ")}${missing.length>1?` • +${missing.length-1} track${missing.length-1===1?"":"s"} still building`:""}`;
}

function renderCourseFinalExamSlot(course){
  const slot=$("courseFinalExamSlot");
  if(!slot)return;
  slot.innerHTML="";
  if(!course.finalExamBlueprintId)return;

  const blueprint=getBlueprint(course.finalExamBlueprintId);
  if(!blueprint)return;

  const poolReadiness=getBlueprintReadiness(state.bankRegistry,blueprint);
  const required=(state.curriculumRegistry.tracks||[]).filter(x=>x.requiredForFinal);
  const trackStatuses=required.map(meta=>({...meta,readiness:getTrackReadiness(meta.trackId)}));
  const curriculumFinal=finalStatusFromTracks(trackStatuses);
  const readyTracks=trackStatuses.filter(x=>x.readiness?.status==="final-ready").length;
  const totalTracks=trackStatuses.length;
  const ready=poolReadiness.ready && curriculumFinal.ready;
  const pct=totalTracks?Math.round((readyTracks/totalTracks)*100):0;

  const wrapper=document.createElement("article");
  wrapper.className="course-final-card learner-final-card";
  wrapper.innerHTML=`
    <div class="course-final-head">
      <div>
        <span class="eyebrow">FINAL EXAM</span>
        <h4>${escapeHtml(blueprint.title)}</h4>
        <p>${escapeHtml(blueprint.description)}</p>
      </div>
      <span class="pool-chip ${ready?"ready":"building"}">${ready?"FINAL READY":"COMING SOON"}</span>
    </div>

    <div class="final-meta-grid">
      <div><span>QUESTIONS</span><strong>${blueprint.questionCount}</strong></div>
      <div><span>TIME</span><strong>${blueprint.timerMinutes} min</strong></div>
      <div><span>TRACKS READY</span><strong>${readyTracks}/${totalTracks}</strong></div>
    </div>

    <div class="final-readiness">
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <strong>${ready?`Ready to start`:`${readyTracks}/${totalTracks} required tracks ready`}</strong>
    </div>
    <div class="readiness-detail">${ready
      ?"All required learning tracks are ready for the comprehensive Final Exam."
      :"The Final Exam will unlock when the required learning tracks are ready. Technical pool diagnostics are available in Platform Diagnostics below."}</div>
    <button class="primary-btn wide" ${ready?"":"disabled"}>
      ${ready?"Start Final Exam →":"Final Exam Not Available Yet"}
    </button>
  `;
  wrapper.querySelector("button").addEventListener("click",()=>{
    if(!ready)return;
    const item=state.registry.find(x=>x.blueprintId===blueprint.id);
    if(item)prepareExam(item);
  });
  slot.appendChild(wrapper);
}

function openTrack(course,track){
  state.selectedCourse=course;
  state.selectedTrack=track;
  state.selectedModule=null;
  renderCoverageStatus(course);
  renderModulePanel(course,track);
}

function renderTrackLearningMap(track){
  const panel=$("trackLearningMapPanel");
  if(!panel)return;
  if(!track){
    panel.classList.add("hidden");
    panel.innerHTML="";
    return;
  }

  const syllabus=state.syllabusMaps?.[track.id];
  const topics=syllabus?.topics || [];
  const stats=track.productionStats || {};
  const sessions=stats.sessions ?? track.modules?.length ?? 0;
  const questions=stats.questions ?? 0;
  const ready=stats.status==="FINAL READY";
  const topicCount=topics.length || new Set((track.modules||[]).flatMap(m=>(m.study?.sections||[]).map(s=>s.id))).size;

  const sqlGroups=[
    "Database Fundamentals & Modeling",
    "ERD & Relational Mapping",
    "Normalization & Constraints",
    "SQL Commands & CRUD",
    "SELECT, Filtering & Sorting",
    "Aggregation & SQL Functions",
    "Joins & Subqueries",
    "Set Operations",
    "Window Functions & CTEs",
    "Pivoting & Reporting",
    "Views & Stored Procedures",
    "Control Flow & Error Handling"
  ];

  const learningItems=track.id==="sql"
    ?sqlGroups
    :topics.slice(0,12).map(t=>t.title);

  panel.innerHTML=`
    <div class="track-learning-map-head">
      <div>
        <span class="eyebrow">COURSE MAP</span>
        <h4>${escapeHtml(track.title)}</h4>
        <p>What you'll learn and where you are going — without exam-production diagnostics.</p>
      </div>
      <span class="track-status-chip ${ready?"ready":"building"}">${ready?"FINAL READY":"IN PROGRESS"}</span>
    </div>

    <div class="track-learning-stats">
      <div><span>SESSIONS</span><strong>${sessions}</strong></div>
      <div><span>TOPICS</span><strong>${topicCount}</strong></div>
      <div><span>PRACTICE QUESTIONS</span><strong>${questions||"—"}</strong></div>
      <div><span>STATUS</span><strong>${ready?"Ready":"Building"}</strong></div>
    </div>

    <div class="track-learning-topics">
      <span class="eyebrow">WHAT YOU'LL LEARN</span>
      <div>${learningItems.map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>
    </div>
  `;
  panel.classList.remove("hidden");
}

function renderModulePanel(course,track=null){
  const trackPanel=$("trackPanel");
  const panel=$("modulePanel");
  const modules=track ? (track.modules || []) : (course.modules || []);
  renderTrackLearningMap(track);

  if(track){
    $("moduleBreadcrumb").textContent=`Learn / ${course.title} / ${track.title}`;
  }else{
    $("moduleBreadcrumb").textContent=`Learn / ${course.title}`;
  }

  if(!modules.length){
    panel.classList.remove("hidden");
    $("modulePanelTitle").textContent=`${track?.title || course.title} modules are coming next`;
    $("modulePanelDescription").textContent="This track is already part of the platform structure. New modules will appear here as soon as you add their material.";
    panel.querySelector(".learning-flow").classList.add("hidden");

    const oldList=panel.querySelector(".module-list");
    if(oldList)oldList.remove();

    panel.scrollIntoView({behavior:"smooth",block:"start"});
    return;
  }

  panel.querySelector(".learning-flow").classList.remove("hidden");

  let list=panel.querySelector(".module-list");
  if(!list){
    list=document.createElement("div");
    list.className="module-list";
    panel.querySelector(".module-panel-head").insertAdjacentElement("afterend",list);
  }

  function bestResultForFeedbackMode(examId,mode){
    return getUserResults()
      .filter(x=>x.examId===examId && x.feedbackMode===mode)
      .sort((a,b)=>b.percentage-a.percentage || a.timeTakenSeconds-b.timeTakenSeconds)[0] || null;
  }
  function studyPercentForModule(module){
    const total=module?.study?.sections?.length || 0;
    if(!total || !state.studentName)return 0;
    const saved=getStudyProgress(state.studentName,module.id);
    const valid=new Set((module.study.sections||[]).map((s,i)=>s.id||`section-${i}`));
    const completed=(saved.completedSections||[]).filter(id=>valid.has(id)).length;
    return Math.round(completed/total*100);
  }
  function updateModuleLearningStats(module){
    const studyPct=studyPercentForModule(module);
    const practice=bestResultForFeedbackMode(module?.examId,"instant");
    const exam=bestResultForFeedbackMode(module?.examId,"exam");

    if($("studyFlowStatus")){
      $("studyFlowStatus").textContent=studyPct>=100?"Completed 100%":studyPct?`${studyPct}% completed`:"Not started";
      $("studyFlowStatus").classList.toggle("complete",studyPct>=100);
    }
    if($("practiceFlowStatus")){
      $("practiceFlowStatus").textContent=practice?`Best ${practice.percentage}%`:"Not attempted";
      $("practiceFlowStatus").classList.toggle("complete",Boolean(practice));
    }
    if($("examFlowStatus")){
      $("examFlowStatus").textContent=exam?`Best ${exam.percentage}%`:"Not attempted";
      $("examFlowStatus").classList.toggle("complete",Boolean(exam));
    }

    if($("openStudyBtn")){
      $("openStudyBtn").innerHTML=studyPct>=100
        ?'Review Study <span>→</span>'
        :studyPct
          ?`Continue Study · ${studyPct}% <span>→</span>`
          :'Start Study <span>→</span>';
    }
  }

  function updateSelectedModuleUI(module,row,{scrollToPath=false}={}){
    state.selectedModule=module;

    list.querySelectorAll(".module-row:not(.track-exam-row)").forEach(item=>{
      const selected=item===row;
      item.classList.toggle("selected",selected);
      item.setAttribute("aria-pressed",selected?"true":"false");
    });

    $("modulePanelTitle").textContent=module.title;
    $("modulePanelDescription").textContent=module.description || "";

    const moduleName=$("selectedModuleName");
    const moduleHint=$("selectedModuleHint");
    if(moduleName)moduleName.textContent=module.title;
    if(moduleHint)moduleHint.textContent="Next: Study the material, practice with feedback, then take the session exam.";
    syncLearningFlowStats(module);

    const flow=$("moduleLearningFlow");
    if(flow)flow.classList.remove("hidden");

    if(scrollToPath && flow){
      const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
      window.requestAnimationFrame(()=>{
        flow.scrollIntoView({behavior:reduceMotion?"auto":"smooth",block:"start"});
        flow.classList.remove("selection-focus");
        void flow.offsetWidth;
        flow.classList.add("selection-focus");
        window.setTimeout(()=>flow.classList.remove("selection-focus"),1400);
      });
    }
  }

  list.innerHTML="";
  let firstModuleRow=null;
  modules.forEach((module,index)=>{
    const row=document.createElement("button");
    row.className="module-row";
    row.type="button";
    row.setAttribute("aria-pressed","false");
    row.dataset.moduleId=module.id||String(index);
    row.innerHTML=`
      <div class="course-icon">${String(index+1).padStart(2,"0")}</div>
      <div class="module-row-copy">
        <strong>${module.title}</strong>
        <small>${module.description || ""}</small>
      </div>
      <span class="module-row-state">Selected</span>
      <span class="module-row-arrow">→</span>
    `;
    row.addEventListener("click",()=>{
      updateSelectedModuleUI(module,row,{scrollToPath:true});
    });
    if(!firstModuleRow)firstModuleRow=row;
    list.appendChild(row);
  });

  if(track?.trackExamId){
    const examItem=state.registry.find(x=>x.id===track.trackExamId);
    const row=document.createElement("button");
    row.className="module-row track-exam-row";
    row.innerHTML=`
      <div class="course-icon">★</div>
      <div class="module-row-copy">
        <strong>${track.trackExamTitle || examItem?.title || "Full Track Exam"}</strong>
        <small>${examItem?.description || "Comprehensive exam across the full track."}</small>
      </div>
      <span class="module-row-arrow">50Q →</span>
    `;
    row.addEventListener("click",()=>{
      if(examItem)prepareExam(examItem);
      else showToast("Full track exam is not available yet.");
    });
    list.appendChild(row);
  }

  updateSelectedModuleUI(modules[0],firstModuleRow,{scrollToPath:false});

  panel.classList.remove("hidden");
  panel.scrollIntoView({behavior:"smooth",block:"start"});
}

$("closeTrackPanel").addEventListener("click",()=>{
  $("trackPanel").classList.add("hidden");
  $("modulePanel").classList.add("hidden");
});
$("closeModulePanel").addEventListener("click",()=>{
  $("modulePanel").classList.add("hidden");
  if(state.selectedCourse?.tracks?.length) $("trackPanel").classList.remove("hidden");
});

$("openStudyBtn").addEventListener("click",()=>openStudy());
$("openPracticeBtn").addEventListener("click",()=>openModuleExam("instant"));
$("openModuleExamBtn").addEventListener("click",()=>openModuleExam(null));

function sqlQuickOptionText(quick,id){
  return quick?.options?.find(o=>o.id===id)?.text || "";
}
function sqlQuickFeedbackHtml(quick,selected){
  const correctId=quick?.correctAnswer || "";
  const correct=selected===correctId;
  const selectedText=sqlQuickOptionText(quick,selected);
  const correctText=sqlQuickOptionText(quick,correctId);
  return `
    <div class="sql-quick-answer-summary" dir="ltr">
      <div><span>YOUR ANSWER</span><strong>${escapeHtml(selected)}${selectedText?` — ${escapeHtml(normalizeStudyText(selectedText))}`:""}</strong></div>
      <div><span>CORRECT ANSWER</span><strong>${escapeHtml(correctId)}${correctText?` — ${escapeHtml(normalizeStudyText(correctText))}`:""}</strong></div>
    </div>
    <strong class="sql-quick-verdict">${correct?"صح ✓":"مش صح ✕"}</strong>
    <p>${formatStudyMixedText(quick?.explanationAr||"")}</p>`;
}
function applySqlQuickUI(check,quick,selected){
  const feedback=check.querySelector(".sql-quick-feedback");
  const reset=check.querySelector(".sql-quick-reset");
  const correct=selected===quick.correctAnswer;
  check.dataset.answered="true";
  check.querySelectorAll("[data-sql-quick-option]").forEach(option=>{
    option.disabled=true;
    option.classList.remove("correct","wrong");
    if(option.dataset.sqlQuickOption===quick.correctAnswer)option.classList.add("correct");
    else if(option.dataset.sqlQuickOption===selected && !correct)option.classList.add("wrong");
  });
  feedback?.classList.remove("hidden");
  feedback?.classList.toggle("correct",correct);
  feedback?.classList.toggle("wrong",!correct);
  if(feedback)feedback.innerHTML=sqlQuickFeedbackHtml(quick,selected);
  reset?.classList.remove("hidden");
}
function resetSqlQuickUI(check){
  delete check.dataset.answered;
  check.querySelectorAll("[data-sql-quick-option]").forEach(option=>{
    option.disabled=false;
    option.classList.remove("correct","wrong");
  });
  const feedback=check.querySelector(".sql-quick-feedback");
  feedback?.classList.add("hidden");
  feedback?.classList.remove("correct","wrong");
  if(feedback)feedback.innerHTML="";
  check.querySelector(".sql-quick-reset")?.classList.add("hidden");
}
function renderSqlStudySection(s,i,id){
  const article=document.createElement("section");
  article.className="study-section sql-study-section sql-study-v2-section";
  article.id=id;
  article.innerHTML=renderSqlStudySectionHtml(s,i);

  const quick=s.lessonV2?.quickCheck;
  article.querySelectorAll("[data-sql-quick-check]").forEach(check=>{
    if(!quick)return;
    const moduleId=state.selectedModule?.id || "";
    const sectionId=s.id || id;
    const saved=getQuickCheckState(state.studentName,moduleId,sectionId);
    if(saved?.selected)applySqlQuickUI(check,quick,saved.selected);

    check.querySelectorAll("[data-sql-quick-option]").forEach(btn=>btn.addEventListener("click",()=>{
      if(check.dataset.answered==="true")return;
      const selected=btn.dataset.sqlQuickOption;
      applySqlQuickUI(check,quick,selected);
      saveQuickCheckState(state.studentName,moduleId,sectionId,{
        selected,
        correct:selected===quick.correctAnswer,
        answeredAt:new Date().toISOString()
      });
    }));

    check.querySelector(".sql-quick-reset")?.addEventListener("click",()=>{
      clearQuickCheckState(state.studentName,moduleId,sectionId);
      resetSqlQuickUI(check);
    });
  });

  return article;
}

function pythonExampleLabel(sourceKind){
  if(sourceKind==="platform-clarification-based-on-course-concept")return "PLATFORM CLARIFICATION";
  if(sourceKind==="platform-presentation-correction")return "PRESENTATION CORRECTION";
  return "SOURCE-BASED CODE WALKTHROUGH";
}
function renderPythonCodeLines(code){
  return String(code||"").split("\n").map((line,index)=>`
    <span class="python-code-line">
      <span class="python-code-number">${index+1}</span>
      <span class="python-code-text">${escapeHtml(line) || " "}</span>
    </span>`).join("");
}

function quickOptionText(quick,id){
  return quick?.options?.find(o=>o.id===id)?.text || "";
}
function quickCheckExtraExplanation(quick){
  const q=String(quick?.question||"");
  if(/for\s+ch\s+in\s+["']Python["']/i.test(q)){
    return `في المثال <bdi dir="ltr">for ch in "Python"</bdi>، قيمة <bdi dir="ltr">ch</bdi> بتكون <bdi dir="ltr">"P"</bdi> ثم <bdi dir="ltr">"y"</bdi> ثم <bdi dir="ltr">"t"</bdi> ثم <bdi dir="ltr">"h"</bdi> ثم <bdi dir="ltr">"o"</bdi> ثم <bdi dir="ltr">"n"</bdi>.`;
  }
  return "";
}
function quickCheckFeedbackHtml(quick,selected){
  const correctId=quick?.correctAnswer || "";
  const correct=selected===correctId;
  const selectedText=quickOptionText(quick,selected);
  const correctText=quickOptionText(quick,correctId);
  const extra=quickCheckExtraExplanation(quick);
  return `
    <div class="python-quick-answer-summary" dir="ltr">
      <div><span>YOUR ANSWER</span><strong>${escapeHtml(selected)}${selectedText?` — ${escapeHtml(normalizeStudyText(selectedText))}`:""}</strong></div>
      <div><span>CORRECT ANSWER</span><strong>${escapeHtml(correctId)}${correctText?` — ${escapeHtml(normalizeStudyText(correctText))}`:""}</strong></div>
    </div>
    <strong class="python-quick-verdict">${correct?"صح ✓":"مش صح ✕"}</strong>
    <p>${formatStudyMixedText(quick?.explanationAr||"")}</p>
    ${extra?`<p class="python-quick-extra">${extra}</p>`:""}`;
}
function applyQuickCheckUI(check,quick,selected){
  const feedback=check.querySelector(".python-quick-feedback");
  const reset=check.querySelector(".python-quick-reset");
  const correct=selected===quick.correctAnswer;
  check.dataset.answered="true";
  check.querySelectorAll("[data-quick-option]").forEach(option=>{
    option.disabled=true;
    option.classList.remove("correct","wrong");
    if(option.dataset.quickOption===quick.correctAnswer)option.classList.add("correct");
    else if(option.dataset.quickOption===selected && !correct)option.classList.add("wrong");
  });
  feedback?.classList.remove("hidden");
  feedback?.classList.toggle("correct",correct);
  feedback?.classList.toggle("wrong",!correct);
  if(feedback)feedback.innerHTML=quickCheckFeedbackHtml(quick,selected);
  reset?.classList.remove("hidden");
}
function resetQuickCheckUI(check){
  delete check.dataset.answered;
  check.querySelectorAll("[data-quick-option]").forEach(option=>{
    option.disabled=false;
    option.classList.remove("correct","wrong");
  });
  const feedback=check.querySelector(".python-quick-feedback");
  feedback?.classList.add("hidden");
  feedback?.classList.remove("correct","wrong");
  if(feedback)feedback.innerHTML="";
  check.querySelector(".python-quick-reset")?.classList.add("hidden");
}

function renderPythonStudySection(s,i,id){
  const article=document.createElement("section");
  article.className="study-section python-study-section";
  article.id=id;

  const summary=s.summaryAr
    ?`<div class="python-concept-summary" dir="rtl">
        <span class="study-ar-label">الفكرة الأساسية</span>
        <p dir="auto">${formatStudyMixedText(s.summaryAr)}</p>
      </div>`
    :"";

  const keyTerms=(s.keyTerms||[]).length
    ?`<div class="study-keyterms python-keyterms" dir="ltr">
        <span class="study-block-label">KEY TERMS</span>
        <div class="study-term-list">
          ${(s.keyTerms||[]).map(term=>`<span class="study-term-chip"><bdi dir="ltr">${escapeHtml(term)}</bdi></span>`).join("")}
        </div>
      </div>`
    :"";

  const concepts=(s.conceptsAr||[]).length
    ?`<div class="python-concepts" dir="rtl">
        <span class="study-ar-label">شرح المفهوم</span>
        <div class="python-concept-list">
          ${(s.conceptsAr||[]).map(item=>`
            <div class="python-concept-item" dir="auto">
              <span>✓</span><p>${formatStudyMixedText(item)}</p>
            </div>`).join("")}
        </div>
      </div>`
    :"";

  const analysis=(s.analysisFlow||[]).length
    ?`<div class="python-analysis-flow" dir="ltr">
        <span class="study-block-label">ANALYSIS FLOW</span>
        <div class="python-flow-steps">
          ${(s.analysisFlow||[]).map((step,idx)=>`
            <div class="python-flow-step">
              <span>${String(idx+1).padStart(2,"0")}</span>
              <strong>${escapeHtml(step)}</strong>
            </div>`).join("")}
        </div>
      </div>`
    :"";

  const examples=(s.codeExamples||[]).map((ex,exampleIndex)=>{
    const lineByLine=(ex.lineByLine||[]).length
      ?`<div class="python-detail-card python-line-card" dir="rtl">
          <span class="python-detail-label">LINE-BY-LINE</span>
          <div class="python-line-explanations">
            ${(ex.lineByLine||[]).map((line,idx)=>`
              <div>
                <bdi dir="ltr">${escapeHtml(String(line.line ?? idx+1))}</bdi>
                <p dir="rtl" class="python-line-explanation-text">${formatStudyMixedText(line.ar||"")}</p>
              </div>`).join("")}
          </div>
        </div>`
      :"";

    const trace=(ex.executionTrace||[]).length
      ?`<div class="python-detail-card" dir="rtl">
          <span class="python-detail-label">EXECUTION TRACE</span>
          <ol class="python-trace-list">
            ${(ex.executionTrace||[]).map(step=>`<li dir="auto">${formatStudyMixedText(step)}</li>`).join("")}
          </ol>
        </div>`
      :"";

    const output=ex.expectedOutput!==undefined && ex.expectedOutput!==null && String(ex.expectedOutput)!==""
      ?`<div class="python-detail-card python-output-card" dir="ltr">
          <span class="python-detail-label">EXPECTED OUTPUT</span>
          <pre><code>${escapeHtml(String(ex.expectedOutput))}</code></pre>
        </div>`
      :"";

    const why=ex.whyItWorks
      ?`<div class="python-detail-card" dir="rtl">
          <span class="python-detail-label">WHY IT WORKS</span>
          <p dir="auto">${formatStudyMixedText(ex.whyItWorks)}</p>
        </div>`
      :"";

    const mistakes=(ex.commonMistakes||[]).length
      ?`<div class="python-detail-card python-warning-card" dir="rtl">
          <span class="python-detail-label">COMMON MISTAKES</span>
          <ul>${(ex.commonMistakes||[]).map(x=>`<li dir="auto">${formatStudyMixedText(x)}</li>`).join("")}</ul>
        </div>`
      :"";

    const tips=(ex.examTips||[]).length
      ?`<div class="python-detail-card python-tip-card" dir="rtl">
          <span class="python-detail-label">EXAM / TRACING TIPS</span>
          <ul>${(ex.examTips||[]).map(x=>`<li dir="auto">${formatStudyMixedText(x)}</li>`).join("")}</ul>
        </div>`
      :"";

    const source=ex.sourceTrace
      ?`<div class="python-example-source" dir="ltr">
          <span>SOURCE TRACE</span><p>${escapeHtml(normalizeStudyText(ex.sourceTrace))}</p>
        </div>`
      :"";

    return `<article class="python-code-example">
      <header class="python-example-head" dir="ltr">
        <div>
          <span class="python-source-kind ${ex.sourceKind==="platform-clarification-based-on-course-concept"?"clarification":ex.sourceKind==="platform-presentation-correction"?"correction":""}">
            ${pythonExampleLabel(ex.sourceKind)}
          </span>
          <h4>${escapeHtml(ex.title||`Code Example ${exampleIndex+1}`)}</h4>
        </div>
        <button class="python-copy-code" type="button" data-python-code="${encodeURIComponent(ex.code||"")}" aria-label="Copy Python code">Copy code</button>
      </header>

      <div class="python-code-shell" dir="ltr">
        <div class="python-code-toolbar">
          <span><i></i><i></i><i></i></span>
          <strong>PYTHON</strong>
        </div>
        <pre class="python-code-block"><code>${renderPythonCodeLines(ex.code||"")}</code></pre>
      </div>

      ${ex.explanationAr?`<div class="python-example-explanation" dir="rtl">
        <span class="study-ar-label">الكود بيعمل إيه؟</span>
        <p dir="auto">${formatStudyMixedText(ex.explanationAr)}</p>
      </div>`:""}

      <div class="python-details-grid python-core-details">
        ${trace}${output}
      </div>

      ${(lineByLine||why)?`<details class="python-code-details">
        <summary><span>Deep Dive</span><strong>Line-by-Line & Why It Works</strong></summary>
        <div class="python-details-grid python-details-expanded">${lineByLine}${why}</div>
      </details>`:""}

      ${(mistakes||tips)?`<details class="python-code-details python-code-review-details">
        <summary><span>Review</span><strong>Common Mistakes & Exam Tips</strong></summary>
        <div class="python-details-grid python-details-expanded">${mistakes}${tips}</div>
      </details>`:""}

      ${source}
    </article>`;
  }).join("");

  const sectionTrace=s.sourceTrace
    ?`<div class="study-source-trace python-section-source" dir="ltr">
        <span class="study-block-label">TOPIC SOURCE TRACE</span>
        <p>${escapeHtml(normalizeStudyText(s.sourceTrace))}</p>
      </div>`
    :"";

  article.innerHTML=`
    <header class="study-section-head python-section-head" dir="ltr">
      <div>
        <span class="eyebrow">SECTION ${String(i+1).padStart(2,"0")}</span>
        <h3>${escapeHtml(s.title)}</h3>
      </div>
      ${(s.codeExamples||[]).length?`<span class="python-example-count">${s.codeExamples.length} CODE ${s.codeExamples.length===1?"WALKTHROUGH":"WALKTHROUGHS"}</span>`:""}
    </header>
    ${s.lessonV2?renderPythonLessonV2(s.lessonV2,s.id||id):summary}
    ${keyTerms}
    ${!s.lessonV2?concepts:""}
    ${analysis}
    ${examples?`<div class="python-examples-stack">
      <div class="python-examples-title" dir="ltr">
        <span>CODE LAB</span>
        <strong>${(s.codeExamples||[]).length} walkthrough${(s.codeExamples||[]).length===1?"":"s"}</strong>
      </div>
      ${examples}
    </div>`:""}
    ${sectionTrace}`;

  article.querySelectorAll(".python-copy-code").forEach(btn=>btn.addEventListener("click",async()=>{
    const code=decodeURIComponent(btn.dataset.pythonCode||"");
    try{
      await navigator.clipboard.writeText(code);
      const old=btn.textContent;btn.textContent="Copied ✓";
      setTimeout(()=>btn.textContent=old,1200);
    }catch{
      showToast("Copy is unavailable in this browser. Select the code manually.");
    }
  }));

  article.querySelectorAll(".python-quick-check").forEach(check=>{
    const quick=s.lessonV2?.quickCheck;
    if(!quick)return;

    const moduleId=state.selectedModule?.id || "";
    const sectionId=s.id || id;
    const saved=getQuickCheckState(state.studentName,moduleId,sectionId);
    if(saved?.selected){
      applyQuickCheckUI(check,quick,saved.selected);
    }

    check.querySelectorAll("[data-quick-option]").forEach(btn=>btn.addEventListener("click",()=>{
      if(check.dataset.answered==="true")return;
      const selected=btn.dataset.quickOption;
      const correct=selected===quick.correctAnswer;
      applyQuickCheckUI(check,quick,selected);
      saveQuickCheckState(state.studentName,moduleId,sectionId,{
        selected,correct,answeredAt:new Date().toISOString()
      });
    }));

    check.querySelector(".python-quick-reset")?.addEventListener("click",()=>{
      clearQuickCheckState(state.studentName,moduleId,sectionId);
      resetQuickCheckUI(check);
    });
  });

  article.querySelectorAll("[data-chart-lab]").forEach(lab=>{
    const stage=lab.querySelector(".python-chart-stage");
    const showBtn=lab.querySelector(".python-show-chart");
    const anatomyBtn=lab.querySelector(".python-show-anatomy");
    showBtn?.addEventListener("click",()=>{
      const hidden=stage?.classList.contains("chart-preview-hidden");
      stage?.classList.toggle("chart-preview-hidden",!hidden);
      if(showBtn)showBtn.textContent=hidden?"Hide Chart":"Show Chart";
      if(anatomyBtn)anatomyBtn.disabled=!hidden;
      if(!hidden){
        stage?.classList.remove("show-anatomy");
        if(anatomyBtn)anatomyBtn.textContent="Show Anatomy";
      }
    });
    anatomyBtn?.addEventListener("click",()=>{
      const active=stage?.classList.toggle("show-anatomy");
      if(anatomyBtn)anatomyBtn.textContent=active?"Hide Anatomy":"Show Anatomy";
    });
  });

  article.querySelectorAll(".python-chart-decision-lab").forEach(lab=>{
    const result=lab.querySelector("[data-chart-decision-result]");
    lab.querySelectorAll("[data-chart-choice]").forEach(btn=>btn.addEventListener("click",()=>{
      const choice=chartDecisionOptions[btn.dataset.chartChoice];
      if(!choice||!result)return;
      lab.querySelectorAll("[data-chart-choice]").forEach(x=>x.classList.toggle("active",x===btn));
      result.innerHTML=`
        <div>
          <span>RECOMMENDED</span>
          <strong>${escapeHtml(choice.chart)}</strong>
          <p>${escapeHtml(choice.why)}</p>
        </div>
        <div class="chart-decision-preview">${chartSvg(choice.type)}</div>`;
    }));
  });

  return article;
}
function globalBestResultForFeedbackMode(examId,mode){
  return getUserResults()
    .filter(x=>x.examId===examId && x.feedbackMode===mode)
    .sort((a,b)=>b.percentage-a.percentage || a.timeTakenSeconds-b.timeTakenSeconds)[0] || null;
}
function globalStudyPercentForModule(module){
  const total=module?.study?.sections?.length || 0;
  if(!total || !state.studentName)return 0;
  const saved=getStudyProgress(state.studentName,module.id);
  const valid=new Set((module.study.sections||[]).map((s,i)=>s.id||`section-${i}`));
  const completed=(saved.completedSections||[]).filter(id=>valid.has(id)).length;
  return Math.round(completed/total*100);
}
function syncLearningFlowStats(module){
  if(!module)return;
  const studyPct=globalStudyPercentForModule(module);
  const practice=globalBestResultForFeedbackMode(module?.examId,"instant");
  const exam=globalBestResultForFeedbackMode(module?.examId,"exam");
  if($("studyFlowStatus")){
    $("studyFlowStatus").textContent=studyPct>=100?"Completed 100%":studyPct?`${studyPct}% completed`:"Not started";
    $("studyFlowStatus").classList.toggle("complete",studyPct>=100);
  }
  if($("practiceFlowStatus")){
    $("practiceFlowStatus").textContent=practice?`Best ${practice.percentage}%`:"Not attempted";
    $("practiceFlowStatus").classList.toggle("complete",Boolean(practice));
  }
  if($("examFlowStatus")){
    $("examFlowStatus").textContent=exam?`Best ${exam.percentage}%`:"Not attempted";
    $("examFlowStatus").classList.toggle("complete",Boolean(exam));
  }
  if($("openStudyBtn")){
    $("openStudyBtn").innerHTML=studyPct>=100
      ?'Review Study <span>→</span>'
      :studyPct
        ?`Continue Study · ${studyPct}% <span>→</span>`
        :'Start Study <span>→</span>';
  }
}

function studySectionKey(section,index){
  return section?.id || `section-${index}`;
}
function currentStudySectionIds(){
  return (state.selectedModule?.study?.sections||[]).map((s,i)=>studySectionKey(s,i));
}
function refreshStudyProgressUI(){
  const module=state.selectedModule;
  if(!module?.study)return;

  const ids=currentStudySectionIds();
  const saved=getStudyProgress(state.studentName,module.id);
  const valid=new Set(ids);
  const completed=new Set((saved.completedSections||[]).filter(id=>valid.has(id)));
  const total=ids.length;
  const count=completed.size;
  const percent=total?Math.round(count/total*100):0;

  if($("studyProgressText"))$("studyProgressText").textContent=`${count} / ${total} topics completed · ${percent}%`;
  if($("studyProgressFill"))$("studyProgressFill").style.width=`${percent}%`;

  document.querySelectorAll("[data-study-section-progress]").forEach(btn=>{
    const key=btn.dataset.studySectionProgress;
    const done=completed.has(key);
    btn.classList.toggle("complete",done);
    btn.textContent=done?"Completed ✓":"Mark Section Complete";
    btn.setAttribute("aria-pressed",done?"true":"false");
    btn.closest(".study-section")?.classList.toggle("study-section-complete",done);
  });
  document.querySelectorAll("[data-study-toc-section]").forEach(btn=>{
    const done=completed.has(btn.dataset.studyTocSection);
    btn.classList.toggle("completed",done);
    const stateLabel=btn.querySelector(".study-toc-item-state");
    if(stateLabel && !btn.classList.contains("active")){
      stateLabel.textContent=done?"✓ Completed":"";
    }
  });

  if($("studyMarkAllCompleteBtn")){
    $("studyMarkAllCompleteBtn").textContent=percent===100?"Study Completed ✓":"Mark Study as Completed ✓";
    $("studyMarkAllCompleteBtn").disabled=percent===100;
  }
  if($("studyResetProgressBtn"))$("studyResetProgressBtn").disabled=count===0 && !saved.lastSectionId;

  const resumeBtn=$("resumeStudyTopicBtn");
  if(resumeBtn){
    const canResume=saved.lastSectionId && valid.has(saved.lastSectionId) && percent<100;
    resumeBtn.classList.toggle("hidden",!canResume);
    resumeBtn.onclick=canResume?()=>{
      document.getElementById(`study-section-${saved.lastSectionId}`)?.scrollIntoView({behavior:"smooth",block:"start"});
    }:null;
  }

  syncLearningFlowStats(module);
}
function toggleStudySectionComplete(sectionId){
  const module=state.selectedModule;
  if(!module?.study || !state.studentName)return;
  const ids=currentStudySectionIds();
  const saved=getStudyProgress(state.studentName,module.id);
  const set=new Set(saved.completedSections||[]);
  set.has(sectionId)?set.delete(sectionId):set.add(sectionId);
  const validCompleted=ids.filter(id=>set.has(id));
  updateStudyProgress(state.studentName,module.id,{
    completedSections:validCompleted,
    completed:validCompleted.length===ids.length,
    lastSectionId:sectionId
  });
  refreshStudyProgressUI();
}
function attachStudySectionProgress(article,section,index,tocBtn){
  const key=studySectionKey(section,index);
  const moduleSections=state.selectedModule?.study?.sections || [];
  article.dataset.studySectionId=key;
  tocBtn.dataset.studyTocSection=key;

  const footer=document.createElement("div");
  footer.className="study-section-progress-footer";
  footer.innerHTML=`
    <div>
      <span>TOPIC PROGRESS</span>
      <small>Save this topic as completed on this device.</small>
    </div>
    <button type="button" class="study-section-progress-btn" data-study-section-progress="${escapeHtml(key)}" aria-pressed="false">Mark Section Complete</button>`;
  footer.querySelector("button").addEventListener("click",()=>toggleStudySectionComplete(key));
  article.appendChild(footer);

  const nav=document.createElement("div");
  nav.className="study-topic-nav";
  const prev=moduleSections[index-1];
  const next=moduleSections[index+1];
  nav.innerHTML=`
    ${prev?`<button type="button" class="study-topic-nav-btn prev" data-study-jump="${escapeHtml(studySectionKey(prev,index-1))}">
      <span>← PREVIOUS TOPIC</span>
      <strong>${escapeHtml(prev.title)}</strong>
    </button>`:`<span></span>`}
    ${next?`<button type="button" class="study-topic-nav-btn next" data-study-jump="${escapeHtml(studySectionKey(next,index+1))}">
      <span>NEXT TOPIC →</span>
      <strong>${escapeHtml(next.title)}</strong>
    </button>`:`<span></span>`}`;
  nav.querySelectorAll("[data-study-jump]").forEach(btn=>btn.addEventListener("click",()=>{
    const target=btn.dataset.studyJump;
    document.getElementById(`study-section-${target}`)?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  article.appendChild(nav);
}
function setActiveStudySection(sectionId,{save=true}={}){
  if(!sectionId || state.activeStudySectionId===sectionId)return;
  state.activeStudySectionId=sectionId;

  const module=state.selectedModule;
  const ids=currentStudySectionIds();
  const index=ids.indexOf(sectionId);
  if(index<0)return;

  document.querySelectorAll("[data-study-toc-section]").forEach(btn=>{
    const active=btn.dataset.studyTocSection===sectionId;
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-current",active?"true":"false");
    const stateLabel=btn.querySelector(".study-toc-item-state");
    if(stateLabel){
      if(active)stateLabel.textContent="YOU ARE HERE";
      else stateLabel.textContent=btn.classList.contains("completed")?"✓ Completed":"";
    }
  });

  const total=ids.length;
  const percent=total?Math.round(((index+1)/total)*100):0;
  if($("studyTocStatus"))$("studyTocStatus").textContent=`Section ${index+1} of ${total}`;
  if($("studyTocPercent"))$("studyTocPercent").textContent=`${percent}%`;
  if($("studyTocMiniFill"))$("studyTocMiniFill").style.width=`${percent}%`;

  const activeBtn=[...document.querySelectorAll("[data-study-toc-section]")]
    .find(btn=>btn.dataset.studyTocSection===sectionId);
  const aside=activeBtn?.closest(".study-toc");
  if(activeBtn && aside){
    const desired=Math.max(0,activeBtn.offsetTop-(aside.clientHeight/2)+(activeBtn.offsetHeight/2));
    aside.scrollTo({top:desired,behavior:"smooth"});
  }

  if(save && state.studentName && module?.id){
    updateStudyProgress(state.studentName,module.id,{lastSectionId:sectionId});
  }
}
function setupStudySectionObserver(){
  if(state.studyObserver)state.studyObserver.disconnect();
  const articles=[...document.querySelectorAll("#studySections .study-section[data-study-section-id]")];
  if(!articles.length)return;

  state.studyObserver=new IntersectionObserver(()=>{
    const viewportAnchor=Math.max(120,window.innerHeight*.24);
    const candidates=articles
      .map(article=>({article,rect:article.getBoundingClientRect()}))
      .filter(x=>x.rect.bottom>viewportAnchor && x.rect.top<window.innerHeight*.72)
      .sort((a,b)=>Math.abs(a.rect.top-viewportAnchor)-Math.abs(b.rect.top-viewportAnchor));
    if(candidates[0])setActiveStudySection(candidates[0].article.dataset.studySectionId);
  },{
    root:null,
    rootMargin:"-12% 0px -58% 0px",
    threshold:[0,0.01,0.15,0.35]
  });
  articles.forEach(article=>state.studyObserver.observe(article));

  const initial=getStudyProgress(state.studentName,state.selectedModule?.id).lastSectionId;
  const initialId=initial && articles.some(a=>a.dataset.studySectionId===initial)
    ?initial
    :articles[0].dataset.studySectionId;
  setActiveStudySection(initialId,{save:false});
}
function openStudy(){
  const c=state.selectedCourse,m=state.selectedModule;
  if(!c||!m?.study)return;
  const isSqlStudy=state.selectedTrack?.id==="sql" || String(m.id||"").startsWith("sql-session-");
  const isPythonStudy=state.selectedTrack?.id==="python" || String(m.id||"").startsWith("python-session-");

  $("studyBreadcrumb").textContent=`${c.title} / ${m.title} / Study`;
  $("studyTitle").textContent=m.study.title;
  $("studyDescription").textContent=m.study.description || "";

  const studyView=$("studyView");
  studyView?.classList.toggle("sql-readable-study",isSqlStudy);
  const sqlStudyMode=String(m.study?.displayMode||"");
  studyView?.classList.toggle("sql-study-v2",isSqlStudy && sqlStudyMode==="sql-visual-learning-v2");
  studyView?.classList.toggle("python-code-study",isPythonStudy);
  const pythonStudyMode=String(m.study?.displayMode||"");
  studyView?.classList.toggle("python-study-v2",isPythonStudy && pythonStudyMode.startsWith("python-"));
  studyView?.classList.toggle("python-visual-study",isPythonStudy && pythonStudyMode==="python-visual-learning-v3");

  const toc=$("studyTocList"),sections=$("studySections");
  toc.innerHTML="";sections.innerHTML="";
  m.study.sections.forEach((s,i)=>{
    const key=studySectionKey(s,i);
    const id=`study-section-${key}`;
    const tocBtn=document.createElement("button");
    tocBtn.dir="ltr";
    tocBtn.innerHTML=`
      <span class="study-toc-item-number">${String(i+1).padStart(2,"0")}</span>
      <span class="study-toc-item-title">${escapeHtml(s.title)}</span>
      <span class="study-toc-item-state"></span>`;
    tocBtn.addEventListener("click",()=>{
      setActiveStudySection(key);
      document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
      refreshStudyProgressUI();
    });
    toc.appendChild(tocBtn);

    let article;
    if(isSqlStudy){
      article=renderSqlStudySection(s,i,id);
    }else if(isPythonStudy){
      article=renderPythonStudySection(s,i,id);
    }else{
      article=document.createElement("section");
      article.className="study-section";article.id=id;
      const paragraphs=(s.paragraphs||[]).map(p=>`<p>${escapeHtml(p)}</p>`).join("");
      const bullets=s.bullets?.length?`<ul>${s.bullets.map(b=>`<li>${escapeHtml(b)}</li>`).join("")}</ul>`:"";
      const callout=s.callout?`<div class="study-callout"><strong>${escapeHtml(s.callout.label)}:</strong> ${escapeHtml(s.callout.text)}</div>`:"";
      article.innerHTML=`<span class="eyebrow">SECTION ${String(i+1).padStart(2,"0")}</span><h3>${escapeHtml(s.title)}</h3>${paragraphs}${bullets}${callout}`;
    }

    attachStudySectionProgress(article,s,i,tocBtn);
    sections.appendChild(article);
  });

  refreshStudyProgressUI();
  routeTo("studyView");
  window.requestAnimationFrame(()=>setupStudySectionObserver());
}
$("studyBackBtn").addEventListener("click",()=>routeTo("learnView"));
$("studyToPracticeBtn").addEventListener("click",()=>openModuleExam("instant"));
$("studyToPracticeTop").addEventListener("click",()=>openModuleExam("instant"));
$("studyMarkAllCompleteBtn").addEventListener("click",()=>{
  const module=state.selectedModule;if(!module?.study || !state.studentName)return;
  const ids=currentStudySectionIds();
  updateStudyProgress(state.studentName,module.id,{
    completedSections:ids,
    completed:true,
    lastSectionId:ids[ids.length-1]||null
  });
  refreshStudyProgressUI();
  showToast("Study progress saved as completed.");
});
$("studyResetProgressBtn").addEventListener("click",()=>{
  const module=state.selectedModule;if(!module?.study || !state.studentName)return;
  if(!confirm("Reset saved Study progress for this session? Practice scores, Exam results and Rankings will not be deleted."))return;
  clearStudyProgress(state.studentName,module.id);
  refreshStudyProgressUI();
  showToast("Study progress reset. Exam results were kept.");
});

function openModuleExam(forcedMode){
  const examId=state.selectedModule?.examId;
  const item=state.registry.find(x=>x.id===examId);
  if(!item){showToast("No exam is connected to this module yet.");return}
  prepareExam(item,forcedMode);
}

function renderHomeExams(){
  const target=$("homeExamGrid"); target.innerHTML="";
  state.registry.filter(x=>x.active!==false).slice(0,3).forEach(item=>{
    const best=getBestForExam(item.id,state.studentName);
    const row=document.createElement("div");
    row.className="compact-exam";
    row.innerHTML=`
      <div class="compact-exam-icon">${item.course?.[0] || "E"}</div>
      <div class="compact-exam-copy"><strong>${item.title}</strong><small>${item.questionCount} questions • ${best?`Best ${best.percentage}%`:"Not attempted"}</small></div>
      <button aria-label="Open exam">→</button>
    `;
    row.addEventListener("click",()=>prepareExam(item));
    target.appendChild(row);
  });
}

function renderMiniAchievements(){
  const target=$("homeAchievements");target.innerHTML="";
  getAchievements(getUserResults()).slice(0,3).forEach(a=>{
    const item=document.createElement("div");
    item.className=`mini-achievement ${a.unlocked?"":"locked"}`;
    item.innerHTML=`<div class="badge-icon">${a.icon}</div><div><strong>${a.title}</strong><small>${a.unlocked?"Unlocked":a.desc}</small></div>`;
    target.appendChild(item);
  });
}
$("openProfileAchievements").addEventListener("click",openProfile);

function renderExamFilters(){
  const courses=["All",...new Set(state.registry.filter(x=>x.active!==false).map(x=>x.course))];
  const target=$("examFilters");target.innerHTML="";
  courses.forEach(c=>{
    const btn=document.createElement("button");
    btn.className=`filter-btn ${state.filter===c?"active":""}`;
    btn.textContent=c;
    btn.addEventListener("click",()=>{
      state.filter=c;renderExamFilters();renderExamLibrary($("examSearch").value);
    });
    target.appendChild(btn);
  });
}

function renderExamLibrary(filter=""){
  const grid=$("examGrid"); if(!grid)return;
  renderExamResumeBanner();
  renderExamFilters();
  grid.innerHTML="";
  const list=state.registry.filter(x=>x.active!==false)
    .filter(x=>state.filter==="All" || x.course===state.filter)
    .filter(x=>`${x.title} ${x.course} ${x.module} ${x.category}`.toLowerCase().includes(filter.toLowerCase()));
  list.forEach(item=>{
    const best=getBestForExam(item.id,state.studentName);
    const savedProgress=activeSavedExamProgress();
    const hasResume=Boolean(savedProgress && savedProgress.examId===item.id);
    const isGenerated=item.generator==="question-bank";
    const blueprint=isGenerated?getBlueprint(item.blueprintId):null;
    let readiness=blueprint?getBlueprintReadiness(state.bankRegistry,blueprint):null;
    if(blueprint?.kind==="final"){
      const required=(state.curriculumRegistry.tracks||[]).filter(x=>x.requiredForFinal);
      const trackStatuses=required.map(meta=>({...meta,readiness:getTrackReadiness(meta.trackId)}));
      const curriculumFinal=finalStatusFromTracks(trackStatuses);
      readiness={...readiness,ready:readiness.ready && curriculumFinal.ready,readyTracks:trackStatuses.filter(x=>x.readiness?.status==="final-ready").length,totalTracks:trackStatuses.length};
    }
    const poolText=readiness?`${readiness.readyTracks}/${readiness.totalTracks} tracks ready`:"";
    const card=document.createElement("article");card.className="exam-card";
    card.innerHTML=`
      <div class="exam-meta"><span class="pill">${item.category || "Exam"}</span><span class="pill subtle">${item.difficulty || "Mixed"}</span></div>
      <h3>${item.title}</h3><p>${item.description || ""}</p>
      ${readiness?`<span class="pool-chip ${readiness.ready?"ready":"building"}">${readiness.ready?"READY":poolText}</span>`:""}
      <div class="exam-details">
        <div><span>COURSE</span><strong>${item.course || "—"}</strong></div>
        <div><span>MODULE</span><strong>${item.module || "—"}</strong></div>
        <div><span>QUESTIONS</span><strong>${item.questionCount ?? "—"}</strong></div>
        <div><span>YOUR BEST</span><strong>${best?`${best.percentage}%`:"Not attempted"}</strong></div>
      </div>
      <button class="primary-btn wide">${hasResume?"Resume Exam":readiness && !readiness.ready?"Check Pool":"Open Exam"} <span>→</span></button>`;
    card.querySelector("button").addEventListener("click",()=>{
      if(hasResume){
        resumeProgress(savedProgress);
        return;
      }
      if(readiness && !readiness.ready){
        showToast(readinessShortText(readiness));
        return;
      }
      prepareExam(item);
    });
    grid.appendChild(card);
  });
  if(!list.length) grid.innerHTML=`<div class="status-card"><div><strong>No matching exams</strong><p>Try another search or filter.</p></div></div>`;
}
$("examSearch").addEventListener("input",e=>renderExamLibrary(e.target.value));

if($("openOfficialHomeBtn"))$("openOfficialHomeBtn").addEventListener('click',()=>routeTo('officialQbankView'));
if($("officialJuniorBackBtn"))$("officialJuniorBackBtn").addEventListener('click',()=>routeTo('officialQbankView'));
if($("officialTrackBackBtn"))$("officialTrackBackBtn").addEventListener('click',()=>routeTo('officialJuniorView'));
if($("startOfficialFinalBtn"))$("startOfficialFinalBtn").addEventListener('click',()=>{
  const level=officialLevelMeta();
  requireRankedIdentity(prepareOfficialFinalExam,`Enter your name before starting the ranked ${level?.title||"Official"} Final.`);
});
if($("officialLevelOverallRankingBtn"))$("officialLevelOverallRankingBtn").addEventListener("click",()=>requireRankedIdentity(()=>{
  state.rankingMode=state.officialLevelId==="professional-data-analysis"?"professional-overall":"junior-overall";
  try{localStorage.setItem("digilians_ranking_mode",state.rankingMode)}catch{}
  routeTo("rankingView");
},"Enter your name before opening the full-bank Total Grades leaderboard."));
if($("officialTrackOverallRankingBtn"))$("officialTrackOverallRankingBtn").addEventListener("click",()=>requireRankedIdentity(()=>{
  state.rankingMode="track";
  state.rankingTrackLevelId=state.officialLevelId;
  state.rankingTrackId=state.officialTrackId;
  try{
    localStorage.setItem("digilians_ranking_mode","track");
    localStorage.setItem("digilians_ranking_track_level",state.rankingTrackLevelId);
    localStorage.setItem("digilians_ranking_track",state.rankingTrackId||"");
  }catch{}
  routeTo("rankingView");
},"Enter your name before opening this Track Total Grades leaderboard."));
if($("officialStudyBackBtn"))$("officialStudyBackBtn").addEventListener('click',()=>routeTo('officialTrackView'));
if($("officialStudyAllBtn"))$("officialStudyAllBtn").addEventListener('click',()=>openOfficialStudyScope(null));
if($("officialRandomPracticeBtn"))$("officialRandomPracticeBtn").addEventListener('click',()=>requireRankedIdentity(()=>prepareOfficialTrack('instant'),"Enter your name before starting ranked Official Practice."));
if($("officialRandomExamBtn"))$("officialRandomExamBtn").addEventListener('click',()=>requireRankedIdentity(()=>prepareOfficialTrack('exam'),"Enter your name before starting a ranked Official Exam."));
if($("officialSearch"))$("officialSearch").addEventListener('input',applyOfficialFilters);
if($("officialTopicFilter"))$("officialTopicFilter").addEventListener('change',applyOfficialFilters);
if($("officialStateFilter"))$("officialStateFilter").addEventListener('change',applyOfficialFilters);
if($("officialPrevBtn"))$("officialPrevBtn").addEventListener('click',()=>moveOfficial(-1));
if($("officialNextBtn"))$("officialNextBtn").addEventListener('click',()=>moveOfficial(1));
if($("officialShowAnswerBtn"))$("officialShowAnswerBtn").addEventListener("click",()=>{
  const q=state.officialQuestions[state.officialIndex];if(!q)return;
  const st=getOfficialTrackState(state.officialTrackId,state.officialLevelId,officialTrackRevision(state.officialTrackId));
  markOfficialReviewed(state.officialTrackId,q.id,state.officialIndex,state.officialLevelId,officialTrackRevision());
  updateOfficialTrackState(state.officialTrackId,{lastQuestionId:q.id},state.officialLevelId,officialTrackRevision());
  renderOfficialAnswerBox(q,st.answers?.[q.id]||null,true);renderOfficialQuestionList();updateOfficialProgress();
});
if($("officialBookmarkBtn"))$("officialBookmarkBtn").addEventListener('click',()=>{
  const q=state.officialQuestions[state.officialIndex];if(!q)return;
  toggleOfficialBookmark(state.officialTrackId,q.id,state.officialLevelId,officialTrackRevision());renderOfficialQuestionList();renderOfficialStudyQuestion();
});
if($("officialPracticeBtn"))$("officialPracticeBtn").addEventListener('click',()=>{
  if(state.officialSectionId){
    requireRankedIdentity(()=>prepareOfficialSection(state.officialSectionId),"Enter your name before solving this ranked section.");
  }else{
    requireRankedIdentity(()=>prepareOfficialTrack('instant'),"Enter your name before starting ranked Official Practice.");
  }
});
if($("officialExamBtn"))$("officialExamBtn").addEventListener('click',()=>requireRankedIdentity(()=>prepareOfficialTrack('exam'),"Enter your name before starting a ranked Official Exam."));

async function prepareExam(registryItem,forcedMode=null){
  const saved=activeSavedExamProgress();
  if(saved && saved.examId===registryItem?.id){
    resumeProgress(saved);
    return;
  }
  try{
    let payload;
    if(registryItem.generator==="question-bank"){
      const blueprint=getBlueprint(registryItem.blueprintId);
      if(!blueprint) throw new Error("Missing exam blueprint.");
      const readiness=getBlueprintReadiness(state.bankRegistry,blueprint);

      if(blueprint.kind==="final"){
        const required=(state.curriculumRegistry.tracks||[]).filter(x=>x.requiredForFinal);
        const trackStatuses=required.map(meta=>({...meta,readiness:getTrackReadiness(meta.trackId)}));
        const curriculumFinal=finalStatusFromTracks(trackStatuses);
        if(!curriculumFinal.ready){
          showToast(`Final curriculum readiness: ${curriculumFinal.readyTracks}/${curriculumFinal.totalTracks} tracks ready.`);
          return;
        }
      }

      if(!readiness.ready){
        showToast(readinessShortText(readiness));
        return;
      }
      const coverageByTrack={};
      for(const spec of blueprint.tracks||[]){
        const coverage=getFinalCoverageForTrack(spec.trackId);
        if(coverage?.topics?.length)coverageByTrack[spec.trackId]=coverage;
      }
      payload=await buildExamFromBlueprint({
        blueprint,
        bankRegistry:state.bankRegistry,
        loadJson,
        coverageByTrack
      });
    }else{
      payload=await loadJson(registryItem.file);
    }

    const errors=validateExamPayload(payload);
    if(errors.length){showToast("This exam JSON needs validation.");console.error(errors);return}
    configureExamSetup(payload,registryItem,forcedMode);
  }catch(err){
    console.error(err);
    showToast(err.message || "Could not load this exam.");
  }
}

function configureExamSetup(payload,registryItem,forcedMode=null){
  state.currentExam=payload;
  state.currentRegistryItem=registryItem;
  state.currentRankedActivity=registryItem?.ranked!==false;
  state.previousBest=state.studentName?getPreviousBestForExam(payload.exam.id,state.studentName):null;

  const exam=payload.exam;
  $("setupCategory").textContent=exam.category || "Exam";
  $("setupDifficulty").textContent=exam.difficulty || "Mixed";
  $("setupTitle").textContent=exam.title;
  $("setupDescription").textContent=exam.description || "";
  $("setupQuestions").textContent=payload.questions.length;
  $("setupPass").textContent=`${exam.settings?.passingScore ?? 60}%`;
  $("setupTimer").textContent=exam.settings?.timer?.enabled?`${exam.settings.timer.durationMinutes} min`:"No timer";
  $("setupBreadcrumb").textContent=`${exam.course || ""} / ${exam.module || ""} / ${exam.category || "Exam"}`;

  const composition=$("setupComposition");
  const generated=exam.generatedFromBlueprint;
  if(generated?.tracks?.length){
    composition.innerHTML=`
      <span>EXAM COMPOSITION</span>
      <div class="setup-composition-grid">
        ${generated.tracks.map(t=>`<div><small>${t.label}</small><strong>${t.count} questions</strong></div>`).join("")}
      </div>`;
    composition.classList.remove("hidden");
  }else{
    composition.classList.add("hidden");
    composition.innerHTML="";
  }

  const allowed=exam.settings?.feedbackModes || ["instant","exam"];
  document.querySelectorAll('input[name="feedbackMode"]').forEach(input=>{
    input.disabled=!allowed.includes(input.value);
    input.closest(".mode-option").classList.toggle("hidden",input.disabled);
  });
  const desired=forcedMode && allowed.includes(forcedMode)?forcedMode:allowed[0];
  const radio=document.querySelector(`input[name="feedbackMode"][value="${desired}"]`);
  if(radio)radio.checked=true;
  routeTo("setupView");
}
$("backToLibraryBtn").addEventListener("click",()=>{
  const ctx=state.currentExam?.exam?.generatedFromOfficialQbank;
  if(ctx?.kind==="section" || ctx?.kind==="track-random"){
    state.officialLevelId=ctx.levelId || state.officialLevelId;
    state.officialTrackId=ctx.trackId || state.officialTrackId;
    state.officialSectionId=null;
    routeTo("officialTrackView");
  }else if(ctx?.kind==="final"){
    state.officialLevelId=ctx.levelId || state.officialLevelId;
    state.officialTrackId=null;state.officialSectionId=null;
    routeTo("officialJuniorView");
  }else routeTo("examsView");
});

$("beginExamBtn").addEventListener("click",()=>{
  const begin=()=>{
    const saved=activeSavedExamProgress();
    if(saved && saved.examId===state.currentExam?.exam?.id){
      const resume=confirm("A saved attempt already exists for this exam. Press OK to Resume it. Cancel keeps you on this setup screen.");
      if(resume)resumeProgress(saved);
      return;
    }
    if(saved && saved.examId!==state.currentExam?.exam?.id){
      const replace=confirm(`You already have an unfinished exam: "${savedProgressTitle(saved)}". Starting a new exam will replace that saved attempt. Continue?`);
      if(!replace)return;
      clearExamProgress();
    }
    state.feedbackMode=document.querySelector('input[name="feedbackMode"]:checked')?.value || "instant";
    startExam();
  };
  if(state.currentRankedActivity && !state.studentName){
    requireRankedIdentity(begin,"Your name is required before this ranked attempt can begin.");
    return;
  }
  begin();
});

function inferTimerPolicy(feedbackMode=state.feedbackMode,ranked=state.currentRankedActivity){
  const enabled=Boolean(state.currentExam?.exam?.settings?.timer?.enabled);
  // Ranked Exam Mode keeps elapsed ranking time continuous even when no countdown timer is configured.
  if(ranked && feedbackMode==="exam")return "continuous-ranked";
  if(!enabled)return "none";
  return "paused";
}
function timerPolicyLabel(policy=state.timerPolicy){
  if(policy==="continuous-ranked")return "Ranked exam time continues while you are away.";
  if(policy==="paused")return "Timer pauses while you are away.";
  return "No countdown timer; your active-session time is saved.";
}
function startExam(restored=null){
  if(state.currentRankedActivity && !state.studentName){
    requireRankedIdentity(()=>startExam(restored),"Your name is required before this ranked attempt can begin.");
    return;
  }
  stopTimer();
  state.timerSuspendedAt=null;

  if(restored){
    state.answers=restored.answers || {};
    state.markedQuestions=[...new Set(restored.markedQuestions || [])];
    state.currentIndex=Math.min(Math.max(0,restored.currentIndex || 0),Math.max(0,state.currentExam.questions.length-1));
    state.feedbackMode=restored.feedbackMode || "instant";
    state.timerPolicy=restored.timerPolicy || inferTimerPolicy(state.feedbackMode,state.currentRankedActivity);

    let elapsed=Math.max(0,Number(restored.elapsedSeconds)||0);
    let remaining=restored.remainingSeconds ?? null;
    if(state.timerPolicy==="continuous-ranked" && restored.savedAtEpoch){
      const awaySeconds=Math.max(0,Math.floor((Date.now()-Number(restored.savedAtEpoch))/1000));
      elapsed+=awaySeconds;
      if(remaining!==null)remaining=Math.max(0,Number(remaining)-awaySeconds);
    }

    state.startedAt=Date.now()-elapsed*1000;
    state.remainingSeconds=remaining;
  }else{
    state.answers={};
    state.markedQuestions=[];
    state.currentIndex=0;
    state.startedAt=Date.now();
    const timer=state.currentExam.exam.settings?.timer;
    state.remainingSeconds=timer?.enabled?timer.durationMinutes*60:null;
    state.timerPolicy=inferTimerPolicy(state.feedbackMode,state.currentRankedActivity);
  }

  buildQuestionNavigator();
  renderQuestion();
  routeTo("examView");
  updateTimerPolicyHint();

  if(state.timerPolicy==="continuous-ranked" && state.remainingSeconds!==null && state.remainingSeconds<=0){
    persistProgress();
    showToast("The ranked timer expired while you were away. Your saved answers are being submitted.");
    finishExam(true);
    return;
  }

  startTimerIfNeeded();
  persistProgress();
}

async function resumeProgress(progress){
  let item=state.registry.find(x=>x.id===progress.examId);
  if(!item && progress.generatedExam){
    item={
      id:progress.examId,
      title:progress.generatedExam.exam?.title||"Saved Exam",
      course:progress.generatedExam.exam?.course||"Data Analysis",
      module:progress.generatedExam.exam?.module||"",
      questionCount:progress.generatedExam.questions?.length||0,
      generator:progress.generatedExam.exam?.generatedFromOfficialQbank?"official-qbank":"question-bank",
      ranked:progress.rankedActivity ?? true
    };
  }
  if(!item){clearExamProgress();routeTo("examsView");return}
  try{
    let payload;
    if(progress.generatedExam){
      payload=progress.generatedExam;
    }else if(item.generator==="question-bank"){
      const blueprint=getBlueprint(item.blueprintId);
      const coverageByTrack={};
      for(const spec of blueprint.tracks||[]){
        const coverage=getFinalCoverageForTrack(spec.trackId);
        if(coverage?.topics?.length)coverageByTrack[spec.trackId]=coverage;
      }
      payload=await buildExamFromBlueprint({blueprint,bankRegistry:state.bankRegistry,loadJson,coverageByTrack});
    }else{
      payload=await loadJson(item.file);
    }
    const errors=validateExamPayload(payload);
    if(errors.length)throw new Error("Invalid exam");
    state.currentExam=payload;
    state.currentRegistryItem=item;
    state.currentRankedActivity=progress.rankedActivity ?? (item?.ranked!==false);

    const officialCtx=payload.exam?.generatedFromOfficialQbank || null;
    if(officialCtx){
      state.officialLevelId=officialCtx.levelId || "junior-data-analysis";
      state.officialTrackId=officialCtx.trackId || null;
      state.officialSectionId=officialCtx.sectionId || null;
    }

    state.previousBest=state.studentName?getPreviousBestForExam(payload.exam.id,state.studentName):null;
    startExam(progress);
  }catch(e){
    console.error("Resume failed",e);
    clearExamProgress();
    showToast("Saved progress could not be restored.");
    routeTo("examsView");
  }
}

function persistProgress(){
  if(!state.currentExam || !state.studentName)return;
  saveExamProgress({
    progressVersion:2,
    studentName:state.studentName,
    examId:state.currentExam.exam.id,
    examTitle:state.currentExam.exam.title,
    answers:state.answers,
    markedQuestions:state.markedQuestions,
    currentIndex:state.currentIndex,
    totalQuestions:state.currentExam.questions.length,
    feedbackMode:state.feedbackMode,
    remainingSeconds:state.remainingSeconds,
    elapsedSeconds:Math.max(0,Math.floor((Date.now()-state.startedAt)/1000)),
    timerPolicy:state.timerPolicy,
    rankedActivity:state.currentRankedActivity,
    savedAtEpoch:Date.now(),
    generatedExam:["question-bank","official-qbank"].includes(state.currentRegistryItem?.generator)?state.currentExam:null
  });
}

function buildQuestionNavigator(){
  const nav=$("questionNavigator");nav.innerHTML="";
  state.currentExam.questions.forEach((q,index)=>{
    const btn=document.createElement("button");
    btn.className="nav-number";
    btn.type="button";
    btn.textContent=index+1;
    btn.setAttribute("aria-label",`Question ${index+1}`);
    btn.addEventListener("click",()=>{
      state.currentIndex=index;
      persistProgress();
      renderQuestion();
    });
    nav.appendChild(btn);
  });
}
function renderQuestion(){
  const qs=state.currentExam.questions,q=qs[state.currentIndex];
  $("questionCounter").textContent=`Question ${state.currentIndex+1} / ${qs.length}`;
  $("progressFill").style.width=`${((state.currentIndex+1)/qs.length)*100}%`;
  {
    const displayTopic=displayTopicForQuestion(q);
    $("questionTopic").textContent=displayTopic;
    const inferred=displayTopic!==(q.topic||"General");
    $("questionTopic").dataset.topicInferred=inferred?"true":"false";
    $("questionTopic").title=inferred?`Display classification: ${displayTopic} • stored metadata: ${q.topic||"General"}`:"";
  }
  $("questionDifficulty").textContent=q.difficulty || "Medium";
  const technicalInfo=analyzeTechnicalContent(q.question,q);
  $("questionText").innerHTML=renderTechnicalQuestion(q.question,q);
  $("questionText").classList.toggle("has-code-question",technicalInfo.hasCode);

  const marked=state.markedQuestions.includes(q.id);
  if($("markReviewBtn")){
    $("markReviewBtn").classList.toggle("marked",marked);
    $("markReviewBtn").setAttribute("aria-pressed",marked?"true":"false");
    $("markReviewBtn").textContent=marked?"★ Marked for Review":"☆ Mark for Review";
  }

  const list=$("optionsList");list.innerHTML="";
  q.options.forEach(option=>{
    const btn=document.createElement("button");btn.className="option-btn";
    btn.innerHTML=`<span class="option-letter">${escapeHtml(option.id)}</span><span class="option-content">${renderTechnicalOption(option.text,q)}</span>`;
    const selected=state.answers[q.id];
    if(selected===option.id)btn.classList.add("selected");
    if(state.feedbackMode==="instant" && selected){
      if(option.id===q.correctAnswer)btn.classList.add("correct");
      if(option.id===selected && selected!==q.correctAnswer)btn.classList.add("wrong");
    }
    btn.addEventListener("click",()=>selectAnswer(q,option.id));
    list.appendChild(btn);
  });
  renderInstantFeedback(q);
  updateNavigator();

  $("prevQuestionBtn").disabled=state.currentIndex===0;
  $("nextQuestionBtn").classList.toggle("hidden",state.currentIndex===qs.length-1);
  $("submitExamBtn").classList.toggle("hidden",state.currentIndex!==qs.length-1);
  const officialKind=state.currentExam?.exam?.generatedFromOfficialQbank?.kind;
  $("submitExamBtn").innerHTML=officialKind==="section"?'Finish Section <span>✓</span>':'Submit Exam <span>✓</span>';
}
function selectAnswer(q,optionId){
  if(state.feedbackMode==="instant" && state.answers[q.id])return;
  state.answers[q.id]=optionId;
  persistProgress();
  renderQuestion();
}
function toggleMarkForReview(){
  const q=state.currentExam?.questions?.[state.currentIndex];
  if(!q)return;
  const set=new Set(state.markedQuestions||[]);
  set.has(q.id)?set.delete(q.id):set.add(q.id);
  state.markedQuestions=[...set];
  persistProgress();
  renderQuestion();
}
$("markReviewBtn").addEventListener("click",toggleMarkForReview);

function renderInstantFeedback(q){
  const box=$("instantFeedback");box.className="feedback-box hidden";box.innerHTML="";
  const selected=state.answers[q.id];
  if(state.feedbackMode!=="instant" || !selected)return;
  const correct=selected===q.correctAnswer;
  const selectedOption=q.options.find(o=>o.id===selected);
  const correctOption=q.options.find(o=>o.id===q.correctAnswer);
  box.className=`feedback-box ${correct?"success":"error"}`;

  const answerStrip=`<div class="technical-feedback-answer">
    <div><span>YOUR ANSWER</span><strong>${escapeHtml(selected)}</strong><div>${renderTechnicalOption(selectedOption?.text||"",q)}</div></div>
    <div><span>CORRECT ANSWER</span><strong>${escapeHtml(q.correctAnswer)}</strong><div>${renderTechnicalOption(correctOption?.text||"",q)}</div></div>
  </div>`;

  if(q.deepExplanation){
    const selectedReason=q.deepExplanation.options?.[selected]||"";
    box.innerHTML=`
      <strong>${correct?"Correct ✓":`Incorrect ✕ — Correct answer: ${escapeHtml(q.correctAnswer)}`}</strong>
      ${answerStrip}
      <div class="ranked-official-feedback" dir="rtl">
        <p><b>${correct?"ليه اختيارك صح؟":"ليه اختيارك غلط؟"}</b> ${renderTechnicalRichText(selectedReason,q)}</p>
        <p><b>شرح المفهوم:</b> ${renderTechnicalRichText(q.deepExplanation.summary||"",q)}</p>
      </div>`;
  }else{
    const explanation=q.aiExplanation?.ar || q.explanation?.ar || q.explanation?.en || "No explanation provided.";
    box.innerHTML=`<strong>${correct?"Correct ✓":`Incorrect ✕ — Correct answer: ${escapeHtml(q.correctAnswer)}`}</strong>
      ${answerStrip}
      <div dir="rtl">${renderTechnicalRichText(explanation,q)}</div>`;
  }
}

function updateNavigator(){
  const answered=Object.keys(state.answers).length;
  const markedCount=(state.markedQuestions||[]).length;
  $("answeredCount").textContent=markedCount?`${answered} answered · ${markedCount} marked`:`${answered} answered`;

  const instant=state.feedbackMode==="instant";
  $("questionNavLegend")?.classList.toggle("exam-mode-legend",!instant);

  document.querySelectorAll(".nav-number").forEach((btn,index)=>{
    const q=state.currentExam.questions[index];
    const selected=state.answers[q.id];
    const marked=state.markedQuestions.includes(q.id);

    btn.classList.toggle("current",index===state.currentIndex);
    btn.classList.toggle("marked",marked);
    btn.classList.remove("answered","correct","wrong","answered-neutral");

    if(selected){
      if(instant){
        btn.classList.add(selected===q.correctAnswer?"correct":"wrong");
      }else{
        btn.classList.add("answered-neutral");
      }
    }

    const status=marked
      ?`Marked for review${selected?"; answered":""}`
      :selected
        ?instant
          ?selected===q.correctAnswer?"Correct":"Incorrect"
          :"Answered"
        :"Unanswered";
    btn.setAttribute("aria-label",`Question ${index+1}: ${status}${index===state.currentIndex?"; current":""}`);
  });
}
$("prevQuestionBtn").addEventListener("click",()=>{if(state.currentIndex>0){state.currentIndex--;persistProgress();renderQuestion()}});
$("nextQuestionBtn").addEventListener("click",()=>{if(state.currentIndex<state.currentExam.questions.length-1){state.currentIndex++;persistProgress();renderQuestion()}});
$("submitExamBtn").addEventListener("click",()=>finishExam(false));

function updateTimerPolicyHint(){
  const display=$("timerDisplay");
  if(!display)return;
  display.title=timerPolicyLabel();
  display.classList.toggle("ranked-continuous",state.timerPolicy==="continuous-ranked");
}
$("exitExamBtn").addEventListener("click",()=>{
  const message=state.timerPolicy==="continuous-ranked"
    ?"Exit this ranked exam? Your answers and current question will be saved, but ranked elapsed time (and the countdown, when enabled) will CONTINUE while you are away. The attempt is not added to Ranking until it is submitted."
    :"Exit the exam? Your answers, question position and remaining time will be saved. The timer will pause until you resume.";
  if(!confirm(message))return;
  stopTimer();
  persistProgress();
  state.timerSuspendedAt=null;
  routeTo("dashboardView");
});

function startTimerIfNeeded(){
  stopTimer();
  if(state.remainingSeconds===null){
    $("timerDisplay").classList.add("hidden");
    updateTimerPolicyHint();
    return;
  }
  $("timerDisplay").classList.remove("hidden");
  updateTimerDisplay();
  updateTimerPolicyHint();
  state.timerId=setInterval(()=>{
    state.remainingSeconds=Math.max(0,(state.remainingSeconds??0)-1);
    updateTimerDisplay();
    if(state.remainingSeconds%5===0)persistProgress();
    if(state.remainingSeconds<=0)finishExam(true);
  },1000);
}
function updateTimerDisplay(){
  const total=Math.max(0,state.remainingSeconds ?? 0);
  $("timerDisplay").textContent=`${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}
function stopTimer(){
  if(state.timerId)clearInterval(state.timerId);
  state.timerId=null;
}

document.addEventListener("visibilitychange",()=>{
  const examActive=$("examView")?.classList.contains("active");
  if(!examActive || !state.currentExam)return;

  if(document.hidden){
    if(state.timerSuspendedAt)return;
    state.timerSuspendedAt=Date.now();
    stopTimer();
    persistProgress();
    return;
  }

  if(!state.timerSuspendedAt)return;
  const awayMs=Math.max(0,Date.now()-state.timerSuspendedAt);
  const awaySeconds=Math.floor(awayMs/1000);

  if(state.timerPolicy==="continuous-ranked"){
    if(state.remainingSeconds!==null)state.remainingSeconds=Math.max(0,state.remainingSeconds-awaySeconds);
    // Keep startedAt unchanged: ranked elapsed time includes time away.
  }else{
    // Practice / Instant Feedback / untimed study-style attempts pause elapsed time while away.
    state.startedAt+=awayMs;
  }

  state.timerSuspendedAt=null;
  updateTimerDisplay();
  persistProgress();

  if(state.timerPolicy==="continuous-ranked" && state.remainingSeconds!==null && state.remainingSeconds<=0){
    showToast("The ranked timer expired while the tab was inactive.");
    finishExam(true);
    return;
  }
  startTimerIfNeeded();
});

window.addEventListener("beforeunload",()=>{
  if($("examView")?.classList.contains("active") && state.currentExam){
    stopTimer();
    persistProgress();
  }
});

function finishExam(autoSubmitted){
  stopTimer();
  const beforeAchievements=getAchievements(getUserResults()).filter(a=>a.unlocked).map(a=>a.id);
  const result=calculateResult(state.currentExam.questions,state.answers);
  const timeTakenSeconds=Math.max(0,Math.floor((Date.now()-state.startedAt)/1000));
  const clientAttemptId=crypto.randomUUID();

  const subjectBreakdown=calculateSubjectBreakdown();
  const topicBreakdown=topicPerformance(state.currentExam.questions,state.answers);
  const officialContext=state.currentExam.exam.generatedFromOfficialQbank || null;
  const record={
    examId:state.currentExam.exam.id,examTitle:state.currentExam.exam.title,studentName:state.studentName,
    percentage:result.percentage,correct:result.correct,wrong:result.wrong,unanswered:result.unanswered,
    timeTakenSeconds,submittedAt:new Date().toISOString(),autoSubmitted,
    clientAttemptId,onlineSynced:false,subjectBreakdown,topicBreakdown,officialContext,
    feedbackMode:state.feedbackMode,examCategory:state.currentExam.exam.category || "Exam"
  };

  const onlineAttempt={
    player_id:state.playerId,
    student_name:state.studentName,
    exam_id:state.currentExam.exam.id,
    exam_title:state.currentExam.exam.title,
    exam_version:state.currentExam.exam.version || "1.0",
    score:result.correct,
    wrong:result.wrong,
    unanswered:result.unanswered,
    total_questions:state.currentExam.questions.length,
    percentage:result.percentage,
    time_taken_seconds:timeTakenSeconds,
    feedback_mode:state.feedbackMode,
    client_attempt_id:clientAttemptId
  };

  if(state.currentExam.exam.generatedFromOfficialQbank){
    const wrongByTrack={};
    for(const q of state.currentExam.questions){if((state.answers[q.id]??null)!==q.correctAnswer){wrongByTrack[q.trackId] ||= [];wrongByTrack[q.trackId].push(q.id)}}
    const levelId=state.currentExam.exam.generatedFromOfficialQbank.levelId || "junior-data-analysis";
    Object.entries(wrongByTrack).forEach(([trackId,ids])=>saveOfficialMistakes(trackId,ids,levelId,officialTrackRevision(trackId,levelId)));
  }

  saveResult(record);
  queuePendingAttempt(onlineAttempt);
  clearExamProgress();

  state.lastResult={...result,record,onlineAttempt};
  const afterAchievements=getAchievements(getUserResults()).filter(a=>a.unlocked);
  state.lastResult.newBadges=afterAchievements.filter(a=>!beforeAchievements.includes(a.id));

  renderResult();
  routeTo("resultView");
  syncFinishedAttempt(onlineAttempt);
}

async function syncFinishedAttempt(onlineAttempt){
  setResultSyncUI("syncing");

  try{
    await submitAttemptOnline(onlineAttempt);
    removePendingAttempt(onlineAttempt.client_attempt_id);
    markResultSynced(onlineAttempt.client_attempt_id);

    const board=await getLeaderboard(onlineAttempt.exam_id);
    const me=board.find(x=>x.player_id===state.playerId);
    setResultSyncUI("synced",me,board);
  }catch(error){
    console.error("Online result sync failed:",error);
    setResultSyncUI("offline");
  }
}

function setResultSyncUI(mode,me=null,board=[]){
  const card=$("onlineRankCard");
  const rank=$("resultOnlineRank");
  const status=$("resultSyncStatus");
  if(!card||!rank||!status)return;

  card.classList.remove("synced","offline");

  if(mode==="syncing"){
    rank.textContent="Syncing…";
    status.textContent="Saving this attempt online.";
    return;
  }

  if(mode==="offline"){
    card.classList.add("offline");
    rank.textContent="Saved locally";
    status.textContent="Online sync failed. The platform will retry automatically next time.";
    return;
  }

  card.classList.add("synced");
  if(me){
    rank.textContent=`#${me.rank} of ${board.length}`;
    const previous=board[me.rank-2];
    if(me.rank===1){
      status.textContent="You are currently #1 on this exam.";
    }else if(previous){
      if(previous.percentage>me.percentage){
        status.textContent=`${previous.percentage-me.percentage} point${previous.percentage-me.percentage===1?"":"s"} behind #${previous.rank}.`;
      }else{
        const seconds=Math.max(0,me.time_taken_seconds-previous.time_taken_seconds);
        status.textContent=`Same score as #${previous.rank}; ${formatLeaderboardTime(seconds)} slower.`;
      }
    }else{
      status.textContent="Your best attempt is now on the shared leaderboard.";
    }
  }else{
    rank.textContent="Synced ✓";
    status.textContent="Your attempt was saved online.";
  }
}

async function retryPendingAttempts(){
  const pending=getPendingAttempts();
  for(const attempt of pending){
    try{
      await submitAttemptOnline(attempt);
      removePendingAttempt(attempt.client_attempt_id);
      markResultSynced(attempt.client_attempt_id);
    }catch(error){
      console.warn("Pending attempt still offline:",error);
      break;
    }
  }
}

function formatLeaderboardTime(seconds){
  const total=Math.max(0,Number(seconds)||0);
  const hours=Math.floor(total/3600);
  const mins=Math.floor((total%3600)/60);
  const secs=Math.floor(total%60);
  if(hours)return `${hours}h ${String(mins).padStart(2,"0")}m`;
  return mins?`${mins}m ${String(secs).padStart(2,"0")}s`:`${secs}s`;
}

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));
}

function calculateSubjectBreakdown(){
  const groups={};
  for(const q of state.currentExam?.questions || []){
    const label=q.track || q.trackId;
    if(!label) continue;
    groups[label] ||= {total:0,correct:0,wrong:0,unanswered:0};
    groups[label].total++;
    const selected=state.answers[q.id] ?? null;
    if(selected===null) groups[label].unanswered++;
    else if(selected===q.correctAnswer) groups[label].correct++;
    else groups[label].wrong++;
  }
  return groups;
}

function renderTopicBreakdown(){
  const section=$("resultTopicBreakdown");
  const grid=$("resultTopicBreakdownGrid");
  const data=state.lastResult?.record?.topicBreakdown || [];
  if(!data.length){
    section.classList.add("hidden");
    grid.innerHTML="";
    return;
  }
  const visible=data.slice(0,8);
  grid.innerHTML=visible.map(t=>`
    <div class="topic-result-card">
      <strong>${escapeHtml(t.label)}</strong>
      <span>${t.percentage}%</span>
      <small>${t.correct}/${t.total} correct • ${t.wrong} wrong${t.unanswered?` • ${t.unanswered} unanswered`:""}</small>
    </div>`).join("");
  section.classList.remove("hidden");
}

function renderSubjectBreakdown(){
  const section=$("resultSubjectBreakdown");
  const grid=$("resultSubjectBreakdownGrid");
  const data=state.lastResult?.record?.subjectBreakdown || {};
  const entries=Object.entries(data);
  if(entries.length<2){
    section.classList.add("hidden");
    grid.innerHTML="";
    return;
  }
  grid.innerHTML=entries.map(([label,s])=>{
    const pct=s.total?Math.round((s.correct/s.total)*100):0;
    return `<div class="subject-breakdown-item">
      <span>${escapeHtml(label)}</span>
      <strong>${s.correct}/${s.total}</strong>
      <small>${pct}% • ${s.wrong} wrong${s.unanswered?` • ${s.unanswered} unanswered`:""}</small>
    </div>`;
  }).join("");
  section.classList.remove("hidden");
}

function animateScore(target){
  const el=$("resultPercent");let current=0;
  const duration=700,start=performance.now();
  function tick(now){
    const p=Math.min(1,(now-start)/duration);
    current=Math.round(target*(1-Math.pow(1-p,3)));
    el.textContent=`${current}%`;
    if(p<1)requestAnimationFrame(tick);
  }requestAnimationFrame(tick);
}

function renderResult(){
  const {record}=state.lastResult,score=state.lastResult,pass=state.currentExam.exam.settings?.passingScore ?? 60;
  const officialCtx=state.currentExam.exam.generatedFromOfficialQbank || null;
  setResultSyncUI("syncing");
  let headline="Keep practicing";
  if(officialCtx?.kind==="section")headline="Section Completed";
  else if(record.percentage>=90)headline="Excellent work";
  else if(record.percentage>=80)headline="Great job";
  else if(record.percentage>=pass)headline="Good progress";
  $("resultHeadline").textContent=headline;
  $("resultSubline").textContent=officialCtx?.kind==="section"
    ?`${officialLevelMeta(officialCtx.levelId)?.title || "Data Analysis"} • ${state.currentExam.exam.module} • Section ${officialCtx.sectionNumber} — your attempt is saved and ranked by your best score.`
    :"Your attempt has been saved on this device.";
  $("resultPercent").textContent="0%";
  $("resultScore").textContent=`${record.correct} / ${state.currentExam.questions.length}`;
  $("correctCount").textContent=score.correct;$("wrongCount").textContent=score.wrong;$("unansweredCount").textContent=score.unanswered;
  $("timeTaken").textContent=formatDuration(record.timeTakenSeconds);
  renderSubjectBreakdown();
  renderTopicBreakdown();
  $("celebration").classList.toggle("hidden",record.percentage<80);
  setTimeout(()=>animateScore(record.percentage),120);

  const best=getBestForExam(record.examId,state.studentName);
  $("resultBestScore").textContent=best?`${best.percentage}%`:`${record.percentage}%`;
  const resultCtx=state.currentExam.exam.generatedFromOfficialQbank || null;
  $("viewResultRankingBtn").classList.toggle("hidden",!state.currentRankedActivity);
  if(resultCtx?.kind==="section"){
    const meta=officialTrackMeta(resultCtx.trackId);
    const hasNext=Boolean(meta?.sections?.some(s=>s.sectionNumber===resultCtx.sectionNumber+1));
    $("nextExamBtn").textContent=hasNext?"Next Section →":"Back to Track →";
    $("retakeBtn").textContent="Retake Section";
  }else{
    if(resultCtx?.kind==="final"){
      const finalLevel=officialLevelMeta(resultCtx.levelId);
      const finalShort=finalLevel?.title?.replace(" Data Analysis","") || "Official";
      $("nextExamBtn").textContent=`Back to ${finalShort} QBank →`;
    }else{
      $("nextExamBtn").textContent=resultCtx?.kind==="track-random"?"Back to Track →":"Next Exam →";
    }
    $("retakeBtn").textContent="Retake";
  }

  const improve=$("improvementMessage");
  if(state.previousBest && record.percentage>state.previousBest.percentage){
    improve.textContent=`↗ Improved by ${record.percentage-state.previousBest.percentage}% from your previous best.`;
    improve.classList.remove("hidden");
  }else improve.classList.add("hidden");

  const badge=$("newBadgeNotice");
  if(state.lastResult.newBadges?.length){
    badge.innerHTML=`🏆 New achievement: <strong>${state.lastResult.newBadges.map(x=>x.title).join(", ")}</strong>`;
    badge.classList.remove("hidden");
  }else badge.classList.add("hidden");
}
$("reviewBtn").addEventListener("click",renderReview);
$("retakeBtn").addEventListener("click",()=>routeTo("setupView"));
$("reviewRetakeBtn").addEventListener("click",()=>routeTo("setupView"));
$("viewResultRankingBtn").addEventListener("click",()=>{
  if(!state.lastResult?.record?.examId)return;
  requireRankedIdentity(()=>{
    state.rankingMode="exam";
    state.rankingExamId=state.lastResult.record.examId;
    try{
      localStorage.setItem("digilians_ranking_mode","exam");
      localStorage.setItem("digilians_last_ranking_exam_id",state.rankingExamId);
    }catch{}
    routeTo("rankingView");
  },"Enter your name to open this leaderboard.");
});
$("nextExamBtn").addEventListener("click",()=>{
  const ctx=state.currentExam?.exam?.generatedFromOfficialQbank;
  if(ctx?.kind==="section"){
    const meta=officialTrackMeta(ctx.trackId);
    const next=meta?.sections?.find(s=>s.sectionNumber===ctx.sectionNumber+1);
    if(next){
      state.officialTrackId=ctx.trackId;state.officialSectionId=next.sectionId;
      requireRankedIdentity(()=>prepareOfficialSection(next.sectionId),"Your saved name is required for the next ranked section.");
    }else{
      state.officialTrackId=ctx.trackId;state.officialSectionId=null;routeTo("officialTrackView");
    }
    return;
  }
  if(ctx?.kind==="final"){
    state.officialLevelId=ctx.levelId || state.officialLevelId;
    state.officialTrackId=null;state.officialSectionId=null;
    routeTo("officialJuniorView");return
  }
  if(ctx?.kind==="track-random"){
    state.officialLevelId=ctx.levelId || state.officialLevelId;
    state.officialTrackId=ctx.trackId || state.officialTrackId;
    state.officialSectionId=null;
    routeTo("officialTrackView");return
  }
  routeTo("examsView");
});

function renderReview(){
  const list=$("reviewList");list.innerHTML="";$("reviewTitle").textContent=state.currentExam.exam.title;
  state.currentExam.questions.forEach((q,index)=>{
    const selected=state.answers[q.id] ?? null;
    const selectedOption=q.options.find(o=>o.id===selected),correctOption=q.options.find(o=>o.id===q.correctAnswer);
    const isCorrect=selected===q.correctAnswer;
    const item=document.createElement("article");item.className="review-item";
    item.innerHTML=`
      <span class="eyebrow">QUESTION ${String(index+1).padStart(2,"0")}</span>
      <div class="review-question-content">${renderTechnicalQuestion(q.question,q)}</div>
      <div class="review-answer ${isCorrect?"correct":"wrong"}"><strong>Your answer:</strong>
        ${selected?`<span class="review-answer-id">${escapeHtml(selected)}.</span> ${renderTechnicalOption(selectedOption?.text || "",q)}`:"Unanswered"}
      </div>
      <div class="review-answer correct"><strong>Correct answer:</strong>
        <span class="review-answer-id">${escapeHtml(q.correctAnswer)}.</span> ${renderTechnicalOption(correctOption?.text || "",q)}
      </div>
      <div class="review-explanation">
        <strong>Explanation:</strong><br>
        <div dir="rtl">${renderTechnicalRichText(q.deepExplanation?.summary || q.aiExplanation?.ar || q.explanation?.ar || q.explanation?.en || "No explanation provided.",q)}</div>
        ${q.deepExplanation?`<div class="review-option-reasons" dir="rtl">${q.options.map(o=>`<p><b>${escapeHtml(o.id)} ${o.id===q.correctAnswer?"✓":"✕"}:</b> ${renderTechnicalRichText(q.deepExplanation.options?.[o.id]||"",q)}</p>`).join("")}</div>`:""}
      </div>`;
    list.appendChild(item);
  });
  routeTo("reviewView");
}

$("reviewHomeBtn").addEventListener("click",()=>{
  const ctx=state.currentExam?.exam?.generatedFromOfficialQbank;
  if(ctx?.kind==="section"||ctx?.kind==="track-random"){
    state.officialLevelId=ctx.levelId || state.officialLevelId;
    state.officialTrackId=ctx.trackId || state.officialTrackId;
    state.officialSectionId=null;
    routeTo("officialTrackView");
  }else if(ctx?.kind==="final"){
    state.officialLevelId=ctx.levelId || state.officialLevelId;
    state.officialTrackId=null;state.officialSectionId=null;
    routeTo("officialJuniorView");
  }else routeTo("examsView");
});

function populateRankingExamSelect(){
  const select=$("rankingExamSelect");if(!select)return;
  select.innerHTML="";
  const dataAnalysisIds=[];
  const availableLevels=(state.officialRegistry.levels||[]).filter(x=>x.available!==false);

  for(const level of availableLevels){
    const blueprint=officialFinalBlueprintForLevel(level.levelId);
    if(!blueprint)continue;
    const group=document.createElement("optgroup");
    group.label=`Data Analysis — Official ${level.levelId==="junior-data-analysis"?"Junior":"Professional"} Final`;
    const option=document.createElement("option");
    option.value=blueprint.id;
    option.textContent=`${level.title} • Official QBank Final Simulation`;
    group.appendChild(option);select.appendChild(group);dataAnalysisIds.push(option.value);
  }

  for(const level of availableLevels){
    const group=document.createElement("optgroup");
    group.label=`Official QBank — ${level.title} Sections`;
    for(const track of level.tracks||[]){
      for(const section of track.sections||[]){
        const option=document.createElement("option");
        option.value=officialSectionExamId(level.levelId,track.trackId,section.sectionNumber,track.sourceRevision||"source-r1");
        option.textContent=`${level.title.replace(" Data Analysis","")} • ${track.track} • ${section.title}`;
        group.appendChild(option);dataAnalysisIds.push(option.value);
      }
    }
    if(group.children.length)select.appendChild(group);
  }

  for(const level of availableLevels){
    const group=document.createElement("optgroup");
    group.label=`Official QBank — ${level.title} Track Challenges`;
    for(const track of level.tracks||[]){
      for(const challenge of [
        {category:"Official Practice",label:"Practice 40"},
        {category:"Official Exam",label:"Exam 50"}
      ]){
        const option=document.createElement("option");
        option.value=officialTrackRandomExamId(level.levelId,track.trackId,challenge.category,track.sourceRevision||"source-r1");
        option.textContent=`${level.title.replace(" Data Analysis","")} • ${track.track} • ${challenge.label}`;
        group.appendChild(option);dataAnalysisIds.push(option.value);
      }
    }
    if(group.children.length)select.appendChild(group);
  }

  const dataGroup=document.createElement("optgroup");dataGroup.label="Data Analysis — Platform Exams";
  state.registry.filter(x=>x.active!==false && String(x.course||"").toLowerCase()==="data analysis").forEach(item=>{
    const option=document.createElement("option");option.value=item.id;option.textContent=`${item.course} — ${item.title}`;dataGroup.appendChild(option);dataAnalysisIds.push(option.value);
  });
  if(dataGroup.children.length)select.appendChild(dataGroup);

  const otherGroup=document.createElement("optgroup");otherGroup.label="Other Platform Exams";
  state.registry.filter(x=>x.active!==false && String(x.course||"").toLowerCase()!=="data analysis").forEach(item=>{
    const option=document.createElement("option");option.value=item.id;option.textContent=`${item.course} — ${item.title}`;otherGroup.appendChild(option);
  });
  if(otherGroup.children.length)select.appendChild(otherGroup);

  const availableIds=[...select.options].map(o=>o.value),validDataIds=dataAnalysisIds.filter(id=>availableIds.includes(id));let preferred="";
  if(state.rankingExamId && availableIds.includes(state.rankingExamId))preferred=state.rankingExamId;
  try{
    const last=localStorage.getItem("digilians_last_ranking_exam_id")||"";
    if(!preferred && last && availableIds.includes(last))preferred=last;
  }catch{}
  if(!preferred&&validDataIds.length){
    const counts={};
    for(const result of getUserResults()){
      if(validDataIds.includes(result.examId))counts[result.examId]=(counts[result.examId]||0)+1;
    }
    preferred=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"";
  }
  if(!preferred){
    const juniorFinalId=officialFinalBlueprintForLevel("junior-data-analysis")?.id||"";
    if(juniorFinalId&&availableIds.includes(juniorFinalId))preferred=juniorFinalId;
  }
  if(!preferred)preferred=availableIds[0]||"";
  select.value=preferred;state.rankingExamId=select.value||preferred;
}

function rankingLevel(levelId){
  return (state.officialRegistry.levels||[]).find(x=>x.levelId===levelId)||null;
}
function fixedSectionCatalog(levelId,trackId=null){
  const level=rankingLevel(levelId);
  if(!level)return [];
  return (level.tracks||[])
    .filter(track=>!trackId || track.trackId===trackId)
    .flatMap(track=>(track.sections||[]).map(section=>({
      examId:officialSectionExamId(level.levelId,track.trackId,section.sectionNumber,track.sourceRevision||"source-r1"),
      levelId:level.levelId,
      trackId:track.trackId,
      track:track.track,
      sectionId:section.sectionId,
      sectionTitle:section.title,
      questionCount:section.questionCount
    })));
}
function populateRankingTrackControls(){
  const levelSelect=$("rankingTrackLevelSelect"),trackSelect=$("rankingTrackSelect");
  if(!levelSelect||!trackSelect)return;
  const levels=(state.officialRegistry.levels||[]).filter(x=>x.available!==false);

  levelSelect.innerHTML="";
  for(const level of levels){
    const option=document.createElement("option");
    option.value=level.levelId;option.textContent=level.title;
    levelSelect.appendChild(option);
  }
  if(!levels.some(x=>x.levelId===state.rankingTrackLevelId))state.rankingTrackLevelId=levels[0]?.levelId||"junior-data-analysis";
  levelSelect.value=state.rankingTrackLevelId;

  const level=rankingLevel(state.rankingTrackLevelId);
  trackSelect.innerHTML="";
  for(const track of level?.tracks||[]){
    const option=document.createElement("option");
    option.value=track.trackId;option.textContent=track.track;
    trackSelect.appendChild(option);
  }
  if(!(level?.tracks||[]).some(x=>x.trackId===state.rankingTrackId))state.rankingTrackId=level?.tracks?.[0]?.trackId||null;
  trackSelect.value=state.rankingTrackId||"";
}
function rankingModeLevelId(){
  if(state.rankingMode==="professional-overall")return "professional-data-analysis";
  if(state.rankingMode==="track")return state.rankingTrackLevelId;
  return "junior-data-analysis";
}
function rankingScopeForMode(){
  if(state.rankingMode==="exam")return null;
  const levelId=rankingModeLevelId();
  const level=rankingLevel(levelId);
  const track=state.rankingMode==="track"?(level?.tracks||[]).find(x=>x.trackId===state.rankingTrackId):null;
  const sections=fixedSectionCatalog(levelId,track?.trackId||null);
  return {
    levelId,level,track,sections,
    name:track?`${level.title} • ${track.track}`:level?.title||"Official QBank",
    maxScore:sections.reduce((sum,s)=>sum+s.questionCount,0),
    sectionCount:sections.length
  };
}
function setRankingMode(mode,{render=true}={}){
  state.rankingMode=mode;
  try{localStorage.setItem("digilians_ranking_mode",mode)}catch{}
  if(render)renderRanking();
}
function syncRankingModeUI(){
  document.querySelectorAll("[data-ranking-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.rankingMode===state.rankingMode));
  $("rankingTrackToolbar").classList.toggle("hidden",state.rankingMode!=="track");
  $("rankingExamToolbar").classList.toggle("hidden",state.rankingMode!=="exam");
  $("rankingScopeSummary").classList.toggle("hidden",state.rankingMode==="exam");
  populateRankingTrackControls();
  if(state.rankingMode==="exam")populateRankingExamSelect();
}

function setExamTableMode(){
  $("leaderboardTableWrap").classList.remove("aggregate");
  $("leaderboardTableHead").classList.remove("aggregate");
  document.querySelectorAll("#leaderboardList .leaderboard-row").forEach(x=>x.classList.remove("aggregate"));
  $("rankingHeadProgress").textContent="Score";
  $("rankingHeadGrade").textContent="Time";
  $("rankingHeadPercent").classList.add("hidden");
  $("rankingHeadTime").classList.add("hidden");
  $("rankingBestLabel").textContent="Best";
  $("rankingAttemptsLabel").textContent="Attempts";
}
function setAggregateTableMode(){
  $("leaderboardTableWrap").classList.add("aggregate");
  $("leaderboardTableHead").classList.add("aggregate");
  $("rankingHeadProgress").textContent="Progress";
  $("rankingHeadGrade").textContent="Total Grade";
  $("rankingHeadPercent").textContent="Overall";
  $("rankingHeadTime").textContent="Total Time";
  $("rankingHeadPercent").classList.remove("hidden");
  $("rankingHeadTime").classList.remove("hidden");
  $("rankingBestLabel").textContent="Total Grade";
  $("rankingAttemptsLabel").textContent="Completed";
}
function setRankingLoading(message="Fetching the latest shared results from Supabase."){
  const status=$("leaderboardStatus"),content=$("leaderboardContent");
  status.className="status-card info";
  status.classList.remove("hidden");
  status.innerHTML=`<div class="status-icon">↗</div><div><strong>Loading leaderboard…</strong><p>${escapeHtml(message)}</p></div>`;
  content.classList.add("hidden");
}
function showRankingError(error){
  console.error("Leaderboard fetch failed:",error);
  const status=$("leaderboardStatus"),content=$("leaderboardContent");
  status.className="status-card danger";
  status.classList.remove("hidden");
  status.innerHTML=`<div class="status-icon">!</div><div><strong>Leaderboard is temporarily unavailable</strong><p>Your local exam results are still safe. Check your connection and try Refresh.</p></div>`;
  content.classList.add("hidden");
}
function showRankingContent(){
  $("leaderboardStatus").classList.add("hidden");
  $("leaderboardContent").classList.remove("hidden");
}
function renderPodium(board,{aggregate=false,maxScore=0}={}){
  const podium=$("leaderboardPodium");podium.innerHTML="";
  if(!board.length){
    podium.innerHTML=`<div class="status-card info"><div class="status-icon">✦</div><div><strong>Be the first on this leaderboard</strong><p>No shared ranked results have been submitted for this scope yet.</p></div></div>`;
    return;
  }
  const top=board.slice(0,3);
  const order=top.length>=3?[top[1],top[0],top[2]]:top.length===2?[top[1],top[0]]:top;
  order.forEach(entry=>{
    const place=document.createElement("div");
    const classes=entry.rank===1?"first":entry.rank===2?"second":"third";
    place.className=`podium-place ${classes} ${entry.player_id===state.playerId?"you":""}`;
    const main=aggregate?`${entry.totalScore}/${maxScore}`:`${entry.percentage}%`;
    const sub=aggregate?`${entry.completedSections}/${entry.totalSections} sections • ${entry.percentage}%`:"Best attempt";
    place.innerHTML=`
      <span>${entry.rank}</span>
      <div class="avatar">${escapeHtml(initials(entry.student_name))}</div>
      <strong class="podium-name">${escapeHtml(entry.student_name)}</strong>
      <div class="podium-score">${main}</div>
      <div class="podium-sub">${sub}</div>`;
    podium.appendChild(place);
  });
}
function renderOnlineLeaderboard(board){
  setExamTableMode();
  renderPodium(board);
  const list=$("leaderboardList");list.innerHTML="";

  if(!board.length){
    list.innerHTML=`<div class="leaderboard-row"><span>—</span><span class="leaderboard-name">No scores yet</span><span>—</span><span>—</span></div>`;
  }else{
    board.forEach(entry=>{
      const row=document.createElement("div");
      const isMe=entry.player_id===state.playerId;
      row.className=`leaderboard-row ${isMe?"you":""}`;
      row.innerHTML=`
        <span class="leaderboard-rank">#${entry.rank}</span>
        <span class="leaderboard-student">
          <span class="avatar">${escapeHtml(initials(entry.student_name))}</span>
          <span class="leaderboard-name">${escapeHtml(entry.student_name)}${isMe?'<span class="you-tag">YOU</span>':""}</span>
        </span>
        <span class="leaderboard-score">${entry.percentage}%</span>
        <span class="leaderboard-time">${formatLeaderboardTime(entry.time_taken_seconds)}</span>`;
      list.appendChild(row);
    });
  }

  const me=board.find(x=>x.player_id===state.playerId);
  $("rankingOnlineRank").textContent=me?`#${me.rank}`:"—";
  $("rankingBest").textContent=me?`${me.percentage}%`:"—";
  $("rankingAttempts").textContent=getUserResults().filter(r=>r.examId===state.rankingExamId).length;

  const gap=$("rankingGap");
  if(!me){
    gap.textContent="Complete this exam to join the leaderboard.";
  }else if(me.rank===1){
    gap.textContent="You are currently leading this exam.";
  }else{
    const previous=board[me.rank-2];
    if(previous.percentage>me.percentage){
      gap.textContent=`You are ${Math.round((previous.percentage-me.percentage)*10)/10} point${previous.percentage-me.percentage===1?"":"s"} behind #${previous.rank}.`;
    }else{
      gap.textContent=`Same score as #${previous.rank}; improve your completion time to move up.`;
    }
  }
}
function renderAggregateLeaderboard(result,scope){
  setAggregateTableMode();
  const {board,maxScore,totalSections}=result;
  renderPodium(board,{aggregate:true,maxScore});
  const list=$("leaderboardList");list.innerHTML="";

  if(!board.length){
    list.innerHTML=`<div class="leaderboard-row aggregate"><span>—</span><span class="leaderboard-name">No section totals yet</span><span>—</span><span>—</span><span>—</span><span>—</span></div>`;
  }else{
    board.forEach(entry=>{
      const row=document.createElement("div");
      const isMe=entry.player_id===state.playerId;
      row.className=`leaderboard-row aggregate ${isMe?"you":""}`;
      row.innerHTML=`
        <span class="leaderboard-rank">#${entry.rank}</span>
        <span class="leaderboard-student">
          <span class="avatar">${escapeHtml(initials(entry.student_name))}</span>
          <span class="leaderboard-name">${escapeHtml(entry.student_name)}${isMe?'<span class="you-tag">YOU</span>':""}</span>
        </span>
        <span class="leaderboard-progress">${entry.completedSections}/${totalSections}</span>
        <span class="leaderboard-grade">${entry.totalScore}/${maxScore}</span>
        <span class="leaderboard-percent">${entry.percentage}%</span>
        <span class="leaderboard-time">${formatLeaderboardTime(entry.totalTimeSeconds)}</span>`;
      list.appendChild(row);
    });
  }

  const me=board.find(x=>x.player_id===state.playerId);
  $("rankingOnlineRank").textContent=me?`#${me.rank}`:"—";
  $("rankingBest").textContent=me?`${me.totalScore}/${maxScore}`:"—";
  $("rankingAttempts").textContent=me?`${me.completedSections}/${totalSections}`:"0/"+totalSections;

  const gap=$("rankingGap");
  if(!me){
    gap.textContent=`Solve the fixed sections in ${scope.name} to enter this Total Grades ranking.`;
  }else if(me.rank===1){
    gap.textContent=me.completedSections===totalSections
      ?"You completed the full scope and currently lead the Total Grades ranking."
      :`You currently lead with ${me.completedSections}/${totalSections} fixed sections completed.`;
  }else{
    const previous=board[me.rank-2];
    if(previous.completedSections>me.completedSections){
      gap.textContent=`Complete ${previous.completedSections-me.completedSections} more fixed section${previous.completedSections-me.completedSections===1?"":"s"} to match #${previous.rank}'s completion.`;
    }else if(previous.totalScore>me.totalScore){
      gap.textContent=`You are ${previous.totalScore-me.totalScore} mark${previous.totalScore-me.totalScore===1?"":"s"} behind #${previous.rank}.`;
    }else{
      gap.textContent=`Same completion and grade as #${previous.rank}; total completion time is the tie-breaker.`;
    }
  }
}
function updateRankingScopeSummary(scope){
  if(!scope)return;
  $("rankingScopeName").textContent=scope.name;
  $("rankingScopeMarks").textContent=scope.maxScore;
  $("rankingScopeSections").textContent=scope.sectionCount;
  $("rankingScopeScoring").textContent="Best per section";

  const isTrack=Boolean(scope.track);
  $("rankingRuleTitle").textContent=isTrack?`${scope.track.track} Total Grades`:"Full Bank Total Grades";
  $("rankingRuleText").textContent=isTrack
    ?`Best attempt from each fixed ${scope.track.track} section. Completion ranks first, then total marks, then total time. Random Practice/Exam do not add marks.`
    :`Best attempt per fixed section across the full ${scope.level?.title||"bank"}. Completion ranks first, then total marks, then total time. Random Practice, Random Exam and Final simulations do not add marks.`;
}
async function renderRanking(){
  $("rankingLocalName").textContent=state.studentName || "Guest";
  const requestId=++state.rankingRequestId;

  try{
    const savedMode=localStorage.getItem("digilians_ranking_mode");
    if(savedMode && ["junior-overall","professional-overall","track","exam"].includes(savedMode) && !state.rankingMode)state.rankingMode=savedMode;
  }catch{}

  syncRankingModeUI();

  if(state.rankingMode==="exam"){
    $("rankingRuleTitle").textContent="Individual Exam Leaderboard";
    $("rankingRuleText").textContent="Best attempt only. Higher percentage ranks first; ties are broken by faster completion time.";
    setRankingLoading();
    const examId=state.rankingExamId;
    if(!examId){
      $("leaderboardStatus").innerHTML=`<div class="status-icon">↗</div><div><strong>No exams available</strong><p>Add an active exam to start a leaderboard.</p></div>`;
      return;
    }
    try{
      const board=await getLeaderboard(examId);
      if(requestId!==state.rankingRequestId)return;
      renderOnlineLeaderboard(board);
      showRankingContent();
    }catch(error){
      if(requestId===state.rankingRequestId)showRankingError(error);
    }
    return;
  }

  const scope=rankingScopeForMode();
  updateRankingScopeSummary(scope);
  setRankingLoading(`Combining best attempts from ${scope.sectionCount} fixed section leaderboard${scope.sectionCount===1?"":"s"}.`);
  try{
    const rows=await fetchAttemptsForExamIds(scope.sections.map(s=>s.examId));
    if(requestId!==state.rankingRequestId)return;
    const result=buildAggregateLeaderboard(rows,scope.sections);
    renderAggregateLeaderboard(result,scope);
    showRankingContent();
  }catch(error){
    if(requestId===state.rankingRequestId)showRankingError(error);
  }
}

document.querySelectorAll("[data-ranking-mode]").forEach(btn=>btn.addEventListener("click",()=>{
  const mode=btn.dataset.rankingMode;
  setRankingMode(mode);
}));
$("rankingTrackLevelSelect").addEventListener("change",e=>{
  state.rankingTrackLevelId=e.target.value;
  state.rankingTrackId=rankingLevel(state.rankingTrackLevelId)?.tracks?.[0]?.trackId||null;
  try{
    localStorage.setItem("digilians_ranking_track_level",state.rankingTrackLevelId);
    localStorage.setItem("digilians_ranking_track",state.rankingTrackId||"");
  }catch{}
  renderRanking();
});
$("rankingTrackSelect").addEventListener("change",e=>{
  state.rankingTrackId=e.target.value;
  try{localStorage.setItem("digilians_ranking_track",state.rankingTrackId)}catch{}
  renderRanking();
});
$("rankingExamSelect").addEventListener("change",e=>{
  state.rankingExamId=e.target.value;
  state.rankingMode="exam";
  try{
    localStorage.setItem("digilians_ranking_mode","exam");
    localStorage.setItem("digilians_last_ranking_exam_id",state.rankingExamId);
  }catch{}
  renderRanking();
});
$("refreshLeaderboardBtn").addEventListener("click",()=>renderRanking());

function openValidator(){
  state.lastValidatorRoute = document.querySelector(".view.active")?.id || "dashboardView";
  closeProfile();
  resetValidator();
  routeTo("validatorView");
}

function resetValidator(){
  state.validatorPayload=null;
  state.validatorRegistryEntry=null;
  $("validatorFileInput").value="";
  $("validatorResultCard").classList.add("hidden");
  $("validatorEmptyState").classList.remove("hidden");
  $("registrySection").classList.add("hidden");
}

async function handleValidatorFile(file){
  if(!file)return;

  if(!file.name.toLowerCase().endsWith(".json") && file.type!=="application/json"){
    showToast("Please choose a JSON file.");
    return;
  }

  let text;
  try{
    text=await file.text();
  }catch{
    showToast("Could not read this file.");
    return;
  }

  let payload;
  try{
    payload=JSON.parse(text);
  }catch(error){
    $("validatorEmptyState").classList.add("hidden");
    $("validatorResultCard").classList.remove("hidden");
    $("validatorFileName").textContent=file.name;
    $("validatorResultTitle").textContent="Invalid JSON syntax";
    $("validatorStatusBadge").textContent="INVALID";
    $("validatorStatusBadge").className="validator-status-badge invalid";
    $("validatorSummary").innerHTML="";
    $("validatorErrorCount").textContent="1";
    $("validatorWarningCount").textContent="0";
    $("validatorErrors").innerHTML=`<div class="validator-issue"><code>JSON parser</code>${escapeHtml(error.message)}</div>`;
    $("validatorWarnings").innerHTML='<div class="validator-no-issues">No warnings available.</div>';
    $("registrySection").classList.add("hidden");
    $("validatorNextStep").querySelector("h3").textContent="Fix the JSON syntax, then validate again.";
    return;
  }

  state.validatorPayload=payload;
  const isBank=payload?.schemaVersion==="2.0" && payload?.bank;
  const result=isBank?validateQuestionBank(payload):validateExamJson(payload);
  renderValidatorResult(file.name,result,payload,isBank?"bank":"exam");
}

function renderValidatorResult(fileName,result,payload,kind="exam"){
  $("validatorEmptyState").classList.add("hidden");
  $("validatorResultCard").classList.remove("hidden");
  $("validatorFileName").textContent=fileName;

  const badge=$("validatorStatusBadge");
  if(result.valid){
    $("validatorResultTitle").textContent=kind==="bank"?"Question Bank JSON is valid":"Exam JSON is valid";
    badge.textContent="VALID ✓";
    badge.className="validator-status-badge valid";
  }else{
    $("validatorResultTitle").textContent=kind==="bank"?"Question Bank JSON needs fixes":"Exam JSON needs fixes";
    badge.textContent="INVALID";
    badge.className="validator-status-badge invalid";
  }

  const summary=result.summary || {};
  $("validatorSummary").innerHTML=`
    <div><span>${kind==="bank"?"BANK":"EXAM"}</span><strong>${escapeHtml(summary.title || "—")}</strong></div>
    <div><span>${kind==="bank"?"TRACK":"COURSE"}</span><strong>${escapeHtml((kind==="bank"?summary.track:summary.course) || "—")}</strong></div>
    <div><span>QUESTIONS</span><strong>${summary.questionCount ?? 0}</strong></div>
    <div><span>TOPICS</span><strong>${summary.topicCount ?? 0}</strong></div>
  `;

  $("validatorErrorCount").textContent=result.errors.length;
  $("validatorWarningCount").textContent=result.warnings.length;
  renderValidatorIssues("validatorErrors",result.errors,"No errors. This file passes all required checks.");
  renderValidatorIssues("validatorWarnings",result.warnings,"No warnings.");

  if(result.valid){
    const registry=kind==="bank"?buildBankRegistryEntry(payload):buildRegistryEntry(payload);
    state.validatorRegistryEntry=registry;
    $("validatorRegistryCode").textContent=JSON.stringify(registry,null,2);
    $("validatorSuggestedPath").textContent=registry.file;
    $("validatorRegistryHelp").innerHTML=kind==="bank"
      ? 'Save the bank at the suggested path, then add this object inside <code>data/question-banks.json</code>.'
      : 'Save the exam at the suggested path, then add this object inside <code>data/exams.json</code>.';
    $("registrySection").classList.remove("hidden");
    $("validatorNextStep").querySelector("h3").textContent=kind==="bank"
      ?"Valid bank. Add it to the question-bank registry, then the exam engine can use it."
      :"Valid exam. Save the file, add the registry entry, then commit to GitHub.";
  }else{
    state.validatorRegistryEntry=null;
    $("registrySection").classList.add("hidden");
    $("validatorNextStep").querySelector("h3").textContent="Fix the errors, then validate again.";
  }
}

function renderValidatorIssues(targetId,issues,emptyMessage){
  const target=$(targetId);
  if(!issues.length){
    target.innerHTML=`<div class="validator-no-issues">${escapeHtml(emptyMessage)}</div>`;
    return;
  }
  target.innerHTML=issues.map(issue=>`
    <div class="validator-issue">
      <code>${escapeHtml(issue.path)}</code>
      ${escapeHtml(issue.message)}
    </div>
  `).join("");
}

$("openValidatorBtn").addEventListener("click",openValidator);
$("validatorBackBtn").addEventListener("click",()=>routeTo(state.lastValidatorRoute || "dashboardView"));
$("validatorChooseBtn").addEventListener("click",()=>$("validatorFileInput").click());
$("validatorFileInput").addEventListener("change",e=>handleValidatorFile(e.target.files?.[0]));

const validatorDropZone=$("validatorDropZone");
["dragenter","dragover"].forEach(eventName=>{
  validatorDropZone.addEventListener(eventName,e=>{
    e.preventDefault();
    validatorDropZone.classList.add("dragging");
  });
});
["dragleave","drop"].forEach(eventName=>{
  validatorDropZone.addEventListener(eventName,e=>{
    e.preventDefault();
    validatorDropZone.classList.remove("dragging");
  });
});
validatorDropZone.addEventListener("drop",e=>handleValidatorFile(e.dataTransfer?.files?.[0]));
validatorDropZone.addEventListener("keydown",e=>{
  if(e.key==="Enter" || e.key===" "){
    e.preventDefault();
    $("validatorFileInput").click();
  }
});

$("validateAnotherBtn").addEventListener("click",()=>{
  resetValidator();
  $("validatorFileInput").click();
});

$("copyRegistryBtn").addEventListener("click",async()=>{
  if(!state.validatorRegistryEntry)return;
  try{
    await navigator.clipboard.writeText(JSON.stringify(state.validatorRegistryEntry,null,2));
    showToast("Registry entry copied.");
  }catch{
    showToast("Could not copy automatically. Select the code manually.");
  }
});

function renderProfile(){
  const stats=getStats();
  $("profileBest").textContent=stats.best===null?"—":`${stats.best}%`;
  $("profileAttempts").textContent=stats.attempts;
  $("profileCompleted").textContent=stats.completed;
  const target=$("profileAchievements");target.innerHTML="";
  stats.badges.forEach(a=>{
    const card=document.createElement("div");
    card.className=`achievement-card ${a.unlocked?"":"locked"}`;
    card.innerHTML=`<span>${a.icon}</span><strong>${a.title}</strong><small>${a.unlocked?"Unlocked":a.desc}</small>`;
    target.appendChild(card);
  });
}
function openProfile(){renderProfile();$("drawerBackdrop").classList.remove("hidden");$("profileDrawer").classList.add("open");$("profileDrawer").setAttribute("aria-hidden","false")}
function closeProfile(){$("drawerBackdrop").classList.add("hidden");$("profileDrawer").classList.remove("open");$("profileDrawer").setAttribute("aria-hidden","true")}
$("profileButton").addEventListener("click",openProfile);$("profileClose").addEventListener("click",closeProfile);$("drawerBackdrop").addEventListener("click",closeProfile);
$("changeNameBtn").addEventListener("click",()=>{
  closeProfile();closeRankedIdentity();clearStudentName();state.studentName="";syncUserUI();
  $("studentName").value="";$("returningUserEntry").classList.add("hidden");$("newUserEntry").classList.remove("hidden");routeTo("welcomeView");
});

function showToast(message){
  const t=document.createElement("div");t.className="toast";t.textContent=message;$("toastContainer").appendChild(t);
  setTimeout(()=>t.remove(),2600);
}

async function init(){
  applyTheme(getTheme());
  state.playerId=getPlayerId();

  let dataLoaded=false;
  try{
    await loadData();
    dataLoaded=true;
  }catch(e){
    console.error(e);
    $("examLoadError").textContent="Could not load platform data. Open this project through GitHub Pages or a local web server.";
    $("examLoadError").classList.remove("hidden");
  }

  if(!dataLoaded){
    window.__DIGILIANS_SHOW_FATAL__?.("Platform data could not be loaded.");
    return;
  }

  state.studentName=getStudentName();syncUserUI();
  retryPendingAttempts();
  if(state.studentName){
    $("returningUserEntry").classList.remove("hidden");$("newUserEntry").classList.add("hidden");
    $("returningUserName").textContent=state.studentName;
    routeTo("welcomeView");
  }else routeTo("welcomeView");

  window.__DIGILIANS_APP_READY__=true;
  window.__DIGILIANS_CLEAR_FATAL__?.();
}
init().catch(error=>{
  console.error("Fatal application startup error:",error);
  window.__DIGILIANS_SHOW_FATAL__?.("The application could not start correctly.");
});
