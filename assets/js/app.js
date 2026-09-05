import {
  getStudentName,setStudentName,clearStudentName,getPlayerId,getTheme,setTheme,getResults,saveResult,initializeStorageSafety,
  getPrimaryTrack,setPrimaryTrack,getRankingPreferences,setRankingMode as persistRankingMode,setRankingTrackPreference,setLastRankingExamId,setVoucherRankingTrackPreference,setVoucherRankingExamPreference,
  markResultSynced,getBestForExam,getPreviousBestForExam,saveExamProgress,getExamProgress,clearExamProgress,
  getStudyProgress,updateStudyProgress,clearStudyProgress,
  getQuickCheckState,saveQuickCheckState,clearQuickCheckState,
  setLastCourse,getPendingAttempts,queuePendingAttempt,removePendingAttempt,
  getOfficialQbankState,getOfficialTrackState,updateOfficialTrackState,toggleOfficialBookmark,markOfficialReviewed,saveOfficialMistakes,clearOfficialMistakeFlags
} from "./storage.js?v=0.22.2";

import {validateExamPayload,calculateResult,formatDuration,isAnswered,isQuestionAnswered,isAnswerCorrect,correctAnswerIds,selectedAnswerIds} from "./exam.js";
import {submitAttemptOnline,getLeaderboard,fetchAttemptsForExamIds,syncRankingAvatarProfile,fetchRankingProfiles,syncVoucherPrimaryTrack,fetchVoucherPrimaryTracks} from "./online.js?v=0.22.2";
import {buildAggregateLeaderboard} from "./ranking-engine.js";
import {isRankingMode,isVoucherRankingMode,findRankingLevel,buildRankingScope} from "./ranking-scopes.js?v=0.22.2";
import {validateExamJson,buildRegistryEntry} from "./json-validator.js";
import {validateQuestionBank,buildBankRegistryEntry} from "./bank-validator.js";
import {getBlueprintReadiness,buildExamFromBlueprint} from "./bank-engine.js";
import {evaluateTrackReadiness,finalStatusFromTracks} from "./readiness.js";
import {evaluateCoverageReadiness,topicPerformance} from "./coverage-engine.js";
import {loadOfficialTrack,loadOfficialSection,buildOfficialSectionExam,buildOfficialTrackExam,buildOfficialFinal,officialSectionExamId,officialTrackRandomExamId,getOfficialTrack} from "./official-qbank.js";
import {normalizeStudyText,formatStudyMixedText} from "./study-format.js";
import {renderPythonLessonV2,chartDecisionOptions,chartSvg} from "./python-study-render.js";
import {renderSqlStudySectionHtml} from "./sql-study-render.js";
import {renderExcelStudySectionHtmlV2,renderExcelGroupOverview,renderExcelGroupHeader} from "./excel-study-render.js";
import {renderTechnicalQuestion,renderTechnicalOption,renderTechnicalRichText,analyzeTechnicalContent,displayTopicForQuestion} from "./technical-content.js?v=0.22.2";
import {recordMistakeOutcome,seedMistake,getMistakes,getMistake,getMistakeSummary,topicWeakness,questionFromMistake,isPracticeableMistakeQuestion,patchMistakeContext,clearMistakesForOwner,removeMistake,shouldRecordMistakeOutcome,isLegacyUnansweredOfficialSeed,MASTERY_STREAK} from "./mistakes.js?v=0.22.2";
import {getAvatarProfile,hasAvatarProfile,renderAvatarInto,openAvatarPicker,avatarMarkup} from "./avatar-profile.js?v=0.22.2";
import {resolveModuleExamId,moduleAssessmentState,shouldSyncAttemptOnline} from "./module-assessment.js?v=0.22.2";
import {createUuid} from "./runtime-compat.js?v=0.22.2";
import {buildExcelTrackResultMetadata} from "./excel-track-results.js?v=0.22.2";
import {resolveLearningFlowExam,buildLearningFlowExamCard,shouldRenderStandaloneTrackExamRow} from "./learning-flow.js?v=0.22.2";
import {
  validateVoucherRegistry,validateVoucherTrackRegistry,validateVoucherExamConfig,trackAvailability,
  selectVoucherQuestions,shuffleVoucherOptions,buildVoucherExamPayload,
  getVoucherSeenQuestionIds,markVoucherQuestionsSeen,saveVoucherAttempt,getBestVoucherAttempt,getVoucherAttempts,
  getVoucherSourcePracticeState,saveVoucherSourcePracticeResult,
  voucherRankingActivityId,isVoucherRankEligibleAttempt,buildVoucherExamLeaderboard,buildVoucherTrackOverallLeaderboard,
  VOUCHER_TIMER_PHASE_SOLVING,VOUCHER_TIMER_PHASE_FEEDBACK,voucherTimerPhaseForQuestion,applyVoucherRankedAwayTime,voucherRankedSolveTimeSeconds,
  voucherReadinessLevel,voucherRankedImprovement,voucherWeakDomains,voucherNextRankTarget,selectVoucherImprovementQuestions,
  validateVoucherContentArchitecture,buildVoucherContentArchitectureView,questionsForVoucherSession,findVoucherContentArchitectureSession,
  findVoucherContentArchitectureDomain,sessionsForVoucherDomain,questionsForVoucherDomain,
  voucherSessionRankingActivityId,buildVoucherSessionLeaderboard,resolveVoucherSessionRankStatus,firstPassPercentage,buildVoucherSessionAttemptMeta,buildVoucherSessionOnlineOverrides,
  voucherDomainRankingActivityId,buildVoucherDomainLeaderboard,buildVoucherOverallLeaderboard,resolveVoucherDomainRankStatus,buildVoucherDomainAttemptMeta,buildVoucherDomainOnlineOverrides,
  buildVoucherDomainNavigatorModel,buildVoucherSectionAnalytics
} from "./voucher-engine.js?v=0.22.2";
import {
  createExamSession,resolveExamMode,
  selectSingleAnswerState,toggleMultiSelectAnswerState,confirmMultiSelectAnswerState,confirmVoucherRankedAnswerState,updateStructuredAnswerState,confirmStructuredAnswerState,
  isStructuredQuestion,structuredFields,structuredFieldChoices,structuredAnswerFields,structuredAnswerComplete,structuredExpectedDisplay,structuredSelectedDisplay,structuredFieldCorrect,
  normalizeNavigatorFilter,toggleMarkedQuestionState,moveQuestionIndex,setQuestionIndex,
  examTimerPolicyLabel,
  buildExamProgressSnapshot,getActiveExamProgress,effectiveSavedRemainingSeconds,voucherSavedAttemptMatches as matchesVoucherSavedAttempt,
  feedbackStateForQuestion,voucherSelectionStatusText,isMultiSelectQuestion as isMultiSelectFeedbackQuestion,
  buildSubjectBreakdown as buildExamSubjectBreakdown,buildStandardResultRecord,buildOnlineAttemptPayload,resultHeadline
} from "./exam-engine.js?v=0.22.2";

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
  excelExplorerGroupId:null,
  excelStudyGroupId:null,
  excelStudyStartSectionId:null,
  currentExam:null,
  currentRegistryItem:null,
  examMode:null,
  answers:{},
  firstPassAnswers:{},
  firstPassCommitted:{},
  confirmedMultiAnswers:{},
  confirmedVoucherAnswers:{},
  voucherTimerPhase:null,
  voucherNavigatorFilter:"all",
  markedQuestions:[],
  currentIndex:0,
  feedbackMode:"instant",
  startedAt:null,
  remainingSeconds:null,
  timerId:null,
  timerPolicy:"none",
  timerSuspendedAt:null,
  solvePauseStartedAt:null,
  studyObserver:null,
  activeStudySectionId:null,
  lastResult:null,
  previousBest:null,
  filter:"All",
  playerId:null,
  primaryTrackId:"",
  rankingExamId:null,
  rankingMode:"junior-overall",
  rankingTrackLevelId:"junior-data-analysis",
  rankingTrackId:"excel",
  rankingRequestId:0,
  rankingAvatarMap:new Map(),
  lastValidatorRoute:"dashboardView",
  validatorPayload:null,
  validatorRegistryEntry:null,
  officialRegistry:{tracks:[],levels:[]},officialFinalBlueprints:[],
  officialLevelId:"junior-data-analysis",officialTrackId:null,officialSectionId:null,officialQuestions:[],officialFiltered:[],officialIndex:0,
  currentRankedActivity:false,identityContinuation:null,
  mistakesOfficialSeeded:false,
  mistakesStatusFilter:"active",
  mistakesPracticeSummary:null,
  mistakesPracticeKeys:[],
  voucherRegistry:{tracks:[]},
  voucherTrackRegistries:{},
  voucherLoadError:null,
  voucherTrackId:null,
  voucherExamId:null,
  voucherExamEntry:null,
  voucherExamConfig:null,
  voucherExamError:null,
  voucherContentArchitecture:null,
  voucherSelectedDomainId:null,
  voucherSelectedSessionId:null,
  voucherSourceReviewSourceId:null,
  voucherSourceReviewBank:null,
  voucherSourceReviewIndex:0,
  voucherSourceReviewFilter:"all",
  voucherSourceReviewParts:[],
  voucherSourceReviewPartId:"all",
  voucherSourcePracticeSelections:{},
  voucherSourcePracticeNativeInputs:{},
  voucherSourcePracticeRetrying:new Set(),
  voucherFullRankedIndex:null,
  voucherFullRankedIndexByQuestion:new Map(),
  voucherSourceRevealOpened:new Set(),
  voucherSourceSolveQuestionId:null,
  voucherSourceSolveStartedAt:null,
  voucherSourcePendingSeconds:{},
  voucherRuntimeSelection:null,
  voucherRankingMode:"exam",
  voucherRankingTrackId:null,
  voucherRankingExamId:null,
  voucherRankingSessionId:null,
  voucherRankingDomainId:null,
  voucherRankingRequestId:0,
  voucherFullRankLastSyncSignature:""
};

const $=id=>document.getElementById(id);
const views=["welcomeView","dashboardView","voucherView","voucherTrackView","voucherExamView","voucherSourceReviewView","voucherRankingView","learnView","excelModuleExplorerView","excelGroupExplorerView","studyView","officialQbankView","officialJuniorView","officialTrackView","officialStudyView","examsView","mistakesView","setupView","examView","resultView","reviewView","rankingView","analyticsView","validatorView"];

function emitAnalytics(eventType,detail={}){
  try{
    window.dispatchEvent(new CustomEvent("digilians:analytics",{
      detail:{eventType,...detail}
    }));
  }catch{}
}


function initials(name){
  return (name || "Guest").trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join("") || "G";
}

function resetVoucherRouteScroll(id){
  if(!["voucherView","voucherTrackView","voucherExamView","voucherSourceReviewView","voucherRankingView"].includes(id))return false;
  window.scrollTo({top:0,left:0,behavior:"auto"});
  return true;
}

function setVoucherFocusMode(active){
  const enabled=Boolean(active);
  document.body.classList.toggle("voucher-focus-mode",enabled);
  $("voucherNavSummary")?.classList.toggle("hidden",!enabled);
  $("voucherNavFilters")?.classList.toggle("hidden",!enabled);
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
  setVoucherFocusMode(id==="examView" && Boolean(state.currentExam?.exam?.generatedFromVoucher));
  updateNav(id);
  if(!resetVoucherRouteScroll(id))window.scrollTo({top:0,behavior:"smooth"});
  if(id==="dashboardView") renderDashboard();
  if(id==="voucherView") renderVoucherHub();
  if(id==="voucherTrackView") renderVoucherTrack();
  if(id==="voucherExamView") renderVoucherExam();
  if(id==="voucherSourceReviewView") renderVoucherSourceReview();
  if(id==="voucherRankingView") renderVoucherRankingShell();
  if(id==="learnView") renderLearn();
  if(id==="excelModuleExplorerView") renderExcelModuleExplorer();
  if(id==="excelGroupExplorerView") renderExcelGroupExplorer();
  if(id==="officialQbankView") renderOfficialHub();
  if(id==="officialJuniorView") renderOfficialJuniorHub();
  if(id==="officialTrackView") renderOfficialTrackHub();
  if(id==="examsView") renderExamLibrary($("examSearch")?.value || "");
  if(id==="mistakesView") void renderMistakes();
  if(id==="rankingView"){renderRankedResumeBanner();renderRanking()}
}

function updateNav(viewId){
  const map={dashboardView:"dashboardView",voucherView:"voucherView",voucherTrackView:"voucherView",voucherExamView:"voucherView",voucherSourceReviewView:"voucherView",voucherRankingView:"voucherView",learnView:"learnView",excelModuleExplorerView:"learnView",excelGroupExplorerView:"learnView",studyView:"learnView",officialQbankView:"officialQbankView",officialJuniorView:"officialQbankView",officialTrackView:"officialQbankView",officialStudyView:"officialQbankView",examsView:"examsView",mistakesView:"mistakesView",rankingView:"rankingView"};
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

const PRIMARY_TRACK_TITLES={
  "data-analysis":"Data Analysis",
  marketing:"Marketing",
  "graphic-design":"Graphic Design",
  "ui-ux":"UI/UX",
  "media-production":"Media Production"
};
let primaryTrackContinuation=null;
let primaryTrackChooserMode="required";

function primaryTrackTitle(trackId){return PRIMARY_TRACK_TITLES[String(trackId||"")]||"Not selected"}

function syncUserUI(){
  const name=state.studentName || "Guest";
  const avatarProfile=getAvatarProfile();
  ["profileAvatar","drawerAvatar"].forEach(id=>renderAvatarInto($(id),avatarProfile,name));
  $("profileName").textContent=name;
  $("drawerName").textContent=name;
  $("rankingLocalName").textContent=name;
  if($("profilePrimaryTrack"))$("profilePrimaryTrack").textContent=primaryTrackTitle(state.primaryTrackId||getPrimaryTrack());
}

function closePrimaryTrackChooser({force=false}={}){
  if(primaryTrackChooserMode==="required"&&!force)return false;
  const modal=$("primaryTrackModal");
  if(!modal)return false;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
  $("primaryTrackError").textContent="";
  if(primaryTrackChooserMode!=="required")primaryTrackContinuation=null;
  return true;
}

async function savePrimaryTrackChoice(){
  const selected=document.querySelector('input[name="primaryTrackOption"]:checked')?.value||"";
  if(!setPrimaryTrack(selected)){
    $("primaryTrackError").textContent="Choose one primary track to continue.";
    return;
  }
  state.primaryTrackId=selected;
  syncUserUI();
  const continuation=primaryTrackContinuation;
  const changed=primaryTrackChooserMode==="change";
  primaryTrackContinuation=null;
  $("primaryTrackModal").classList.add("hidden");
  $("primaryTrackModal").setAttribute("aria-hidden","true");
  $("primaryTrackError").textContent="";
  try{await syncVoucherPrimaryTrack(state.playerId,selected)}catch(error){console.warn("Voucher Primary Track sync unavailable:",error)}
  if(changed)showToast(`Primary Track updated: ${primaryTrackTitle(selected)}`);
  continuation?.();
}

function ensurePrimaryTrack({required=true,onDone=null,mode="required"}={}){
  const current=getPrimaryTrack();
  state.primaryTrackId=current;
  if(current && mode!=="change"){
    syncUserUI();
    onDone?.();
    return true;
  }
  primaryTrackChooserMode=mode;
  primaryTrackContinuation=onDone;
  $("primaryTrackModalTitle").textContent=mode==="change"?"Change your primary track":"Choose your primary track";
  $("primaryTrackModalSubtitle").textContent=mode==="change"
    ?"Your next Voucher Track Overall competition will use this track. Existing progress and attempts stay untouched."
    :"This sets your official Voucher Track Overall competition. You can still explore every track.";
  document.querySelectorAll('input[name="primaryTrackOption"]').forEach(input=>{input.checked=input.value===current});
  $("primaryTrackCancelBtn").classList.toggle("hidden",Boolean(required)&&mode!=="change");
  $("primaryTrackError").textContent="";
  $("primaryTrackModal").classList.remove("hidden");
  $("primaryTrackModal").setAttribute("aria-hidden","false");
  setTimeout(()=>document.querySelector('input[name="primaryTrackOption"]:checked')?.focus()||document.querySelector('input[name="primaryTrackOption"]')?.focus(),40);
  return false;
}

$("primaryTrackSaveBtn")?.addEventListener("click",savePrimaryTrackChoice);
$("primaryTrackCancelBtn")?.addEventListener("click",()=>closePrimaryTrackChooser());
$("primaryTrackModal")?.addEventListener("click",event=>{if(event.target===$("primaryTrackModal"))closePrimaryTrackChooser()});

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

  const continueRanked=async()=>{
    syncUserUI();
    await syncCurrentAvatarToRanking();
    ensurePrimaryTrack({required:true,onDone:()=>{
      showToast(`Ranked profile saved: ${name}`);
      continuation?.();
    }});
  };

  if(!hasAvatarProfile()){
    openAvatarPicker({mode:"onboarding",name,onDone:continueRanked});
  }else{
    continueRanked();
  }
}
$("rankedIdentitySaveBtn")?.addEventListener("click",saveRankedIdentity);
$("rankedIdentityCancelBtn")?.addEventListener("click",closeRankedIdentity);
$("rankedIdentityName")?.addEventListener("keydown",e=>{if(e.key==="Enter")saveRankedIdentity();if(e.key==="Escape")closeRankedIdentity()});
$("rankedIdentityModal")?.addEventListener("click",e=>{if(e.target===$("rankedIdentityModal"))closeRankedIdentity()});

function setEntryControlsReady(ready){
  const start=$("startBtn");
  const resume=$("continueUserBtn");
  if(start){
    start.disabled=!ready;
    start.setAttribute("aria-disabled",String(!ready));
    start.innerHTML=ready?'Enter Platform <span>→</span>':'Loading Platform…';
  }
  if(resume){
    resume.disabled=!ready;
    resume.setAttribute("aria-disabled",String(!ready));
    resume.innerHTML=ready?'Continue <span>→</span>':'Loading…';
  }
}

function handleNameSubmit(){
  if($("startBtn")?.disabled)return;
  const name=$("studentName").value.trim();
  if(name.length<2){
    $("nameError").textContent="Please enter a valid name.";
    return;
  }
  $("nameError").textContent="";
  setStudentName(name);
  state.studentName=name;
  syncUserUI();

  const enterPlatform=async()=>{
    syncUserUI();
    await syncCurrentAvatarToRanking();
    ensurePrimaryTrack({required:true,onDone:()=>{
      showToast(`Welcome, ${name}`);
      routeTo("dashboardView");
    }});
  };

  if(!hasAvatarProfile()){
    openAvatarPicker({mode:"onboarding",name,onDone:enterPlatform});
  }else{
    enterPlatform();
  }
}
$("startBtn").addEventListener("click",handleNameSubmit);
$("studentName").addEventListener("keydown",e=>{if(e.key==="Enter")handleNameSubmit()});
$("continueUserBtn").addEventListener("click",()=>{
  const continueToDashboard=()=>ensurePrimaryTrack({required:true,onDone:()=>routeTo("dashboardView")});
  if(state.studentName && !hasAvatarProfile()){
    openAvatarPicker({
      mode:"rollout",
      required:true,
      name:state.studentName,
      onDone:async()=>{syncUserUI();await syncCurrentAvatarToRanking();continueToDashboard()}
    });
    return;
  }
  continueToDashboard();
});

function openReturningUserAvatarRollout(){
  if(!state.studentName || hasAvatarProfile())return false;
  openAvatarPicker({
    mode:"rollout",
    required:true,
    name:state.studentName,
    onDone:async()=>{
      syncUserUI();
      await syncCurrentAvatarToRanking();
      showToast("Avatar saved — welcome back!");
      ensurePrimaryTrack({required:true,onDone:()=>routeTo("dashboardView")});
    }
  });
  return true;
}

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
  const rankingPreferences=getRankingPreferences();
  if(isRankingMode(rankingPreferences.mode))state.rankingMode=rankingPreferences.mode;
  if(rankingPreferences.trackLevelId)state.rankingTrackLevelId=rankingPreferences.trackLevelId;
  if(rankingPreferences.trackId)state.rankingTrackId=rankingPreferences.trackId;
  if(rankingPreferences.voucherTrackId)state.voucherRankingTrackId=rankingPreferences.voucherTrackId;
  if(rankingPreferences.voucherExamId)state.voucherRankingExamId=rankingPreferences.voucherExamId;

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
  await loadVoucherRegistryData();
}

async function loadVoucherRegistryData(){
  state.voucherLoadError=null;
  state.voucherRegistry={tracks:[]};
  state.voucherTrackRegistries={};
  try{
    const registry=await loadJson("voucher/registry.json");
    const errors=validateVoucherRegistry(registry);
    if(errors.length)throw new Error(errors.join("; "));
    state.voucherRegistry=registry;
    const children={};
    await Promise.all((registry.tracks||[]).map(async track=>{
      try{
        const child=await loadJson(track.registryFile);
        const childErrors=validateVoucherTrackRegistry(child,track.id);
        if(childErrors.length)throw new Error(childErrors.join("; "));
        children[track.id]=child;
      }catch(error){
        console.warn("Voucher track registry unavailable:",track.id,error);
        children[track.id]={schemaVersion:1,trackId:track.id,title:track.title,exams:[],unavailable:true};
      }
    }));
    state.voucherTrackRegistries=children;
  }catch(error){
    console.warn("Voucher registry unavailable:",error);
    state.voucherLoadError=error?.message||"Voucher data could not be loaded.";
  }
}

function voucherTrackMeta(trackId){
  return (state.voucherRegistry.tracks||[]).find(track=>track.id===trackId)||null;
}

const voucherTrackPresentation={
  "data-analysis":{tone:"data",index:"01",mark:"DA",tagline:"Think in data. Decide with confidence.",meta:"Analytics • Insights • Decisions"},
  "marketing":{tone:"marketing",index:"02",mark:"MK",tagline:"Turn ideas into measurable growth.",meta:"Strategy • Growth • Campaigns"},
  "graphic-design":{tone:"design",index:"03",mark:"GD",tagline:"Train your eye. Sharpen your craft.",meta:"Visuals • Creativity • Design"},
  "ui-ux":{tone:"ux",index:"04",mark:"UX",tagline:"Design experiences people understand.",meta:"Research • Flows • Interfaces"},
  "media-production":{tone:"media",index:"05",mark:"MP",tagline:"Create with purpose. Produce with impact.",meta:"Story • Production • Media"}
};

function renderVoucherHomeCard(){
  if($("voucherHomePrimaryTrack"))$("voucherHomePrimaryTrack").textContent=primaryTrackTitle(state.primaryTrackId||getPrimaryTrack());
}

function renderVoucherHub(){
  const grid=$("voucherTrackGrid");
  if(!grid)return;
  if(state.voucherLoadError){
    grid.innerHTML=`<article class="voucher-empty-card"><span>VOUCHER</span><h3>Voucher is temporarily unavailable</h3><p>${escapeHtml(state.voucherLoadError)}</p></article>`;
    return;
  }
  const primary=state.primaryTrackId||getPrimaryTrack();
  grid.innerHTML=(state.voucherRegistry.tracks||[]).map(track=>{
    const child=state.voucherTrackRegistries[track.id];
    const availability=trackAvailability(child);
    const ready=availability==="ready"&&!child?.unavailable;
    const count=Array.isArray(child?.exams)?child.exams.length:0;
    const presentation=voucherTrackPresentation[track.id]||{tone:"default",index:"--",mark:track.title.slice(0,2).toUpperCase(),tagline:"Prepare with focused mock practice.",meta:"Voucher preparation"};
    return `<article class="voucher-track-card ${ready?"is-ready":"is-coming-soon"}" data-voucher-tone="${escapeHtml(presentation.tone)}">
      <div class="voucher-track-card-head">
        <span class="voucher-track-icon" aria-hidden="true">${escapeHtml(presentation.mark)}</span>
        <span class="voucher-track-number">${escapeHtml(presentation.index)}</span>
        ${primary===track.id?'<span class="voucher-your-track">YOUR TRACK</span>':''}
      </div>
      <div class="voucher-track-content">
        <span class="eyebrow">VOUCHER TRACK</span>
        <h3>${escapeHtml(track.title)}</h3>
        <p class="voucher-track-tagline">${escapeHtml(presentation.tagline)}</p>
        <div class="voucher-track-meta">${escapeHtml(presentation.meta)}</div>
      </div>
      ${ready?`<div class="voucher-track-ready"><span>${count} released exam${count===1?"":"s"}</span><button type="button" class="primary-btn wide" data-voucher-track="${escapeHtml(track.id)}">Open Track <span>→</span></button></div>`:`<div class="voucher-coming-soon-panel"><span class="voucher-coming-soon"><i></i> Coming Soon</span><small>Mocks and detailed explanations are being prepared from approved source PDFs.</small></div>`}
    </article>`;
  }).join("");
  grid.querySelectorAll("[data-voucher-track]").forEach(button=>button.addEventListener("click",()=>openVoucherTrack(button.dataset.voucherTrack)));
}

function openVoucherTrack(trackId){
  const meta=voucherTrackMeta(trackId);
  if(!meta)return;
  state.voucherTrackId=trackId;
  state.voucherExamId=null;
  state.voucherExamEntry=null;
  state.voucherExamConfig=null;
  state.voucherExamError=null;
  state.voucherContentArchitecture=null;
  state.voucherSelectedDomainId=null;
  state.voucherSelectedSessionId=null;
  routeTo("voucherTrackView");
}

function renderVoucherTrackExamCard(exam,config,{featured=false}={}){
  const reviewed=Number(config?.masterBankQuestionCount)||0;
  const realCount=Number(config?.realExam?.questionCount)||0;
  const duration=Number(config?.realExam?.durationMinutes)||0;
  const pass=Number(config?.passingScore)||0;
  const subtitle=config?.subtitle||exam.subtitle||"Certification mock preparation";
  return `<article class="voucher-exam-card ${featured?"is-featured":""}" data-voucher-exam-card="${escapeHtml(exam.id)}">
    <div class="voucher-exam-card-copy">
      <span class="eyebrow">VOUCHER EXAM</span>
      <h3>${escapeHtml(exam.title||exam.id)}</h3>
      <p>${escapeHtml(subtitle)}</p>
      ${config?`<div class="voucher-exam-stat-row"><span><strong>${reviewed}</strong> Reviewed</span><span><strong>${realCount}</strong> Real Exam</span><span><strong>${duration}</strong> Min</span><span><strong>${pass}%</strong> Pass</span><span class="ranked">RANKED</span></div>`:"<div class=\"voucher-exam-stat-row is-loading\"><span>Loading live exam details…</span></div>"}
    </div>
    <button type="button" class="primary-btn voucher-exam-open-btn" data-voucher-exam="${escapeHtml(exam.id)}">Prepare for ${escapeHtml(exam.title||"Exam")} <span>→</span></button>
  </article>`;
}

async function renderVoucherTrack(){
  const trackId=state.voucherTrackId;
  const meta=voucherTrackMeta(trackId);
  const child=state.voucherTrackRegistries[trackId];
  if(!meta||!child){routeTo("voucherView");return}
  $("voucherTrackTitle").textContent=meta.title;
  $("voucherTrackBreadcrumb").textContent=`Voucher / ${meta.title}`;
  const grid=$("voucherExamGrid");
  if(child.unavailable){
    grid.innerHTML='<article class="voucher-empty-card"><h3>Track unavailable</h3><p>This track registry could not be loaded. Other platform areas are unaffected.</p></article>';
    return;
  }
  if(!child.exams.length){
    grid.innerHTML=`<article class="voucher-empty-card"><span class="voucher-coming-soon">Coming Soon</span><h3>${escapeHtml(meta.title)} mocks are being prepared</h3><p>No production Voucher exam is released in this track yet.</p></article>`;
    return;
  }
  grid.innerHTML=child.exams.map((exam,index)=>renderVoucherTrackExamCard(exam,null,{featured:index===0})).join("");
  grid.querySelectorAll("[data-voucher-exam]").forEach(button=>button.addEventListener("click",()=>void openVoucherExam(button.dataset.voucherExam)));
  const hydrated=await Promise.all(child.exams.map(async (exam,index)=>{
    try{
      const {config}=await loadVoucherExamConfig(trackId,exam.id);
      return renderVoucherTrackExamCard(exam,config,{featured:index===0});
    }catch(error){
      console.warn("Voucher track card metadata unavailable:",exam.id,error);
      return renderVoucherTrackExamCard(exam,null,{featured:index===0});
    }
  }));
  if(state.voucherTrackId!==trackId||!$("voucherTrackView")?.classList.contains("active"))return;
  grid.innerHTML=hydrated.join("");
  grid.querySelectorAll("[data-voucher-exam]").forEach(button=>button.addEventListener("click",()=>void openVoucherExam(button.dataset.voucherExam)));
}

async function loadVoucherExamConfig(trackId,examId){
  const child=state.voucherTrackRegistries[trackId];
  const entry=(child?.exams||[]).find(exam=>exam.id===examId);
  if(!entry)throw new Error("Voucher exam is not registered.");
  if(!entry.configFile)throw new Error("Exam configuration is missing.");
  const config=await loadJson(entry.configFile);
  const errors=validateVoucherExamConfig(config);
  if(errors.length)throw new Error(errors.join("; "));
  if(config.trackId!==trackId||config.id!==examId)throw new Error("Exam registry/config identity mismatch.");
  return {entry,config};
}

function ensurePl300Styles(doc=globalThis.document){
  if(!doc?.head||doc.querySelector('link[data-pl300-styles]'))return;
  const link=doc.createElement('link');
  link.rel='stylesheet';
  link.href='assets/css/pl300.css?v=0.22.2';
  link.dataset.pl300Styles='1';
  doc.head.append(link);
}

async function openVoucherExam(examId){
  if(String(examId)==="microsoft-pl-300")ensurePl300Styles();
  state.voucherExamId=examId;
  state.voucherExamEntry=null;
  state.voucherExamConfig=null;
  state.voucherExamError=null;
  state.voucherContentArchitecture=null;
  state.voucherSelectedDomainId=null;
  state.voucherSelectedSessionId=null;
  try{
    const {entry,config}=await loadVoucherExamConfig(state.voucherTrackId,examId);
    state.voucherExamEntry=entry;
    state.voucherExamConfig=config;
    if(config.contentArchitectureFile){
      try{
        const architecture=await loadJson(config.contentArchitectureFile);
        state.voucherContentArchitecture=architecture;
        state.voucherSelectedDomainId=architecture?.domains?.[0]?.id||null;
      }catch(architectureError){
        console.warn("Voucher content architecture unavailable:",architectureError);
      }
    }
  }catch(error){
    console.warn("Voucher exam configuration unavailable:",error);
    state.voucherExamError=error?.message||"Voucher exam configuration could not be loaded.";
  }
  routeTo("voucherExamView");
}

function voucherRandomSizeButtons(config){
  const available=Number(config?.masterBankQuestionCount||0);
  const choices=[25,50,100].filter(size=>!available||available>=size).map(size=>`<button type="button" class="voucher-size-btn" data-voucher-size="${size}" aria-pressed="false"><strong>${size}</strong><small>Questions</small></button>`);
  choices.push(`<button type="button" class="voucher-size-btn full-reviewed" data-voucher-size="full-bank" aria-pressed="false"><strong>Full Reviewed Bank</strong><small>${available||"All"} Questions</small></button>`);
  return choices.join("");
}

function voucherModeControls(prefix,{timed=true,feedback="exam"}={}){
  return `<div class="voucher-mode-grid compact">
    <fieldset><legend>Timing</legend><label><input type="radio" name="${prefix}Timed" value="timed" ${timed?"checked":""}> Timed</label><label><input type="radio" name="${prefix}Timed" value="untimed" ${!timed?"checked":""}> Untimed</label></fieldset>
    <fieldset><legend>Feedback</legend><label><input type="radio" name="${prefix}Feedback" value="exam" ${feedback==="exam"?"checked":""}> Exam Mode</label><label><input type="radio" name="${prefix}Feedback" value="instant" ${feedback==="instant"?"checked":""}> Instant Feedback</label></fieldset>
  </div>`;
}

let voucherSourcePracticeNative=null;
let pl300FullRankedLearning=null;

async function ensurePl300FullRankedLearning(){
  pl300FullRankedLearning??=await import("./pl300-full-ranked-learning.js?v=0.22.2");
  return pl300FullRankedLearning;
}

async function loadVoucherFullRankedIndex(config=state.voucherExamConfig){
  if(state.voucherFullRankedIndex?.examId===config?.id)return state.voucherFullRankedIndex;
  if(!config?.fullRankedLearning?.indexFile)throw new Error("Full Ranked Learning index is unavailable.");
  const index=await loadJson(config.fullRankedLearning.indexFile);
  if(!Array.isArray(index?.records)||Number(index?.questionCount)!==509)throw new Error("Full Ranked Learning index is invalid.");
  state.voucherFullRankedIndex=index;
  state.voucherFullRankedIndexByQuestion=new Map(index.records.map(record=>[String(record.questionId),record]));
  return index;
}

function voucherFullRankRecord(question){
  return question?.id?state.voucherFullRankedIndexByQuestion?.get?.(String(question.id))||null:null;
}

function voucherFullRankMetrics(){
  if(!pl300FullRankedLearning||!state.voucherFullRankedIndex)return null;
  const practice=getVoucherSourcePracticeState(mistakeOwnerId(),state.voucherExamConfig?.id||"microsoft-pl-300");
  return pl300FullRankedLearning.buildPl300FullRankMetrics({index:state.voucherFullRankedIndex,records:practice.records||{}});
}

function voucherSourceStartSolveTimer(question,{force=false}={}){
  if(!question?.id)return;
  const id=String(question.id);
  if(!force&&state.voucherSourceSolveQuestionId===id&&Number.isFinite(Number(state.voucherSourceSolveStartedAt)))return;
  state.voucherSourceSolveQuestionId=id;
  state.voucherSourceSolveStartedAt=Date.now();
}

function voucherSourceConsumeSolveSeconds(question){
  const id=String(question?.id||"");
  if(!id||state.voucherSourceSolveQuestionId!==id||!Number.isFinite(Number(state.voucherSourceSolveStartedAt)))return 0;
  const elapsed=Math.max(0,Math.min(1800,Math.round((Date.now()-Number(state.voucherSourceSolveStartedAt))/1000)));
  state.voucherSourceSolveQuestionId=null;
  state.voucherSourceSolveStartedAt=null;
  return elapsed;
}

function voucherSourceResetSolveTimer(){
  state.voucherSourceSolveQuestionId=null;
  state.voucherSourceSolveStartedAt=null;
}

async function hydrateVoucherFullRankedCard(config){
  if(!config?.fullRankedLearning)return;
  try{
    await ensurePl300FullRankedLearning();
    await loadVoucherFullRankedIndex(config);
    const landing=$("pl300FullRankLanding");
    if(landing){
      landing.className="";
      landing.innerHTML=pl300FullRankedLearning.buildPl300FullRankedLandingMarkup({domainCount:state.voucherContentArchitecture?.domains?.length||4,sessionCount:state.voucherContentArchitecture?.sessions?.length||10});
    }
    const metrics=voucherFullRankMetrics();
    if(!metrics)return;
    if($("pl300FullRankCompletion"))$("pl300FullRankCompletion").textContent=`${metrics.completedOccurrences} / ${metrics.totalOccurrences}`;
    if($("pl300FullRankAccuracy"))$("pl300FullRankAccuracy").textContent=`${metrics.validatedAccuracy}%`;
    if($("pl300FullRankMastery"))$("pl300FullRankMastery").textContent=`${metrics.masteredClusters} / ${metrics.validatedConceptCount}`;
    const start=$("pl300FullRankStartBtn");
    if(start){
      start.textContent=metrics.completedOccurrences>0&&metrics.completedOccurrences<metrics.totalOccurrences?"Continue Full Ranked Bank →":metrics.completedOccurrences>=metrics.totalOccurrences?"Review Full Ranked Bank →":"Start Full Ranked Bank →";
      start.addEventListener("click",()=>requireRankedIdentity(()=>void openVoucherFullRankedLearning({filter:"all",continueIncomplete:true}),"Enter your name before starting the PL-300 Full Ranked Bank."));
    }
    $("pl300FullRankRankingBtn")?.addEventListener("click",()=>requireRankedIdentity(()=>void openVoucherFullRankedLearningRanking(state.voucherTrackId,config.id),"Enter your name to view the PL-300 Full Bank Ranking."));
    if($("voucherArchitecturePanel"))renderVoucherArchitecturePanel();
  }catch(error){console.error("PL-300 Full Ranked card hydration failed",error);}
}

let pl300FullRankSyncTimer=null;

async function syncPl300FullRankSnapshot({force=false}={}){
  const config=state.voucherExamConfig;
  if(!config?.fullRankedLearning||!state.playerId||!state.studentName)return false;
  await ensurePl300FullRankedLearning();
  await loadVoucherFullRankedIndex(config);
  const metrics=voucherFullRankMetrics();
  if(!metrics||metrics.completedOccurrences<=0)return false;
  const signature=[metrics.completedOccurrences,metrics.masteredClusters,metrics.firstPassCorrectClusters,metrics.attemptsToBest,metrics.activeSolveSeconds].join(":");
  if(!force&&signature===state.voucherFullRankLastSyncSignature)return true;
  const payload=pl300FullRankedLearning.buildPl300FullRankOnlineAttempt({
    playerId:state.playerId,studentName:state.studentName,examVersion:"0.22.2",metrics,
    trackId:state.voucherTrackId||config.trackId||"data-analysis",examId:config.id
  });
  await submitAttemptOnline(payload);
  state.voucherFullRankLastSyncSignature=signature;
  return true;
}

function schedulePl300FullRankSync(){
  if(pl300FullRankSyncTimer)clearTimeout(pl300FullRankSyncTimer);
  pl300FullRankSyncTimer=setTimeout(()=>{
    pl300FullRankSyncTimer=null;
    void syncPl300FullRankSnapshot().catch(error=>console.warn("PL-300 Full Ranked Learning sync deferred:",error));
  },1200);
}

async function openVoucherFullRankedLearning({filter="all",continueIncomplete=false}={}){
  try{
    ensurePl300Styles();
    const config=state.voucherExamConfig;
    if(!config)throw new Error("Open Microsoft PL-300 first.");
    await ensurePl300FullRankedLearning();
    await loadVoucherFullRankedIndex(config);
    voucherSourcePracticeNative??=await import("./voucher-source-practice-native.js?v=0.22.2");
    voucherSourcePracticeNative.ensureNativePracticeStyles();
    const sources=config.sourceReviewSources||[];
    if(sources.length!==2)throw new Error("The two PL-300 source review banks are required.");
    const banks=await Promise.all(sources.map(async source=>{
      if(!source?.reviewBankFile)throw new Error("A PL-300 source review bank is unavailable.");
      const bank=await loadJson(source.reviewBankFile);
      if(!Array.isArray(bank?.questions)||!bank.questions.length)throw new Error("A PL-300 source bank has no questions.");
      return {...bank,sourceTitle:source.title||bank.title||source.sourceId};
    }));
    const masterBank=config.masterBankFile?await loadJson(config.masterBankFile):{questions:[]};
    const rawQuestions=banks.flatMap(bank=>bank.questions.map(question=>({...question,sourceTitle:bank.sourceTitle})));
    const questions=pl300FullRankedLearning.enrichPl300SourceQuestionsWithArabic({questions:rawQuestions,index:state.voucherFullRankedIndex,masterQuestions:masterBank?.questions||[]});
    const expected=Number(config.fullRankedLearning?.questionCount)||509;
    if(questions.length!==expected)throw new Error(`Full Ranked Learning expected ${expected} source questions but found ${questions.length}.`);
    state.voucherSourceReviewSourceId="all";
    state.voucherSourceReviewBank={schemaVersion:1,examId:config.id,sourceId:"all",sourceTitle:"Full Ranked Bank — 509 Questions",questionCount:questions.length,questions};
    state.voucherSourceReviewFilter=["all","source-01","source-02","objective","checkpoint"].includes(String(filter))?String(filter):"all";
    state.voucherSourceReviewParts=pl300FullRankedLearning.buildPl300MiniParts({index:state.voucherFullRankedIndex,architecture:state.voucherContentArchitecture,targetSize:18,maxSize:20});
    state.voucherSourceReviewPartId="all";
    state.voucherSourceReviewIndex=0;
    state.voucherSourcePracticeSelections={};
    state.voucherSourcePracticeNativeInputs={};
    state.voucherSourcePracticeRetrying=new Set();
    state.voucherSourceRevealOpened=new Set();
    state.voucherSourcePendingSeconds={};
    voucherSourceResetSolveTimer();
    if(continueIncomplete){
      const filtered=voucherSourceReviewFilteredQuestions();
      const practice=getVoucherSourcePracticeState(mistakeOwnerId(),config.id);
      const nextIndex=filtered.findIndex(question=>!practice.records?.[question.id]);
      state.voucherSourceReviewIndex=nextIndex>=0?nextIndex:0;
    }
    routeTo("voucherSourceReviewView");
  }catch(error){
    console.error("Voucher full ranked learning failed",error);
    showToast(error?.message||"Could not open PL-300 Full Ranked Learning.");
  }
}

function voucherSourceReviewFilteredQuestions(){
  const questions=state.voucherSourceReviewBank?.questions||[];
  const partQuestions=pl300FullRankedLearning?.filterPl300QuestionsByPart
    ?pl300FullRankedLearning.filterPl300QuestionsByPart({questions,partId:state.voucherSourceReviewPartId,parts:state.voucherSourceReviewParts})
    :questions;
  if(state.voucherSourceReviewFilter==="source-01"||state.voucherSourceReviewFilter==="source-02")return partQuestions.filter(q=>String(q.sourceId)===state.voucherSourceReviewFilter);
  if(state.voucherSourceReviewFilter==="objective")return partQuestions.filter(q=>voucherFullRankRecord(q)?.mode==="objective");
  if(state.voucherSourceReviewFilter==="checkpoint")return partQuestions.filter(q=>voucherFullRankRecord(q)?.mode==="checkpoint");
  return partQuestions;
}

function voucherSourcePracticeRecord(question){
  if(!question?.id)return null;
  const practice=getVoucherSourcePracticeState(mistakeOwnerId(),state.voucherExamConfig?.id||"microsoft-pl-300");
  return practice.records?.[question.id]||null;
}

function voucherSourcePracticeCorrectIds(question){
  return (Array.isArray(question?.correctAnswers)&&question.correctAnswers.length?question.correctAnswers:[question?.correctAnswer]).filter(Boolean).map(String);
}

function voucherSourcePracticeSelection(question,record=voucherSourcePracticeRecord(question)){
  const retrying=state.voucherSourcePracticeRetrying?.has?.(String(question?.id||""));
  return pl300FullRankedLearning.sourceAttemptSelection({question,record,tempSelections:state.voucherSourcePracticeSelections,retrying});
}

function voucherSourcePracticeSelectionsMatch(question,selected){
  const expected=[...voucherSourcePracticeCorrectIds(question)].sort();
  const actual=[...(selected||[])].map(String).sort();
  return expected.length===actual.length&&expected.every((id,index)=>id===actual[index]);
}

function voucherSourcePracticeOptionsHtml(question,record){
  if(question?.reviewMode!=="scored-text"||!Array.isArray(question.options)||!question.options.length)return "";
  const retrying=state.voucherSourcePracticeRetrying?.has?.(String(question.id||""));
  const locked=pl300FullRankedLearning.sourceAttemptLocked(record,retrying);
  return pl300FullRankedLearning.buildSourcePracticeOptionsMarkup({question,record,selected:voucherSourcePracticeSelection(question,record),locked,retrying,renderRichText:renderTechnicalRichText});
}


function voucherSourcePracticeSummary(){
  return voucherFullRankMetrics()||{completedOccurrences:0,totalOccurrences:509,completionPercentage:0,masteredClusters:0,validatedConceptCount:265,validatedAccuracy:0,firstPassPercentage:0,checkpointCompletions:0};
}

function voucherSourceReviewAnswerHtml(question,practiceRecord=voucherSourcePracticeRecord(question)){
  return pl300FullRankedLearning.buildPl300FullRankedAnswerMarkup({
    question,completed:Boolean(practiceRecord),revealed:Boolean(practiceRecord)||state.voucherSourceRevealOpened?.has?.(String(question?.id||"")),
    nativeAnswerHtml:question?.reviewMode==="native-structured"?(voucherSourcePracticeNative?.renderNativeAnswer(question,renderTechnicalRichText)||""):"",
    renderRichText:renderTechnicalRichText
  });
}

function renderVoucherSourceReview(){
  const body=$("voucherSourceReviewBody");
  if(!body)return;
  const bank=state.voucherSourceReviewBank;
  if(!bank){
    body.innerHTML='<article class="voucher-empty-card"><h3>Full Ranked Learning unavailable</h3><p>Return to Microsoft PL-300 and open the 509-question ranked bank.</p></article>';
    return;
  }
  const questions=voucherSourceReviewFilteredQuestions();
  if(!questions.length)state.voucherSourceReviewIndex=0;
  state.voucherSourceReviewIndex=Math.max(0,Math.min(state.voucherSourceReviewIndex,Math.max(0,questions.length-1)));
  const q=questions[state.voucherSourceReviewIndex]||null;
  const totalAll=bank.questions?.length||0;
  const source01Count=(bank.questions||[]).filter(item=>item.sourceId==="source-01").length;
  const source02Count=(bank.questions||[]).filter(item=>item.sourceId==="source-02").length;
  const objectiveCount=state.voucherFullRankedIndex?.objectiveOccurrences||0;
  const checkpointCount=state.voucherFullRankedIndex?.checkpointOccurrences||0;
  const sourceTitle="Full Ranked Bank — 509 Questions";
  $("voucherSourceReviewBreadcrumb").textContent=`Voucher / Microsoft PL-300 / Full Ranked Bank`;
  if(!q){
    body.innerHTML='<article class="voucher-empty-card"><h3>No questions in this filter</h3><p>Choose another Full Ranked Learning filter.</p></article>';
    return;
  }
  const rankRecord=voucherFullRankRecord(q);
  const practiceRecord=voucherSourcePracticeRecord(q);
  if(!practiceRecord)voucherSourceStartSolveTimer(q);
  const visualHtml=(q.questionVisuals||[]).map(path=>`<img src="${escapeHtml(path)}" alt="Source visual for question ${escapeHtml(q.questionNumber||"")}" loading="lazy">`).join("");
  const retrying=state.voucherSourcePracticeRetrying?.has?.(String(q.id||""));
  const sourceAttemptLocked=pl300FullRankedLearning.sourceAttemptLocked(practiceRecord,retrying);
  const optionsHtml=voucherSourcePracticeOptionsHtml(q,practiceRecord);
  const nativeHtml=voucherSourcePracticeNative?.renderNativePractice(q,practiceRecord,state.voucherSourcePracticeNativeInputs,{locked:sourceAttemptLocked,retrying})||"";
  const metrics=voucherSourcePracticeSummary();
  const practiceState=getVoucherSourcePracticeState(mistakeOwnerId(),state.voucherExamConfig?.id||"microsoft-pl-300");
  const {partTotal,partCompleted,activePartLabel,partOptionsHtml,filterLabel}=pl300FullRankedLearning.buildPl300PartViewState({parts:state.voucherSourceReviewParts,activePartId:state.voucherSourceReviewPartId,records:practiceState.records||{},totalAll,completedAll:metrics.completedOccurrences,activeFilter:state.voucherSourceReviewFilter});
  const pageLabel=Number(q.pageStart)===Number(q.pageEnd)?`Page ${q.pageStart}`:`Pages ${q.pageStart}–${q.pageEnd}`;
  const objective=rankRecord?.mode==="objective";
  const sourceType=String(q.sourceType||q.reviewMode||"source").replace(/-/g," ").toUpperCase();
  const typeLabel=objective
    ?q.reviewMode==="native-structured"?`${sourceType} / RANKED OBJECTIVE`:`TEXT / RANKED OBJECTIVE`
    :`${sourceType} / RANKED STUDY CHECKPOINT`;
  const recordStatus=practiceRecord
    ?objective?(practiceRecord.everCorrect===true||practiceRecord.correct===true?"STUDIED · MASTERED":"STUDIED · REVIEW"):"STUDIED · CHECKPOINT"
    :"NOT STUDIED";
  const revealOpen=practiceRecord?.mode==="auto"||practiceRecord?.mode==="native"||practiceRecord?.mode==="checkpoint"||practiceRecord?.mode==="self"||state.voucherSourceRevealOpened?.has?.(String(q.id));
  const sourceLabel=q.sourceId==="source-01"?"Source 01":"Source 02";
  body.innerHTML=pl300FullRankedLearning.buildPl300FullRankedReviewMarkup({
    sourceTitle,source01Count,source02Count,objectiveCount,checkpointCount,metrics,activeFilter:state.voucherSourceReviewFilter,totalAll,
    questionsLength:questions.length,currentIndex:state.voucherSourceReviewIndex,filterLabel,objective,typeLabel,sourceLabel,questionNumber:q.questionNumber||"",
    partOptionsHtml,activePartLabel,partCompleted,partTotal,
    occurrence:q.occurrence||1,pageLabel,domainId:rankRecord?.domainId||"",recordStatus,questionHtml:renderTechnicalRichText(q.questionText||""),
    visualHtml,optionsHtml,nativeHtml,revealOpen,answerHtml:voucherSourceReviewAnswerHtml(q,practiceRecord)
  });

  $("sourceReviewPart")?.addEventListener("change",event=>{
    voucherSourceResetSolveTimer();
    const requested=String(event.target?.value||"all");
    state.voucherSourceReviewPartId=requested==="all"||state.voucherSourceReviewParts.some(part=>String(part.id)===requested)?requested:"all";
    state.voucherSourceReviewIndex=0;
    renderVoucherSourceReview();
    window.scrollTo({top:0,behavior:"smooth"});
  });
  body.querySelectorAll('[data-source-review-filter]').forEach(button=>button.addEventListener('click',()=>{
    voucherSourceResetSolveTimer();
    state.voucherSourceReviewFilter=button.dataset.sourceReviewFilter||"all";
    state.voucherSourceReviewIndex=0;
    renderVoucherSourceReview();
  }));
  body.querySelectorAll('[data-source-practice-option]').forEach(button=>button.addEventListener('click',()=>{
    const optionId=String(button.dataset.sourcePracticeOption||"");
    const retrying=state.voucherSourcePracticeRetrying?.has?.(String(q.id||""));
    if(!optionId||q.reviewMode!=="scored-text"||pl300FullRankedLearning.sourceAttemptLocked(practiceRecord,retrying))return;
    voucherSourceStartSolveTimer(q);
    const multi=voucherSourcePracticeCorrectIds(q).length>1;
    const current=voucherSourcePracticeSelection(q,practiceRecord);
    const next=multi
      ?(current.includes(optionId)?current.filter(id=>id!==optionId):[...current,optionId])
      :[optionId];
    state.voucherSourcePracticeSelections[q.id]=next;
    renderVoucherSourceReview();
  }));
  $("sourcePracticeCheckBtn")?.addEventListener("click",()=>{
    const retrying=state.voucherSourcePracticeRetrying?.has?.(String(q.id||""));
    if(pl300FullRankedLearning.sourceAttemptLocked(practiceRecord,retrying))return;
    const selected=voucherSourcePracticeSelection(q,practiceRecord);
    if(!selected.length){showToast("Select an answer first.");return;}
    const correct=voucherSourcePracticeSelectionsMatch(q,selected);
    const activeSeconds=voucherSourceConsumeSolveSeconds(q);
    saveVoucherSourcePracticeResult(mistakeOwnerId(),q.id,{
      examId:state.voucherExamConfig?.id||"microsoft-pl-300",
      sourceId:q.sourceId||state.voucherSourceReviewSourceId||"",
      mode:"auto",selected,correct,activeSeconds
    });
    delete state.voucherSourcePracticeSelections[q.id];
    state.voucherSourcePracticeRetrying?.delete?.(String(q.id));
    schedulePl300FullRankSync();
    renderVoucherSourceReview();
  });
  $("sourcePracticeRetryBtn")?.addEventListener("click",()=>{
    if(!practiceRecord)return;
    state.voucherSourcePracticeRetrying.add(String(q.id));
    delete state.voucherSourcePracticeSelections[q.id];
    delete state.voucherSourcePracticeNativeInputs[q.id];
    voucherSourceResetSolveTimer();
    voucherSourceStartSolveTimer(q);
    renderVoucherSourceReview();
  });
  $("sourcePracticeNativeRetryBtn")?.addEventListener("click",()=>{
    if(!practiceRecord)return;
    state.voucherSourcePracticeRetrying.add(String(q.id));
    delete state.voucherSourcePracticeSelections[q.id];
    delete state.voucherSourcePracticeNativeInputs[q.id];
    voucherSourceResetSolveTimer();
    voucherSourceStartSolveTimer(q);
    renderVoucherSourceReview();
  });
  if(!sourceAttemptLocked) voucherSourcePracticeNative?.wireNativePractice({
    root:body,question:q,record:practiceRecord,tempInputs:state.voucherSourcePracticeNativeInputs,
    onInput:answers=>{voucherSourceStartSolveTimer(q);state.voucherSourcePracticeNativeInputs[q.id]=answers;},
    onSave:({answers,correct})=>{
      const activeSeconds=voucherSourceConsumeSolveSeconds(q);
      saveVoucherSourcePracticeResult(mistakeOwnerId(),q.id,{examId:state.voucherExamConfig?.id||"microsoft-pl-300",sourceId:q.sourceId||state.voucherSourceReviewSourceId||"",mode:"native",answers,correct,activeSeconds});
      delete state.voucherSourcePracticeNativeInputs[q.id];
      state.voucherSourcePracticeRetrying?.delete?.(String(q.id));
      schedulePl300FullRankSync();
      renderVoucherSourceReview();
    },
    toast:showToast
  });
  const reveal=body.querySelector('#sourceReviewReveal');
  reveal?.addEventListener('toggle',()=>{
    if(!reveal.open||q.reviewMode!=="source-reveal"||practiceRecord)return;
    state.voucherSourceRevealOpened.add(String(q.id));
    const elapsed=voucherSourceConsumeSolveSeconds(q);
    state.voucherSourcePendingSeconds[q.id]=(Number(state.voucherSourcePendingSeconds[q.id])||0)+elapsed;
    const button=$("sourcePracticeCheckpointBtn");
    if(button)button.disabled=false;
  });
  $("sourcePracticeCheckpointBtn")?.addEventListener("click",()=>{
    if(practiceRecord)return;
    const activeSeconds=(Number(state.voucherSourcePendingSeconds[q.id])||0)+voucherSourceConsumeSolveSeconds(q);
    saveVoucherSourcePracticeResult(mistakeOwnerId(),q.id,{
      examId:state.voucherExamConfig?.id||"microsoft-pl-300",
      sourceId:q.sourceId||state.voucherSourceReviewSourceId||"",
      mode:"checkpoint",reviewStatus:"reviewed",activeSeconds
    });
    delete state.voucherSourcePendingSeconds[q.id];
    schedulePl300FullRankSync();
    renderVoucherSourceReview();
  });
  $("sourceReviewPrev")?.addEventListener("click",()=>{if(state.voucherSourceReviewIndex>0){voucherSourceResetSolveTimer();state.voucherSourceReviewIndex-=1;renderVoucherSourceReview();window.scrollTo({top:0,behavior:"smooth"})}});
  $("sourceReviewNext")?.addEventListener("click",()=>{if(state.voucherSourceReviewIndex<questions.length-1){voucherSourceResetSolveTimer();state.voucherSourceReviewIndex+=1;renderVoucherSourceReview();window.scrollTo({top:0,behavior:"smooth"})}});
  $("sourceReviewJumpBtn")?.addEventListener("click",()=>{
    const requested=Math.max(1,Math.min(questions.length,Number($("sourceReviewJump")?.value)||1));
    voucherSourceResetSolveTimer();
    state.voucherSourceReviewIndex=requested-1;renderVoucherSourceReview();window.scrollTo({top:0,behavior:"smooth"});
  });
}

function voucherLocalRankedAttempts(examId){
  return getVoucherAttempts(mistakeOwnerId(),examId).filter(attempt=>attempt?.rankEligible===true&&String(attempt?.sizeMode||"")==="real");
}

function voucherArchitectureQuestionIds(architecture=state.voucherContentArchitecture){
  return Object.keys(architecture?.questionSessionMap||{});
}

function voucherArchitectureSession(sessionId,architecture=state.voucherContentArchitecture){
  return (architecture?.sessions||[]).find(session=>String(session.id)===String(sessionId))||null;
}

function voucherRankedSessionLocalAttempts(examId,sessionId,{officialOnly=false}={}){
  return getVoucherAttempts(mistakeOwnerId(),examId).filter(attempt=>{
    if(attempt?.voucherMode!=="ranked-session")return false;
    if(String(attempt?.sessionId||"")!==String(sessionId||""))return false;
    return !officialOnly||attempt?.officialRankEligible===true;
  });
}

function voucherBestRankedSessionAttempt(examId,sessionId){
  return voucherRankedSessionLocalAttempts(examId,sessionId,{officialOnly:true}).sort((a,b)=>
    Number(b?.percentage||0)-Number(a?.percentage||0) ||
    Number(b?.firstPassPercentage||0)-Number(a?.firstPassPercentage||0) ||
    Number(a?.attemptNumber||Number.MAX_SAFE_INTEGER)-Number(b?.attemptNumber||Number.MAX_SAFE_INTEGER) ||
    Number(a?.timeTakenSeconds||Number.MAX_SAFE_INTEGER)-Number(b?.timeTakenSeconds||Number.MAX_SAFE_INTEGER) ||
    String(a?.submittedAt||"").localeCompare(String(b?.submittedAt||""))
  )[0]||null;
}

function voucherRankedDomainLocalAttempts(examId,domainId,{officialOnly=false}={}){
  return getVoucherAttempts(mistakeOwnerId(),examId).filter(attempt=>{
    if(attempt?.voucherMode!=="ranked-domain")return false;
    if(String(attempt?.domainId||"")!==String(domainId||""))return false;
    return !officialOnly||attempt?.officialRankEligible===true;
  });
}

function voucherBestRankedDomainAttempt(examId,domainId){
  return voucherRankedDomainLocalAttempts(examId,domainId,{officialOnly:true}).sort((a,b)=>
    Number(b?.percentage||0)-Number(a?.percentage||0) ||
    Number(b?.firstPassPercentage||0)-Number(a?.firstPassPercentage||0) ||
    Number(a?.attemptNumber||Number.MAX_SAFE_INTEGER)-Number(b?.attemptNumber||Number.MAX_SAFE_INTEGER) ||
    Number(a?.timeTakenSeconds||Number.MAX_SAFE_INTEGER)-Number(b?.timeTakenSeconds||Number.MAX_SAFE_INTEGER) ||
    String(a?.submittedAt||"").localeCompare(String(b?.submittedAt||""))
  )[0]||null;
}

function buildVoucherDomainLearningLocalSummary(view,examId){
  const bestByDomain=new Map();
  for(const domain of view?.domains||[]){
    const best=voucherBestRankedDomainAttempt(examId,domain.id);
    if(best)bestByDomain.set(domain.id,best);
  }
  const domainsCompleted=bestByDomain.size;
  const mastered=[...bestByDomain.values()].reduce((sum,a)=>sum+Number(a.correct||0),0);
  const total=view?.totalQuestions||0;
  const mastery=total?Math.round((mastered/total)*100):0;
  const recommended=(view?.domains||[]).slice().sort((a,b)=>{
    const aa=bestByDomain.get(a.id),bb=bestByDomain.get(b.id);
    if(Boolean(aa)!==Boolean(bb))return aa?1:-1;
    return Number(aa?.percentage??-1)-Number(bb?.percentage??-1) || Number(a.order||0)-Number(b.order||0);
  })[0]||null;
  return {bestByDomain,domainsCompleted,mastered,total,mastery,recommended};
}

function pl300FullRankDomainCoverage(domainId){
  const records=state.voucherFullRankedIndex?.records||[];
  const domainRecords=records.filter(record=>String(record.domainId||"")===String(domainId||""));
  const practice=getVoucherSourcePracticeState(mistakeOwnerId(),state.voucherExamConfig?.id||"microsoft-pl-300");
  const completed=domainRecords.filter(record=>practice.records?.[record.questionId]).length;
  return {
    total:domainRecords.length,
    completed,
    objective:domainRecords.filter(record=>record.mode==="objective").length,
    checkpoints:domainRecords.filter(record=>record.mode==="checkpoint").length
  };
}

function renderVoucherArchitecturePanel(){
  const panel=$("voucherArchitecturePanel");
  const architecture=state.voucherContentArchitecture;
  const config=state.voucherExamConfig;
  if(!panel)return;
  if(!architecture){
    panel.innerHTML='<div class="voucher-inline-empty">Structured PL-300 domains are temporarily unavailable.</div>';
    return;
  }
  const pseudoQuestions=voucherArchitectureQuestionIds(architecture).map(id=>({id}));
  const seenIds=getVoucherSeenQuestionIds(mistakeOwnerId(),config?.id);
  const view=buildVoucherContentArchitectureView({architecture,questions:pseudoQuestions,seenIds});
  const localSummary=buildVoucherDomainLearningLocalSummary(view,config?.id);
  const selectedDomainId=state.voucherSelectedDomainId||view.domains[0]?.id||null;
  state.voucherSelectedDomainId=selectedDomainId;
  const selectedDomain=view.domains.find(domain=>String(domain.id)===String(selectedDomainId))||view.domains[0]||null;
  const domainSessions=view.sessions.filter(session=>String(session.domainId)===String(selectedDomain?.id));
  const domainBest=selectedDomain?localSummary.bestByDomain.get(selectedDomain.id):null;
  const domainAttempts=selectedDomain?voucherRankedDomainLocalAttempts(config?.id,selectedDomain.id,{officialOnly:true}):[];
  const sectionAnalytics=selectedDomain?buildVoucherSectionAnalytics({architecture,domainId:selectedDomain.id,attempt:domainBest}):{rows:[],strongest:null,weakest:null,hasAttempt:false};
  const recommended=localSummary.recommended;
  const saved=activeSavedExamProgress();
  const savedDomainId=saved?.voucherResume?.domainRanked||saved?.voucherResume?.mockKind==="domain"?saved?.voucherResume?.domainId:null;

  panel.innerHTML=`
    <div class="voucher-ranked-learning-overview domain-ranked">
      <div class="voucher-architecture-head">
        <div><span class="eyebrow">PL-300 DOMAIN RANKED LEARNING</span><h3>Study and rank by complete PL-300 Domain.</h3><p>Each Domain is one ranked learning attempt. Sessions stay inside it as study sections so you always know what you are solving.</p></div>
        <div class="voucher-architecture-summary"><strong>${localSummary.mastery}%</strong><span>Overall Mastery</span><small>${localSummary.domainsCompleted}/${view.domains.length} domains complete</small></div>
      </div>
      <div class="voucher-ranked-learning-stats">
        <div><span>DOMAINS COMPLETED</span><strong>${localSummary.domainsCompleted} / ${view.domains.length}</strong></div>
        <div><span>QUESTIONS MASTERED</span><strong>${localSummary.mastered} / ${view.totalQuestions}</strong></div>
        <div><span>OVERALL RANK</span><strong>${localSummary.domainsCompleted===view.domains.length?"Ready":"Provisional"}</strong><small>${localSummary.domainsCompleted===view.domains.length?"Overall ranking comes after all four domains":"Complete all four domains for official overall rank"}</small></div>
        <div class="recommended"><span>RECOMMENDED NEXT</span><strong>${escapeHtml(recommended?.title||"Choose a domain")}</strong><small>${recommended?`${recommended.questionCount} questions • ${localSummary.bestByDomain.has(recommended.id)?"lowest mastery":"not completed yet"}`:""}</small></div>
      </div>
      ${state.voucherFullRankedIndex?`<div class="voucher-full-source-coverage"><span class="eyebrow">FULL SOURCE COVERAGE</span><strong>${state.voucherFullRankedIndex.mappedDomainOccurrences} mapped to Domains · ${state.voucherFullRankedIndex.unclassifiedOccurrences} Unclassified Source Review</strong><small>Mapped source coverage + Unclassified Source Review = 509 required study occurrences. Domain exam scoring remains the validated ${view.totalQuestions}-question bank.</small></div>`:""}
      <button type="button" class="secondary-btn voucher-overall-ranking-action" id="voucherOverallRankingBtn">View PL-300 Overall Ranking →</button>
    </div>

    <div class="voucher-domain-grid compact" role="list" aria-label="PL-300 ranked domains">
      ${view.domains.map((domain,index)=>{const best=localSummary.bestByDomain.get(domain.id);const sourceCoverage=pl300FullRankDomainCoverage(domain.id);return `<button type="button" class="voucher-domain-card${String(domain.id)===String(selectedDomain?.id)?" active":""}" data-voucher-domain="${escapeHtml(domain.id)}" aria-pressed="${String(domain.id)===String(selectedDomain?.id)?"true":"false"}">
        <span class="voucher-domain-index">0${index+1}</span><span class="eyebrow">RANKED DOMAIN</span><strong>${escapeHtml(domain.title)}</strong><small>${domain.sessionCount} Sections · ${domain.questionCount} Validated Questions</small>${sourceCoverage.total?`<small>Source coverage ${sourceCoverage.completed}/${sourceCoverage.total} studied · ${sourceCoverage.checkpoints} checkpoints</small>`:""}<span class="voucher-domain-progress"><i style="width:${best?Number(best.percentage)||0:domain.progressPercentage}%"></i></span><em>${best?`Best ${Number(best.percentage)||0}%`:`${domain.progressPercentage}% reviewed`}</em>
      </button>`}).join("")}
    </div>

    ${selectedDomain?`<article class="voucher-domain-ranked-detail">
      <div class="voucher-domain-ranked-copy">
        <span class="eyebrow">RANKED DOMAIN</span><h4>${escapeHtml(selectedDomain.title)}</h4><p>${escapeHtml(selectedDomain.description||"")}</p>
        <div class="voucher-domain-ranked-stats"><span><strong>${selectedDomain.questionCount}</strong> Questions</span><span><strong>${domainSessions.length}</strong> Sections</span><span><strong>${domainBest?`${Number(domainBest.percentage)||0}%`:"—"}</strong> Best</span><span><strong>${domainAttempts.length}</strong> Official Attempts</span></div>
        <div class="voucher-domain-section-preview"><span class="eyebrow">SECTIONS inside this Domain</span>${domainSessions.map((session,index)=>`<div><span>${index+1}</span><strong>${escapeHtml(session.title)}</strong><small>${session.questionCount} Questions</small></div>`).join("")}</div>
        <div class="voucher-section-analytics">
          <div class="voucher-section-analytics-head"><div><span class="eyebrow">SECTION ANALYTICS</span><strong>${sectionAnalytics.hasAttempt?"Best official Domain attempt":"Complete this Domain to unlock analytics"}</strong></div>${sectionAnalytics.hasAttempt?`<small>Weakest: ${escapeHtml(sectionAnalytics.weakest?.title||"—")}</small>`:""}</div>
          <div class="voucher-section-analytics-grid">${sectionAnalytics.rows.map(row=>`<div class="voucher-section-analytics-row is-${escapeHtml(row.status)}"><span>${escapeHtml(row.title)}</span><strong>${row.percentage===null?"—":`${row.percentage}%`}</strong><small>${row.percentage===null?"No official attempt yet":`${row.correct}/${row.total} correct${sectionAnalytics.strongest?.id===row.id?" • Strongest":""}${sectionAnalytics.weakest?.id===row.id?" • Review first":""}`}</small></div>`).join("")}</div>
        </div>
      </div>
      <div class="voucher-domain-ranked-setup">
        <span class="voucher-path-badge">RANKED DOMAIN</span>
        <fieldset class="voucher-ranked-session-choice"><legend>Feedback</legend><label><input type="radio" name="voucherDomainFeedback" value="instant" checked> <span><strong>Instant Feedback</strong><small>Learn after every answer. Feedback reading time does not count.</small></span></label><label><input type="radio" name="voucherDomainFeedback" value="exam"> <span><strong>Feedback at End</strong><small>Solve the complete Domain first, then review.</small></span></label></fieldset>
        <fieldset class="voucher-ranked-session-choice"><legend>Active Solve Time</legend><label><input type="radio" name="voucherDomainTimerDisplay" value="show" checked> Show while solving</label><label><input type="radio" name="voucherDomainTimerDisplay" value="hide"> Hide while solving</label></fieldset>
        <button type="button" class="primary-btn large-btn" id="voucherDomainStartBtn">${String(savedDomainId)===String(selectedDomain.id)?"Resume Domain":"Start / Resume Domain"} →</button>
        <button type="button" class="secondary-btn" id="voucherDomainRankingBtn">View Domain Ranking →</button>
        <small>Complete every released question in this Domain for an Official Domain Rank. Incomplete attempts remain provisional and local.</small>
      </div>
    </article>`:""}
  `;

  panel.querySelectorAll("[data-voucher-domain]").forEach(button=>button.addEventListener("click",()=>{
    state.voucherSelectedDomainId=button.dataset.voucherDomain;
    renderVoucherArchitecturePanel();
  }));
  $("voucherDomainStartBtn")?.addEventListener("click",()=>{
    const feedbackMode=document.querySelector('input[name="voucherDomainFeedback"]:checked')?.value||"instant";
    const timerDisplay=(document.querySelector('input[name="voucherDomainTimerDisplay"]:checked')?.value||"show")==="show";
    void prepareVoucherRankedDomain(state.voucherSelectedDomainId,{feedbackMode,timerDisplay});
  });
  $("voucherDomainRankingBtn")?.addEventListener("click",()=>openVoucherDomainRanking(state.voucherTrackId,config.id,state.voucherSelectedDomainId));
  $("voucherOverallRankingBtn")?.addEventListener("click",()=>openVoucherOverallRanking(state.voucherTrackId,config.id));
}

async function prepareVoucherRankedDomain(domainId,{feedbackMode="instant",timerDisplay=true}={}){
  const architecture=state.voucherContentArchitecture;
  const config=state.voucherExamConfig;
  const domain=findVoucherContentArchitectureDomain({architecture,domainId});
  if(!architecture||!config||!domain){showToast("Choose a PL-300 Domain first.");return}
  if(!state.studentName){requireRankedIdentity(()=>void prepareVoucherRankedDomain(domainId,{feedbackMode,timerDisplay}),"Enter your name before starting a ranked PL-300 Domain.");return}
  try{
    const bank=await loadJson(config.masterBankFile);
    const validationErrors=validateVoucherContentArchitecture({architecture,questions:bank.questions||[],examId:config.id});
    if(validationErrors.length)throw new Error(validationErrors.join("; "));
    const questions=questionsForVoucherDomain({architecture,questions:bank.questions||[],domainId:domain.id});
    const sections=sessionsForVoucherDomain({architecture,domainId:domain.id});
    if(!questions.length)throw new Error("This PL-300 Domain has no released questions.");
    await prepareVoucherMock({
      mockKind:"domain",sourceId:domain.id,sizeMode:"domain",timed:false,feedbackMode,
      allowedQuestionIds:questions.map(question=>question.id),domainTitle:domain.title,
      domainRanked:true,domainId:domain.id,sectionIds:sections.map(section=>section.id),timerDisplay
    });
  }catch(error){
    console.error("Voucher ranked domain failed",error);
    showToast(error?.message||"Could not prepare this PL-300 ranked Domain.");
  }
}

async function prepareVoucherRankedSession(sessionId,{feedbackMode="instant",timerDisplay=true}={}){
  const architecture=state.voucherContentArchitecture;
  const config=state.voucherExamConfig;
  const session=voucherArchitectureSession(sessionId,architecture);
  if(!architecture||!config||!session){showToast("Choose a PL-300 session first.");return}
  if(!state.studentName){requireRankedIdentity(()=>void prepareVoucherRankedSession(sessionId,{feedbackMode,timerDisplay}),"Enter your name before starting a ranked PL-300 session.");return}
  try{
    const bank=await loadJson(config.masterBankFile);
    const validationErrors=validateVoucherContentArchitecture({architecture,questions:bank.questions||[],examId:config.id});
    if(validationErrors.length)throw new Error(validationErrors.join("; "));
    const questions=questionsForVoucherSession({architecture,questions:bank.questions||[],sessionId:session.id});
    if(!questions.length)throw new Error("This PL-300 session has no released questions.");
    await prepareVoucherMock({
      mockKind:"session",sourceId:session.id,sizeMode:"session",timed:false,feedbackMode,
      allowedQuestionIds:questions.map(question=>question.id),sessionTitle:session.title,
      sessionRanked:true,sessionId:session.id,domainId:session.domainId,timerDisplay
    });
  }catch(error){
    console.error("Voucher ranked session failed",error);
    showToast(error?.message||"Could not prepare this PL-300 ranked session.");
  }
}

function renderVoucherExam(){
  const meta=voucherTrackMeta(state.voucherTrackId);
  $("voucherExamBreadcrumb").textContent=`Voucher / ${meta?.title||"Track"} / ${state.voucherExamEntry?.title||state.voucherExamId||"Exam"}`;
  const body=$("voucherExamBody");
  if(!body)return;
  if(state.voucherExamError||!state.voucherExamConfig){
    body.innerHTML=`<article class="voucher-empty-card"><h3>Exam unavailable</h3><p>${escapeHtml(state.voucherExamError||"This Voucher exam is not ready yet.")}</p></article>`;
    return;
  }
  const config=state.voucherExamConfig;
  const reviewed=Number(config.masterBankQuestionCount)||0;
  const architecture=state.voucherContentArchitecture;
  const domainCount=architecture?.domains?.length||4;
  const sessionCount=architecture?.sessions?.length||10;
  const sourceReleased=(config.sourceReviewSources||[]).length>0;

  body.innerHTML=`
    <div id="pl300FullRankLanding" class="pl300-full-ranked-loading"><span class="eyebrow">PL-300 FULL RANKED LEARNING</span><h2>Microsoft PL-300 — Ranked Learning</h2><p>509 Questions · ${domainCount} Ranked Domains · ${sessionCount} Study Sections</p></div>

    <section class="voucher-content-architecture" id="voucherArchitecturePanel" aria-label="PL-300 ranked domains and sessions"></section>

    <details class="voucher-more-practice">
      <summary><span><span class="eyebrow">More Practice</span><strong>Quick Practice</strong></span><small>Custom subsets • Non-Ranked</small></summary>
      <div class="voucher-more-practice-body">
        <p>Use Quick Practice for custom subsets and extra repetition. The complete 509-question source journey is the primary ranked experience above.</p>
        <div class="voucher-size-picker-head"><div><strong>Choose number of questions</strong><small>Select one option to continue</small></div><span class="voucher-size-picker-hint">QUICK PRACTICE</span></div>
        <div class="voucher-size-grid" id="voucherSizeGrid" role="group" aria-label="Choose number of quick practice questions">${voucherRandomSizeButtons(config)}</div>
        ${voucherModeControls("voucherPractice")}
        <div class="voucher-practice-summary" id="voucherPracticeSummary"><span>QUICK PRACTICE</span><strong>Choose a practice size</strong><small>Non-Ranked</small></div>
        <button type="button" class="primary-btn large-btn" id="voucherStartRandomBtn" disabled>Choose practice size to start →</button>
      </div>
    </details>

    <section class="voucher-progress-section"><div class="section-title-row"><div><span class="eyebrow">YOUR PROGRESS</span><h3>Ranked Learning History</h3></div></div><div id="voucherAttemptHistory" class="voucher-empty-compact"><strong>No attempts yet</strong><span>Complete your first ranked Domain to start tracking mastery here.</span></div></section>`;

  renderVoucherArchitecturePanel();
  void hydrateVoucherFullRankedCard(config);

  const history=$("voucherAttemptHistory");
  const attempts=getVoucherAttempts(mistakeOwnerId(),config.id).sort((a,b)=>String(b.submittedAt||"").localeCompare(String(a.submittedAt||"")));
  if(history&&attempts.length){
    history.className="voucher-attempt-list";
    history.innerHTML=attempts.slice(0,12).map(attempt=>{
      const domainRanked=attempt.voucherMode==="ranked-domain";
      const sessionRanked=attempt.voucherMode==="ranked-session";
      const legacy=sessionRanked||attempt.voucherMode==="ranked-learning"||attempt.voucherMode==="full-bank-ranked"||attempt.sizeMode==="real"||attempt.sizeMode==="full-ranked"||attempt.voucherMode==="improvement";
      const modeLabel=domainRanked
        ?`${attempt.domainTitle||attempt.domainId||"Ranked Domain"} • ${attempt.feedbackMode==="instant"?"Instant Feedback":"Feedback at End"}`
        :sessionRanked
          ?`Legacy Session Attempt • ${attempt.sessionTitle||attempt.sessionId||"Session"}`
          :legacy
            ?`Legacy Attempt • ${attempt.voucherMode==="full-bank-ranked"||attempt.sizeMode==="full-ranked"?"Full Bank":attempt.voucherMode==="improvement"?"Improvement":"60Q Challenge"}`
            :attempt.mockKind==="source"?"Source Practice":`Quick Practice ${attempt.sizeMode||""}`;
      const status=domainRanked?(attempt.officialRankEligible?"OFFICIAL DOMAIN":"PROVISIONAL"):(legacy?"LEGACY":"PRACTICE");
      const firstPass=domainRanked&&Number.isFinite(Number(attempt.firstPassPercentage))?` • First pass ${Number(attempt.firstPassPercentage)}%`:"";
      const date=attempt.submittedAt?new Date(attempt.submittedAt).toLocaleDateString():"";
      return `<div class="voucher-attempt-row ${domainRanked?"is-ranked":"is-practice"}"><div><span class="voucher-attempt-badge">${escapeHtml(modeLabel)}</span><strong>${Number(attempt.percentage)||0}% • ${Number(attempt.correct)||0}/${Number(attempt.total)||0}</strong><small>${escapeHtml(status)}${firstPass}${date?` • ${escapeHtml(date)}`:""}</small></div><span>${attempt.passed?"PASS":"RETRY"}</span><small>${domainRanked?"Active solve":"Time"} ${formatLeaderboardTime(attempt.timeTakenSeconds||0)}</small></div>`;
    }).join("");
  }

  let selectedSize=null;
  const updatePracticeSummary=()=>{
    const summary=$("voucherPracticeSummary");
    if(!summary)return;
    if(!selectedSize){summary.innerHTML='<span>QUICK PRACTICE</span><strong>Choose a practice size</strong><small>Non-Ranked</small>';return}
    const total=selectedSize==="full-bank"?reviewed:Number(selectedSize)||0;
    const timing=document.querySelector('input[name="voucherPracticeTimed"]:checked')?.value==="untimed"?"Untimed":"Timed";
    const feedback=document.querySelector('input[name="voucherPracticeFeedback"]:checked')?.value==="instant"?"Instant Feedback":"Feedback at End";
    summary.innerHTML=`<span>QUICK PRACTICE</span><strong>${total} Questions • ${timing}</strong><small>${feedback} • Non-Ranked</small>`;
  };
  body.querySelectorAll("[data-voucher-size]").forEach(button=>button.addEventListener("click",()=>{
    selectedSize=button.dataset.voucherSize;
    body.querySelectorAll("[data-voucher-size]").forEach(x=>{const active=x===button;x.classList.toggle("active",active);x.setAttribute("aria-pressed",active?"true":"false")});
    const start=$("voucherStartRandomBtn");start.disabled=false;start.textContent=selectedSize==="full-bank"?`Start Full Reviewed Bank • ${reviewed} Q →`:`Start ${selectedSize}-Question Quick Practice →`;
    updatePracticeSummary();
  }));
  body.querySelectorAll('input[name="voucherPracticeTimed"],input[name="voucherPracticeFeedback"]').forEach(input=>input.addEventListener("change",updatePracticeSummary));
  $("voucherStartRandomBtn")?.addEventListener("click",()=>{
    if(!selectedSize)return;
    void prepareVoucherMock({mockKind:"random",sizeMode:selectedSize,sourceId:null,
      timed:(document.querySelector('input[name="voucherPracticeTimed"]:checked')?.value||"timed")==="timed",
      feedbackMode:document.querySelector('input[name="voucherPracticeFeedback"]:checked')?.value||"exam"
    });
  });
}

async function voucherRankedExamSpecs(trackId){
  const child=state.voucherTrackRegistries[trackId];
  if(!child?.exams?.length)return [];
  const specs=[];
  for(const entry of child.exams){
    try{
      const {config}=await loadVoucherExamConfig(trackId,entry.id);
      if(config?.realExam?.rankEligible!==true)continue;
      const totalQuestions=Number(config.realExam.questionCount)||0;
      if(!totalQuestions)continue;
      specs.push({
        examId:config.id,
        title:config.title,
        activityId:voucherRankingActivityId(trackId,config.id),
        totalQuestions
      });
    }catch(error){
      console.warn("Voucher ranked exam config skipped",entry?.id,error);
    }
  }
  return specs;
}

async function voucherFullBankRankedSpec(trackId,examId){
  const {config}=await loadVoucherExamConfig(trackId,examId);
  const full=config?.fullBankExam||{};
  if(full.rankEligible!==true)throw new Error("This Voucher exam does not have a released Full Bank Ranked Exam yet.");
  const totalQuestions=Number(full.questionCount)||Number(config.masterBankQuestionCount)||0;
  const durationMinutes=Number(full.durationMinutes)||0;
  if(!totalQuestions||!durationMinutes)throw new Error("Full Bank Ranked Exam configuration is incomplete.");
  return {examId:config.id,title:config.title,activityId:voucherRankingActivityId(trackId,config.id,"full-bank"),totalQuestions,durationMinutes};
}

function renderVoucherRankingShell(){
  const mode=state.voucherRankingMode||"exam";
  const trackId=state.voucherRankingTrackId||state.voucherTrackId;
  const meta=voucherTrackMeta(trackId);
  const examTitle=state.voucherExamConfig?.id===state.voucherRankingExamId?state.voucherExamConfig.title:state.voucherExamEntry?.title||state.voucherRankingExamId||"Voucher Exam";
  const sessionTitle=state.voucherContentArchitecture?.sessions?.find(session=>String(session.id)===String(state.voucherRankingSessionId))?.title||"PL-300 Session";
  const domainTitle=state.voucherContentArchitecture?.domains?.find(domain=>String(domain.id)===String(state.voucherRankingDomainId))?.title||"PL-300 Domain";
  $("voucherRankingTitle").textContent=mode==="full-ranked-learning"?`${examTitle} • Full Ranked Learning 509/509`:mode==="domain-overall"?`${examTitle} • PL-300 Overall Ranking`:mode==="domain"?`${domainTitle} • Domain Ranking`:mode==="session"?`${sessionTitle} • Legacy Session Ranking`:mode==="track"?`${meta?.title||"Voucher"} Overall Ranking`:mode==="full-exam"?`${examTitle} • Full Bank Ranking`:`${examTitle} Ranking`;
  $("voucherRankingRule").textContent=mode==="full-ranked-learning"
    ?"Completion → Validated Mastery → First Pass → Attempts-to-Best → Active Solve Time."
    :mode==="domain-overall"
    ?"Complete all four PL-300 Domains • Total Mastery → First Pass → Attempts-to-Best → Active Solve Time."
    :mode==="domain"
    ?"Complete the full Domain to join • Mastery → First Pass → Attempts-to-Best → Active Solve Time."
    :mode==="session"
      ?"Legacy Session leaderboard • retained for history only."
      :mode==="track"
      ?"Best Real Exam Size attempt from every released exam • fixed total question denominator • Primary Track members only."
      :mode==="full-exam"
        ?"Full Bank Ranked Exam only • all reviewed questions • best attempt per learner • score first, then time."
        :"Real Exam Size only • best attempt per learner • score first, then time.";
  $("voucherRankingSummary").innerHTML="";
  $("voucherRankingContent").classList.add("hidden");
  const status=$("voucherRankingStatus");
  status.className="status-card info";
  status.innerHTML=`<div class="status-icon">↗</div><div><strong>Loading Voucher ranking…</strong><p>Fetching shared ${mode==="full-ranked-learning"?"Full Ranked Learning 509/509":mode==="domain-overall"?"PL-300 Overall":mode==="domain"?"Ranked Domain":mode==="session"?"Legacy Ranked Session":mode==="full-exam"?"Full Bank Ranked Exam":"Real Exam"} results.</p></div>`;
  status.classList.remove("hidden");
}

function voucherRankingAvatarCell(playerId,name,avatarMap){
  const avatarId=avatarMap?.get?.(playerId);
  const visual=avatarId?avatarMarkup(avatarId,{lazy:true}):escapeHtml(initials(name));
  return `<span class="voucher-ranking-avatar">${visual}</span>`;
}

function renderVoucherRankingBoard({board=[],mode="exam",trackId="",examSpec=null,examSpecs=[],avatarMap=new Map()}={}){
  const content=$("voucherRankingContent"),list=$("voucherRankingList"),personal=$("voucherRankingPersonal"),status=$("voucherRankingStatus"),summary=$("voucherRankingSummary");
  const isTrack=mode==="track";
  const isFull=mode==="full-exam";
  const isSession=mode==="session";
  const isDomain=mode==="domain";
  const isOverall=mode==="domain-overall";
  const totalMarks=isTrack?examSpecs.reduce((sum,x)=>sum+(Number(x.totalQuestions)||0),0):(Number(examSpec?.totalQuestions)||0);
  summary.innerHTML=isOverall
    ?`<div><span>Certification</span><strong>${escapeHtml(examSpec?.title||"Microsoft PL-300")}</strong></div><div><span>Questions</span><strong>${totalMarks}</strong></div><div><span>Required</span><strong>${Number(examSpec?.domains?.length)||4} / ${Number(examSpec?.domains?.length)||4} Domains</strong></div><div><span>Scoring</span><strong>Total Mastery → First Pass → Attempts → Active Solve Time</strong></div>`
    :isDomain
    ?`<div><span>Domain</span><strong>${escapeHtml(examSpec?.title||"PL-300 Domain")}</strong></div><div><span>Questions</span><strong>${totalMarks}</strong></div><div><span>Rank Status</span><strong>Complete Domain Only</strong></div><div><span>Scoring</span><strong>Mastery → First Pass → Attempts → Active Solve Time</strong></div>`
    :isSession
      ?`<div><span>Session</span><strong>${escapeHtml(examSpec?.title||"PL-300 Session")}</strong></div><div><span>Questions</span><strong>${totalMarks}</strong></div><div><span>Rank Status</span><strong>Legacy</strong></div><div><span>Scoring</span><strong>Historical Session Ranking</strong></div>`
      :isTrack
      ?`<div><span>Track</span><strong>${escapeHtml(voucherTrackMeta(trackId)?.title||trackId)}</strong></div><div><span>Total Marks</span><strong>${totalMarks}</strong></div><div><span>Ranked Exams</span><strong>${examSpecs.length}</strong></div><div><span>Scoring</span><strong>Best Real Exam Size</strong></div>`
      :`<div><span>Exam</span><strong>${escapeHtml(examSpec?.title||state.voucherRankingExamId||"Voucher Exam")}</strong></div><div><span>Total Marks</span><strong>${totalMarks}</strong></div><div><span>Mode</span><strong>${isFull?"Full Bank Ranked Exam":"Real Exam Size"}</strong></div><div><span>Scoring</span><strong>Best Attempt</strong></div>`;
  status.classList.add("hidden");
  content.classList.remove("hidden");
  if(!board.length){
    list.innerHTML=`<div class="voucher-inline-empty">${isOverall?"Complete all four PL-300 Domains to join the Overall Ranking.":isDomain?"Complete the full Domain to join this leaderboard.":isSession?"No legacy Session attempts are synced yet.":`No ranked ${isFull?"Full Bank":"Real Exam"} attempt has been synced yet.`}</div>`;
  }else{
    list.innerHTML=board.map(row=>{
      const name=row.student_name||"Learner";
      const score=isOverall?`${row.totalCorrect}/${row.totalQuestions}`:isTrack?`${row.totalCorrect}/${row.totalQuestions}`:(isDomain||isSession)?`${Number(row.percentage)||0}%`:`${Number(row.score)||0}/${Number(row.total_questions)||totalMarks}`;
      const pct=(isOverall||isTrack)?row.percentage:Number(row.percentage)||0;
      const time=isOverall?row.totalTimeSeconds:isTrack?row.totalTimeSeconds:row.time_taken_seconds;
      const detail=isOverall?`First Pass ${Number(row.firstPassPercentage)||0}% · ${Number(row.attemptsToBest)||Number(row.totalDomains)||4} attempts-to-best`:isTrack?`${row.completedExams}/${row.totalExams} exams`:(isDomain||isSession)?`First Pass ${Number(row.firstPassPercentage)||0}% · ${Number(row.attemptCount)||1} attempt${Number(row.attemptCount)===1?"":"s"}`:`${pct}%`;
      return `<div class="voucher-ranking-row${row.player_id===state.playerId?" current-user":""}"><span class="voucher-ranking-rank">#${row.rank}</span><div class="voucher-ranking-student">${voucherRankingAvatarCell(row.player_id,name,avatarMap)}<div><strong>${escapeHtml(name)}</strong><small>${row.player_id===state.playerId?"You":isTrack?escapeHtml(voucherTrackMeta(trackId)?.title||trackId):"Voucher learner"}</small></div></div><div class="voucher-ranking-score"><strong>${escapeHtml(score)}</strong><small>${escapeHtml(detail)}</small></div><div class="voucher-ranking-time"><strong>${escapeHtml(formatLeaderboardTime(time||0))}</strong><small>${isOverall?`${pct}% overall · Active Solve Time`:isTrack?`${pct}% overall`:(isDomain||isSession)?"Active Solve Time":"best time"}</small></div></div>`;
    }).join("");
  }
  const me=board.find(row=>row.player_id===state.playerId);
  const primary=getPrimaryTrack();
  if(isOverall&&me){
    personal.innerHTML=`<div><span class="eyebrow">YOUR POSITION</span><h3>${escapeHtml(state.studentName||me.student_name||"Learner")}</h3><small>Official PL-300 Overall • ${me.completedDomains}/${me.totalDomains} Domains • First Pass ${Number(me.firstPassPercentage)||0}% • ${Number(me.attemptsToBest)||me.totalDomains} attempts-to-best</small></div><div class="rank-local-stats"><div><span>Rank</span><strong>#${me.rank}</strong></div><div><span>Overall</span><strong>${Number(me.percentage)||0}%</strong></div></div>`;
  }else if(isOverall){
    personal.innerHTML=`<div><span class="eyebrow">YOUR POSITION</span><h3>${escapeHtml(state.studentName||"Learner")}</h3><small>Complete all four PL-300 Domains with Official attempts to join the Overall Ranking.</small></div><div class="rank-local-stats"><div><span>Rank</span><strong>—</strong></div></div>`;
  }else if(isDomain&&me){
    personal.innerHTML=`<div><span class="eyebrow">YOUR POSITION</span><h3>${escapeHtml(state.studentName||me.student_name||"Learner")}</h3><small>Official full-Domain attempt • First Pass ${Number(me.firstPassPercentage)||0}% • best reached in ${Number(me.attemptCount)||1} attempt${Number(me.attemptCount)===1?"":"s"}</small></div><div class="rank-local-stats"><div><span>Rank</span><strong>#${me.rank}</strong></div><div><span>Mastery</span><strong>${Number(me.percentage)||0}%</strong></div></div>`;
  }else if(isDomain){
    personal.innerHTML=`<div><span class="eyebrow">YOUR POSITION</span><h3>${escapeHtml(state.studentName||"Learner")}</h3><small>Complete every question in this Domain to join the official leaderboard. Provisional attempts stay local.</small></div><div class="rank-local-stats"><div><span>Rank</span><strong>—</strong></div></div>`;
  }else if(isSession&&me){
    personal.innerHTML=`<div><span class="eyebrow">YOUR POSITION</span><h3>${escapeHtml(state.studentName||me.student_name||"Learner")}</h3><small>Legacy full-session attempt • First Pass ${Number(me.firstPassPercentage)||0}% • ${Number(me.attemptCount)||1} attempt${Number(me.attemptCount)===1?"":"s"}</small></div><div class="rank-local-stats"><div><span>Rank</span><strong>#${me.rank}</strong></div><div><span>Mastery</span><strong>${Number(me.percentage)||0}%</strong></div></div>`;
  }else if(isSession){
    personal.innerHTML=`<div><span class="eyebrow">YOUR POSITION</span><h3>${escapeHtml(state.studentName||"Learner")}</h3><small>Complete the full session to join the official leaderboard. Provisional attempts stay on this device.</small></div><div class="rank-local-stats"><div><span>Rank</span><strong>—</strong></div></div>`;
  }else if(isTrack && primary!==trackId){
    personal.innerHTML=`<div><span class="eyebrow">VIEW ONLY</span><h3>${escapeHtml(state.studentName||"Learner")}</h3><small>Your Primary Track is ${escapeHtml(primaryTrackTitle(primary)||"not selected")}. You can view this leaderboard, but only ${escapeHtml(voucherTrackMeta(trackId)?.title||trackId)} members enter its Overall Ranking.</small></div>`;
  }else if(me){
    const best=isTrack?`${me.totalCorrect}/${me.totalQuestions} • ${me.percentage}%`:`${Number(me.score)||0}/${Number(me.total_questions)||totalMarks} • ${Number(me.percentage)||0}%`;
    personal.innerHTML=`<div><span class="eyebrow">YOUR POSITION</span><h3>${escapeHtml(state.studentName||me.student_name||"Learner")}</h3><small>${isTrack?`${me.completedExams}/${me.totalExams} ranked exams completed`:isFull?"Best synced Full Bank Ranked Exam attempt":"Best synced Real Exam attempt"}</small></div><div class="rank-local-stats"><div><span>Rank</span><strong>#${me.rank}</strong></div><div><span>Best</span><strong>${escapeHtml(best)}</strong></div></div>`;
  }else{
    personal.innerHTML=`<div><span class="eyebrow">YOUR POSITION</span><h3>${escapeHtml(state.studentName||"Learner")}</h3><small>Complete a ${isFull?"Full Bank Ranked Exam":"Real Exam Size"} attempt to join this Voucher leaderboard.</small></div><div class="rank-local-stats"><div><span>Rank</span><strong>—</strong></div></div>`;
  }
}

function renderPl300FullRankedLearningBoard({board=[],avatarMap=new Map(),metrics=null}={}){
  const content=$("voucherRankingContent"),list=$("voucherRankingList"),personal=$("voucherRankingPersonal"),status=$("voucherRankingStatus"),summary=$("voucherRankingSummary");
  const avatarHtmlByPlayer={};
  for(const row of board){const name=row.student_name||"Learner";avatarHtmlByPlayer[row.player_id]=voucherRankingAvatarCell(row.player_id,name,avatarMap);}
  const view=pl300FullRankedLearning.buildPl300FullRankLeaderboardPresentation({board,currentPlayerId:state.playerId,studentName:state.studentName,avatarHtmlByPlayer});
  summary.innerHTML=view.summaryHtml;list.innerHTML=view.listHtml;personal.innerHTML=view.personalHtml;status.classList.add("hidden");content.classList.remove("hidden");
  if(!board.some(row=>row.player_id===state.playerId)&&Number(metrics?.completedOccurrences)>0){
    personal.querySelector("small")?.replaceChildren(document.createTextNode(`${metrics.completedOccurrences}/509 saved locally. Sync when online to enter the shared board.`));
  }
}

async function loadVoucherFullRankedLearningRanking(trackId,examId){
  const requestId=++state.voucherRankingRequestId;
  try{
    await ensurePl300FullRankedLearning();
    await loadVoucherFullRankedIndex(state.voucherExamConfig);
    try{await syncPl300FullRankSnapshot({force:true})}catch(error){console.warn("Full Ranked snapshot sync unavailable:",error)}
    const activityId=pl300FullRankedLearning.pl300FullRankActivityId(trackId,examId);
    const rows=await fetchAttemptsForExamIds([activityId]);
    if(requestId!==state.voucherRankingRequestId)return;
    const board=pl300FullRankedLearning.buildPl300FullRankLeaderboard(rows,{totalOccurrences:509,validatedConceptCount:265});
    let avatarMap=new Map();
    try{avatarMap=await fetchRankingProfiles(board.map(row=>row.player_id))}catch{}
    if(requestId!==state.voucherRankingRequestId)return;
    renderPl300FullRankedLearningBoard({board,avatarMap,metrics:voucherFullRankMetrics()});
  }catch(error){
    if(requestId===state.voucherRankingRequestId)renderVoucherRankingError(error?.message||"Could not load Full Ranked Learning leaderboard.");
  }
}

function renderVoucherRankingError(message){
  const status=$("voucherRankingStatus");
  status.className="status-card warning";
  status.innerHTML=`<div class="status-icon">!</div><div><strong>Voucher ranking unavailable</strong><p>${escapeHtml(message||"Could not load the shared leaderboard.")}</p></div>`;
  status.classList.remove("hidden");
  $("voucherRankingContent").classList.add("hidden");
}

async function voucherOverallRankingSpec(trackId,examId){
  const {config}=await loadVoucherExamConfig(trackId,examId);
  if(!config?.contentArchitectureFile)throw new Error("This PL-300 exam does not have a content architecture.");
  const architecture=state.voucherContentArchitecture&&String(state.voucherContentArchitecture.examId)===String(examId)
    ?state.voucherContentArchitecture
    :await loadJson(config.contentArchitectureFile);
  const domains=(architecture?.domains||[]).map(domain=>{
    const sections=sessionsForVoucherDomain({architecture,domainId:domain.id});
    const totalQuestions=Object.entries(architecture.questionSessionMap||{}).filter(([,sessionId])=>sections.some(section=>String(section.id)===String(sessionId))).length;
    return {domainId:String(domain.id),title:String(domain.title||domain.id),totalQuestions,activityId:voucherDomainRankingActivityId(trackId,config.id,domain.id)};
  }).filter(domain=>domain.totalQuestions>0);
  if(!domains.length)throw new Error("This PL-300 exam has no released ranked Domains.");
  state.voucherContentArchitecture=architecture;
  return {examId:config.id,title:config.title||"Microsoft PL-300",totalQuestions:domains.reduce((sum,domain)=>sum+domain.totalQuestions,0),domains};
}

async function loadVoucherOverallRanking(trackId,examId){
  const requestId=++state.voucherRankingRequestId;
  try{
    const spec=await voucherOverallRankingSpec(trackId,examId);
    const rows=await fetchAttemptsForExamIds(spec.domains.map(domain=>domain.activityId));
    if(requestId!==state.voucherRankingRequestId)return;
    const board=buildVoucherOverallLeaderboard(rows,{domains:spec.domains});
    let avatarMap=new Map();
    try{avatarMap=await fetchRankingProfiles(board.map(x=>x.player_id))}catch{}
    if(requestId!==state.voucherRankingRequestId)return;
    renderVoucherRankingBoard({board,mode:"domain-overall",trackId,examSpec:spec,avatarMap});
  }catch(error){
    if(requestId===state.voucherRankingRequestId)renderVoucherRankingError(error?.message||"Could not load PL-300 Overall Ranking.");
  }
}

async function voucherDomainRankingSpec(trackId,examId,domainId){
  const {config}=await loadVoucherExamConfig(trackId,examId);
  if(!config?.contentArchitectureFile)throw new Error("This PL-300 exam does not have a content architecture.");
  const architecture=state.voucherContentArchitecture&&String(state.voucherContentArchitecture.examId)===String(examId)
    ?state.voucherContentArchitecture
    :await loadJson(config.contentArchitectureFile);
  const domain=findVoucherContentArchitectureDomain({architecture,domainId});
  if(!domain)throw new Error("This PL-300 Domain is not available.");
  const sections=sessionsForVoucherDomain({architecture,domainId});
  const totalQuestions=Object.entries(architecture.questionSessionMap||{}).filter(([,sessionId])=>sections.some(section=>String(section.id)===String(sessionId))).length;
  if(!totalQuestions)throw new Error("This PL-300 Domain has no released questions.");
  state.voucherContentArchitecture=architecture;
  return {examId:config.id,title:domain.title,domainId:domain.id,sectionIds:sections.map(section=>section.id),totalQuestions,activityId:voucherDomainRankingActivityId(trackId,config.id,domain.id)};
}

async function loadVoucherDomainRanking(trackId,examId,domainId){
  const requestId=++state.voucherRankingRequestId;
  try{
    const spec=await voucherDomainRankingSpec(trackId,examId,domainId);
    const rows=await fetchAttemptsForExamIds([spec.activityId]);
    if(requestId!==state.voucherRankingRequestId)return;
    const board=buildVoucherDomainLeaderboard(rows,{expectedQuestions:spec.totalQuestions});
    let avatarMap=new Map();
    try{avatarMap=await fetchRankingProfiles(board.map(x=>x.player_id))}catch{}
    if(requestId!==state.voucherRankingRequestId)return;
    renderVoucherRankingBoard({board,mode:"domain",trackId,examSpec:spec,avatarMap});
  }catch(error){
    if(requestId===state.voucherRankingRequestId)renderVoucherRankingError(error?.message||"Could not load Domain Ranking.");
  }
}

async function voucherSessionRankingSpec(trackId,examId,sessionId){
  const {config}=await loadVoucherExamConfig(trackId,examId);
  if(!config?.contentArchitectureFile)throw new Error("This PL-300 exam does not have a content architecture.");
  const architecture=state.voucherContentArchitecture&&String(state.voucherContentArchitecture.examId)===String(examId)
    ?state.voucherContentArchitecture
    :await loadJson(config.contentArchitectureFile);
  const session=findVoucherContentArchitectureSession({architecture,sessionId});
  if(!session)throw new Error("This PL-300 session is not available.");
  state.voucherContentArchitecture=architecture;
  const totalQuestions=Object.values(architecture.questionSessionMap||{}).filter(id=>String(id)===String(session.id)).length;
  if(!totalQuestions)throw new Error("This PL-300 session has no released questions.");
  return {examId:config.id,title:session.title,sessionId:session.id,domainId:session.domainId,totalQuestions,activityId:voucherSessionRankingActivityId(trackId,config.id,session.id)};
}

async function loadVoucherSessionRanking(trackId,examId,sessionId){
  const requestId=++state.voucherRankingRequestId;
  try{
    const spec=await voucherSessionRankingSpec(trackId,examId,sessionId);
    const rows=await fetchAttemptsForExamIds([spec.activityId]);
    if(requestId!==state.voucherRankingRequestId)return;
    const board=buildVoucherSessionLeaderboard(rows,{expectedQuestions:spec.totalQuestions});
    let avatarMap=new Map();
    try{avatarMap=await fetchRankingProfiles(board.map(x=>x.player_id))}catch{}
    if(requestId!==state.voucherRankingRequestId)return;
    renderVoucherRankingBoard({board,mode:"session",trackId,examSpec:spec,avatarMap});
  }catch(error){
    if(requestId===state.voucherRankingRequestId)renderVoucherRankingError(error?.message||"Could not load Session Ranking.");
  }
}

async function loadVoucherExamRanking(trackId,examId){
  const requestId=++state.voucherRankingRequestId;
  try{
    const specs=await voucherRankedExamSpecs(trackId);
    const spec=specs.find(x=>x.examId===examId);
    if(!spec)throw new Error("This Voucher exam does not have a released rank-eligible Real Exam yet.");
    const rows=await fetchAttemptsForExamIds([spec.activityId]);
    if(requestId!==state.voucherRankingRequestId)return;
    const board=buildVoucherExamLeaderboard(rows);
    let avatarMap=new Map();
    try{avatarMap=await fetchRankingProfiles(board.map(x=>x.player_id))}catch{}
    if(requestId!==state.voucherRankingRequestId)return;
    renderVoucherRankingBoard({board,mode:"exam",trackId,examSpec:spec,avatarMap});
  }catch(error){
    if(requestId===state.voucherRankingRequestId)renderVoucherRankingError(error?.message||"Could not load Voucher Exam Ranking.");
  }
}

async function loadVoucherFullBankRanking(trackId,examId){
  const requestId=++state.voucherRankingRequestId;
  try{
    const spec=await voucherFullBankRankedSpec(trackId,examId);
    const rows=await fetchAttemptsForExamIds([spec.activityId]);
    if(requestId!==state.voucherRankingRequestId)return;
    const board=buildVoucherExamLeaderboard(rows);
    let avatarMap=new Map();
    try{avatarMap=await fetchRankingProfiles(board.map(x=>x.player_id))}catch{}
    if(requestId!==state.voucherRankingRequestId)return;
    renderVoucherRankingBoard({board,mode:"full-exam",trackId,examSpec:spec,avatarMap});
  }catch(error){
    if(requestId===state.voucherRankingRequestId)renderVoucherRankingError(error?.message||"Could not load Full Bank Ranking.");
  }
}

async function loadVoucherTrackOverallRanking(trackId){
  const requestId=++state.voucherRankingRequestId;
  try{
    const specs=await voucherRankedExamSpecs(trackId);
    if(!specs.length)throw new Error("No released rank-eligible Voucher exams exist in this track yet.");
    const rows=await fetchAttemptsForExamIds(specs.map(x=>x.activityId));
    if(requestId!==state.voucherRankingRequestId)return;
    const ids=[...new Set(rows.map(x=>x.player_id).filter(Boolean))];
    let primaryTracks;
    try{
      if(state.playerId&&getPrimaryTrack())await syncVoucherPrimaryTrack(state.playerId,getPrimaryTrack());
      primaryTracks=await fetchVoucherPrimaryTracks(ids);
    }catch{
      throw new Error("Track Overall needs the Voucher Profiles Supabase migration and an online connection. Exam Ranking is still available.");
    }
    const board=buildVoucherTrackOverallLeaderboard({trackId,exams:specs,rows,primaryTracks});
    let avatarMap=new Map();
    try{avatarMap=await fetchRankingProfiles(board.map(x=>x.player_id))}catch{}
    if(requestId!==state.voucherRankingRequestId)return;
    renderVoucherRankingBoard({board,mode:"track",trackId,examSpecs:specs,avatarMap});
  }catch(error){
    if(requestId===state.voucherRankingRequestId)renderVoucherRankingError(error?.message||"Could not load Voucher Track Overall Ranking.");
  }
}

function openVoucherFullRankedLearningRanking(trackId=state.voucherTrackId,examId=state.voucherExamId){
  requireRankedIdentity(()=>{
    state.voucherRankingMode="full-ranked-learning";
    state.voucherRankingTrackId=trackId;
    state.voucherRankingExamId=examId;
    routeTo("voucherRankingView");
    void loadVoucherFullRankedLearningRanking(trackId,examId);
  },"Enter your name to open the PL-300 Full Ranked Learning leaderboard.");
}

function openVoucherOverallRanking(trackId=state.voucherTrackId,examId=state.voucherExamId){
  requireRankedIdentity(()=>{
    state.voucherRankingMode="domain-overall";
    state.voucherRankingTrackId=trackId;
    state.voucherRankingExamId=examId;
    state.voucherRankingDomainId=null;
    routeTo("voucherRankingView");
    void loadVoucherOverallRanking(trackId,examId);
  },"Enter your name to open the PL-300 Overall leaderboard.");
}

function openVoucherDomainRanking(trackId=state.voucherTrackId,examId=state.voucherExamId,domainId=state.voucherSelectedDomainId){
  requireRankedIdentity(()=>{
    if(!domainId){showToast("Choose a PL-300 Domain first.");return}
    state.voucherRankingMode="domain";
    state.voucherRankingTrackId=trackId;
    state.voucherRankingExamId=examId;
    state.voucherRankingDomainId=domainId;
    routeTo("voucherRankingView");
    void loadVoucherDomainRanking(trackId,examId,domainId);
  },"Enter your name to open this PL-300 Domain leaderboard.");
}

function openVoucherSessionRanking(trackId=state.voucherTrackId,examId=state.voucherExamId,sessionId=state.voucherSelectedSessionId){
  requireRankedIdentity(()=>{
    if(!sessionId){showToast("Choose a PL-300 session first.");return}
    state.voucherRankingMode="session";
    state.voucherRankingTrackId=trackId;
    state.voucherRankingExamId=examId;
    state.voucherRankingSessionId=sessionId;
    routeTo("voucherRankingView");
    void loadVoucherSessionRanking(trackId,examId,sessionId);
  },"Enter your name to open this PL-300 Session leaderboard.");
}

function openVoucherExamRanking(trackId=state.voucherTrackId,examId=state.voucherExamId){
  requireRankedIdentity(()=>{
    state.voucherRankingMode="exam";
    state.voucherRankingTrackId=trackId;
    state.voucherRankingExamId=examId;
    routeTo("voucherRankingView");
    void loadVoucherExamRanking(trackId,examId);
  },"Enter your name to open this Voucher Exam leaderboard.");
}

function openVoucherFullBankRanking(trackId=state.voucherTrackId,examId=state.voucherExamId){
  requireRankedIdentity(()=>{
    state.voucherRankingMode="full-exam";
    state.voucherRankingTrackId=trackId;
    state.voucherRankingExamId=examId;
    routeTo("voucherRankingView");
    void loadVoucherFullBankRanking(trackId,examId);
  },"Enter your name to open this Full Bank Ranked leaderboard.");
}

function openVoucherTrackOverallRanking(trackId=state.voucherTrackId){
  requireRankedIdentity(()=>{
    if(!getPrimaryTrack()){
      ensurePrimaryTrack({required:true,onDone:()=>openVoucherTrackOverallRanking(trackId)});
      return;
    }
    state.voucherRankingMode="track";
    state.voucherRankingTrackId=trackId;
    state.voucherRankingExamId=null;
    routeTo("voucherRankingView");
    void loadVoucherTrackOverallRanking(trackId);
  },"Enter your name to view the Voucher Track Overall leaderboard.");
}

$("voucherRankingBackBtn")?.addEventListener("click",()=>{
  state.voucherTrackId=state.voucherRankingTrackId||state.voucherTrackId;
  if(state.voucherRankingMode==="full-ranked-learning"&&state.voucherRankingExamId){
    state.voucherExamId=state.voucherRankingExamId;
    routeTo("voucherExamView");
  }else if(state.voucherRankingMode==="domain-overall"&&state.voucherRankingExamId){
    state.voucherExamId=state.voucherRankingExamId;
    routeTo("voucherExamView");
  }else if(state.voucherRankingMode==="domain"&&state.voucherRankingExamId){
    state.voucherExamId=state.voucherRankingExamId;
    state.voucherSelectedDomainId=state.voucherRankingDomainId||state.voucherSelectedDomainId;
    routeTo("voucherExamView");
  }else if(state.voucherRankingMode==="session"&&state.voucherRankingExamId){
    state.voucherExamId=state.voucherRankingExamId;
    state.voucherSelectedSessionId=state.voucherRankingSessionId||state.voucherSelectedSessionId;
    routeTo("voucherExamView");
  }else if((state.voucherRankingMode==="exam"||state.voucherRankingMode==="full-exam")&&state.voucherRankingExamId){
    state.voucherExamId=state.voucherRankingExamId;
    routeTo("voucherExamView");
  }else routeTo("voucherTrackView");
});

function openVoucherVisual(asset,alt="Voucher question visual"){
  const modal=$("voucherVisualModal"),image=$("voucherVisualImage");
  if(!modal||!image||!asset)return false;
  image.src=String(asset);
  image.alt=String(alt||"Voucher question visual");
  $("voucherVisualCaption").textContent=image.alt;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  return true;
}
window.openVoucherVisual=openVoucherVisual;
$("voucherVisualCloseBtn")?.addEventListener("click",()=>{$("voucherVisualModal").classList.add("hidden");$("voucherVisualModal").setAttribute("aria-hidden","true");$("voucherVisualImage").removeAttribute("src")});
$("voucherVisualModal")?.addEventListener("click",event=>{if(event.target===$("voucherVisualModal"))$("voucherVisualCloseBtn")?.click()});
$("voucherTrackBackBtn")?.addEventListener("click",()=>routeTo("voucherView"));
$("voucherExamBackBtn")?.addEventListener("click",()=>routeTo("voucherTrackView"));
$("voucherSourceReviewBackBtn")?.addEventListener("click",()=>routeTo("voucherExamView"));
$("openVoucherHomeBtn")?.addEventListener("click",()=>routeTo("voucherView"));

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

function mistakeOwnerId(){return state.playerId || getPlayerId()}
function mistakeTrackMeta(levelId,trackId){
  return getOfficialTrack(state.officialRegistry,levelId,trackId) || null;
}
function parseOfficialMistakeTrackKey(key){
  const parts=String(key||"").split("::");
  if(parts.length>=3)return {levelId:parts[0],sourceRevision:parts[1],trackId:parts.slice(2).join("::")};
  if(parts.length===2)return {levelId:parts[0],sourceRevision:"source-r1",trackId:parts[1]};
  return {levelId:"junior-data-analysis",sourceRevision:"source-r1",trackId:parts[0]||""};
}
function mistakeContextForQuestion(q,exam=state.currentExam?.exam,override={}){
  const official=exam?.generatedFromOfficialQbank || null;
  const voucher=exam?.generatedFromVoucher || null;
  const trackId=override.trackId || voucher?.trackId || official?.trackId || q?.trackId || state.selectedTrack?.id || state.currentRegistryItem?.trackId || "";
  const levelId=override.levelId || official?.levelId || "";
  const officialMeta=levelId && trackId?mistakeTrackMeta(levelId,trackId):null;
  const sourceType=override.sourceType || (voucher || q?.sourceType==="voucher"?"voucher":(official || q?.sourceType==="official-qbank"?"official-qbank":"course"));
  const voucherTrack=voucher?state.voucherRegistry?.tracks?.find?.(item=>item.id===trackId):null;
  const voucherSection=sourceType==="voucher"?voucherDomainQuestionSession(q):null;
  const resolvedDomainId=override.domainId || voucher?.domainId || voucherSection?.domainId || (sourceType==="voucher"?q?.topicId:"") || "";
  const voucherDomain=resolvedDomainId?findVoucherContentArchitectureDomain({architecture:state.voucherContentArchitecture,domainId:resolvedDomainId}):null;
  return {
    sourceType,
    official:sourceType==="official-qbank",
    courseId:override.courseId || state.selectedCourse?.id || "",
    course:override.course || (sourceType==="voucher"?"Voucher":exam?.course || state.selectedCourse?.title || (sourceType==="official-qbank"?"Data Analysis":"")),
    trackId,
    track:override.track || q?.track || voucherTrack?.title || officialMeta?.track || state.selectedTrack?.title || exam?.module || trackId || "General",
    moduleId:override.moduleId || state.selectedModule?.id || "",
    module:override.module || exam?.module || state.selectedModule?.title || "",
    levelId,
    examId:override.examId || voucher?.voucherExamId || exam?.id || "",
    examTitle:override.examTitle || exam?.title || "",
    voucherSourceId:override.voucherSourceId || voucher?.sourceId || "",
    domainId:String(resolvedDomainId||""),
    domainTitle:override.domainTitle || voucher?.domainTitle || voucherDomain?.title || (sourceType==="voucher"?q?.topic:"") || "",
    sectionId:override.sectionId || voucherSection?.id || "",
    sectionTitle:override.sectionTitle || voucherSection?.title || "",
    topic:override.topic || displayTopicForQuestion(q)
  };
}
function recordAttemptMistakeOutcomes(questions,answers,exam=state.currentExam?.exam){
  for(const q of questions||[]){
    const selected=answers?.[q.id] ?? null;
    if(selected===null || selected===undefined || selected==="")continue;
    recordMistakeOutcome({
      ownerId:mistakeOwnerId(),studentName:state.studentName,question:q,selected,
      context:q.mistakeContext?{...mistakeContextForQuestion(q,exam),...q.mistakeContext}:mistakeContextForQuestion(q,exam)
    });
  }
}
async function ensureOfficialMistakesImported(){
  if(state.mistakesOfficialSeeded)return;
  const officialState=getOfficialQbankState();

  // Remove only legacy imported Official items that never had a real learner answer.
  // Official Study wrong answers remain because they have a saved track answer.
  // Official Exam wrong answers remain because they carry exam context.
  const officialItems=getMistakes(mistakeOwnerId(),{includeMastered:true})
    .filter(item=>item.context?.sourceType==="official-qbank");
  for(const item of officialItems){
    const levelId=item.context?.levelId||"junior-data-analysis";
    const trackId=item.context?.trackId||item.question?.trackId||"";
    if(!trackId)continue;
    const matchingRecord=Object.entries(officialState?.tracks||{}).find(([trackKey])=>{
      const parsed=parseOfficialMistakeTrackKey(trackKey);
      return parsed.levelId===levelId && parsed.trackId===trackId;
    })?.[1] || {};
    if(isLegacyUnansweredOfficialSeed(item,matchingRecord)){
      removeMistake(mistakeOwnerId(),item.key);
    }
  }

  const existingOfficial=new Set(getMistakes(mistakeOwnerId(),{includeMastered:true})
    .filter(item=>item.context?.sourceType==="official-qbank")
    .map(item=>`${item.context?.levelId||"junior-data-analysis"}::${item.context?.trackId||item.question?.trackId||""}::${item.question?.id||""}`));
  const entries=Object.entries(officialState?.tracks||{}).filter(([,record])=>(record?.mistakes||[]).length);
  for(const [trackKey,record] of entries){
    const parsed=parseOfficialMistakeTrackKey(trackKey);
    if(!parsed.trackId)continue;
    const missingIds=(record.mistakes||[]).filter(questionId=>!existingOfficial.has(`${parsed.levelId}::${parsed.trackId}::${questionId}`));
    if(!missingIds.length)continue;
    try{
      const questions=await loadOfficialTrack(state.officialRegistry,parsed.trackId,loadJson,parsed.levelId);
      const byId=new Map(questions.map(q=>[q.id,q]));
      const meta=mistakeTrackMeta(parsed.levelId,parsed.trackId);
      for(const questionId of missingIds){
        const q=byId.get(questionId);if(!q)continue;
        seedMistake({
          ownerId:mistakeOwnerId(),studentName:state.studentName,question:q,
          selected:record.answers?.[questionId]||null,
          context:{
            sourceType:"official-qbank",official:true,course:"Data Analysis",
            trackId:parsed.trackId,track:meta?.track||q.track||parsed.trackId,
            levelId:parsed.levelId,module:meta?.track||q.track||"Official QBank",
            topic:displayTopicForQuestion(q)
          }
        });
      }
    }catch(error){
      console.warn("Could not import Official QBank mistakes",trackKey,error);
    }
  }
  state.mistakesOfficialSeeded=true;
}
async function ensureVoucherMistakeContexts(){
  const items=getMistakes(mistakeOwnerId(),{includeMastered:true}).filter(item=>{
    if(item?.context?.sourceType!=="voucher")return false;
    return !item.context?.domainId || !item.context?.sectionId || !item.context?.domainTitle || !item.context?.sectionTitle;
  });
  if(!items.length)return;
  const groups=new Map();
  for(const item of items){
    const trackId=String(item.context?.trackId||item.question?.trackId||"");
    const examId=String(item.context?.examId||"");
    if(!trackId||!examId)continue;
    const key=`${trackId}::${examId}`;
    if(!groups.has(key))groups.set(key,{trackId,examId,items:[]});
    groups.get(key).items.push(item);
  }
  for(const group of groups.values()){
    try{
      const {config}=await loadVoucherExamConfig(group.trackId,group.examId);
      if(!config?.contentArchitectureFile)continue;
      const architecture=(state.voucherExamConfig?.id===group.examId&&state.voucherContentArchitecture)
        ?state.voucherContentArchitecture
        :await loadJson(config.contentArchitectureFile);
      const sessions=new Map((architecture?.sessions||[]).map(row=>[String(row.id),row]));
      const domains=new Map((architecture?.domains||[]).map(row=>[String(row.id),row]));
      for(const item of group.items){
        const sectionId=String(architecture?.questionSessionMap?.[item.question?.id]||item.context?.sectionId||"");
        const section=sessions.get(sectionId)||null;
        const domainId=String(section?.domainId||item.context?.domainId||item.question?.topicId||"");
        const domain=domains.get(domainId)||null;
        if(!section&&!domain)continue;
        patchMistakeContext(mistakeOwnerId(),item.key,{
          examTitle:item.context?.examTitle||config.title||group.examId,
          domainId,domainTitle:domain?.title||item.context?.domainTitle||item.question?.topic||"",
          sectionId:section?.id||item.context?.sectionId||"",sectionTitle:section?.title||item.context?.sectionTitle||""
        });
      }
    }catch(error){
      console.warn("Could not enrich Voucher mistake context",group.examId,error);
    }
  }
}
function mistakeStatusLabel(status){
  if(status==="mastered")return "Mastered";
  if(status==="improving")return "Improving";
  return "Needs Review";
}
function mistakeSourceLabel(item){
  if(item?.context?.sourceType==="official-qbank"){
    const level=item.context.levelId==="professional-data-analysis"?"Professional":"Junior";
    return `${level} Official QBank`;
  }
  if(item?.context?.sourceType==="voucher")return `Voucher${item.context?.examTitle?` • ${item.context.examTitle}`:""}`;
  return item?.context?.examTitle || item?.context?.module || "Course Practice / Exam";
}
function mistakeExplanation(item){
  return item?.question?.explanationAr || "No detailed explanation is stored for this question yet.";
}
function selectedMistakeOptions(item){
  const selected=item?.lastWrongSelected??item?.lastSelected;
  const ids=new Set(selectedAnswerIds(selected));
  return (item?.question?.options||[]).filter(o=>ids.has(String(o.id)));
}
function correctMistakeOptions(item){
  const ids=new Set(correctAnswerIds(item?.question||{}));
  return (item?.question?.options||[]).filter(o=>ids.has(String(o.id)));
}
function mistakeOptionSummary(options,qLike){
  return (options||[]).map(option=>`<div><b>${escapeHtml(option.id)}.</b> ${renderTechnicalOption(option.text||"",qLike)}</div>`).join("")||"—";
}
function relativeMistakeDate(value){
  const time=Date.parse(value||"");
  if(!time)return "—";
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(time));
}
function currentMistakeFilters(){
  return {
    search:($("mistakesSearch")?.value||"").trim().toLowerCase(),
    source:$("mistakesSourceFilter")?.value||"all",
    track:$("mistakesTrackFilter")?.value||"all",
    exam:$("mistakesExamFilter")?.value||"all",
    domain:$("mistakesDomainFilter")?.value||"all",
    section:$("mistakesSectionFilter")?.value||"all",
    topic:$("mistakesTopicFilter")?.value||"all",
    status:$("mistakesStatusFilter")?.value||state.mistakesStatusFilter||"active"
  };
}
function filterMistakeItems(items,filters=currentMistakeFilters()){
  return (items||[]).filter(item=>{
    const q=item.question||{},ctx=item.context||{};
    if(filters.source!=="all" && (ctx.sourceType||q.sourceType)!==filters.source)return false;
    if(filters.track!=="all" && String(ctx.trackId||q.trackId||ctx.track||q.track)!==filters.track)return false;
    if(filters.exam!=="all" && String(ctx.examId||"")!==filters.exam)return false;
    if(filters.domain!=="all" && String(ctx.domainId||ctx.domainTitle||"")!==filters.domain)return false;
    if(filters.section!=="all" && String(ctx.sectionId||ctx.sectionTitle||"")!==filters.section)return false;
    if(filters.topic!=="all" && String(q.topic||"General")!==filters.topic)return false;
    if(filters.status==="active" && item.status==="mastered")return false;
    if(!["all","active"].includes(filters.status) && item.status!==filters.status)return false;
    if(filters.search){
      const hay=[q.question,q.topic,q.track,ctx.track,ctx.examTitle,ctx.module,ctx.domainTitle,ctx.sectionTitle,mistakeSourceLabel(item)].join(" ").toLowerCase();
      if(!hay.includes(filters.search))return false;
    }
    return true;
  });
}
function syncMistakeFilterOptions(items){
  const sourceSelect=$("mistakesSourceFilter"),trackSelect=$("mistakesTrackFilter"),examSelect=$("mistakesExamFilter"),domainSelect=$("mistakesDomainFilter"),sectionSelect=$("mistakesSectionFilter"),topicSelect=$("mistakesTopicFilter");
  if(!trackSelect||!topicSelect)return;
  const source=sourceSelect?.value||"all";
  const voucherOnly=source==="voucher";
  const scoped=source==="all"?(items||[]):(items||[]).filter(item=>(item.context?.sourceType||item.question?.sourceType)===source);
  const previousTrack=trackSelect.value||"all",previousExam=examSelect?.value||"all",previousDomain=domainSelect?.value||"all",previousSection=sectionSelect?.value||"all",previousTopic=topicSelect.value||"all";

  const tracks=new Map();
  for(const item of scoped){
    const ctx=item.context||{},q=item.question||{};
    const value=String(ctx.trackId||q.trackId||ctx.track||q.track||"General");
    tracks.set(value,String(ctx.track||q.track||value||"General"));
  }
  trackSelect.innerHTML='<option value="all">All tracks</option>'+[...tracks.entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([value,label])=>`<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
  trackSelect.value=[...tracks.keys()].includes(previousTrack)?previousTrack:"all";
  const selectedTrack=trackSelect.value;
  const trackScoped=selectedTrack==="all"?scoped:scoped.filter(item=>String(item.context?.trackId||item.question?.trackId||item.context?.track||item.question?.track)===selectedTrack);

  const exams=new Map();
  for(const item of trackScoped){const ctx=item.context||{};if(ctx.examId)exams.set(String(ctx.examId),String(ctx.examTitle||ctx.examId));}
  if(examSelect){
    examSelect.classList.toggle("hidden",!voucherOnly);
    examSelect.innerHTML='<option value="all">All exams</option>'+[...exams.entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([value,label])=>`<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
    examSelect.value=voucherOnly&&exams.has(previousExam)?previousExam:"all";
  }
  const selectedExam=examSelect?.value||"all";
  const examScoped=selectedExam==="all"?trackScoped:trackScoped.filter(item=>String(item.context?.examId||"")===selectedExam);

  const domains=new Map();
  for(const item of examScoped){const ctx=item.context||{};if(ctx.domainId||ctx.domainTitle)domains.set(String(ctx.domainId||ctx.domainTitle),String(ctx.domainTitle||ctx.domainId));}
  if(domainSelect){
    domainSelect.classList.toggle("hidden",!voucherOnly);
    domainSelect.innerHTML='<option value="all">All domains</option>'+[...domains.entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([value,label])=>`<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
    domainSelect.value=voucherOnly&&domains.has(previousDomain)?previousDomain:"all";
  }
  const selectedDomain=domainSelect?.value||"all";
  const domainScoped=selectedDomain==="all"?examScoped:examScoped.filter(item=>String(item.context?.domainId||item.context?.domainTitle||"")===selectedDomain);

  const sections=new Map();
  for(const item of domainScoped){const ctx=item.context||{};if(ctx.sectionId||ctx.sectionTitle)sections.set(String(ctx.sectionId||ctx.sectionTitle),String(ctx.sectionTitle||ctx.sectionId));}
  if(sectionSelect){
    sectionSelect.classList.toggle("hidden",!voucherOnly);
    sectionSelect.innerHTML='<option value="all">All sections</option>'+[...sections.entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([value,label])=>`<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join("");
    sectionSelect.value=voucherOnly&&sections.has(previousSection)?previousSection:"all";
  }
  const selectedSection=sectionSelect?.value||"all";
  const sectionScoped=selectedSection==="all"?domainScoped:domainScoped.filter(item=>String(item.context?.sectionId||item.context?.sectionTitle||"")===selectedSection);

  const topics=new Set(sectionScoped.map(item=>String(item.question?.topic||"General")));
  topicSelect.innerHTML='<option value="all">All topics</option>'+[...topics].sort((a,b)=>a.localeCompare(b)).map(topic=>`<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join("");
  topicSelect.value=topics.has(previousTopic)?previousTopic:"all";
}
function renderMistakeWeakTopics(){
  const section=$("mistakesWeakTopicsSection"),row=$("mistakesWeakTopics");if(!section||!row)return;
  const weak=topicWeakness(mistakeOwnerId(),{limit:8});
  if(!weak.length){section.classList.add("hidden");row.innerHTML="";return}
  row.innerHTML=weak.map(x=>`<button type="button" data-weak-topic="${escapeHtml(x.topic)}"><strong>${escapeHtml(x.topic)}</strong><span>${x.needsReview} need review • ${x.wrongAttempts} wrong attempts</span></button>`).join("");
  row.querySelectorAll("[data-weak-topic]").forEach(btn=>btn.addEventListener("click",()=>{
    $("mistakesTopicFilter").value=btn.dataset.weakTopic;
    renderMistakesList();
  }));
  section.classList.remove("hidden");
}
function renderMistakesPracticeSummary(){
  const box=$("mistakesPracticeSummary");if(!box)return;
  const summary=state.mistakesPracticeSummary;
  if(!summary){box.classList.add("hidden");box.innerHTML="";return}
  box.classList.remove("hidden");
  box.innerHTML=`<div><span class="eyebrow">PRACTICE COMPLETE</span><h3>${summary.correct}/${summary.total} correct</h3><p>${summary.masteredGained} question${summary.masteredGained===1?"":"s"} reached Mastered • ${summary.improving} now Improving • no Ranking entry was created.</p></div><button type="button" class="ghost-btn" data-dismiss-mistakes-summary>Dismiss</button>`;
  box.querySelector("[data-dismiss-mistakes-summary]")?.addEventListener("click",()=>{state.mistakesPracticeSummary=null;renderMistakesPracticeSummary()});
}
function renderMistakesList(){
  const activeStatus=$("mistakesStatusFilter")?.value||state.mistakesStatusFilter||"active";
  document.querySelectorAll("[data-mistake-status]").forEach(btn=>btn.classList.toggle("active",btn.dataset.mistakeStatus===activeStatus));
  const all=getMistakes(mistakeOwnerId(),{includeMastered:true});
  syncMistakeFilterOptions(all);
  const filtered=filterMistakeItems(all);
  const list=$("mistakesList"),empty=$("mistakesEmpty"),count=$("mistakesVisibleCount");
  if(count)count.textContent=`${filtered.length} question${filtered.length===1?"":"s"}`;
  if(!list||!empty)return;
  if(!filtered.length){
    list.innerHTML="";empty.classList.remove("hidden");
    $("mistakesEmptyText").textContent=all.length?"No questions match the current filters.":"Complete Practice, Exams or Official QBank questions and your wrong answers will appear here automatically.";
    return;
  }
  empty.classList.add("hidden");
  list.innerHTML=filtered.map((item,index)=>{
    const q=item.question||{},selected=selectedMistakeOptions(item),correct=correctMistakeOptions(item);
    const source=mistakeSourceLabel(item),status=mistakeStatusLabel(item.status),mastered=item.status==="mastered";
    const qLike={...q,deepExplanation:q.optionReasons?{summary:q.explanationAr||"",options:q.optionReasons}:undefined};
    const lastWrong=item.lastWrongSelected??item.lastSelected;
    const structuredMistake=isStructuredQuestion(qLike);
    const structuredExpected=structuredMistake?structuredExpectedDisplay(qLike):[];
    const lastWrongLabel=structuredMistake?answerDisplayText(qLike,lastWrong):(selectedAnswerIds(lastWrong).join(", ")||"—");
    const lastWrongBody=structuredMistake?answerOptionText(qLike,lastWrong):mistakeOptionSummary(selected,qLike);
    const correctLabel=structuredMistake?(structuredExpected.map(row=>`${row.label}: ${row.value||"—"}`).join(" · ")||"—"):(correctAnswerIds(q).join(", ")||"—");
    const correctBody=structuredMistake?structuredExpected.map(row=>`<div class="structured-answer-row"><b>${escapeHtml(row.label)}:</b> ${escapeHtml(row.value||"—")}</div>`).join(""):mistakeOptionSummary(correct,qLike);
    return `<article class="mistake-card status-${escapeHtml(item.status)}" data-mistake-key="${escapeHtml(item.key)}">
      <div class="mistake-card-top">
        <div class="mistake-card-meta"><span class="mistake-status-chip ${escapeHtml(item.status)}">${escapeHtml(status)}</span><span>${escapeHtml(source)}</span><span>${escapeHtml(q.track||item.context?.track||"General")}</span>${item.context?.domainTitle?`<span>${escapeHtml(item.context.domainTitle)}</span>`:""}${item.context?.sectionTitle?`<span>${escapeHtml(item.context.sectionTitle)}</span>`:""}${!item.context?.domainTitle||String(q.topic||"")!==String(item.context.domainTitle||"")?`<span>${escapeHtml(q.topic||"General")}</span>`:""}</div>
        <div class="mistake-count-badge"><strong>${Number(item.wrongCount)||0}×</strong><small>wrong</small></div>
      </div>
      <div class="mistake-question-number">QUESTION ${String(index+1).padStart(2,"0")}</div>
      <div class="mistake-question-text">${renderTechnicalQuestion(q.question||"",qLike)}</div>
      <div class="mistake-answer-grid">
        <div class="mistake-answer wrong-answer"><span>YOUR LAST WRONG ANSWER</span><strong>${escapeHtml(lastWrongLabel)}</strong><div>${lastWrongBody}</div></div>
        <div class="mistake-answer correct-answer"><span>CORRECT ANSWER</span><strong>${escapeHtml(correctLabel)}</strong><div>${correctBody}</div></div>
      </div>
      <details class="mistake-explanation"><summary>Review explanation</summary><div dir="rtl">${renderTechnicalRichText(mistakeExplanation(item),qLike)}</div></details>
      <div class="mistake-card-footer">
        <div class="mistake-recovery-meta"><span>Recovery streak <strong>${Number(item.recoveryStreak)||0}/${MASTERY_STREAK}</strong></span><span>Last wrong ${escapeHtml(relativeMistakeDate(item.lastWrongAt||item.updatedAt))}</span>${mastered?'<span class="mastered-note">Mastered ✓</span>':""}</div>
        <button type="button" class="${mastered?"secondary-btn":"primary-btn"}" data-retry-mistake="${escapeHtml(item.key)}">${mastered?"Review Again":"Retry Question"} →</button>
      </div>
    </article>`;
  }).join("");
  list.querySelectorAll("[data-retry-mistake]").forEach(btn=>btn.addEventListener("click",()=>startMistakesPracticeByKeys([btn.dataset.retryMistake])));
}
async function renderMistakes(){
  await ensureOfficialMistakesImported();
  await ensureVoucherMistakeContexts();
  const summary=getMistakeSummary(mistakeOwnerId());
  const active=summary["needs-review"]+summary.improving;
  $("mistakesActiveCount").textContent=active;
  $("mistakesNeedsReviewCount").textContent=summary["needs-review"];
  $("mistakesImprovingCount").textContent=summary.improving;
  $("mistakesMasteredCount").textContent=summary.mastered;
  const resetBtn=$("resetMistakesBtn");
  if(resetBtn){resetBtn.disabled=summary.total===0;resetBtn.textContent=summary.total?`Reset My Mistakes (${summary.total})`:"Reset My Mistakes";}
  renderMistakeWeakTopics();renderMistakesPracticeSummary();renderMistakesList();
}
function selectedMistakePracticeItems(){
  const all=getMistakes(mistakeOwnerId(),{includeMastered:true});
  let items=filterMistakeItems(all);
  if(!items.length && currentMistakeFilters().status==="mastered")return items;
  if(!items.length)items=all.filter(x=>x.status!=="mastered");
  const requested=$("mistakesPracticeCount")?.value||"20";
  const max=requested==="all"?items.length:Math.max(1,Number(requested)||20);
  return items.slice(0,max);
}
function startMistakesPracticeByKeys(keys){
  const items=(keys||[]).map(key=>getMistake(mistakeOwnerId(),key)).filter(Boolean);
  startMistakesPractice(items);
}
function startMistakesPractice(items){
  if(!items?.length){showToast("No mistakes are available for this practice view.");return}
  const questions=items.map(questionFromMistake).filter(isPracticeableMistakeQuestion);
  if(!questions.length){showToast("These saved mistakes cannot be practiced yet.");return}
  const id=`my-mistakes-${Date.now()}`;
  state.mistakesPracticeKeys=items.map(x=>x.key);
  state.currentExam={schemaVersion:"1.0",exam:{
    id,title:`My Mistakes Practice — ${questions.length} Question${questions.length===1?"":"s"}`,
    description:"Personal recovery practice generated only from your saved mistakes. This practice never enters Ranking.",
    course:"My Mistakes",module:"Personal Recovery",category:"My Mistakes",uploadedBy:"Digilians E-Learn",
    createdAt:new Date().toISOString().slice(0,10),version:"1.0",difficulty:"Mixed",
    settings:{timer:{enabled:false,durationMinutes:null},allowRetake:true,feedbackModes:["instant"],shuffleQuestions:false,shuffleOptions:false,passingScore:60},
    generatedFromMistakes:{ranked:false,kind:"mistake-recovery",keys:state.mistakesPracticeKeys}
  },questions};
  state.currentRegistryItem={id,title:state.currentExam.exam.title,course:"My Mistakes",module:"Personal Recovery",questionCount:questions.length,generator:"mistakes",ranked:false};
  state.currentRankedActivity=false;
  state.feedbackMode="instant";
  state.previousBest=null;
  startExam();
}

$("mistakesSearch")?.addEventListener("input",renderMistakesList);
["mistakesSourceFilter","mistakesTrackFilter","mistakesExamFilter","mistakesDomainFilter","mistakesSectionFilter","mistakesTopicFilter","mistakesStatusFilter"].forEach(id=>$(id)?.addEventListener("change",()=>{
  if(id==="mistakesStatusFilter")state.mistakesStatusFilter=$(id).value;
  renderMistakesList();
}));
document.querySelectorAll("[data-mistake-status]").forEach(btn=>btn.addEventListener("click",()=>{
  const status=btn.dataset.mistakeStatus||"active";
  state.mistakesStatusFilter=status;
  if($("mistakesStatusFilter"))$("mistakesStatusFilter").value=status;
  document.querySelectorAll("[data-mistake-status]").forEach(x=>x.classList.toggle("active",x===btn));
  renderMistakesList();
}));
$("practiceMistakesBtn")?.addEventListener("click",()=>startMistakesPractice(selectedMistakePracticeItems()));
$("resetMistakesBtn")?.addEventListener("click",async()=>{
  const summary=getMistakeSummary(mistakeOwnerId());
  if(!summary.total){showToast("No saved mistakes to clear.");return}
  const profile=state.studentName?` for ${state.studentName}`:"";
  if(!confirm(`Clear all ${summary.total} saved mistakes${profile}? Needs Review, Improving and Mastered history will be removed. Exam results, Ranking, bookmarks, reviewed questions and saved answers will stay.`))return;
  if(!confirm("Final confirmation: permanently reset My Mistakes on this device? This cannot be undone unless you restore an older backup."))return;

  const cleared=clearMistakesForOwner(mistakeOwnerId());
  const officialFlagsCleared=clearOfficialMistakeFlags();
  const saved=getExamProgress();
  if(String(saved?.examId||"").startsWith("my-mistakes-"))clearExamProgress();
  state.mistakesOfficialSeeded=true;
  state.mistakesPracticeSummary=null;
  state.mistakesPracticeKeys=[];
  state.mistakesStatusFilter="active";
  if($("mistakesStatusFilter"))$("mistakesStatusFilter").value="active";
  emitAnalytics("mistakes_reset",{metadata:{mistakesCleared:cleared,officialFlagsCleared}});
  await renderMistakes();
  showToast(`${cleared} saved mistake${cleared===1?"":"s"} cleared. Results and Ranking were kept.`);
});

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
  renderVoucherHomeCard();
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
  return getActiveExamProgress(getExamProgress(),state.studentName);
}
function effectiveSavedRemaining(progress){
  return effectiveSavedRemainingSeconds(progress,{nowEpoch:Date.now()});
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
        <button class="secondary-btn section-study-btn">Study</button>
        <button class="primary-btn section-solve-btn">Solve & Rank →</button>
        <button class="ghost-btn section-rank-btn">Ranking ↗</button>
      </div>`;
    card.querySelector(".section-study-btn").addEventListener("click",()=>openOfficialStudyScope(section.sectionId));
    card.querySelector(".section-solve-btn").addEventListener("click",()=>requireRankedIdentity(()=>prepareOfficialSection(section.sectionId),"Enter your name before solving a ranked Official QBank section."));
    card.querySelector(".section-rank-btn").addEventListener("click",()=>requireRankedIdentity(()=>{
      state.rankingMode="exam";
      state.rankingExamId=examId;
      persistRankingMode("exam");
      setLastRankingExamId(examId);
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
  const unifiedMistakes=new Map(getMistakes(mistakeOwnerId(),{includeMastered:true})
    .filter(item=>item.context?.sourceType==="official-qbank" && item.context?.levelId===state.officialLevelId && item.context?.trackId===state.officialTrackId)
    .map(item=>[item.question?.id,item]));
  state.officialFiltered=state.officialQuestions.filter(q=>{
    if(query && !(`${q.question} ${q.options.map(o=>o.text).join(' ')}`).toLowerCase().includes(query))return false;
    if(topic!=='all' && displayTopicForQuestion(q)!==topic)return false;
    if(kind==='unseen' && reviewed.has(q.id))return false;
    if(kind==='reviewed'&&!reviewed.has(q.id))return false;
    if(kind==='bookmarks'&&!bookmarks.has(q.id))return false;
    if(kind==='mistakes'){
      const unified=unifiedMistakes.get(q.id);
      if(unified?.status==="mastered")return false;
      if(!mistakes.has(q.id) && !unified)return false;
    }
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
  recordMistakeOutcome({
    ownerId:mistakeOwnerId(),studentName:state.studentName,question:q,selected:optionId,
    context:mistakeContextForQuestion(q,null,{
      sourceType:"official-qbank",levelId:state.officialLevelId,trackId:state.officialTrackId,
      track:mistakeTrackMeta(state.officialLevelId,state.officialTrackId)?.track||q.track||state.officialTrackId,
      course:"Data Analysis",module:"Official QBank",topic:displayTopicForQuestion(q)
    })
  });
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
  configureExamSetup(payload,item);
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
          <span>${topic.importance ? String(topic.importance).toUpperCase() : "MAPPED"}</span>
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
  emitAnalytics("track_open",{courseId:course?.id||null,trackId:track?.id||null});
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
    :(track.studyGroups?.length?track.studyGroups:topics.slice(0,12).map(t=>t.title));
  const sessionLabel=track.id==="excel"?"MODULES":"SESSIONS";

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
      <div><span>${sessionLabel}</span><strong>${sessions}</strong></div>
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


function isExcelLearningGroupsModule(module=state.selectedModule){
  return Boolean(
    module?.study?.displayMode==="excel-learning-groups-v3-full" &&
    Array.isArray(module?.study?.learningGroups) &&
    module.study.learningGroups.length
  );
}

function moduleStudyProgressSnapshot(module=state.selectedModule){
  const sections=module?.study?.sections||[];
  const total=sections.length;
  if(!total || !state.studentName)return {completed:0,total,percent:0};
  const saved=getStudyProgress(state.studentName,module.id);
  const valid=new Set(sections.map((s,i)=>studySectionKey(s,i)));
  const completed=(saved.completedSections||[]).filter(id=>valid.has(id)).length;
  return {completed,total,percent:Math.round(completed/total*100)};
}

function groupStudyProgressSnapshot(group,module=state.selectedModule){
  const ids=(group?.sectionIds||[]).filter(Boolean);
  if(!ids.length || !state.studentName)return {completed:0,total:ids.length,percent:0};
  const saved=getStudyProgress(state.studentName,module?.id);
  const completed=(saved.completedSections||[]).filter(id=>ids.includes(id)).length;
  return {completed,total:ids.length,percent:Math.round(completed/ids.length*100)};
}

function excelGroupById(groupId,module=state.selectedModule){
  return (module?.study?.learningGroups||[]).find(g=>g.id===groupId)||null;
}

function excelSectionById(sectionId,module=state.selectedModule){
  return (module?.study?.sections||[]).find(s=>s.id===sectionId)||null;
}

function openExcelModuleExplorer(module=state.selectedModule){
  if(!isExcelLearningGroupsModule(module)){
    openStudy();
    return;
  }
  state.selectedModule=module;
  state.excelExplorerGroupId=null;
  state.excelStudyGroupId=null;
  state.excelStudyStartSectionId=null;
  renderExcelModuleExplorer();
  emitAnalytics("excel_module_explorer_open",{
    courseId:state.selectedCourse?.id||null,
    trackId:state.selectedTrack?.id||null,
    moduleId:module?.id||null
  });
  routeTo("excelModuleExplorerView");
}

function openExcelGroupExplorer(groupId){
  const group=excelGroupById(groupId);
  if(!group)return;
  state.excelExplorerGroupId=group.id;
  renderExcelGroupExplorer();
  emitAnalytics("excel_group_explorer_open",{
    courseId:state.selectedCourse?.id||null,
    trackId:state.selectedTrack?.id||null,
    moduleId:state.selectedModule?.id||null,
    groupId:group.id
  });
  routeTo("excelGroupExplorerView");
}

function renderExcelModuleExplorer(){
  const module=state.selectedModule;
  if(!isExcelLearningGroupsModule(module))return;

  const groups=module.study.learningGroups||[];
  const snapshot=moduleStudyProgressSnapshot(module);

  $("excelModuleExplorerBreadcrumb").textContent=`Learn / ${state.selectedCourse?.title||"Data Analysis"} / ${state.selectedTrack?.title||"Excel"}`;
  $("excelModuleExplorerTitle").textContent=module.title||"Excel";
  $("excelModuleExplorerDescription").textContent=module.study?.description||module.description||"";
  $("excelModuleExplorerProgress").textContent=`${snapshot.percent}%`;
  $("excelModuleExplorerProgressFill").style.width=`${snapshot.percent}%`;
  $("excelModuleExplorerProgressMeta").textContent=`${snapshot.completed} / ${snapshot.total} lessons completed`;

  const source=module.sourceBatch||{};
  $("excelModuleExplorerSource").textContent=`${module.displaySourceBatch||`Week ${source.week||1}`} • ${source.files||9} files • ${source.slides||262} slides`;

  const grid=$("excelModuleGroupGrid");
  grid.innerHTML=groups.map(group=>{
    const progress=groupStudyProgressSnapshot(group,module);
    const lessons=(group.sectionIds||[]).map(id=>excelSectionById(id,module)).filter(Boolean);
    const prereq=lessons.length>0 && lessons.every(s=>s.role==="statistics-prerequisite");
    const deep=group.status==="deep-learning-full";
    const firstTerms=[...new Set(lessons.flatMap(s=>s.keyTerms||[]))].slice(0,5);

    return `<article class="excel-explorer-group-card ${prereq?"prerequisite":""} ${deep?"deep-v2":""}" data-open-excel-group="${escapeHtml(group.id)}" tabindex="0" role="button">
      <div class="excel-explorer-group-top">
        <span class="excel-explorer-group-number">${escapeHtml(group.number)}</span>
        <div class="excel-explorer-group-badges">
          ${prereq?'<span class="excel-explorer-chip prereq">PREREQUISITE • STATISTICS</span>':''}
          ${deep?'<span class="excel-explorer-chip deep">DEEP LEARNING</span>':''}
        </div>
      </div>
      <h3>${escapeHtml(group.title)}</h3>
      <p>${escapeHtml(group.subtitle||"")}</p>
      <div class="excel-explorer-relationship-mini">
        <span>WHY THESE LESSONS BELONG TOGETHER</span>
        <p>${escapeHtml(group.relationship||"")}</p>
      </div>
      ${firstTerms.length?`<div class="excel-explorer-term-row">${firstTerms.map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>`:""}
      <div class="excel-explorer-group-footer">
        <div>
          <strong>${lessons.length} lesson${lessons.length===1?"":"s"}</strong>
          <small>${progress.completed}/${progress.total} completed • ${progress.percent}%</small>
        </div>
        <button type="button" class="secondary-btn" data-open-excel-group-button="${escapeHtml(group.id)}">Explore Group →</button>
      </div>
      <div class="excel-explorer-mini-progress"><i style="width:${progress.percent}%"></i></div>
    </article>`;
  }).join("");

  grid.querySelectorAll("[data-open-excel-group]").forEach(card=>{
    const open=()=>openExcelGroupExplorer(card.dataset.openExcelGroup);
    card.addEventListener("click",e=>{
      if(e.target.closest("button"))return;
      open();
    });
    card.addEventListener("keydown",e=>{
      if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}
    });
  });
  grid.querySelectorAll("[data-open-excel-group-button]").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.stopPropagation();
      openExcelGroupExplorer(btn.dataset.openExcelGroupButton);
    });
  });
}

function renderExcelGroupExplorer(){
  const module=state.selectedModule;
  const group=excelGroupById(state.excelExplorerGroupId,module);
  if(!module || !group)return;

  const sections=(group.sectionIds||[]).map(id=>excelSectionById(id,module)).filter(Boolean);
  const progress=groupStudyProgressSnapshot(group,module);
  const prereq=sections.length>0 && sections.every(s=>s.role==="statistics-prerequisite");

  $("excelGroupExplorerBreadcrumb").textContent=`Excel / ${module.title} / ${group.title}`;
  $("excelGroupExplorerBadge").textContent=`GROUP ${group.number}`;
  $("excelGroupExplorerEyebrow").textContent=`LEARNING GROUP ${group.number}${prereq?" • PREREQUISITE":""}`;
  $("excelGroupExplorerTitle").textContent=group.title;
  $("excelGroupExplorerSubtitle").textContent=group.subtitle||"";
  $("excelGroupExplorerRelationship").textContent=group.relationship||"";
  $("excelGroupExplorerProgress").textContent=`${progress.percent}%`;
  $("excelGroupExplorerProgressFill").style.width=`${progress.percent}%`;
  $("excelGroupExplorerProgressMeta").textContent=`${progress.completed} / ${progress.total} lessons completed`;

  $("excelGroupExplorerFlow").innerHTML=sections.map((s,i)=>`
    <span>${escapeHtml(s.title)}</span>${i<sections.length-1?'<b>→</b>':""}
  `).join("");

  const saved=getStudyProgress(state.studentName,module.id);
  const completed=new Set(saved.completedSections||[]);
  const grid=$("excelGroupLessonGrid");
  grid.innerHTML=sections.map((section,i)=>{
    const done=completed.has(section.id);
    const deep=Boolean(section.deepLearningV2?.version?.startsWith("2."));
    const terms=(section.keyTerms||[]).slice(0,7);
    const description=section.deepLearningV2?.opening?.goalAr || section.summaryAr || section.lessonV2?.whatIsItAr || "";
    return `<article class="excel-lesson-explorer-card ${done?"completed":""} ${deep?"deep-v2":""}" data-excel-lesson="${escapeHtml(section.id)}">
      <div class="excel-lesson-explorer-index">${String(i+1).padStart(2,"0")}</div>
      <div class="excel-lesson-explorer-copy">
        <div class="excel-lesson-explorer-meta">
          <span>${prereq?"PREREQUISITE • STATISTICS":"EXCEL CORE"}</span>
          ${deep?'<span class="deep-label">DEEP LEARNING V2</span>':""}
          ${done?'<span class="done-label">COMPLETED ✓</span>':""}
        </div>
        <h3>${escapeHtml(section.title)}</h3>
        <p dir="rtl">${formatStudyMixedText(description)}</p>
        ${terms.length?`<div class="excel-lesson-term-row">${terms.map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>`:""}
        <div class="excel-lesson-source-line"><span>SOURCE</span><small>${escapeHtml(section.sourceTrace||"")}</small></div>
      </div>
      <div class="excel-lesson-explorer-action">
        <button type="button" class="${done?"secondary-btn":"primary-btn"}" data-start-excel-lesson="${escapeHtml(section.id)}">
          ${done?"Review Lesson":"Start Lesson"} →
        </button>
      </div>
    </article>`;
  }).join("");

  grid.querySelectorAll("[data-start-excel-lesson]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      openStudy({groupId:group.id,startSectionId:btn.dataset.startExcelLesson});
    });
  });
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
    const selectedNoticeLabel=$("selectedModuleNotice")?.querySelector("span");
    if(selectedNoticeLabel)selectedNoticeLabel.textContent=isExcelLearningGroupsModule(module)?"SELECTED MODULE":"SELECTED SESSION";
    if(moduleName)moduleName.textContent=module.title;
    if(moduleHint)moduleHint.textContent=isExcelLearningGroupsModule(module)
      ?"Study + Practice cover this Excel week. Full Track Exam covers all 3 Excel weeks."
      :module.assessmentStatus==="building-after-study-qa"
        ?"Study is ready. Practice and Exam will unlock after Study/source-trace QA."
        :"Next: Study the material, practice with feedback, then take the session exam.";

    const selectedNotice=$("selectedModuleNotice");
    if(selectedNotice){
      const explorerReady=isExcelLearningGroupsModule(module);
      selectedNotice.classList.toggle("explorer-ready",explorerReady);
      selectedNotice.setAttribute("role",explorerReady?"button":"status");
      selectedNotice.setAttribute("tabindex",explorerReady?"0":"-1");
      selectedNotice.setAttribute("aria-label",explorerReady?`Explore ${module.title} content`:"Selected session");
      selectedNotice.dataset.explorerReady=explorerReady?"true":"false";
    }
    syncLearningFlowStats(module);

    const flow=$("moduleLearningFlow");
    const studyFlowCard=flow?.querySelector(".flow-card:first-child");
    if(studyFlowCard){
      const title=studyFlowCard.querySelector("h4");
      const desc=studyFlowCard.querySelector("p");
      if(isExcelLearningGroupsModule(module)){
        if(title)title.textContent="Explore the learning map";
        if(desc)desc.textContent="Open 8 connected Groups, understand how the topics relate, then choose the exact lesson you want to study.";
      }else{
        if(title)title.textContent="Understand the material";
        if(desc)desc.textContent="Read clear sections, key points, examples and visual notes.";
      }
    }
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
      updateSelectedModuleUI(module,row,{scrollToPath:!isExcelLearningGroupsModule(module)});
      if(isExcelLearningGroupsModule(module))openExcelModuleExplorer(module);
    });
    if(!firstModuleRow)firstModuleRow=row;
    list.appendChild(row);
  });

  if(shouldRenderStandaloneTrackExamRow(track)){
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

$("openStudyBtn").addEventListener("click",()=>{
  if(isExcelLearningGroupsModule())openExcelModuleExplorer();
  else openStudy();
});
$("openPracticeBtn").addEventListener("click",()=>openModuleExam("instant"));
$("openModuleExamBtn").addEventListener("click",()=>openLearningFlowExam());


$("selectedModuleNotice")?.addEventListener("click",()=>{
  if($("selectedModuleNotice")?.dataset.explorerReady==="true")openExcelModuleExplorer();
});
$("selectedModuleNotice")?.addEventListener("keydown",e=>{
  if($("selectedModuleNotice")?.dataset.explorerReady!=="true")return;
  if(e.key==="Enter"||e.key===" "){e.preventDefault();openExcelModuleExplorer()}
});
$("excelModuleExplorerBackBtn")?.addEventListener("click",()=>routeTo("learnView"));
$("excelGroupExplorerBackBtn")?.addEventListener("click",()=>routeTo("excelModuleExplorerView"));

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
  const {practiceReady,examReady}=moduleAssessmentState(module);
  const practiceExamId=resolveModuleExamId(module,"instant");
  const practice=practiceReady?globalBestResultForFeedbackMode(practiceExamId,"instant"):null;
  const flowExam=resolveLearningFlowExam({module,track:state.selectedTrack,registry:state.registry});
  const usesTrackExam=flowExam.scope==="track";
  const moduleExamId=resolveModuleExamId(module,"exam");
  const exam=usesTrackExam
    ?(flowExam.examId?getBestForExam(flowExam.examId,state.studentName):null)
    :(examReady?globalBestResultForFeedbackMode(moduleExamId,"exam"):null);
  const savedProgress=activeSavedExamProgress();
  const blueprint=usesTrackExam
    ?(state.blueprints?.blueprints||[]).find(x=>x.id===flowExam.item?.blueprintId || x.id===flowExam.examId)
    :null;
  const trackCard=buildLearningFlowExamCard({scope:flowExam.scope,item:flowExam.item,bestResult:exam,savedProgress,blueprint});

  if($("studyFlowStatus")){
    $("studyFlowStatus").textContent=studyPct>=100?"Completed 100%":studyPct?`${studyPct}% completed`:"Not started";
    $("studyFlowStatus").classList.toggle("complete",studyPct>=100);
  }
  if($("practiceFlowStatus")){
    $("practiceFlowStatus").textContent=practice?`Best ${practice.percentage}%`:"Not attempted";
    $("practiceFlowStatus").classList.toggle("complete",Boolean(practice));
  }
  if($("examFlowStatus")){
    $("examFlowStatus").textContent=trackCard?.status || (exam?`Best ${exam.percentage}%`:"Not attempted");
    $("examFlowStatus").classList.toggle("complete",Boolean(exam) && !trackCard?.resume);
  }
  if($("examFlowPill"))$("examFlowPill").textContent=trackCard?.pill || "EXAM";
  if($("examFlowTitle"))$("examFlowTitle").textContent=trackCard?.title || "Test your readiness";
  if($("examFlowDescription"))$("examFlowDescription").textContent=trackCard?.description || "Take the exam in your preferred feedback mode and track your best.";
  if($("openPracticeBtn")){
    $("openPracticeBtn").disabled=!practiceReady;
    $("openPracticeBtn").innerHTML=practiceReady?'Start Practice <span>→</span>':'Practice Building';
  }
  if($("openModuleExamBtn")){
    const ready=trackCard?.ready ?? examReady;
    $("openModuleExamBtn").disabled=!ready;
    $("openModuleExamBtn").innerHTML=trackCard
      ?`${trackCard.buttonLabel} <span>→</span>`
      :(examReady?'Start Exam <span>→</span>':'Exam Building');
    $("openModuleExamBtn").dataset.examScope=trackCard?"track":"module";
  }
  if($("openStudyBtn")){
    if(isExcelLearningGroupsModule(module)){
      $("openStudyBtn").innerHTML=`Explore Content${studyPct?` · ${studyPct}%`:""} <span>→</span>`;
    }else{
      $("openStudyBtn").innerHTML=studyPct>=100
        ?'Review Study <span>→</span>'
        :studyPct
          ?`Continue Study · ${studyPct}% <span>→</span>`
          :'Start Study <span>→</span>';
    }
  }
}

function studySectionKey(section,index){
  return section?.id || `section-${index}`;
}
function allStudySectionIds(){
  return (state.selectedModule?.study?.sections||[]).map((s,i)=>studySectionKey(s,i));
}
function currentStudySections(){
  const all=state.selectedModule?.study?.sections||[];
  if(!state.excelStudyGroupId)return all;
  const group=excelGroupById(state.excelStudyGroupId);
  const ids=new Set(group?.sectionIds||[]);
  return all.filter(s=>ids.has(s.id));
}
function currentStudySectionIds(){
  return currentStudySections().map((s,i)=>studySectionKey(s,i));
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

  if($("studyProgressText"))$("studyProgressText").textContent=state.excelStudyGroupId
    ?`${count} / ${total} lessons in this group completed · ${percent}%`
    :`${count} / ${total} topics completed · ${percent}%`;
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
    $("studyMarkAllCompleteBtn").textContent=percent===100
      ?(state.excelStudyGroupId?"Group Completed ✓":"Study Completed ✓")
      :(state.excelStudyGroupId?"Mark Group as Completed ✓":"Mark Study as Completed ✓");
    $("studyMarkAllCompleteBtn").disabled=percent===100;
  }
  if($("studyResetProgressBtn")){
    $("studyResetProgressBtn").textContent=state.excelStudyGroupId?"Reset Group Progress":"Reset Study Progress";
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
  const allIds=allStudySectionIds();
  const saved=getStudyProgress(state.studentName,module.id);
  const set=new Set(saved.completedSections||[]);
  set.has(sectionId)?set.delete(sectionId):set.add(sectionId);
  const validCompleted=allIds.filter(id=>set.has(id));
  updateStudyProgress(state.studentName,module.id,{
    completedSections:validCompleted,
    completed:validCompleted.length===allIds.length,
    lastSectionId:sectionId
  });
  refreshStudyProgressUI();
}
function attachStudySectionProgress(article,section,index,tocBtn){
  const key=studySectionKey(section,index);
  const moduleSections=currentStudySections();
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
function openStudy({groupId=null,startSectionId=null}={}){
  const c=state.selectedCourse,m=state.selectedModule;
  if(!c||!m?.study)return;

  const requestedGroup=groupId && isExcelLearningGroupsModule(m)?excelGroupById(groupId,m):null;
  state.excelStudyGroupId=requestedGroup?.id||null;
  state.excelStudyStartSectionId=startSectionId||null;
  const isSqlStudy=state.selectedTrack?.id==="sql" || String(m.id||"").startsWith("sql-session-");
  const isPythonStudy=state.selectedTrack?.id==="python" || String(m.id||"").startsWith("python-session-");
  const isExcelStudy=state.selectedTrack?.id==="excel" || String(m.id||"").startsWith("excel-week-");

  const activeExcelGroup=state.excelStudyGroupId?excelGroupById(state.excelStudyGroupId,m):null;
  $("studyBreadcrumb").textContent=activeExcelGroup
    ?`${c.title} / ${m.title} / ${activeExcelGroup.title}`
    :`${c.title} / ${m.title} / Study`;
  $("studyTitle").textContent=activeExcelGroup?activeExcelGroup.title:m.study.title;
  $("studyDescription").textContent=activeExcelGroup
    ?`${activeExcelGroup.subtitle||""} ${activeExcelGroup.relationship||""}`.trim()
    :(m.study.description || "");

  const studyView=$("studyView");

  const scopedExcelStudy=Boolean(activeExcelGroup);
  if($("studyBackBtn"))$("studyBackBtn").textContent=scopedExcelStudy?"← Group":"← Module";

  const nextStep=studyView?.querySelector(".next-step-card");
  const nextTitle=nextStep?.querySelector("h3");
  const nextCopy=nextStep?.querySelector("p");
  if(scopedExcelStudy && m.assessmentStatus==="building-after-study-qa"){
    if($("studyToPracticeTop")){
      $("studyToPracticeTop").textContent="Group Overview ←";
      $("studyToPracticeTop").classList.remove("hidden");
    }
    if(nextTitle)nextTitle.textContent="Choose your next lesson";
    if(nextCopy)nextCopy.textContent="Return to the Group Overview to pick another lesson and see your Group progress.";
    if($("studyToPracticeBtn"))$("studyToPracticeBtn").innerHTML='Back to Group <span>←</span>';
  }else{
    if($("studyToPracticeTop"))$("studyToPracticeTop").textContent="Practice →";
    if(nextTitle)nextTitle.textContent="Ready to practice?";
    if(nextCopy)nextCopy.textContent="Use instant feedback to strengthen what you just reviewed.";
    if($("studyToPracticeBtn"))$("studyToPracticeBtn").innerHTML='Start Practice <span>→</span>';
  }

  studyView?.classList.toggle("sql-readable-study",isSqlStudy);
  const sqlStudyMode=String(m.study?.displayMode||"");
  studyView?.classList.toggle("sql-study-v2",isSqlStudy && sqlStudyMode==="sql-visual-learning-v2");
  studyView?.classList.toggle("python-code-study",isPythonStudy);
  const pythonStudyMode=String(m.study?.displayMode||"");
  studyView?.classList.toggle("python-study-v2",isPythonStudy && pythonStudyMode.startsWith("python-"));
  studyView?.classList.toggle("python-visual-study",isPythonStudy && pythonStudyMode==="python-visual-learning-v3");
  const excelStudyMode=String(m.study?.displayMode||"");
  studyView?.classList.toggle("excel-study-v1",isExcelStudy && (excelStudyMode==="excel-visual-learning-v1" || excelStudyMode==="excel-learning-groups-v3-full"));
  studyView?.classList.toggle("excel-study-v2-groups",isExcelStudy && excelStudyMode==="excel-learning-groups-v3-full");

  const toc=$("studyTocList"),sections=$("studySections");
  toc.innerHTML="";sections.innerHTML="";

  const excelGroups=isExcelStudy && Array.isArray(m.study?.learningGroups)?m.study.learningGroups:[];
  const excelGroupBySection=new Map();
  excelGroups.forEach(group=>(group.sectionIds||[]).forEach(id=>excelGroupBySection.set(id,group)));
  const studySectionsToRender=currentStudySections();

  if(excelGroups.length && !activeExcelGroup){
    const overview=document.createElement("div");
    overview.className="excel-group-overview-shell";
    overview.innerHTML=renderExcelGroupOverview(excelGroups,m.study.sections);
    sections.appendChild(overview);
  }
  if(activeExcelGroup){
    const groupHeader=document.createElement("div");
    groupHeader.className="excel-group-header-shell";
    groupHeader.innerHTML=renderExcelGroupHeader(activeExcelGroup,m.study.sections);
    sections.appendChild(groupHeader);
  }

  let lastExcelGroupId=activeExcelGroup?.id||null;

  studySectionsToRender.forEach((s,i)=>{
    const key=studySectionKey(s,i);
    const id=`study-section-${key}`;
    const excelGroup=excelGroups.length?excelGroupBySection.get(s.id):null;

    if(!activeExcelGroup && excelGroup && excelGroup.id!==lastExcelGroupId){
      const tocGroup=document.createElement("div");
      tocGroup.className=`excel-toc-group ${excelGroup.status==="deep-learning-full"?"prototype":""}`;
      tocGroup.innerHTML=`<span>GROUP ${escapeHtml(excelGroup.number)}</span><strong>${escapeHtml(excelGroup.title)}</strong>`;
      toc.appendChild(tocGroup);

      const groupHeader=document.createElement("div");
      groupHeader.className="excel-group-header-shell";
      groupHeader.innerHTML=renderExcelGroupHeader(excelGroup,m.study.sections);
      sections.appendChild(groupHeader);
      lastExcelGroupId=excelGroup.id;
    }

    const tocBtn=document.createElement("button");
    tocBtn.dir="ltr";
    const excelPrereq=isExcelStudy && s.role==="statistics-prerequisite";
    if(excelPrereq)tocBtn.classList.add("excel-prereq-toc");
    tocBtn.innerHTML=`
      <span class="study-toc-item-number">${String(i+1).padStart(2,"0")}</span>
      <span class="study-toc-item-title">${escapeHtml(s.title)}${excelPrereq?'<small class="excel-toc-role">PREREQUISITE • STATISTICS</small>':""}</span>
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
    }else if(isExcelStudy){
      article=document.createElement("section");
      article.className=`study-section excel-study-section ${s.role==="statistics-prerequisite"?"statistics-prerequisite":"excel-core"}`;
      article.id=id;
      article.innerHTML=renderExcelStudySectionHtmlV2(s,i);
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

  if(isExcelStudy){
    sections.querySelectorAll("[data-excel-deep-qc]").forEach(card=>{
      const answerIndex=Number(card.dataset.answerIndex);
      const feedback=card.querySelector(".excel-qc-feedback");
      card.querySelectorAll("[data-excel-qc-option]").forEach(btn=>{
        btn.addEventListener("click",()=>{
          const selected=Number(btn.dataset.excelQcOption);
          card.querySelectorAll("[data-excel-qc-option]").forEach((option,i)=>{
            option.classList.toggle("correct",i===answerIndex);
            option.classList.toggle("wrong",i===selected && selected!==answerIndex);
            option.disabled=true;
          });
          const section=m.study.sections.find(x=>x.id===card.dataset.excelDeepQc);
          const explanation=section?.deepLearningV2?.quickCheck?.explanationAr||"";
          feedback.hidden=false;
          feedback.className=`excel-qc-feedback ${selected===answerIndex?"correct":"wrong"}`;
          feedback.innerHTML=`<strong>${selected===answerIndex?"Correct ✓":"Not quite"}</strong><p dir="rtl">${formatStudyMixedText(explanation)}</p>`;
        });
      });
    });

    sections.querySelectorAll("[data-excel-group]").forEach(card=>{
      card.addEventListener("click",()=>{
        const groupId=card.dataset.excelGroup;
        document.querySelector(`[data-excel-group-header="${groupId}"]`)?.scrollIntoView({behavior:"smooth",block:"start"});
      });
    });
  }

  refreshStudyProgressUI();
  emitAnalytics("study_open",{
    courseId:c?.id||null,
    trackId:state.selectedTrack?.id||null,
    moduleId:m?.id||null,
    groupId:activeExcelGroup?.id||null,
    sectionId:startSectionId||null
  });
  routeTo("studyView");
  window.requestAnimationFrame(()=>{
    setupStudySectionObserver();
    if(startSectionId){
      const target=document.getElementById(`study-section-${startSectionId}`);
      if(target){
        setActiveStudySection(startSectionId,{save:true});
        target.scrollIntoView({behavior:"auto",block:"start"});
      }
    }
  });
}
$("studyBackBtn").addEventListener("click",()=>{
  if(state.excelStudyGroupId && isExcelLearningGroupsModule()){
    state.excelExplorerGroupId=state.excelStudyGroupId;
    routeTo("excelGroupExplorerView");
  }else{
    routeTo("learnView");
  }
});
function handleStudyNextAction(){
  if(state.excelStudyGroupId && isExcelLearningGroupsModule() && state.selectedModule?.assessmentStatus==="building-after-study-qa"){
    state.excelExplorerGroupId=state.excelStudyGroupId;
    routeTo("excelGroupExplorerView");
    return;
  }
  openModuleExam("instant");
}
$("studyToPracticeBtn").addEventListener("click",handleStudyNextAction);
$("studyToPracticeTop").addEventListener("click",handleStudyNextAction);
$("studyMarkAllCompleteBtn").addEventListener("click",()=>{
  const module=state.selectedModule;if(!module?.study || !state.studentName)return;
  const scopedIds=currentStudySectionIds();
  const allIds=allStudySectionIds();
  const saved=getStudyProgress(state.studentName,module.id);
  const set=new Set(saved.completedSections||[]);
  scopedIds.forEach(id=>set.add(id));
  const completedSections=allIds.filter(id=>set.has(id));
  updateStudyProgress(state.studentName,module.id,{
    completedSections,
    completed:completedSections.length===allIds.length,
    lastSectionId:scopedIds[scopedIds.length-1]||saved.lastSectionId||null
  });
  refreshStudyProgressUI();
  showToast(state.excelStudyGroupId?"Group progress saved as completed.":"Study progress saved as completed.");
});
$("studyResetProgressBtn").addEventListener("click",()=>{
  const module=state.selectedModule;if(!module?.study || !state.studentName)return;

  if(state.excelStudyGroupId){
    if(!confirm("Reset saved progress for this Excel Group? Other Groups and exam results will not be deleted."))return;
    const scoped=new Set(currentStudySectionIds());
    const allIds=allStudySectionIds();
    const saved=getStudyProgress(state.studentName,module.id);
    const completedSections=allIds.filter(id=>(saved.completedSections||[]).includes(id) && !scoped.has(id));
    updateStudyProgress(state.studentName,module.id,{
      completedSections,
      completed:false,
      lastSectionId:scoped.has(saved.lastSectionId)?null:saved.lastSectionId
    });
    refreshStudyProgressUI();
    showToast("Group progress reset. Other Groups were kept.");
    return;
  }

  if(!confirm("Reset saved Study progress for this session? Practice scores, Exam results and Rankings will not be deleted."))return;
  clearStudyProgress(state.studentName,module.id);
  refreshStudyProgressUI();
  showToast("Study progress reset. Exam results were kept.");
});

function openLearningFlowExam(){
  const module=state.selectedModule;
  const flowExam=resolveLearningFlowExam({module,track:state.selectedTrack,registry:state.registry});
  if(flowExam.scope==="track"){
    const saved=activeSavedExamProgress();
    if(saved?.examId===flowExam.examId){
      resumeProgress(saved);
      return;
    }
    if(flowExam.item){
      prepareExam(flowExam.item);
      return;
    }
    showToast("Full track exam is not available yet.");
    return;
  }
  openModuleExam(null);
}

function openModuleExam(forcedMode){
  const module=state.selectedModule;
  const examId=resolveModuleExamId(module,forcedMode);
  const item=state.registry.find(x=>x.id===examId);
  if(!item){
    showToast(forcedMode==="instant"?"Practice is not connected to this module yet.":"Exam is still locked for this module.");
    return;
  }
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
  persistRankingMode(state.rankingMode);
  routeTo("rankingView");
},"Enter your name before opening the full-bank Total Grades leaderboard."));
if($("officialTrackOverallRankingBtn"))$("officialTrackOverallRankingBtn").addEventListener("click",()=>requireRankedIdentity(()=>{
  state.rankingMode="track";
  state.rankingTrackLevelId=state.officialLevelId;
  state.rankingTrackId=state.officialTrackId;
  persistRankingMode("track");
  setRankingTrackPreference(state.rankingTrackLevelId,state.rankingTrackId||"");
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

function voucherBlueprint(config){
  if(Array.isArray(config?.blueprint))return config.blueprint;
  if(Array.isArray(config?.blueprint?.topics))return config.blueprint.topics;
  return null;
}

function voucherCountForSize(config,bank,sizeMode){
  const eligible=(bank?.questions||[]).filter(q=>q?.status!=="conflict"&&q?.productionReady!==false);
  if(sizeMode==="full-bank"||sizeMode==="full-ranked")return eligible.length;
  if(sizeMode==="real")return Number(config?.realExam?.questionCount)||0;
  const count=Number(sizeMode);
  return Number.isInteger(count)&&count>0?count:0;
}

async function prepareVoucherImprovementSession(config=state.voucherExamConfig){
  try{
    const examId=config?.id||state.voucherExamId;
    if(!config?.masterBankFile||!examId)throw new Error("Voucher improvement bank is unavailable.");
    const ranked=voucherLocalRankedAttempts(examId).sort((a,b)=>Date.parse(b.submittedAt||0)-Date.parse(a.submittedAt||0));
    const latest=ranked[0];
    if(!latest){showToast("Complete your first Ranked Challenge so we can identify your weak areas.");return}
    const weakDomains=voucherWeakDomains(latest,2);
    const mistakeQuestionIds=getMistakes(mistakeOwnerId(),{includeMastered:false})
      .filter(item=>item?.context?.sourceType==="voucher"&&String(item?.context?.examId||"")===String(examId))
      .map(item=>String(item?.question?.id||"")).filter(Boolean);
    const seenIds=getVoucherSeenQuestionIds(mistakeOwnerId(),examId);
    const bank=await loadJson(config.masterBankFile);
    const selected=selectVoucherImprovementQuestions({questions:bank.questions||[],weakDomains,mistakeQuestionIds,seenIds,count:25});
    if(!selected.length)throw new Error("No reviewed questions are available for an improvement session.");
    const questions=selected.map(question=>shuffleVoucherOptions({...question,options:(question.options||[]).map(option=>({...option}))}));
    const runtime={
      mockKind:"improvement",sizeMode:"improvement-25",sourceId:null,
      timed:false,feedbackMode:"instant",rankedLearning:false,
      improvementSession:true,weakDomains,attemptKey:createUuid()
    };
    const examConfig={...config,trackTitle:voucherTrackMeta(config.trackId)?.title||config.trackId};
    const payload=buildVoucherExamPayload({examConfig,questions,runtime});
    payload.exam.title=`${config.title} • Improve My Level`;
    payload.exam.description=`Focused learning session • ${weakDomains.length?weakDomains.join(" + "):"mixed review"} • 25 Questions • Instant Feedback • Non-Ranked`;
    const errors=validateExamPayload(payload);
    if(errors.length)throw new Error(errors.join("; "));
    state.voucherRuntimeSelection={mockKind:"improvement",sizeMode:"improvement-25",timed:false,feedbackMode:"instant",improvementSession:true,weakDomains};
    state.currentRegistryItem={id:payload.exam.id,title:payload.exam.title,course:"Voucher",module:examConfig.trackTitle,questionCount:payload.questions.length,generator:"voucher",ranked:false,trackId:config.trackId};
    await launchPreparedVoucherExam(payload,state.currentRegistryItem,{feedbackMode:"instant",timed:false,improvementSession:true,weakDomains});
  }catch(error){
    console.error("Voucher improvement session failed",error);
    showToast(error?.message||"Could not prepare your improvement session.");
  }
}

async function prepareVoucherMock(runtimeConfig){
  if(runtimeConfig?.domainRanked===true&&!state.studentName){
    requireRankedIdentity(()=>void prepareVoucherMock(runtimeConfig),"Enter your name before starting a ranked PL-300 Domain.");
    return;
  }
  if(runtimeConfig?.sessionRanked===true&&!state.studentName){
    requireRankedIdentity(()=>void prepareVoucherMock(runtimeConfig),"Enter your name before starting a ranked PL-300 session.");
    return;
  }
  if(runtimeConfig?.sizeMode==="real"||runtimeConfig?.sizeMode==="full-ranked"){
    if(!state.studentName){
      requireRankedIdentity(()=>void prepareVoucherMock(runtimeConfig),"Enter your name before starting a ranked Voucher Real Exam.");
      return;
    }
    if(!getPrimaryTrack()){
      ensurePrimaryTrack({required:true,onDone:()=>void prepareVoucherMock(runtimeConfig)});
      return;
    }
  }
  try{
    const trackId=state.voucherTrackId;
    const examId=state.voucherExamId;
    if(!trackId||!examId)throw new Error("Choose a Voucher exam first.");
    if(String(examId)==="microsoft-pl-300")ensurePl300Styles();
    const resolved=state.voucherExamConfig&&state.voucherExamConfig.id===examId
      ?{entry:state.voucherExamEntry,config:state.voucherExamConfig}
      :await loadVoucherExamConfig(trackId,examId);
    const config={...resolved.config,trackTitle:voucherTrackMeta(trackId)?.title||trackId};
    let questions=[];
    if(runtimeConfig?.mockKind==="source"){
      const source=(config.sources||[]).find(item=>String(item.sourceId)===String(runtimeConfig.sourceId));
      if(!source)throw new Error("Voucher source PDF is not registered.");
      const bankFile=source.bankFile||source.sourceBankFile;
      if(!bankFile)throw new Error("Voucher source bank file is missing.");
      const bank=await loadJson(bankFile);
      questions=(bank.questions||[]).map(question=>({...question,options:(question.options||[]).map(option=>({...option}))}));
      if(!questions.length)throw new Error("This source mock has no released questions.");
    }else{
      if(!config.masterBankFile)throw new Error("Voucher Master Bank is not configured.");
      const bank=await loadJson(config.masterBankFile);
      if(runtimeConfig?.domainRanked===true&&Array.isArray(runtimeConfig?.allowedQuestionIds)){
        const byId=new Map((bank.questions||[]).map(question=>[String(question.id),question]));
        const selected=runtimeConfig.allowedQuestionIds.map(id=>byId.get(String(id))).filter(Boolean);
        if(selected.length!==runtimeConfig.allowedQuestionIds.length)throw new Error("The PL-300 Domain question map is incomplete.");
        questions=selected.map(question=>shuffleVoucherOptions({...question,options:(question.options||[]).map(option=>({...option}))}));
      }else{
        const count=voucherCountForSize(config,bank,runtimeConfig?.sizeMode);
        if(!count)throw new Error("Choose a valid Voucher mock size.");
        const seenIds=getVoucherSeenQuestionIds(mistakeOwnerId(),examId);
        const selected=selectVoucherQuestions({
          questions:bank.questions||[],count,seenIds,
          blueprint:Array.isArray(runtimeConfig?.allowedQuestionIds)?null:voucherBlueprint(config),
          allowedQuestionIds:runtimeConfig?.allowedQuestionIds||null
        });
        questions=selected.map(question=>shuffleVoucherOptions({...question,options:(question.options||[]).map(option=>({...option}))}));
      }
    }

    const runtime={
      mockKind:runtimeConfig.mockKind,
      sourceId:runtimeConfig.sourceId||null,
      sizeMode:runtimeConfig.sizeMode,
      timed:Boolean(runtimeConfig.timed),
      feedbackMode:runtimeConfig.feedbackMode||"exam",
      rankedLearning:Boolean(runtimeConfig.rankedLearning)||Boolean(runtimeConfig.domainRanked),
      domainRanked:Boolean(runtimeConfig.domainRanked),
      domainTitle:runtimeConfig.domainTitle||null,
      sectionIds:Array.isArray(runtimeConfig.sectionIds)?runtimeConfig.sectionIds.map(String):[],
      sessionRanked:Boolean(runtimeConfig.sessionRanked),
      sessionId:runtimeConfig.sessionId||null,
      domainId:runtimeConfig.domainId||null,
      sessionTitle:runtimeConfig.sessionTitle||null,
      timerDisplay:runtimeConfig.timerDisplay!==false,
      fullBankRanked:Boolean(runtimeConfig.fullBankRanked),
      improvementSession:Boolean(runtimeConfig.improvementSession),
      weakDomains:Array.isArray(runtimeConfig.weakDomains)?runtimeConfig.weakDomains:[],
      attemptKey:createUuid()
    };
    const payload=buildVoucherExamPayload({examConfig:config,questions,runtime});
    if(runtime.mockKind==="domain"&&runtimeConfig?.domainTitle)payload.exam.title=`${config.title} • ${runtimeConfig.domainTitle}`;
    if(runtime.mockKind==="session"&&runtimeConfig?.sessionTitle)payload.exam.title=`${config.title} • ${runtimeConfig.sessionTitle}`;
    payload.exam.description=runtime.mockKind==="source"
      ?"Full Source Mock — source question and option order preserved."
      :runtime.mockKind==="domain"
        ?`${runtimeConfig?.domainTitle||"PL-300 Domain"} — complete ranked Domain • ${runtime.feedbackMode==="instant"?"Instant Feedback":"Feedback at End"} • Active Solve Time.`
      :runtime.mockKind==="session"
        ?`${runtimeConfig?.sessionTitle||"PL-300 Session"} — legacy ranked session • ${runtime.feedbackMode==="instant"?"Instant Feedback":"Feedback at End"} • Active Solve Time.`
      :runtime.sizeMode==="real"
        ?"Real Exam Size simulation — rank eligible after submission."
        :runtime.sizeMode==="full-ranked"
          ?"Full Bank Ranked Exam — all reviewed questions, Exam Mode, separate leaderboard."
          :"Random Voucher practice — Unseen-First with safe option shuffling.";
    const errors=validateExamPayload(payload);
    if(errors.length)throw new Error(errors.join("; "));
    state.voucherExamEntry=resolved.entry;
    state.voucherExamConfig=resolved.config;
    state.voucherRuntimeSelection={...runtimeConfig};
    state.currentRegistryItem={
      id:payload.exam.id,title:payload.exam.title,course:"Voucher",module:config.trackTitle,
      questionCount:payload.questions.length,generator:"voucher",ranked:payload.exam.generatedFromVoucher?.rankEligible===true,trackId
    };
    await launchPreparedVoucherExam(payload,state.currentRegistryItem,{...runtimeConfig,feedbackMode:runtime.feedbackMode});
  }catch(error){
    console.error("Voucher mock preparation failed",error);
    showToast(error?.message||"Could not prepare this Voucher mock.");
  }
}

function voucherSavedModeLabel(progress){
  const saved=progress?.voucherResume||{};
  if(saved.sessionRanked||saved.mockKind==="session")return "Ranked Session";
  if(saved.sizeMode==="real")return "Legacy Ranked Challenge";
  if(saved.sizeMode==="full-ranked")return "Full Bank Ranked Exam";
  if(saved.mockKind==="improvement"||saved.sizeMode==="improvement-25")return "Improvement Session";
  if(saved.mockKind==="source")return "Source Mock";
  return "Custom Practice";
}

function resolveVoucherSavedAttempt({saved,targetTitle,targetMode}={}){
  const modal=$("voucherSavedAttemptModal");
  if(!modal||!saved)return Promise.resolve("new");
  const title=$("voucherSavedAttemptTitle"),meta=$("voucherSavedAttemptMeta");
  const resume=$("voucherSavedAttemptResumeBtn"),fresh=$("voucherSavedAttemptNewBtn"),cancel=$("voucherSavedAttemptCancelBtn");
  const total=Number(saved.totalQuestions)||saved.voucherResume?.questionIds?.length||0;
  const confirmedCount=Object.keys(saved.confirmedVoucherAnswers||{}).filter(key=>saved.confirmedVoucherAnswers[key]).length;
  const answered=confirmedCount||Object.keys(saved.answers||{}).length;
  const last=saved.savedAtEpoch?new Date(Number(saved.savedAtEpoch)).toLocaleString():"Unknown";
  const remaining=formatResumeRemaining(saved);
  title.textContent=`Saved ${voucherSavedModeLabel(saved)} found`;
  meta.innerHTML=`<strong>${escapeHtml(savedProgressTitle(saved))}</strong><span>${answered} / ${total} answered</span><span>${escapeHtml(remaining)}</span><span>Last activity: ${escapeHtml(last)}</span>${targetTitle?`<small>New selection: ${escapeHtml(targetTitle)} • ${escapeHtml(targetMode||"Voucher")}</small>`:""}`;
  modal.classList.remove("hidden");modal.setAttribute("aria-hidden","false");
  const returnFocus=document.activeElement;
  return new Promise(resolve=>{
    const buttons=[resume,fresh,cancel].filter(Boolean);
    const finish=value=>{
      modal.classList.add("hidden");modal.setAttribute("aria-hidden","true");
      resume?.removeEventListener("click",onResume);fresh?.removeEventListener("click",onNew);cancel?.removeEventListener("click",onCancel);document.removeEventListener("keydown",onKey);
      if(returnFocus instanceof HTMLElement)requestAnimationFrame(()=>returnFocus.focus());
      resolve(value);
    };
    const onResume=()=>finish("resume"),onNew=()=>finish("new"),onCancel=()=>finish("cancel");
    const onKey=event=>{
      if(event.key==="Escape"){event.preventDefault();finish("cancel");return}
      if(event.key!=="Tab"||buttons.length<2)return;
      const first=buttons[0],lastButton=buttons[buttons.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();lastButton.focus()}
      else if(!event.shiftKey&&document.activeElement===lastButton){event.preventDefault();first.focus()}
    };
    resume?.addEventListener("click",onResume);fresh?.addEventListener("click",onNew);cancel?.addEventListener("click",onCancel);document.addEventListener("keydown",onKey);
    requestAnimationFrame(()=>resume?.focus());
  });
}

async function launchPreparedVoucherExam(payload,registryItem,runtimeConfig={}){
  const ctx=payload?.exam?.generatedFromVoucher||null;
  const saved=activeSavedExamProgress();
  if(saved&&matchesVoucherSavedAttempt(saved,ctx)){
    const decision=await resolveVoucherSavedAttempt({saved,targetExamId:ctx?.voucherExamId,targetTitle:payload?.exam?.title,targetMode:ctx?.fullBankRanked?"Full Bank Ranked Exam":ctx?.rankedLearning?"Ranked Challenge":"Custom Practice"});
    if(decision==="cancel")return false;
    if(decision==="resume"){
      await resumeProgress(saved);
      return true;
    }
    clearExamProgress();
  }else if(saved){
    clearExamProgress();
  }
  state.currentExam=payload;
  state.currentRegistryItem=registryItem;
  state.currentRankedActivity=payload?.exam?.generatedFromVoucher?.rankEligible===true;
  state.previousBest=ctx?.fullBankRanked
    ?getBestVoucherAttempt(mistakeOwnerId(),ctx.voucherExamId,{rankEligibleOnly:true,sizeMode:"full-ranked"})
    :ctx?getBestVoucherAttempt(mistakeOwnerId(),ctx.voucherExamId,{rankEligibleOnly:Boolean(ctx.realExamSize),sizeMode:ctx.realExamSize?"real":null}):null;
  state.feedbackMode=runtimeConfig.feedbackMode||payload?.exam?.settings?.feedbackModes?.[0]||"instant";
  startExam();
  return true;
}

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
  const voucherCtx=payload.exam?.generatedFromVoucher||null;
  state.previousBest=voucherCtx
    ?getBestVoucherAttempt(mistakeOwnerId(),voucherCtx.voucherExamId,{rankEligibleOnly:Boolean(voucherCtx.realExamSize)})
    :state.studentName?getPreviousBestForExam(payload.exam.id,state.studentName):null;

  const exam=payload.exam;
  $("backToLibraryBtn").textContent=voucherCtx?"← Voucher Exam":isStandardTrackExam()?`← ${state.selectedTrack?.title || exam.track || "Track"}`:"← Exams";
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
function isStandardTrackExam(){
  return Boolean(
    state.currentExam?.exam?.category==="Track Exam" &&
    !state.currentExam?.exam?.generatedFromOfficialQbank &&
    state.selectedCourse && state.selectedTrack
  );
}

function returnToSelectedTrack(){
  if(!state.selectedCourse || !state.selectedTrack){
    routeTo("examsView");
    return;
  }
  routeTo("learnView");
  renderModulePanel(state.selectedCourse,state.selectedTrack);
}

$("backToLibraryBtn").addEventListener("click",()=>{
  const voucherCtx=state.currentExam?.exam?.generatedFromVoucher;
  if(voucherCtx){
    state.voucherTrackId=voucherCtx.trackId||state.voucherTrackId;
    state.voucherExamId=voucherCtx.voucherExamId||state.voucherExamId;
    routeTo("voucherExamView");
    return;
  }
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
  }else if(isStandardTrackExam()) returnToSelectedTrack();
  else routeTo("examsView");
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

function startExam(restored=null){
  state.examMode=resolveExamMode({
    exam:state.currentExam?.exam,
    feedbackMode:restored?.feedbackMode||state.feedbackMode,
    rankedActivity:state.currentRankedActivity
  });
  state.feedbackMode=state.examMode.feedbackMode;
  state.currentRankedActivity=state.examMode.rankedActivity;
  if(state.examMode.rankedActivity && !state.studentName){
    requireRankedIdentity(()=>startExam(restored),"Your name is required before this ranked attempt can begin.");
    return;
  }
  stopTimer();
  state.timerSuspendedAt=null;
  state.solvePauseStartedAt=null;

  const session=createExamSession({
    exam:state.currentExam?.exam,
    questions:state.currentExam?.questions||[],
    restored,
    feedbackMode:state.feedbackMode,
    rankedActivity:state.currentRankedActivity,
    nowEpoch:Date.now()
  });
  Object.assign(state,session);

  buildQuestionNavigator();
  renderQuestion();
  routeTo("examView");
  emitAnalytics(state.examMode.analyticsStartEvent,{
    courseId:state.selectedCourse?.id||null,
    trackId:state.selectedTrack?.id||state.currentExam?.exam?.generatedFromOfficialQbank?.trackId||state.currentRegistryItem?.trackId||null,
    moduleId:state.selectedModule?.id||null,
    examId:state.currentExam?.exam?.id||null,
    feedbackMode:state.feedbackMode,
    metadata:{official:state.examMode.official,modeId:state.examMode.id}
  });
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

async function reconstructVoucherProgress(progress){
  const descriptor=progress?.voucherResume;
  if(String(descriptor?.voucherExamId)==="microsoft-pl-300")ensurePl300Styles();
  if(!descriptor?.trackId||!descriptor?.voucherExamId)throw new Error("Voucher resume metadata is incomplete.");
  const {entry,config}=await loadVoucherExamConfig(descriptor.trackId,descriptor.voucherExamId);
  let architecture=null;
  let session=null;
  let domain=null;
  if(descriptor.mockKind==="session"||descriptor.mockKind==="domain"){
    if(!config.contentArchitectureFile)throw new Error("Saved Voucher content architecture is unavailable.");
    architecture=await loadJson(config.contentArchitectureFile);
    state.voucherContentArchitecture=architecture;
  }
  if(descriptor.mockKind==="session"){
    session=findVoucherContentArchitectureSession({architecture,sessionId:descriptor.sourceId});
    if(!session)throw new Error(`Saved Voucher session no longer exists: ${descriptor.sourceId}`);
  }
  if(descriptor.mockKind==="domain"){
    domain=findVoucherContentArchitectureDomain({architecture,domainId:descriptor.domainId});
    if(!domain)throw new Error(`Saved Voucher domain no longer exists: ${descriptor.domainId}`);
  }
  let bank;
  if(descriptor.mockKind==="source"){
    const source=(config.sources||[]).find(item=>String(item.sourceId)===String(descriptor.sourceId));
    const bankFile=source?.bankFile||source?.sourceBankFile;
    if(!bankFile)throw new Error("Saved Voucher source is no longer available.");
    bank=await loadJson(bankFile);
  }else{
    if(!config.masterBankFile)throw new Error("Saved Voucher Master Bank is unavailable.");
    bank=await loadJson(config.masterBankFile);
  }
  const byId=new Map((bank.questions||[]).map(question=>[String(question.id),question]));
  const questionIds=Array.isArray(descriptor.questionIds)?descriptor.questionIds:[];
  if(!questionIds.length)throw new Error("Saved Voucher question order is missing.");
  const questions=questionIds.map(questionId=>{
    const original=byId.get(String(questionId));
    if(!original)throw new Error(`Saved Voucher question no longer exists: ${questionId}`);
    const optionOrder=descriptor.optionOrderByQuestion?.[questionId];
    if(!Array.isArray(optionOrder)||optionOrder.length!==(original.options||[]).length)throw new Error(`Saved Voucher option order is invalid: ${questionId}`);
    const optionMap=new Map((original.options||[]).map(option=>[String(option.id),option]));
    const options=optionOrder.map(optionId=>{
      const option=optionMap.get(String(optionId));
      if(!option)throw new Error(`Saved Voucher option no longer exists: ${questionId}/${optionId}`);
      return {...option};
    });
    if(new Set(optionOrder.map(String)).size!==optionMap.size)throw new Error(`Saved Voucher option set changed: ${questionId}`);
    return {...original,options};
  });
  const runtime={
    mockKind:descriptor.mockKind,sourceId:descriptor.sourceId||null,sizeMode:descriptor.sizeMode,
    timed:Boolean(descriptor.timed),feedbackMode:descriptor.feedbackMode||progress.feedbackMode||"instant",
    rankedLearning:Boolean(descriptor.rankedLearning),sessionRanked:Boolean(descriptor.sessionRanked),domainRanked:Boolean(descriptor.domainRanked),
    sessionId:descriptor.sessionId||descriptor.sourceId||null,domainId:descriptor.domainId||session?.domainId||null,
    sessionTitle:session?.title||null,domainTitle:descriptor.domainTitle||domain?.title||null,
    sectionIds:Array.isArray(descriptor.sectionIds)?descriptor.sectionIds:(domain?domain.sessionIds||[]:[]),
    timerDisplay:descriptor.timerDisplay!==false,
    fullBankRanked:Boolean(descriptor.fullBankRanked),improvementSession:Boolean(descriptor.improvementSession),
    weakDomains:Array.isArray(descriptor.weakDomains)?descriptor.weakDomains:[],attemptKey:"resume"
  };
  const payload=buildVoucherExamPayload({examConfig:{...config,trackTitle:voucherTrackMeta(descriptor.trackId)?.title||descriptor.trackId},questions,runtime});
  if(descriptor.mockKind==="session"&&session){
    payload.exam.title=`${config.title} • ${session.title}`;
    payload.exam.description=`${session.title} — legacy ranked session • ${runtime.feedbackMode==="instant"?"Instant Feedback":"Feedback at End"}.`;
  }
  if(descriptor.mockKind==="domain"&&domain){
    payload.exam.title=`${config.title} • ${domain.title}`;
    payload.exam.description=`${domain.title} — complete ranked domain • ${runtime.feedbackMode==="instant"?"Instant Feedback":"Feedback at End"}.`;
  }
  payload.exam.id=progress.examId;
  const errors=validateExamPayload(payload);
  if(errors.length)throw new Error(errors.join("; "));
  state.voucherTrackId=descriptor.trackId;
  state.voucherExamId=descriptor.voucherExamId;
  state.voucherExamEntry=entry;
  state.voucherExamConfig=config;
  state.voucherExamError=null;
  return {
    payload,
    item:{id:progress.examId,title:payload.exam.title,course:"Voucher",module:payload.exam.module,questionCount:questions.length,generator:"voucher",ranked:Boolean(descriptor.domainRanked)||Boolean(descriptor.sessionRanked)||descriptor.sizeMode==="real"||descriptor.sizeMode==="full-ranked",trackId:descriptor.trackId}
  };
}

async function resumeProgress(progress){
  if(progress?.voucherResume){
    try{
      const {payload,item}=await reconstructVoucherProgress(progress);
      state.currentExam=payload;
      state.currentRegistryItem=item;
      state.currentRankedActivity=progress.rankedActivity ?? (Boolean(progress.voucherResume.domainRanked)||Boolean(progress.voucherResume.sessionRanked)||progress.voucherResume.sizeMode==="real"||progress.voucherResume.sizeMode==="full-ranked");
      state.previousBest=progress.voucherResume.domainRanked
        ?voucherBestRankedDomainAttempt(progress.voucherResume.voucherExamId,progress.voucherResume.domainId)
        :progress.voucherResume.sessionRanked
          ?voucherBestRankedSessionAttempt(progress.voucherResume.voucherExamId,progress.voucherResume.sessionId||progress.voucherResume.sourceId)
          :progress.voucherResume.sizeMode==="full-ranked"
          ?getBestVoucherAttempt(mistakeOwnerId(),progress.voucherResume.voucherExamId,{rankEligibleOnly:true,sizeMode:"full-ranked"})
          :getBestVoucherAttempt(mistakeOwnerId(),progress.voucherResume.voucherExamId,{rankEligibleOnly:progress.voucherResume.sizeMode==="real",sizeMode:progress.voucherResume.sizeMode==="real"?"real":null});
      startExam(progress);
    }catch(error){
      console.error("Voucher resume failed",error);
      clearExamProgress();
      showToast("Saved Voucher attempt could not be reconstructed. Your other progress is unchanged.");
      routeTo(state.voucherExamId?"voucherExamView":"dashboardView");
    }
    return;
  }
  let item=state.registry.find(x=>x.id===progress.examId);
  if(!item && progress.generatedExam){
    item={
      id:progress.examId,
      title:progress.generatedExam.exam?.title||"Saved Exam",
      course:progress.generatedExam.exam?.course||"Data Analysis",
      module:progress.generatedExam.exam?.module||"",
      questionCount:progress.generatedExam.questions?.length||0,
      generator:progress.generatedExam.exam?.generatedFromMistakes?"mistakes":progress.generatedExam.exam?.generatedFromOfficialQbank?"official-qbank":"question-bank",
      ranked:progress.generatedExam.exam?.generatedFromMistakes?false:(progress.rankedActivity ?? true)
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
  const nowEpoch=Date.now();
  const snapshotStartedAt=state.timerPolicy==="active-solve"&&state.solvePauseStartedAt
    ?Number(state.startedAt)+(nowEpoch-Number(state.solvePauseStartedAt))
    :state.startedAt;
  const progress=buildExamProgressSnapshot({
    studentName:state.studentName,
    currentExam:state.currentExam,
    currentRegistryItem:state.currentRegistryItem,
    answers:state.answers,
    firstPassAnswers:state.firstPassAnswers,
    firstPassCommitted:state.firstPassCommitted,
    confirmedMultiAnswers:state.confirmedMultiAnswers,
    confirmedVoucherAnswers:state.confirmedVoucherAnswers,
    voucherTimerPhase:state.voucherTimerPhase,
    markedQuestions:state.markedQuestions,
    currentIndex:state.currentIndex,
    feedbackMode:state.feedbackMode,
    remainingSeconds:state.remainingSeconds,
    startedAt:snapshotStartedAt,
    timerPolicy:state.timerPolicy,
    currentRankedActivity:state.currentRankedActivity,
    nowEpoch
  });
  if(progress)saveExamProgress(progress);
}

function voucherRankedQuestionAnswered(q){
  if(!isCurrentVoucherRankedLearning())return isQuestionAnswered(q,state.answers?.[q?.id]);
  if(isCurrentVoucherActiveSolveRanked()&&state.feedbackMode!=="instant")return isQuestionAnswered(q,state.answers?.[q?.id]);
  return isCurrentQuestionConfirmed(q);
}
function voucherQuestionStatus(q){
  const answered=voucherRankedQuestionAnswered(q);
  if(!answered)return "unanswered";
  if(state.feedbackMode==="instant"&&isCurrentQuestionConfirmed(q)){
    return isAnswerCorrect(q,state.answers?.[q?.id])?"correct":"wrong";
  }
  return "answered";
}
function setVoucherNavigatorFilter(filter){
  state.voucherNavigatorFilter=normalizeNavigatorFilter(filter);
  updateNavigator();
}

function voucherDomainQuestionSession(question){
  if(!question||!state.voucherContentArchitecture)return null;
  const sessionId=state.voucherContentArchitecture?.questionSessionMap?.[question.id];
  return voucherArchitectureSession(sessionId,state.voucherContentArchitecture);
}

function closeVoucherDomainNavigatorDrawer(){
  const card=document.querySelector("#examView .question-nav-card");
  card?.classList.remove("domain-nav-open");
  $("voucherDomainNavToggle")?.setAttribute("aria-expanded","false");
}

function renderVoucherDomainQuestionNavigator(){
  const questions=state.currentExam?.questions||[];
  const architecture=state.voucherContentArchitecture;
  const domainNav=$("voucherDomainSectionNav");
  const flatNav=$("questionNavigator");
  const card=document.querySelector("#examView .question-nav-card");
  const toggle=$("voucherDomainNavToggle");
  if(!domainNav||!architecture||!questions.length)return false;

  const model=buildVoucherDomainNavigatorModel({
    architecture,
    questions,
    currentIndex:state.currentIndex,
    filter:state.voucherNavigatorFilter||"all",
    statusForQuestion:q=>({
      status:voucherQuestionStatus(q),
      answered:voucherRankedQuestionAnswered(q),
      marked:(state.markedQuestions||[]).includes(q.id)
    })
  });

  flatNav?.classList.add("hidden");
  domainNav.classList.remove("hidden");
  card?.classList.add("domain-ranked-nav");
  toggle?.classList.remove("hidden");
  if(toggle)toggle.textContent=`Sections • ${model.answeredCount}/${model.totalQuestions}`;

  domainNav.innerHTML=model.sections.map((section,sectionIndex)=>{
    const open=section.current || sectionIndex===0;
    const buttons=section.questions.map(entry=>{
      const status=entry.visualStatus|| (entry.answered?"answered-neutral":"unanswered");
      const current=entry.globalIndex===state.currentIndex;
      const answerLabel=status==="correct"?"Correct":status==="wrong"?"Incorrect":entry.answered?"Answered":"Unanswered";
      return `<button type="button" class="nav-number ${status}${entry.marked?" marked":""}${current?" current":""}" data-nav-index="${entry.globalIndex}" aria-label="Question ${entry.globalIndex+1}: ${answerLabel}${entry.marked?"; Marked for review":""}${current?"; current":""}">${entry.globalIndex+1}</button>`;
    }).join("");
    return `<details class="voucher-domain-section${section.current?" current-section":""}" data-domain-section="${escapeHtml(section.id)}" ${open?"open":""}>
      <summary><span><small>SECTION ${sectionIndex+1}</small><strong>${escapeHtml(section.title)}</strong></span><em>${section.answered}/${section.total}${section.marked?` • ★ ${section.marked}`:""}</em></summary>
      <div class="voucher-domain-section-grid">${buttons||'<span class="voucher-domain-section-empty">No questions in this filter.</span>'}</div>
    </details>`;
  }).join("");

  domainNav.querySelectorAll("[data-nav-index]").forEach(btn=>btn.addEventListener("click",()=>{
    const index=Number(btn.dataset.navIndex);
    state.currentIndex=setQuestionIndex({targetIndex:index,totalQuestions:questions.length});
    persistProgress();
    renderQuestion();
    closeVoucherDomainNavigatorDrawer();
    scrollToQuestionCard();
  }));
  return true;
}

function buildQuestionNavigator(){
  const nav=$("questionNavigator");
  if(isCurrentVoucherDomainRanked()){
    nav.innerHTML="";
    renderVoucherDomainQuestionNavigator();
    return;
  }
  $("voucherDomainSectionNav")?.classList.add("hidden");
  $("voucherDomainNavToggle")?.classList.add("hidden");
  const card=document.querySelector("#examView .question-nav-card");
  card?.classList.remove("domain-ranked-nav","domain-nav-open");
  nav.classList.remove("hidden");
  nav.innerHTML="";
  state.currentExam.questions.forEach((q,index)=>{
    const btn=document.createElement("button");
    btn.className="nav-number";
    btn.type="button";
    btn.textContent=index+1;
    btn.dataset.navIndex=String(index);
    btn.dataset.navTrack=String(q?.mistakeContext?.track || q?.track || q?.module || q?.mistakeContext?.module || q?.trackId || "");
    btn.dataset.navTopic=String(displayTopicForQuestion(q) || q?.sectionTitle || q?.section || q?.topic || q?.topicId || "General");
    btn.setAttribute("aria-label",`Question ${index+1}`);
    btn.addEventListener("click",()=>{
      state.currentIndex=setQuestionIndex({targetIndex:index,totalQuestions:state.currentExam.questions.length});
      persistProgress();
      renderQuestion();
      scrollToQuestionCard();
    });
    nav.appendChild(btn);
  });
}
function optionDisplayLabel(question,optionId){
  if(question?.voucherSource||state.currentExam?.exam?.generatedFromVoucher){
    const index=(question?.options||[]).findIndex(option=>String(option.id)===String(optionId));
    if(index>=0&&index<26)return String.fromCharCode(65+index);
  }
  return String(optionId??"");
}

function isMultiSelectQuestion(question){
  return isMultiSelectFeedbackQuestion(question);
}
function answerDisplayText(question,selected){
  if(isStructuredQuestion(question)){
    const rows=selected?.type==='structured'?structuredSelectedDisplay(question,selected):structuredExpectedDisplay(question);
    return rows.map(row=>`${row.label}: ${row.value||'—'}`).join(' · ');
  }
  return selectedAnswerIds(selected).map(id=>optionDisplayLabel(question,id)).join(', ');
}
function answerOptionText(question,selected){
  if(isStructuredQuestion(question)){
    const rows=selected?.type==='structured'?structuredSelectedDisplay(question,selected):structuredExpectedDisplay(question);
    return rows.map(row=>`<div class="structured-answer-row"><b>${escapeHtml(row.label)}:</b> ${escapeHtml(row.value||'—')}</div>`).join('');
  }
  const ids=selectedAnswerIds(selected);
  return ids.map(id=>{
    const option=(question?.options||[]).find(o=>String(o.id)===String(id));
    return option?`<div><b>${escapeHtml(optionDisplayLabel(question,id))}.</b> ${renderTechnicalOption(option.text||'',question)}</div>`:'';
  }).join('');
}

function renderRankedStructuredInputs(question,list,{selected,confirmed,feedbackReady}={}){
  const values=structuredAnswerFields(selected);
  const showFieldFeedback=state.feedbackMode==='instant'&&feedbackReady&&structuredAnswerComplete(question,selected);
  list.classList.add('ranked-structured-list');
  for(const field of structuredFields(question)){
    const row=document.createElement('label');
    row.className='ranked-structured-field';
    row.innerHTML=`<span class="ranked-structured-label">${escapeHtml(field.label||field.id)}</span>`;
    const choices=structuredFieldChoices(field);
    const input=choices.length?document.createElement('select'):document.createElement('input');
    if(choices.length){
      const placeholder=document.createElement('option');
      placeholder.value='';
      placeholder.textContent='Select an answer';
      input.appendChild(placeholder);
      for(const choice of choices){
        const option=document.createElement('option');
        option.value=choice;
        option.textContent=choice;
        input.appendChild(option);
      }
    }else{
      input.type='text';
      input.autocomplete='off';
      input.spellcheck=false;
      input.placeholder='Type the source answer';
    }
    input.setAttribute('data-ranked-structured-field',String(field.id));
    input.value=String(values?.[field.id]??'');
    input.disabled=Boolean(confirmed)||(state.feedbackMode==='instant'&&!isCurrentVoucherRankedLearning()&&structuredAnswerComplete(question,selected));
    if(showFieldFeedback)input.classList.add(structuredFieldCorrect(field,input.value)?'correct':'wrong');
    input.addEventListener(choices.length?'change':'input',event=>updateStructuredField(question,field.id,event.target.value));
    row.appendChild(input);
    if(showFieldFeedback){
      const expected=String((field.expected||[])[0]??'');
      const note=document.createElement('small');
      note.className='ranked-structured-expected';
      note.textContent=structuredFieldCorrect(field,input.value)?'Correct ✓':`Expected: ${expected}`;
      row.appendChild(note);
    }
    list.appendChild(row);
  }
}
function renderQuestion(){
  const qs=state.currentExam.questions,q=qs[state.currentIndex];
  $("questionCounter").textContent=`Question ${state.currentIndex+1} / ${qs.length}`;
  $("progressFill").style.width=`${((state.currentIndex+1)/qs.length)*100}%`;
  {
    const domainSession=isCurrentVoucherDomainRanked()?voucherDomainQuestionSession(q):null;
    const displayTopic=domainSession?.title||displayTopicForQuestion(q);
    $("questionTopic").textContent=displayTopic;
    const inferred=displayTopic!==(q.topic||"General");
    $("questionTopic").dataset.topicInferred=inferred?"true":"false";
    $("questionTopic").title=domainSession
      ?`${state.currentExam?.exam?.generatedFromVoucher?.domainTitle||"PL-300 Domain"} • ${domainSession.title}`
      :inferred?`Display classification: ${displayTopic} • stored metadata: ${q.topic||"General"}`:"";
  }
  $("questionDifficulty").textContent=q.difficulty || "Medium";
  const technicalInfo=analyzeTechnicalContent(q.question,q);
  $("questionText").innerHTML=renderTechnicalQuestion(q.question,q);
  $("questionText").classList.toggle("has-code-question",technicalInfo.hasCode);
  const voucherVisual=$("voucherQuestionVisual");
  if(voucherVisual){
    const assets=state.currentExam?.exam?.generatedFromVoucher
      ?[...(Array.isArray(q?.visualAssets)?q.visualAssets:[]),...(q?.visualAsset?[q.visualAsset]:[])].map(String).filter(Boolean)
      :[];
    const uniqueAssets=[...new Set(assets)];
    if(uniqueAssets.length){
      const alt=String(q.visualAlt||q.visualCaption||"Voucher question visual");
      voucherVisual.innerHTML=uniqueAssets.map((asset,index)=>`<div class="voucher-question-visual-item"><img src="${escapeHtml(asset)}" alt="${escapeHtml(alt)}${uniqueAssets.length>1?` ${index+1}`:""}"><button type="button" class="secondary-btn" data-voucher-visual-index="${index}">Enlarge visual ↗</button></div>`).join('');
      voucherVisual.classList.remove("hidden");
      voucherVisual.querySelectorAll("[data-voucher-visual-index]").forEach(button=>button.addEventListener("click",()=>{
        const asset=uniqueAssets[Number(button.dataset.voucherVisualIndex)||0];
        openVoucherVisual(asset,alt);
      }));
    }else{
      voucherVisual.innerHTML="";
      voucherVisual.classList.add("hidden");
    }
  }

  const marked=state.markedQuestions.includes(q.id);
  if($("markReviewBtn")){
    $("markReviewBtn").classList.toggle("marked",marked);
    $("markReviewBtn").setAttribute("aria-pressed",marked?"true":"false");
    $("markReviewBtn").textContent=marked?"★ Marked for Review":"☆ Mark for Review";
  }

  const list=$("optionsList");list.innerHTML="";list.classList.remove("ranked-structured-list");
  const selected=state.answers[q.id];
  const selectedIds=new Set(selectedAnswerIds(selected));
  const rankedLearning=isCurrentVoucherRankedLearning();
  const confirmed=rankedLearning?isCurrentQuestionConfirmed(q):Boolean(state.confirmedMultiAnswers[q.id]);
  const feedbackState=feedbackStateForQuestion({question:q,selected,feedbackMode:state.feedbackMode,rankedLearning,confirmedVoucher:isCurrentQuestionConfirmed(q),confirmedMulti:Boolean(state.confirmedMultiAnswers[q.id])});
  const multi=feedbackState.multi;
  const feedbackReady=feedbackState.feedbackReady;
  const correctIds=new Set(feedbackState.correctIds);
  const selectionStatus=$("voucherSelectionStatus");
  if(selectionStatus){
    if(state.currentExam?.exam?.generatedFromVoucher){
      selectionStatus.textContent=voucherSelectionStatusText({question:q,selected,feedbackMode:state.feedbackMode,rankedLearning,confirmed});
      selectionStatus.classList.remove("hidden");
    }else{
      selectionStatus.textContent="";
      selectionStatus.classList.add("hidden");
    }
  }
  if(isStructuredQuestion(q)){
    renderRankedStructuredInputs(q,list,{selected,confirmed,feedbackReady});
  }else (q.options||[]).forEach((option,optionIndex)=>{
    const btn=document.createElement("button");btn.className="option-btn";
    const visibleLabel=state.currentExam?.exam?.generatedFromVoucher && optionIndex<26?String.fromCharCode(65+optionIndex):option.id;
    btn.innerHTML=`<span class="option-letter">${escapeHtml(visibleLabel)}</span><span class="option-content">${renderTechnicalOption(option.text,q)}</span>`;
    if(selectedIds.has(String(option.id)))btn.classList.add("selected");
    if(state.feedbackMode==="instant" && feedbackReady && isAnswered(selected)){
      if(correctIds.has(String(option.id)))btn.classList.add("correct");
      if(selectedIds.has(String(option.id)) && !correctIds.has(String(option.id)))btn.classList.add("wrong");
    }
    btn.setAttribute("aria-pressed",selectedIds.has(String(option.id))?"true":"false");
    btn.disabled=rankedLearning&&confirmed;
    btn.addEventListener("click",()=>multi?toggleMultiSelectAnswer(q,option.id):selectAnswer(q,option.id));
    list.appendChild(btn);
  });

  const confirm=$("multiSelectConfirmBtn");
  if(confirm){
    const structured=isStructuredQuestion(q);
    const required=structured?structuredFields(q).length:correctAnswerIds(q).length;
    const selectedCount=structured?Object.values(structuredAnswerFields(selected)).filter(value=>String(value??'').trim()).length:selectedAnswerIds(selected).length;
    const show=state.feedbackMode==="instant"&&(multi||structured);
    const ready=show&&(structured?structuredAnswerComplete(q,selected):selectedCount===required)&&!confirmed;
    confirm.classList.toggle("hidden",!show);
    confirm.classList.toggle("is-ready",ready);
    confirm.classList.toggle("is-confirmed",show&&confirmed);
    const complete=structured?structuredAnswerComplete(q,selected):(isAnswered(selected)&&selectedCount===required);
    confirm.disabled=rankedLearning
      ?(!complete||confirmed)
      :structured?true:(!complete||Boolean(state.confirmedMultiAnswers[q.id]));
    if(confirmed)confirm.textContent="Answer confirmed ✓";
    else if(structured&&!complete)confirm.textContent=`Complete all ${required} fields first`;
    else if(!structured&&selectedCount===0)confirm.textContent=`Select ${required} answers first`;
    else if(!structured&&selectedCount<required)confirm.textContent=`Select ${required-selectedCount} more answer${required-selectedCount===1?"":"s"}`;
    else confirm.textContent="Confirm Answer ✓";
  }

  renderInstantFeedback(q);
  updateNavigator();
  if(rankedLearning)syncVoucherRankedTimerPhase();

  const previousButton=document.getElementById("prevQuestionBtn");
  previousButton.disabled=state.currentIndex===0;
  const voucherFeedbackOpen=Boolean(state.currentExam?.exam?.generatedFromVoucher&&state.feedbackMode==="instant"&&feedbackReady&&isQuestionAnswered(q,selected));
  const examActions=document.querySelector("#examView .exam-actions");
  examActions?.classList.toggle("voucher-sticky-actions",voucherFeedbackOpen);
  const stickyMark=$("stickyMarkReviewBtn");
  if(stickyMark){
    stickyMark.classList.toggle("hidden",!voucherFeedbackOpen);
    stickyMark.classList.toggle("marked",marked);
    stickyMark.setAttribute("aria-pressed",marked?"true":"false");
    stickyMark.textContent=marked?"★ Marked":"☆ Mark";
  }
  $("nextQuestionBtn").classList.toggle("hidden",state.currentIndex===qs.length-1);
  $("submitExamBtn").classList.toggle("hidden",state.currentIndex!==qs.length-1);
  const officialKind=state.currentExam?.exam?.generatedFromOfficialQbank?.kind;
  const mistakePractice=Boolean(state.currentExam?.exam?.generatedFromMistakes);
  $("submitExamBtn").innerHTML=mistakePractice?'Finish Practice <span>✓</span>':officialKind==="section"?'Finish Section <span>✓</span>':'Submit Exam <span>✓</span>';
}
function isCurrentVoucherRankedLearning(){
  return Boolean(state.examMode?.voucherRankedLearning);
}
function isCurrentVoucherSessionRanked(){
  return Boolean(state.examMode?.sessionRanked||state.currentExam?.exam?.generatedFromVoucher?.sessionRanked);
}
function isCurrentVoucherDomainRanked(){
  return Boolean(state.examMode?.domainRanked||state.currentExam?.exam?.generatedFromVoucher?.domainRanked);
}
function isCurrentVoucherActiveSolveRanked(){
  return isCurrentVoucherDomainRanked()||isCurrentVoucherSessionRanked();
}
function cloneAnswerValue(value){
  if(value&&typeof value==='object')return JSON.parse(JSON.stringify(value));
  return Array.isArray(value)?[...value]:value;
}
function commitFirstPassAnswer(question,value=state.answers?.[question?.id]){
  const id=question?.id;
  if(!id||!isCurrentVoucherActiveSolveRanked()||state.firstPassCommitted?.[id]||!isQuestionAnswered(question,value))return false;
  state.firstPassAnswers={...(state.firstPassAnswers||{}),[id]:cloneAnswerValue(value)};
  state.firstPassCommitted={...(state.firstPassCommitted||{}),[id]:true};
  return true;
}
function currentFirstPassCorrect(){
  return (state.currentExam?.questions||[]).reduce((sum,q)=>sum+(state.firstPassCommitted?.[q.id]&&isAnswerCorrect(q,state.firstPassAnswers?.[q.id])?1:0),0);
}
function isCurrentQuestionConfirmed(question){
  return Boolean(question?.id&&state.confirmedVoucherAnswers?.[question.id]);
}
function updateStructuredField(q,fieldId,value){
  const rankedLearning=isCurrentVoucherRankedLearning();
  const beforeComplete=isQuestionAnswered(q,state.answers?.[q.id]);
  const result=updateStructuredAnswerState({
    question:q,fieldId,value,answers:state.answers,rankedLearning,feedbackMode:state.feedbackMode,confirmed:isCurrentQuestionConfirmed(q)
  });
  if(!result.changed)return;
  state.answers=result.answers;
  const nowComplete=isQuestionAnswered(q,state.answers?.[q.id]);
  if(isCurrentVoucherActiveSolveRanked()&&state.feedbackMode!=="instant"&&!beforeComplete&&nowComplete)commitFirstPassAnswer(q,state.answers[q.id]);
  persistProgress();
  updateNavigator();
  const status=$("voucherSelectionStatus");
  if(status)status.textContent=voucherSelectionStatusText({question:q,selected:state.answers[q.id],feedbackMode:state.feedbackMode,rankedLearning,confirmed:isCurrentQuestionConfirmed(q)});
  const confirm=$("multiSelectConfirmBtn");
  if(confirm&&state.feedbackMode==="instant"&&rankedLearning){
    confirm.disabled=!structuredAnswerComplete(q,state.answers[q.id])||isCurrentQuestionConfirmed(q);
    confirm.classList.toggle("is-ready",!confirm.disabled);
    confirm.textContent=structuredAnswerComplete(q,state.answers[q.id])?"Confirm Answer ✓":`Complete all ${structuredFields(q).length} fields first`;
  }
  if(!rankedLearning&&state.feedbackMode==="instant"&&nowComplete)renderQuestion();
}
function confirmStructuredRankedAnswer(){
  const q=state.currentExam?.questions?.[state.currentIndex];
  const result=confirmStructuredAnswerState({
    question:q,answers:state.answers,confirmedVoucherAnswers:state.confirmedVoucherAnswers,
    rankedLearning:isCurrentVoucherRankedLearning(),alreadyConfirmed:isCurrentQuestionConfirmed(q)
  });
  if(!result.changed)return;
  state.confirmedVoucherAnswers=result.confirmedVoucherAnswers;
  if(isCurrentVoucherActiveSolveRanked())commitFirstPassAnswer(q,state.answers[q.id]);
  if(result.voucherTimerPhase)state.voucherTimerPhase=result.voucherTimerPhase;
  if(result.stopTimer)stopTimer();
  persistProgress();
  renderQuestion();
  scrollVoucherFeedbackIntoView();
}

function selectAnswer(q,optionId){
  const rankedLearning=isCurrentVoucherRankedLearning();
  const result=selectSingleAnswerState({
    question:q,
    optionId,
    answers:state.answers,
    confirmedVoucherAnswers:state.confirmedVoucherAnswers,
    rankedLearning,
    feedbackMode:state.feedbackMode,
    alreadyConfirmed:isCurrentQuestionConfirmed(q)
  });
  if(!result.changed)return;
  state.answers=result.answers;
  state.confirmedVoucherAnswers=result.confirmedVoucherAnswers;
  if(isCurrentVoucherActiveSolveRanked())commitFirstPassAnswer(q,state.answers[q.id]);
  if(result.voucherTimerPhase)state.voucherTimerPhase=result.voucherTimerPhase;
  if(result.stopTimer)stopTimer();
  persistProgress();
  renderQuestion();
  if(state.currentExam?.exam?.generatedFromVoucher&&state.feedbackMode==="instant"&&(!result.requiresConfirm||!rankedLearning))scrollVoucherFeedbackIntoView();
}
function toggleMultiSelectAnswer(q,optionId){
  const rankedLearning=isCurrentVoucherRankedLearning();
  const result=toggleMultiSelectAnswerState({
    question:q,
    optionId,
    answers:state.answers,
    rankedLearning,
    feedbackMode:state.feedbackMode,
    confirmed:rankedLearning?isCurrentQuestionConfirmed(q):Boolean(state.confirmedMultiAnswers[q.id])
  });
  if(!result.changed)return;
  state.answers=result.answers;
  if(isCurrentVoucherActiveSolveRanked()&&state.feedbackMode!=="instant"&&selectedAnswerIds(state.answers[q.id]).length===correctAnswerIds(q).length)commitFirstPassAnswer(q,state.answers[q.id]);
  persistProgress();
  renderQuestion();
}
function confirmMultiSelectAnswer(){
  const q=state.currentExam?.questions?.[state.currentIndex];
  const result=confirmMultiSelectAnswerState({question:q,answers:state.answers,confirmedMultiAnswers:state.confirmedMultiAnswers});
  if(!result.changed)return;
  state.confirmedMultiAnswers=result.confirmedMultiAnswers;
  persistProgress();
  renderQuestion();
  if(state.currentExam?.exam?.generatedFromVoucher)scrollVoucherFeedbackIntoView();
}
function confirmVoucherRankedAnswer(){
  const q=state.currentExam?.questions?.[state.currentIndex];
  const result=confirmVoucherRankedAnswerState({
    question:q,
    answers:state.answers,
    firstPassAnswers:state.firstPassAnswers,
    firstPassCommitted:state.firstPassCommitted,
    confirmedMultiAnswers:state.confirmedMultiAnswers,
    confirmedVoucherAnswers:state.confirmedVoucherAnswers,
    rankedLearning:isCurrentVoucherRankedLearning(),
    alreadyConfirmed:isCurrentQuestionConfirmed(q)
  });
  if(!result.changed)return;
  state.confirmedMultiAnswers=result.confirmedMultiAnswers;
  state.confirmedVoucherAnswers=result.confirmedVoucherAnswers;
  if(isCurrentVoucherActiveSolveRanked())commitFirstPassAnswer(q,state.answers[q.id]);
  if(result.voucherTimerPhase)state.voucherTimerPhase=result.voucherTimerPhase;
  if(result.stopTimer)stopTimer();
  persistProgress();
  renderQuestion();
  scrollVoucherFeedbackIntoView();
}
function handleVoucherAnswerConfirm(){
  const q=state.currentExam?.questions?.[state.currentIndex];
  if(isStructuredQuestion(q)&&isCurrentVoucherRankedLearning())confirmStructuredRankedAnswer();
  else if(isCurrentVoucherRankedLearning())confirmVoucherRankedAnswer();
  else confirmMultiSelectAnswer();
}
$("multiSelectConfirmBtn")?.addEventListener("click",handleVoucherAnswerConfirm);
function toggleMarkForReview(){
  const q=state.currentExam?.questions?.[state.currentIndex];
  if(!q)return;
  state.markedQuestions=toggleMarkedQuestionState(state.markedQuestions,q.id);
  persistProgress();
  renderQuestion();
}
$("markReviewBtn").addEventListener("click",toggleMarkForReview);
$("stickyMarkReviewBtn")?.addEventListener("click",toggleMarkForReview);

function scrollVoucherFeedbackIntoView(){
  requestAnimationFrame(()=>{
    const feedback=$("instantFeedback");
    if(!feedback||feedback.classList.contains("hidden"))return;
    const reduceMotion=globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
    feedback.scrollIntoView({behavior:reduceMotion?"auto":"smooth",block:"nearest"});
  });
}

function structuredAnswerStateForExpected(question){
  const fields={};
  for(const row of structuredExpectedDisplay(question))fields[row.id]=row.value;
  return {type:'structured',fields,complete:true};
}

function renderVoucherLearningExplanation(question,selected){
  const deep=question?.deepExplanation||{};
  const correctIds=correctAnswerIds(question);
  const correctSet=new Set(correctIds.map(String));
  const summary=String(deep.summary||question?.explanationAr||question?.explanation?.ar||question?.explanation?.en||"No reviewed explanation is available yet.");
  const correctOptions=answerOptionText(question,isStructuredQuestion(question)?structuredAnswerStateForExpected(question):correctIds);
  const wrongRows=(question?.options||[]).filter(option=>!correctSet.has(String(option.id))).map(option=>{
    const reason=deep.options?.[option.id];
    if(!reason)return "";
    return `<li><div class="voucher-explanation-option"><span class="voucher-explanation-tech">${escapeHtml(optionDisplayLabel(question,option.id))}</span><div><strong>${renderTechnicalOption(option.text||"",question)}</strong><p>${renderTechnicalRichText(String(reason),question)}</p></div></div></li>`;
  }).filter(Boolean).join("");
  const tip=String(deep.examTip||question?.examTip||question?.reviewedTip||"").trim();
  const selectedText=answerOptionText(question,selected);
  return `<div class="voucher-learning-explanation" dir="rtl">
    <section class="voucher-explanation-section voucher-explanation-answer">
      <span class="voucher-explanation-kicker">CORRECT ANSWER</span>
      <div class="voucher-explanation-tech-block">${correctOptions}</div>
    </section>
    <section class="voucher-explanation-section">
      <h4>لماذا هذه الإجابة صحيحة؟</h4>
      <div>${renderTechnicalRichText(summary,question)}</div>
    </section>
    ${wrongRows?`<section class="voucher-explanation-section"><h4>لماذا الخيارات الأخرى غير صحيحة؟</h4><ul class="voucher-explanation-wrong-list">${wrongRows}</ul></section>`:""}
    ${tip?`<section class="voucher-explanation-section voucher-exam-tip"><h4>Exam Tip</h4><div>${renderTechnicalRichText(tip,question)}</div></section>`:""}
    <section class="voucher-explanation-section voucher-your-answer">
      <span class="voucher-explanation-kicker">YOUR ANSWER</span>
      <div class="voucher-explanation-tech-block">${selectedText}</div>
    </section>
  </div>`;
}

function renderInstantFeedback(q){
  const box=$("instantFeedback");box.className="feedback-box hidden";box.innerHTML="";
  const selected=state.answers[q.id];
  const rankedLearning=isCurrentVoucherRankedLearning();
  const feedbackState=feedbackStateForQuestion({question:q,selected,feedbackMode:state.feedbackMode,rankedLearning,confirmedVoucher:isCurrentQuestionConfirmed(q),confirmedMulti:Boolean(state.confirmedMultiAnswers[q.id])});
  if(!feedbackState.showFeedback)return;
  const correct=feedbackState.correct;
  const correctIds=feedbackState.correctIds;
  const selectedLabels=answerDisplayText(q,selected)||"—";
  const correctAnswerValue=isStructuredQuestion(q)?structuredAnswerStateForExpected(q):correctIds;
  const correctLabels=answerDisplayText(q,correctAnswerValue)||"—";
  box.className=`feedback-box ${correct?"success":"error"}`;

  if(state.currentExam?.exam?.generatedFromVoucher){
    box.innerHTML=`<strong>${correct?"Correct ✓":`Incorrect ✕ — Correct answer: ${escapeHtml(correctLabels)}`}</strong>${renderVoucherLearningExplanation(q,selected)}`;
    return;
  }

  const answerStrip=`<div class="technical-feedback-answer">
    <div><span>YOUR ANSWER</span><strong>${escapeHtml(selectedLabels)}</strong><div>${answerOptionText(q,selected)}</div></div>
    <div><span>CORRECT ANSWER</span><strong>${escapeHtml(correctLabels)}</strong><div>${answerOptionText(q,correctAnswerValue)}</div></div>
  </div>`;

  if(q.deepExplanation){
    const selectedReasons=selectedAnswerIds(selected).map(id=>q.deepExplanation.options?.[id]||"").filter(Boolean).join(" ");
    box.innerHTML=`
      <strong>${correct?"Correct ✓":`Incorrect ✕ — Correct answer: ${escapeHtml(correctLabels)}`}</strong>
      ${answerStrip}
      <div class="ranked-official-feedback" dir="rtl">
        <p><b>${correct?"ليه اختيارك صح؟":"ليه اختيارك غلط؟"}</b> ${renderTechnicalRichText(selectedReasons,q)}</p>
        <p><b>شرح المفهوم:</b> ${renderTechnicalRichText(q.deepExplanation.summary||"",q)}</p>
      </div>`;
  }else{
    const explanation=q.aiExplanation?.ar || q.explanation?.ar || q.explanation?.en || "No explanation provided.";
    box.innerHTML=`<strong>${correct?"Correct ✓":`Incorrect ✕ — Correct answer: ${escapeHtml(correctLabels)}`}</strong>
      ${answerStrip}
      <div dir="rtl">${renderTechnicalRichText(explanation,q)}</div>`;
  }
}

function updateNavigator(){
  const rankedLearning=isCurrentVoucherRankedLearning();
  const questions=state.currentExam?.questions||[];
  const answered=questions.filter(q=>rankedLearning?voucherRankedQuestionAnswered(q):isQuestionAnswered(q,state.answers?.[q.id])).length;
  const markedCount=(state.markedQuestions||[]).length;
  const remaining=Math.max(0,questions.length-answered);
  $("answeredCount").textContent=markedCount?`${answered} answered · ${markedCount} marked`:`${answered} answered`;
  const summary=$("voucherNavSummary");
  if(summary)summary.textContent=`Answered ${answered} / ${questions.length} · Marked ${markedCount} · Remaining ${remaining}`;
  document.querySelectorAll("[data-voucher-nav-filter]").forEach(control=>{
    const active=control.dataset.voucherNavFilter===(state.voucherNavigatorFilter||"all");
    control.classList.toggle("active",active);
    control.setAttribute("aria-pressed",active?"true":"false");
  });

  const instant=state.feedbackMode==="instant";
  $("questionNavLegend")?.classList.toggle("exam-mode-legend",!instant);

  if(isCurrentVoucherDomainRanked()){
    renderVoucherDomainQuestionNavigator();
    return;
  }

  document.querySelectorAll(".nav-number").forEach((btn,domIndex)=>{
    const stableIndex=Number(btn.dataset.navIndex);
    const index=Number.isInteger(stableIndex)?stableIndex:domIndex;
    const q=questions[index];
    if(!q)return;
    const selected=state.answers[q.id];
    const answeredNow=rankedLearning?voucherRankedQuestionAnswered(q):isQuestionAnswered(q,selected);
    const multi=isMultiSelectQuestion(q);
    const structured=isStructuredQuestion(q);
    const instantReady=instant&&(rankedLearning?isCurrentQuestionConfirmed(q):(structured?isQuestionAnswered(q,selected):(!multi||Boolean(state.confirmedMultiAnswers[q.id]))));
    const marked=(state.markedQuestions||[]).includes(q.id);
    const filter=state.voucherNavigatorFilter||"all";
    const matches=filter==="all"||(filter==="answered"&&answeredNow)||(filter==="unanswered"&&!answeredNow)||(filter==="marked"&&marked);

    btn.classList.toggle("current",index===state.currentIndex);
    btn.classList.toggle("marked",marked);
    btn.classList.toggle("out-of-filter",!matches&&index===state.currentIndex);
    btn.classList.toggle("hidden",!matches&&index!==state.currentIndex);
    btn.classList.remove("answered","correct","wrong","answered-neutral");

    if(answeredNow){
      if(instantReady)btn.classList.add(isAnswerCorrect(q,selected)?"correct":"wrong");
      else btn.classList.add("answered-neutral");
    }

    const status=marked
      ?`Marked for review${answeredNow?"; answered":""}`
      :answeredNow
        ?instantReady
          ?isAnswerCorrect(q,selected)?"Correct":"Incorrect"
          :"Answered"
        :"Unanswered";
    btn.setAttribute("aria-label",`Question ${index+1}: ${status}${index===state.currentIndex?"; current":""}`);
  });
}
document.querySelectorAll("[data-voucher-nav-filter]").forEach(btn=>btn.addEventListener("click",()=>setVoucherNavigatorFilter(btn.dataset.voucherNavFilter)));
$("voucherDomainNavToggle")?.addEventListener("click",()=>{
  if(!isCurrentVoucherDomainRanked())return;
  const card=document.querySelector("#examView .question-nav-card");
  const open=!card?.classList.contains("domain-nav-open");
  card?.classList.toggle("domain-nav-open",open);
  $("voucherDomainNavToggle")?.setAttribute("aria-expanded",open?"true":"false");
});
$("prevQuestionBtn").addEventListener("click",()=>{
  const nextIndex=moveQuestionIndex({currentIndex:state.currentIndex,totalQuestions:state.currentExam?.questions?.length||0,direction:-1});
  if(nextIndex===state.currentIndex)return;
  state.currentIndex=nextIndex;persistProgress();renderQuestion();scrollToQuestionCard();
});
$("nextQuestionBtn").addEventListener("click",()=>{
  const nextIndex=moveQuestionIndex({currentIndex:state.currentIndex,totalQuestions:state.currentExam?.questions?.length||0,direction:1});
  if(nextIndex===state.currentIndex)return;
  state.currentIndex=nextIndex;persistProgress();renderQuestion();scrollToQuestionCard();
});
$("submitExamBtn").addEventListener("click",()=>finishExam(false));

function activeSolveElapsedSeconds(now=Date.now()){
  if(!state.startedAt)return 0;
  const effectiveNow=state.solvePauseStartedAt?Number(state.solvePauseStartedAt):Number(now);
  return Math.max(0,Math.floor((effectiveNow-Number(state.startedAt))/1000));
}
function pauseActiveSolveClock(){
  if(state.timerPolicy!=="active-solve"||state.solvePauseStartedAt)return;
  state.solvePauseStartedAt=Date.now();
}
function resumeActiveSolveClock(){
  if(state.timerPolicy!=="active-solve"||!state.solvePauseStartedAt)return;
  state.startedAt+=Math.max(0,Date.now()-Number(state.solvePauseStartedAt));
  state.solvePauseStartedAt=null;
}

function syncVoucherRankedTimerPhase(){
  if(!isCurrentVoucherRankedLearning()){state.voucherTimerPhase=null;return}
  const q=state.currentExam?.questions?.[state.currentIndex];
  if(!q)return;
  const next=voucherTimerPhaseForQuestion({exam:state.currentExam.exam,questionId:q.id,selected:state.answers[q.id],confirmedAnswers:state.confirmedVoucherAnswers,confirmedMultiAnswers:state.confirmedMultiAnswers});
  state.voucherTimerPhase=next||VOUCHER_TIMER_PHASE_SOLVING;
  if(isCurrentVoucherActiveSolveRanked()){
    if(state.voucherTimerPhase===VOUCHER_TIMER_PHASE_FEEDBACK){pauseActiveSolveClock();stopTimer();updateTimerDisplay();}
    else{resumeActiveSolveClock();if($("examView")?.classList.contains("active"))startTimerIfNeeded();}
    return;
  }
  if(state.voucherTimerPhase===VOUCHER_TIMER_PHASE_FEEDBACK)stopTimer();
  else if($("examView")?.classList.contains("active"))startTimerIfNeeded();
}
function scrollToQuestionCard(){
  requestAnimationFrame(()=>document.querySelector("#examView .question-card")?.scrollIntoView({behavior:"auto",block:"start"}));
}

function updateTimerPolicyHint(){
  const display=$("timerDisplay");
  if(!display)return;
  display.title=examTimerPolicyLabel({policy:state.timerPolicy,voucherTimerPhase:state.voucherTimerPhase});
  display.classList.toggle("ranked-continuous",state.timerPolicy==="continuous-ranked");
}
$("exitExamBtn").addEventListener("click",()=>{
  const mistakePractice=Boolean(state.currentExam?.exam?.generatedFromMistakes);
  const message=mistakePractice
    ?"Exit My Mistakes practice? Your answers and current question will be saved so you can resume later. This practice never enters Ranking."
    :state.timerPolicy==="active-solve"
      ?"Exit this ranked learning session? Your answers, first-pass state and current question will be saved. Active solve time pauses while you are away. The attempt becomes official only after every question is answered."
    :state.timerPolicy==="continuous-ranked"
      ?"Exit this ranked exam? Your answers and current question will be saved, but ranked elapsed time (and the countdown, when enabled) will CONTINUE while you are away. The attempt is not added to Ranking until it is submitted."
      :"Exit the exam? Your answers, question position and remaining time will be saved. The timer will pause until you resume.";
  if(!confirm(message))return;
  stopTimer();
  persistProgress();
  state.timerSuspendedAt=null;
  if(mistakePractice) routeTo("mistakesView");
  else if(state.currentExam?.exam?.generatedFromVoucher) routeTo("voucherExamView");
  else if(isStandardTrackExam()) returnToSelectedTrack();
  else routeTo("dashboardView");
});

function startTimerIfNeeded(){
  stopTimer();
  if(state.timerPolicy==="active-solve"){
    const show=state.currentExam?.exam?.generatedFromVoucher?.timerDisplay!==false;
    $("timerDisplay").classList.toggle("hidden",!show);
    updateTimerDisplay();updateTimerPolicyHint();
    if(state.solvePauseStartedAt)return;
    state.timerId=setInterval(()=>{updateTimerDisplay();if(activeSolveElapsedSeconds()%5===0)persistProgress();},1000);
    return;
  }
  if(state.remainingSeconds===null){
    $("timerDisplay").classList.add("hidden");
    updateTimerPolicyHint();
    return;
  }
  $("timerDisplay").classList.remove("hidden");
  updateTimerDisplay();
  updateTimerPolicyHint();
  if(isCurrentVoucherRankedLearning()&&state.voucherTimerPhase===VOUCHER_TIMER_PHASE_FEEDBACK)return;
  state.timerId=setInterval(()=>{
    state.remainingSeconds=Math.max(0,(state.remainingSeconds??0)-1);
    updateTimerDisplay();
    if(state.remainingSeconds%5===0)persistProgress();
    if(state.remainingSeconds<=0)finishExam(true);
  },1000);
}
function updateTimerDisplay(){
  const total=state.timerPolicy==="active-solve"?activeSolveElapsedSeconds():Math.max(0,state.remainingSeconds ?? 0);
  $("timerDisplay").textContent=`${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}
function stopTimer(){
  if(state.timerId)clearInterval(state.timerId);
  state.timerId=null;
}

document.addEventListener("visibilitychange",()=>{
  const examActive=$("examView")?.classList.contains("active");
  if(!examActive || !state.currentExam)return;

  if(isCurrentVoucherRankedLearning()&&!isCurrentVoucherActiveSolveRanked()){
    if(document.hidden){
      if(state.timerSuspendedAt)return;
      state.timerSuspendedAt=Date.now();
      stopTimer();
      persistProgress();
      return;
    }
    if(!state.timerSuspendedAt)return;
    const adjusted=applyVoucherRankedAwayTime({phase:state.voucherTimerPhase,remainingSeconds:state.remainingSeconds,savedAtEpoch:state.timerSuspendedAt,nowEpoch:Date.now()});
    state.remainingSeconds=adjusted.remainingSeconds;
    state.timerSuspendedAt=null;
    updateTimerDisplay();
    persistProgress();
    if(state.remainingSeconds!==null&&state.remainingSeconds<=0){showToast("The Ranked Challenge solve timer expired while you were away.");finishExam(true);return}
    startTimerIfNeeded();
    return;
  }

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
  }else if(!(state.timerPolicy==="active-solve"&&state.solvePauseStartedAt)){
    // Practice and active-solve sessions pause elapsed time while away.
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

function finishMistakesPractice(autoSubmitted=false){
  stopTimer();
  const questions=state.currentExam?.questions||[];
  const before=new Map((state.mistakesPracticeKeys||[]).map(key=>[key,getMistake(mistakeOwnerId(),key)?.status||null]));
  const result=calculateResult(questions,state.answers);
  recordAttemptMistakeOutcomes(questions,state.answers,state.currentExam?.exam);
  const after=(state.mistakesPracticeKeys||[]).map(key=>getMistake(mistakeOwnerId(),key)).filter(Boolean);
  const masteredGained=after.filter(item=>before.get(item.key)!=="mastered" && item.status==="mastered").length;
  const improving=after.filter(item=>item.status==="improving").length;
  state.mistakesPracticeSummary={
    total:questions.length,correct:result.correct,wrong:result.wrong,unanswered:result.unanswered,
    masteredGained,improving,autoSubmitted:Boolean(autoSubmitted),completedAt:new Date().toISOString()
  };
  clearExamProgress();
  const mode=state.examMode||resolveExamMode({exam:state.currentExam?.exam,feedbackMode:"instant",rankedActivity:false});
  emitAnalytics(mode.analyticsCompleteEvent,{
    courseId:null,trackId:null,moduleId:null,examId:state.currentExam?.exam?.id||null,feedbackMode:"instant",
    metadata:{questions:questions.length,correct:result.correct,masteredGained,ranked:false,modeId:mode.id}
  });
  state.currentExam=null;state.currentRegistryItem=null;state.currentRankedActivity=false;state.examMode=null;
  state.answers={};state.confirmedMultiAnswers={};state.markedQuestions=[];state.currentIndex=0;state.mistakesPracticeKeys=[];
  showToast(`${result.correct}/${questions.length} correct • My Mistakes updated`);
  routeTo("mistakesView");
}

function voucherDomainSectionBreakdown(questions=state.currentExam?.questions||[],answers=state.answers){
  if(!isCurrentVoucherDomainRanked()||!state.voucherContentArchitecture)return calculateSubjectBreakdown();
  const out={};
  for(const q of questions){
    const session=voucherDomainQuestionSession(q);
    const label=session?.title||"PL-300 Section";
    out[label] ||= {correct:0,wrong:0,unanswered:0,total:0};
    const row=out[label];row.total+=1;
    const selected=answers?.[q.id];
    if(!isQuestionAnswered(q,selected))row.unanswered+=1;
    else if(isAnswerCorrect(q,selected))row.correct+=1;
    else row.wrong+=1;
  }
  return out;
}

function finishVoucherExam(autoSubmitted=false){
  const ctx=state.currentExam?.exam?.generatedFromVoucher;
  if(!ctx)return;
  const domainRanked=isCurrentVoucherDomainRanked();
  const sessionRanked=isCurrentVoucherSessionRanked();
  const activeSolveRanked=domainRanked||sessionRanked;
  if(activeSolveRanked)resumeActiveSolveClock();
  stopTimer();

  const questions=state.currentExam.questions;
  const result=calculateResult(questions,state.answers);
  const mode=state.examMode||resolveExamMode({exam:state.currentExam?.exam,feedbackMode:state.feedbackMode,rankedActivity:state.currentRankedActivity});
  const rankedLearning=mode.voucherRankedLearning;
  const allowed=Number(state.currentExam.exam.settings?.timer?.durationMinutes)||0;
  const timeTakenSeconds=activeSolveRanked
    ?activeSolveElapsedSeconds()
    :rankedLearning
      ?voucherRankedSolveTimeSeconds({allowedDurationMinutes:allowed,remainingSeconds:state.remainingSeconds})
      :Math.max(0,Math.floor((Date.now()-state.startedAt)/1000));
  const submittedAt=new Date().toISOString();
  const clientAttemptId=createUuid();
  const subjectBreakdown=domainRanked?voucherDomainSectionBreakdown(questions,state.answers):calculateSubjectBreakdown();
  const topicBreakdown=topicPerformance(questions,state.answers);

  let rankedMeta=null;
  let rankEligible=false;
  let previousRanked=null;
  let readiness=null;
  let improvementDelta=null;

  if(domainRanked){
    const domain=findVoucherContentArchitectureDomain({architecture:state.voucherContentArchitecture,domainId:ctx.domainId});
    const sections=sessionsForVoucherDomain({architecture:state.voucherContentArchitecture,domainId:ctx.domainId});
    const firstPassCorrect=currentFirstPassCorrect();
    const attemptNumber=voucherRankedDomainLocalAttempts(ctx.voucherExamId,ctx.domainId).length+1;
    rankedMeta=buildVoucherDomainAttemptMeta({
      domainId:ctx.domainId,
      domainTitle:domain?.title||ctx.domainTitle||state.currentExam.exam.title,
      sectionIds:sections.map(section=>section.id),
      result,totalQuestions:questions.length,firstPassCorrect,attemptNumber
    });
    rankEligible=rankedMeta.officialRankEligible;
  }else if(sessionRanked){
    const session=voucherArchitectureSession(ctx.sessionId);
    const firstPassCorrect=currentFirstPassCorrect();
    const attemptNumber=voucherRankedSessionLocalAttempts(ctx.voucherExamId,ctx.sessionId).length+1;
    rankedMeta=buildVoucherSessionAttemptMeta({
      sessionId:ctx.sessionId,domainId:ctx.domainId,sessionTitle:session?.title||state.currentExam.exam.title,
      result,totalQuestions:questions.length,firstPassCorrect,attemptNumber
    });
    rankEligible=rankedMeta.officialRankEligible;
  }else{
    rankEligible=isVoucherRankEligibleAttempt({sizeMode:ctx.sizeMode,rankEligible:ctx.rankEligible===true,rankingMode:ctx.rankingMode});
    previousRanked=getVoucherAttempts(mistakeOwnerId(),ctx.voucherExamId)
      .filter(attempt=>attempt.rankEligible===true&&attempt.sizeMode==="real")
      .sort((a,b)=>String(b.submittedAt||"").localeCompare(String(a.submittedAt||"")))[0]||null;
    readiness=voucherReadinessLevel(result.percentage);
    improvementDelta=rankedLearning&&previousRanked?result.percentage-Number(previousRanked.percentage||0):null;
  }

  const record={
    id:clientAttemptId,
    examId:ctx.voucherExamId,
    runtimeExamId:state.currentExam.exam.id,
    examTitle:state.currentExam.exam.title,
    studentName:state.studentName,
    trackId:ctx.trackId,
    percentage:result.percentage,correct:result.correct,wrong:result.wrong,unanswered:result.unanswered,total:questions.length,
    passed:result.percentage>=Number(state.currentExam.exam.settings?.passingScore??70),
    timeTakenSeconds,submittedAt,autoSubmitted:Boolean(autoSubmitted),clientAttemptId,onlineSynced:false,
    subjectBreakdown,topicBreakdown,excelBreakdown:null,officialContext:null,feedbackMode:state.feedbackMode,examCategory:"Voucher Mock",
    mockKind:ctx.mockKind,sizeMode:ctx.sizeMode,sourceId:ctx.sourceId||null,timed:Boolean(ctx.timed),
    allowedDurationMinutes:state.currentExam.exam.settings?.timer?.enabled?Number(state.currentExam.exam.settings.timer.durationMinutes)||null:null,
    voucherMode:rankedMeta?.voucherMode||mode.resultMode||"practice",
    rankingMode:domainRanked?"domain":sessionRanked?"session":ctx.rankingMode||null,
    readinessLevel:activeSolveRanked?null:(rankedLearning?readiness?.label||null:null),
    solveTimePolicy:activeSolveRanked?"active-solve":rankedLearning?"solve-only":null,
    improvementDelta:activeSolveRanked?null:improvementDelta,
    rankEligible,
    ...(rankedMeta||{})
  };

  recordAttemptMistakeOutcomes(questions,state.answers,state.currentExam.exam);
  markVoucherQuestionsSeen(mistakeOwnerId(),ctx.voucherExamId,questions.map(q=>q.id));
  saveVoucherAttempt(mistakeOwnerId(),record);

  let onlineAttempt=null;
  if(domainRanked&&record.officialRankEligible){
    onlineAttempt=buildOnlineAttemptPayload({
      playerId:state.playerId,studentName:state.studentName,exam:state.currentExam.exam,result,totalQuestions:questions.length,
      timeTakenSeconds,feedbackMode:state.feedbackMode,clientAttemptId,
      examId:voucherDomainRankingActivityId(ctx.trackId,ctx.voucherExamId,ctx.domainId),
      examTitle:`Voucher • PL-300 • ${record.domainTitle||ctx.domainId}`
    });
    Object.assign(onlineAttempt,buildVoucherDomainOnlineOverrides({totalQuestions:questions.length,firstPassCorrect:record.firstPassCorrect}));
  }else if(sessionRanked&&record.officialRankEligible){
    onlineAttempt=buildOnlineAttemptPayload({
      playerId:state.playerId,studentName:state.studentName,exam:state.currentExam.exam,result,totalQuestions:questions.length,
      timeTakenSeconds,feedbackMode:state.feedbackMode,clientAttemptId,
      examId:voucherSessionRankingActivityId(ctx.trackId,ctx.voucherExamId,ctx.sessionId),
      examTitle:`Voucher • PL-300 • ${record.sessionTitle||ctx.sessionId}`
    });
    Object.assign(onlineAttempt,buildVoucherSessionOnlineOverrides({totalQuestions:questions.length,firstPassCorrect:record.firstPassCorrect}));
  }else if(!activeSolveRanked&&rankEligible){
    onlineAttempt=buildOnlineAttemptPayload({
      playerId:state.playerId,studentName:state.studentName,exam:state.currentExam.exam,result,totalQuestions:questions.length,
      timeTakenSeconds,feedbackMode:state.feedbackMode,clientAttemptId,
      examId:voucherRankingActivityId(ctx.trackId,ctx.voucherExamId,ctx.fullBankRanked?"full-bank":"real"),
      examTitle:`Voucher • ${state.currentExam.exam.title}`
    });
  }
  if(onlineAttempt)queuePendingAttempt(onlineAttempt);
  clearExamProgress();

  state.lastResult={...result,record,onlineAttempt,newBadges:[]};
  renderResult();
  emitAnalytics(mode.analyticsCompleteEvent,{
    courseId:"voucher",trackId:ctx.trackId,moduleId:ctx.voucherExamId,examId:state.currentExam?.exam?.id||null,feedbackMode:state.feedbackMode,
    metadata:{voucher:true,mockKind:ctx.mockKind,sizeMode:ctx.sizeMode,rankEligible,officialRankEligible:record.officialRankEligible??null,modeId:mode.id,rankingMode:record.rankingMode}
  });
  routeTo("resultView");
  if(onlineAttempt)void syncFinishedAttempt(onlineAttempt);
}

function finishExam(autoSubmitted){
  if(state.currentExam?.exam?.generatedFromMistakes){finishMistakesPractice(autoSubmitted);return}
  if(state.currentExam?.exam?.generatedFromVoucher){finishVoucherExam(autoSubmitted);return}
  stopTimer();
  const beforeAchievements=getAchievements(getUserResults()).filter(a=>a.unlocked).map(a=>a.id);
  const result=calculateResult(state.currentExam.questions,state.answers);
  const timeTakenSeconds=Math.max(0,Math.floor((Date.now()-state.startedAt)/1000));
  const clientAttemptId=createUuid();

  const subjectBreakdown=calculateSubjectBreakdown();
  const topicBreakdown=topicPerformance(state.currentExam.questions,state.answers);
  const excelBreakdown=buildExcelTrackResultMetadata(state.currentExam.exam,state.currentExam.questions,state.answers);
  const officialContext=state.currentExam.exam.generatedFromOfficialQbank || null;
  const submittedAt=new Date().toISOString();
  const record=buildStandardResultRecord({
    exam:state.currentExam.exam,result,studentName:state.studentName,timeTakenSeconds,submittedAt,autoSubmitted,clientAttemptId,
    subjectBreakdown,topicBreakdown,excelBreakdown,officialContext,feedbackMode:state.feedbackMode
  });

  recordAttemptMistakeOutcomes(state.currentExam.questions,state.answers,state.currentExam.exam);

  const onlineAttempt=buildOnlineAttemptPayload({
    playerId:state.playerId,studentName:state.studentName,exam:state.currentExam.exam,result,totalQuestions:state.currentExam.questions.length,
    timeTakenSeconds,feedbackMode:state.feedbackMode,clientAttemptId
  });

  if(state.currentExam.exam.generatedFromOfficialQbank){
    const wrongByTrack={};
    for(const q of state.currentExam.questions){
      const selected=state.answers[q.id]??null;
      if(shouldRecordMistakeOutcome(q,selected)){
        wrongByTrack[q.trackId] ||= [];
        wrongByTrack[q.trackId].push(q.id);
      }
    }
    const levelId=state.currentExam.exam.generatedFromOfficialQbank.levelId || "junior-data-analysis";
    Object.entries(wrongByTrack).forEach(([trackId,ids])=>saveOfficialMistakes(trackId,ids,levelId,officialTrackRevision(trackId,levelId)));
  }

  saveResult(record);
  if(shouldSyncAttemptOnline(state.currentRankedActivity))queuePendingAttempt(onlineAttempt);
  clearExamProgress();

  state.lastResult={...result,record,onlineAttempt};
  const afterAchievements=getAchievements(getUserResults()).filter(a=>a.unlocked);
  state.lastResult.newBadges=afterAchievements.filter(a=>!beforeAchievements.includes(a.id));

  renderResult();
  const mode=state.examMode||resolveExamMode({exam:state.currentExam?.exam,feedbackMode:state.feedbackMode,rankedActivity:state.currentRankedActivity});
  emitAnalytics(mode.analyticsCompleteEvent,{
    courseId:state.selectedCourse?.id||null,
    trackId:state.selectedTrack?.id||state.currentExam?.exam?.generatedFromOfficialQbank?.trackId||state.currentRegistryItem?.trackId||null,
    moduleId:state.selectedModule?.id||null,
    examId:state.currentExam?.exam?.id||null,
    feedbackMode:state.feedbackMode,
    metadata:{official:mode.official,modeId:mode.id}
  });
  routeTo("resultView");
  if(shouldSyncAttemptOnline(state.currentRankedActivity))syncFinishedAttempt(onlineAttempt);
}

async function syncFinishedAttempt(onlineAttempt){
  setResultSyncUI("syncing");

  try{
    await submitAttemptOnline(onlineAttempt);
    removePendingAttempt(onlineAttempt.client_attempt_id);
    markResultSynced(onlineAttempt.client_attempt_id);

    const rankingId=String(onlineAttempt.exam_id||"");
    const domainRanking=rankingId.includes("::domain::");
    const sessionRanking=rankingId.includes("::session::");
    const rows=(domainRanking||sessionRanking)?await fetchAttemptsForExamIds([onlineAttempt.exam_id]):null;
    const board=domainRanking
      ?buildVoucherDomainLeaderboard(rows,{expectedQuestions:Number(onlineAttempt.total_questions)||0})
      :sessionRanking
        ?buildVoucherSessionLeaderboard(rows,{expectedQuestions:Number(onlineAttempt.total_questions)||0})
        :await getLeaderboard(onlineAttempt.exam_id);
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

  card.classList.toggle("hidden",mode==="local");
  card.classList.remove("synced","offline");
  if(mode==="local")return;

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
    const sessionRanking=Number.isFinite(Number(me.firstPassPercentage))&&Number.isFinite(Number(me.attemptCount));
    if(sessionRanking){
      if(me.rank===1){
        status.textContent=`You are #1 • Mastery ${Number(me.percentage)||0}% • First Pass ${Number(me.firstPassPercentage)||0}% • reached in ${Number(me.attemptCount)||1} attempt${Number(me.attemptCount)===1?"":"s"}.`;
      }else if(previous){
        if(Number(previous.percentage)>Number(me.percentage))status.textContent=`${Math.round((Number(previous.percentage)-Number(me.percentage))*10)/10} mastery point${Number(previous.percentage)-Number(me.percentage)===1?"":"s"} behind #${previous.rank}.`;
        else if(Number(previous.firstPassPercentage)>Number(me.firstPassPercentage))status.textContent=`Same Mastery; First Pass is ${Math.round((Number(previous.firstPassPercentage)-Number(me.firstPassPercentage))*10)/10} point${Number(previous.firstPassPercentage)-Number(me.firstPassPercentage)===1?"":"s"} behind #${previous.rank}.`;
        else if(Number(previous.attemptCount)<Number(me.attemptCount))status.textContent=`Same Mastery and First Pass; #${previous.rank} reached that result in fewer Attempts.`;
        else status.textContent=`Same Mastery, First Pass and Attempts; Active Solve Time is the tie-breaker.`;
      }else status.textContent="Your official ranked-learning attempt is now on the shared leaderboard.";
    }else if(me.rank===1){
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
  return buildExamSubjectBreakdown(state.currentExam?.questions||[],state.answers);
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

function renderExcelTrackBreakdown(){
  const weekSection=$("resultExcelWeekBreakdown");
  const weekGrid=$("resultExcelWeekBreakdownGrid");
  const groupSection=$("resultExcelGroupBreakdown");
  const groupGrid=$("resultExcelGroupBreakdownGrid");
  if(!weekSection||!weekGrid||!groupSection||!groupGrid)return;

  const data=state.lastResult?.record?.excelBreakdown || null;
  if(!data){
    weekSection.classList.add("hidden");weekGrid.innerHTML="";
    groupSection.classList.add("hidden");groupGrid.innerHTML="";
    return;
  }

  weekGrid.innerHTML=(data.weeks||[]).map(w=>`<div class="subject-breakdown-item">
    <span>${escapeHtml(w.label)}</span><strong>${w.correct}/${w.total}</strong>
    <small>${w.percentage}% • ${w.wrong} wrong${w.unanswered?` • ${w.unanswered} unanswered`:""}</small>
  </div>`).join("");
  weekSection.classList.toggle("hidden",!(data.weeks||[]).length);

  groupGrid.innerHTML=(data.groups||[]).map(g=>`<div class="subject-breakdown-item">
    <span>GROUP ${escapeHtml(g.groupNumber)} • ${escapeHtml(g.groupTitle)}</span><strong>${g.correct}/${g.total}</strong>
    <small>${g.percentage}% • Week ${escapeHtml(g.weekNumber)}${g.wrong?` • ${g.wrong} wrong`:""}${g.unanswered?` • ${g.unanswered} unanswered`:""}</small>
  </div>`).join("");
  groupSection.classList.toggle("hidden",!(data.groups||[]).length);
}

function renderSubjectBreakdown(){
  const section=$("resultSubjectBreakdown");
  const grid=$("resultSubjectBreakdownGrid");
  const rankedDomain=state.lastResult?.record?.voucherMode==="ranked-domain";
  const eyebrow=section?.querySelector(".eyebrow"),title=section?.querySelector("h3");
  if(eyebrow)eyebrow.textContent=rankedDomain?"SECTION ANALYTICS":"SUBJECT BREAKDOWN";
  if(title)title.textContent=rankedDomain?"Performance by PL-300 section":"Performance by track";
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
  const voucherCtx=state.currentExam.exam.generatedFromVoucher || null;
  const rankedDomainResult=Boolean(voucherCtx&&record.voucherMode==="ranked-domain");
  const rankedSessionResult=Boolean(voucherCtx&&record.voucherMode==="ranked-session");
  setResultSyncUI(voucherCtx?(record.rankEligible?"syncing":"local"):shouldSyncAttemptOnline(state.currentRankedActivity)?"syncing":"local");
  $("resultHeadline").textContent=resultHeadline({percentage:record.percentage,passingScore:pass,officialKind:officialCtx?.kind||null});
  $("resultSubline").textContent=rankedDomainResult
    ?`${record.domainTitle||"PL-300 Domain"} • ${record.feedbackMode==="instant"?"Instant Feedback":"Feedback at End"} • ${record.officialRankEligible?"Official Domain Rank":"Provisional — complete every question for Official Domain Rank"}.`
    :rankedSessionResult
      ?`${record.sessionTitle||"PL-300 Session"} • Legacy Session Attempt.`
      :voucherCtx
      ?`${state.currentExam.exam.module} • ${voucherCtx.sizeMode==="real"?"Real Exam Size":voucherCtx.sizeMode==="full-ranked"?"Full Bank Ranked Exam":voucherCtx.mockKind==="source"?"Full Source Mock":`Random ${voucherCtx.sizeMode}`} — saved in your Voucher history${record.rankEligible?" and eligible for Voucher Ranking":""}.`
      :officialCtx?.kind==="section"
      ?`${officialLevelMeta(officialCtx.levelId)?.title || "Data Analysis"} • ${state.currentExam.exam.module} • Section ${officialCtx.sectionNumber} — your attempt is saved and ranked by your best score.`
      :"Your attempt has been saved on this device.";
  $("resultPercent").textContent="0%";
  $("resultScore").textContent=`${record.correct} / ${state.currentExam.questions.length}`;
  $("correctCount").textContent=score.correct;$("wrongCount").textContent=score.wrong;$("unansweredCount").textContent=score.unanswered;
  $("timeTaken").textContent=formatDuration(record.timeTakenSeconds);
  renderSubjectBreakdown();
  renderTopicBreakdown();
  renderExcelTrackBreakdown();
  $("celebration").classList.toggle("hidden",record.percentage<80);
  setTimeout(()=>animateScore(record.percentage),120);

  const best=rankedDomainResult
    ?voucherBestRankedDomainAttempt(voucherCtx.voucherExamId,record.domainId)
    :rankedSessionResult
      ?voucherBestRankedSessionAttempt(voucherCtx.voucherExamId,record.sessionId)
    :voucherCtx?.fullBankRanked
      ?getBestVoucherAttempt(mistakeOwnerId(),voucherCtx.voucherExamId,{rankEligibleOnly:true,sizeMode:"full-ranked"})
      :voucherCtx?getBestVoucherAttempt(mistakeOwnerId(),voucherCtx.voucherExamId,{rankEligibleOnly:Boolean(record.rankEligible),sizeMode:record.rankEligible?"real":null}):getBestForExam(record.examId,state.studentName);
  $("resultBestScore").textContent=best?`${best.percentage}%`:`${record.percentage}%`;
  const resultCtx=state.currentExam.exam.generatedFromOfficialQbank || null;
  const rankedVoucherResult=Boolean(voucherCtx&&record.voucherMode==="ranked-learning");
  $("viewResultRankingBtn").classList.toggle("hidden",voucherCtx?(rankedDomainResult?false:rankedSessionResult?false:!record.rankEligible):!state.currentRankedActivity);
  $("voucherResultImproveBtn")?.classList.toggle("hidden",rankedDomainResult||!rankedVoucherResult||rankedSessionResult);
  $("reviewBtn")?.classList.toggle("primary-btn",rankedDomainResult||!rankedVoucherResult||rankedSessionResult);
  $("reviewBtn")?.classList.toggle("secondary-btn",!rankedDomainResult&&rankedVoucherResult&&!rankedSessionResult);
  if(voucherCtx){
    $("nextExamBtn").textContent=(rankedDomainResult||rankedSessionResult)?"Back to PL-300 →":"Back to Voucher Exam →";
    $("retakeBtn").textContent=rankedDomainResult?"Retake Domain":rankedSessionResult?"Retake Legacy Session":voucherCtx.fullBankRanked?"Retake Full Bank Ranked Exam":rankedVoucherResult?"Retake Ranked Challenge":"Build Another Mock";
  }else if(resultCtx?.kind==="section"){
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
  if(rankedDomainResult){
    improve.textContent=`First-Pass Accuracy: ${Number(record.firstPassPercentage)||0}% • ${record.officialRankEligible?"Official Domain Rank eligible":"Provisional — answer every question to join the shared Domain Ranking"} • Active Solve Time ${formatDuration(record.timeTakenSeconds)}. Section breakdown below shows where to review next.`;
    improve.classList.remove("hidden");
  }else if(rankedSessionResult){
    improve.textContent=`Legacy Session result • First-Pass Accuracy ${Number(record.firstPassPercentage)||0}% • Active Solve Time ${formatDuration(record.timeTakenSeconds)}.`;
    improve.classList.remove("hidden");
  }else if(rankedVoucherResult){
    const delta=Number(record.improvementDelta);
    const deltaText=Number.isFinite(delta)?(delta>0?` • ↗ +${delta}% vs previous ranked attempt`:delta<0?` • ${delta}% vs previous ranked attempt`:` • matched your previous ranked score`):"";
    improve.textContent=`Digilians Readiness: ${record.readinessLevel||voucherReadinessLevel(record.percentage).label}${deltaText}. Use Improve My Level to focus on weak domains, mistakes and unseen questions.`;
    improve.classList.remove("hidden");
  }else if(state.previousBest && record.percentage>state.previousBest.percentage){
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
$("viewMistakesBtn")?.addEventListener("click",()=>routeTo("mistakesView"));
$("voucherResultImproveBtn")?.addEventListener("click",()=>{
  if(state.voucherExamConfig)void prepareVoucherImprovementSession(state.voucherExamConfig);
  else routeTo("voucherExamView");
});
$("retakeBtn").addEventListener("click",()=>{
  const voucherCtx=state.currentExam?.exam?.generatedFromVoucher;
  if(voucherCtx&&state.lastResult?.record?.voucherMode==="ranked-domain"){
    void prepareVoucherRankedDomain(voucherCtx.domainId,{feedbackMode:state.lastResult.record.feedbackMode||"instant",timerDisplay:voucherCtx.timerDisplay!==false});
    return;
  }
  if(voucherCtx&&state.lastResult?.record?.voucherMode==="ranked-session"){
    const ctx=voucherCtx;
    void prepareVoucherRankedSession(ctx.sessionId,{feedbackMode:state.lastResult.record.feedbackMode||"instant",timerDisplay:ctx.timerDisplay!==false});
    return;
  }
  if(voucherCtx&&state.lastResult?.record?.voucherMode==="full-bank-ranked"){
    void prepareVoucherMock({mockKind:"random",sizeMode:"full-ranked",sourceId:null,timed:true,feedbackMode:"exam",fullBankRanked:true});
    return;
  }
  if(voucherCtx&&state.lastResult?.record?.voucherMode==="ranked-learning"){
    void prepareVoucherMock({mockKind:"random",sizeMode:"real",sourceId:null,timed:true,feedbackMode:"instant",rankedLearning:true});
    return;
  }
  routeTo(voucherCtx?"voucherExamView":"setupView");
});
$("reviewRetakeBtn").addEventListener("click",()=>routeTo(state.currentExam?.exam?.generatedFromVoucher?"voucherExamView":"setupView"));
$("viewResultRankingBtn").addEventListener("click",()=>{
  if(!state.lastResult?.record?.examId)return;
  const voucherCtx=state.currentExam?.exam?.generatedFromVoucher;
  if(voucherCtx){
    if(state.lastResult?.record?.voucherMode==="ranked-domain")openVoucherDomainRanking(voucherCtx.trackId,voucherCtx.voucherExamId,voucherCtx.domainId);
    else if(state.lastResult?.record?.voucherMode==="ranked-session")openVoucherSessionRanking(voucherCtx.trackId,voucherCtx.voucherExamId,voucherCtx.sessionId);
    else if(voucherCtx.fullBankRanked)openVoucherFullBankRanking(voucherCtx.trackId,voucherCtx.voucherExamId);
    else openVoucherExamRanking(voucherCtx.trackId,voucherCtx.voucherExamId);
    return;
  }
  requireRankedIdentity(()=>{
    state.rankingMode="exam";
    state.rankingExamId=state.lastResult.record.examId;
    persistRankingMode("exam");
    setLastRankingExamId(state.rankingExamId);
    routeTo("rankingView");
  },"Enter your name to open this leaderboard.");
});
$("nextExamBtn").addEventListener("click",()=>{
  const voucherCtx=state.currentExam?.exam?.generatedFromVoucher;
  if(voucherCtx){
    state.voucherTrackId=voucherCtx.trackId||state.voucherTrackId;
    state.voucherExamId=voucherCtx.voucherExamId||state.voucherExamId;
    routeTo("voucherExamView");
    return;
  }
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
  if(isStandardTrackExam()) returnToSelectedTrack();
  else routeTo("examsView");
});

function renderReview(){
  const list=$("reviewList");list.innerHTML="";$("reviewTitle").textContent=state.currentExam.exam.title;
  state.currentExam.questions.forEach((q,index)=>{
    const selected=state.answers[q.id] ?? null;
    const selectedIds=selectedAnswerIds(selected),correctIds=correctAnswerIds(q);
    const isCorrect=isAnswerCorrect(q,selected);
    const item=document.createElement("article");item.className="review-item";
    item.innerHTML=`
      <span class="eyebrow">QUESTION ${String(index+1).padStart(2,"0")}</span>
      <div class="review-question-content">${renderTechnicalQuestion(q.question,q)}</div>
      <div class="review-answer ${isCorrect?"correct":"wrong"}"><strong>Your answer:</strong>
        ${isQuestionAnswered(q,selected)?`<span class="review-answer-id">${escapeHtml(answerDisplayText(q,selected))}</span> ${answerOptionText(q,selected)}`:"Unanswered"}
      </div>
      <div class="review-answer correct"><strong>Correct answer:</strong>
        <span class="review-answer-id">${escapeHtml(answerDisplayText(q,correctIds))}</span> ${answerOptionText(q,correctIds)}
      </div>
      <div class="review-explanation">
        <strong>Explanation:</strong><br>
        <div dir="rtl">${renderTechnicalRichText(q.deepExplanation?.summary || q.aiExplanation?.ar || q.explanation?.ar || q.explanation?.en || "No explanation provided.",q)}</div>
        ${q.deepExplanation?`<div class="review-option-reasons" dir="rtl">${q.options.map(o=>`<p><b>${escapeHtml(optionDisplayLabel(q,o.id))} ${correctIds.includes(String(o.id))?"✓":"✕"}:</b> ${renderTechnicalRichText(q.deepExplanation.options?.[o.id]||"",q)}</p>`).join("")}</div>`:""}
      </div>`;
    list.appendChild(item);
  });
  routeTo("reviewView");
}

$("reviewHomeBtn").addEventListener("click",()=>{
  const voucherCtx=state.currentExam?.exam?.generatedFromVoucher;
  if(voucherCtx){routeTo("voucherExamView");return}
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
  }else if(isStandardTrackExam()) returnToSelectedTrack();
  else routeTo("examsView");
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
    const last=getRankingPreferences().lastExamId;
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

  const level=findRankingLevel(state.officialRegistry,state.rankingTrackLevelId);
  trackSelect.innerHTML="";
  for(const track of level?.tracks||[]){
    const option=document.createElement("option");
    option.value=track.trackId;option.textContent=track.track;
    trackSelect.appendChild(option);
  }
  if(!(level?.tracks||[]).some(x=>x.trackId===state.rankingTrackId))state.rankingTrackId=level?.tracks?.[0]?.trackId||null;
  trackSelect.value=state.rankingTrackId||"";
}
function setRankingMode(mode,{render=true}={}){
  state.rankingMode=mode;
  persistRankingMode(mode);
  if(render)renderRanking();
}
function isVoucherRankingCenterMode(mode=state.rankingMode){
  return mode==="voucher-exam"||mode==="voucher-track";
}

function populateVoucherRankingControls(){
  const trackSelect=$("rankingVoucherTrackSelect");
  if(!trackSelect)return;
  const tracks=state.voucherRegistry?.tracks||[];
  const preferred=state.voucherRankingTrackId||getPrimaryTrack()||tracks[0]?.id||"";
  state.voucherRankingTrackId=tracks.some(track=>track.id===preferred)?preferred:(tracks[0]?.id||"");
  trackSelect.innerHTML=tracks.length
    ?tracks.map(track=>`<option value="${escapeHtml(track.id)}">${escapeHtml(track.title)}</option>`).join("")
    :'<option value="">No Voucher tracks</option>';
  trackSelect.value=state.voucherRankingTrackId||"";
  trackSelect.disabled=!tracks.length;
  $("rankingVoucherExamField")?.classList.toggle("hidden",state.rankingMode!=="voucher-exam");
}

function syncRankingModeUI(){
  document.querySelectorAll("[data-ranking-mode]").forEach(btn=>btn.classList.toggle("active",btn.dataset.rankingMode===state.rankingMode));
  $("rankingTrackToolbar").classList.toggle("hidden",state.rankingMode!=="track");
  $("rankingExamToolbar").classList.toggle("hidden",state.rankingMode!=="exam");
  $("rankingVoucherToolbar")?.classList.toggle("hidden",!isVoucherRankingCenterMode());
  $("rankingScopeSummary").classList.toggle("hidden",state.rankingMode==="exam");
  populateRankingTrackControls();
  populateVoucherRankingControls();
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

function rankingAvatarHtml(entry,isMe=false){
  const sharedAvatarId=state.rankingAvatarMap.get(entry?.player_id)||null;
  const localProfile=isMe?getAvatarProfile():null;
  const avatarRef=sharedAvatarId || localProfile?.avatarId || null;

  if(avatarRef){
    const image=avatarMarkup(avatarRef,{lazy:false});
    if(image){
      return `<span class="avatar ranking-avatar has-profile-avatar" data-ranking-shared-avatar="${sharedAvatarId?"true":"local"}">${image}</span>`;
    }
  }
  return `<span class="avatar ranking-avatar">${escapeHtml(initials(entry?.student_name))}</span>`;
}

async function refreshSharedRankingAvatars(entries=[]){
  const ids=[...new Set((entries||[]).map(x=>x?.player_id).filter(Boolean))];
  if(!ids.length){
    state.rankingAvatarMap=new Map();
    return state.rankingAvatarMap;
  }
  try{
    state.rankingAvatarMap=await fetchRankingProfiles(ids);
  }catch(error){
    console.warn("Shared ranking avatars unavailable:",error);
    state.rankingAvatarMap=new Map();
  }
  return state.rankingAvatarMap;
}

async function syncCurrentAvatarToRanking(){
  const profile=getAvatarProfile();
  if(!state.playerId || !profile?.avatarId)return false;
  try{
    return await syncRankingAvatarProfile(state.playerId,profile.avatarId);
  }catch(error){
    console.warn("Could not sync ranking avatar profile:",error);
    return false;
  }
}

function renderPodium(board,{aggregate=false,maxScore=0,unitLabel="sections"}={}){
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
    const sub=aggregate?`${entry.completedSections}/${entry.totalSections} ${unitLabel} • ${entry.percentage}%`:"Best attempt";
    place.innerHTML=`
      <span>${entry.rank}</span>
      ${rankingAvatarHtml(entry,entry.player_id===state.playerId)}
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
          ${rankingAvatarHtml(entry,isMe)}
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
function renderAggregateLeaderboard(result,scope,{unitLabel="sections"}={}){
  setAggregateTableMode();
  const {board,maxScore,totalSections}=result;
  renderPodium(board,{aggregate:true,maxScore,unitLabel});
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
          ${rankingAvatarHtml(entry,isMe)}
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
    gap.textContent=unitLabel==="exams"?`Complete ranked Real Exam Size attempts in ${scope.name} to enter this Overall ranking.`:`Solve the fixed sections in ${scope.name} to enter this Total Grades ranking.`;
  }else if(me.rank===1){
    gap.textContent=me.completedSections===totalSections
      ?`You completed the full ${unitLabel==="exams"?"Voucher exam":"section"} scope and currently lead this ranking.`
      :`You currently lead with ${me.completedSections}/${totalSections} ${unitLabel} completed.`;
  }else{
    const previous=board[me.rank-2];
    if(previous.completedSections>me.completedSections){
      gap.textContent=`Complete ${previous.completedSections-me.completedSections} more ${unitLabel==="exams"?"ranked exam":"fixed section"}${previous.completedSections-me.completedSections===1?"":"s"} to match #${previous.rank}'s completion.`;
    }else if(previous.totalScore>me.totalScore){
      gap.textContent=`You are ${previous.totalScore-me.totalScore} mark${previous.totalScore-me.totalScore===1?"":"s"} behind #${previous.rank}.`;
    }else{
      gap.textContent=`Same completion and grade as #${previous.rank}; total completion time is the tie-breaker.`;
    }
  }
}
function setRankingSummaryLabels({name="Scope",marks="Total Marks",sections="Fixed Sections",scoring="Scoring"}={}){
  $("rankingScopeNameLabel").textContent=name;
  $("rankingScopeMarksLabel").textContent=marks;
  $("rankingScopeSectionsLabel").textContent=sections;
  $("rankingScopeScoringLabel").textContent=scoring;
}

function updateRankingScopeSummary(scope){
  if(!scope)return;
  setRankingSummaryLabels();
  $("rankingRuleIcon").textContent="Σ";
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

function showVoucherRankingCenterEmpty(title,message){
  const status=$("leaderboardStatus"),content=$("leaderboardContent");
  status.className="status-card info";
  status.classList.remove("hidden");
  status.innerHTML=`<div class="status-icon">V</div><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(message)}</p></div>`;
  content.classList.add("hidden");
}

function updateVoucherRankingCenterSummary({mode,trackId,examSpec=null,examSpecs=[]}={}){
  const meta=voucherTrackMeta(trackId);
  const totalMarks=mode==="voucher-track"
    ?examSpecs.reduce((sum,item)=>sum+(Number(item.totalQuestions)||0),0)
    :(Number(examSpec?.totalQuestions)||0);
  $("rankingRuleIcon").textContent="V";
  if(mode==="voucher-track"){
    setRankingSummaryLabels({sections:"Ranked Exams"});
    $("rankingScopeName").textContent=`${meta?.title||"Voucher"} Voucher`;
    $("rankingScopeMarks").textContent=totalMarks;
    $("rankingScopeSections").textContent=examSpecs.length;
    $("rankingScopeScoring").textContent="Best Real Exam Size";
    $("rankingRuleTitle").textContent="Voucher Track Overall";
    $("rankingRuleText").textContent="Best Real Exam Size attempt from every released Voucher exam. Total correct answers use the fixed total question volume; only Primary Track members enter the Overall ranking.";
  }else{
    setRankingSummaryLabels({sections:"Mode"});
    $("rankingScopeName").textContent=examSpec?.title||"Voucher Exam";
    $("rankingScopeMarks").textContent=totalMarks||"—";
    $("rankingScopeSections").textContent="Real Exam Size";
    $("rankingScopeScoring").textContent="Best Attempt";
    $("rankingRuleTitle").textContent="Voucher Exam Leaderboard";
    $("rankingRuleText").textContent="Real Exam Size only. Best attempt per learner; higher score ranks first and faster completion time breaks ties.";
  }
}

async function populateVoucherRankingExamSelect(trackId){
  const select=$("rankingVoucherExamSelect");
  if(!select)return [];
  select.disabled=true;
  select.innerHTML='<option value="">Loading released Real Exams…</option>';
  const specs=await voucherRankedExamSpecs(trackId);
  if(!specs.length){
    state.voucherRankingExamId=null;
    select.innerHTML='<option value="">No released Real Exams yet</option>';
    return [];
  }
  if(!specs.some(spec=>spec.examId===state.voucherRankingExamId))state.voucherRankingExamId=specs[0].examId;
  select.innerHTML=specs.map(spec=>`<option value="${escapeHtml(spec.examId)}">${escapeHtml(spec.title)}</option>`).join("");
  select.value=state.voucherRankingExamId;
  select.disabled=false;
  return specs;
}

async function renderVoucherRankingCenter(requestId){
  const mode=state.rankingMode;
  const tracks=state.voucherRegistry?.tracks||[];
  if(!state.voucherRankingTrackId)state.voucherRankingTrackId=getPrimaryTrack()||tracks[0]?.id||"";
  const trackId=state.voucherRankingTrackId;
  populateVoucherRankingControls();
  setRankingLoading("Loading released Voucher Real Exam leaderboards.");

  if(!trackId){
    updateVoucherRankingCenterSummary({mode,trackId:"",examSpecs:[]});
    showVoucherRankingCenterEmpty("No Voucher tracks are available","Voucher ranking will appear here after the Voucher registry is available.");
    return;
  }

  let specs=[];
  try{specs=await populateVoucherRankingExamSelect(trackId)}catch(error){
    if(requestId===state.rankingRequestId)showRankingError(error);
    return;
  }
  if(requestId!==state.rankingRequestId)return;

  if(!specs.length){
    updateVoucherRankingCenterSummary({mode,trackId,examSpecs:[]});
    const title=mode==="voucher-track"?"No Voucher exams have been released yet":"No rank-eligible Real Exam is available in this track yet";
    const message=mode==="voucher-track"
      ?"Track Overall activates automatically after the first released Voucher exam has a Real Exam Size configuration."
      :"Voucher Exam Ranking activates automatically after a released exam has a rank-eligible Real Exam Size.";
    showVoucherRankingCenterEmpty(title,message);
    return;
  }

  if(mode==="voucher-exam"){
    const spec=specs.find(item=>item.examId===state.voucherRankingExamId)||specs[0];
    state.voucherRankingExamId=spec.examId;
    $("rankingVoucherExamSelect").value=spec.examId;
    updateVoucherRankingCenterSummary({mode,trackId,examSpec:spec,examSpecs:specs});
    try{
      const rows=await fetchAttemptsForExamIds([spec.activityId]);
      if(requestId!==state.rankingRequestId)return;
      const board=buildVoucherExamLeaderboard(rows);
      await refreshSharedRankingAvatars(board);
      if(requestId!==state.rankingRequestId)return;
      renderOnlineLeaderboard(board);
      $("rankingAttemptsLabel").textContent="Real Attempts";
      $("rankingAttempts").textContent=getVoucherAttempts(state.playerId,spec.examId).filter(attempt=>attempt?.rankEligible===true).length;
      const me=board.find(row=>row.player_id===state.playerId);
      if(!me)$("rankingGap").textContent="Complete this Voucher Real Exam Size attempt to join the leaderboard.";
      showRankingContent();
    }catch(error){if(requestId===state.rankingRequestId)showRankingError(error)}
    return;
  }

  updateVoucherRankingCenterSummary({mode,trackId,examSpecs:specs});
  try{
    const rows=await fetchAttemptsForExamIds(specs.map(spec=>spec.activityId));
    if(requestId!==state.rankingRequestId)return;
    const playerIds=[...new Set(rows.map(row=>row.player_id).filter(Boolean))];
    let primaryTracks;
    try{
      if(state.playerId&&getPrimaryTrack())await syncVoucherPrimaryTrack(state.playerId,getPrimaryTrack());
      primaryTracks=await fetchVoucherPrimaryTracks(playerIds);
    }catch{
      throw new Error("Voucher Track Overall needs the Voucher Profiles Supabase migration and an online connection.");
    }
    const board=buildVoucherTrackOverallLeaderboard({trackId,exams:specs,rows,primaryTracks});
    const normalized=board.map(row=>({...row,totalScore:row.totalCorrect,completedSections:row.completedExams,totalSections:row.totalExams}));
    await refreshSharedRankingAvatars(normalized);
    if(requestId!==state.rankingRequestId)return;
    renderAggregateLeaderboard({board:normalized,maxScore:specs.reduce((sum,item)=>sum+(Number(item.totalQuestions)||0),0),totalSections:specs.length},{name:`${voucherTrackMeta(trackId)?.title||trackId} Voucher`},{unitLabel:"exams"});
    $("rankingBestLabel").textContent="Total Correct";
    $("rankingAttemptsLabel").textContent="Ranked Exams";
    const primary=getPrimaryTrack();
    const me=board.find(row=>row.player_id===state.playerId);
    if(primary!==trackId){
      $("rankingGap").textContent=`View only: your Primary Track is ${primaryTrackTitle(primary)||"not selected"}. Only ${voucherTrackMeta(trackId)?.title||trackId} members enter this Overall ranking.`;
    }else if(!me){
      $("rankingGap").textContent="Complete a Real Exam Size attempt in this Voucher track to enter Track Overall.";
    }
    showRankingContent();
  }catch(error){if(requestId===state.rankingRequestId)showRankingError(error)}
}
async function renderRanking(){
  $("rankingLocalName").textContent=state.studentName || "Guest";
  const requestId=++state.rankingRequestId;

  const savedMode=getRankingPreferences().mode;
  if(savedMode && isRankingMode(savedMode) && !state.rankingMode)state.rankingMode=savedMode;

  syncRankingModeUI();

  if(state.rankingMode==="voucher-exam"||state.rankingMode==="voucher-track"){
    await renderVoucherRankingCenter(requestId);
    return;
  }

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
      await refreshSharedRankingAvatars(board);
      if(requestId!==state.rankingRequestId)return;
      renderOnlineLeaderboard(board);
      showRankingContent();
    }catch(error){
      if(requestId===state.rankingRequestId)showRankingError(error);
    }
    return;
  }

  const scope=buildRankingScope({mode:state.rankingMode,trackLevelId:state.rankingTrackLevelId,trackId:state.rankingTrackId,officialRegistry:state.officialRegistry,sectionExamId:officialSectionExamId});
  updateRankingScopeSummary(scope);
  setRankingLoading(`Combining best attempts from ${scope.sectionCount} fixed section leaderboard${scope.sectionCount===1?"":"s"}.`);
  try{
    const rows=await fetchAttemptsForExamIds(scope.sections.map(s=>s.examId));
    if(requestId!==state.rankingRequestId)return;
    const result=buildAggregateLeaderboard(rows,scope.sections);
    await refreshSharedRankingAvatars(result.board);
    if(requestId!==state.rankingRequestId)return;
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
  state.rankingTrackId=findRankingLevel(state.officialRegistry,state.rankingTrackLevelId)?.tracks?.[0]?.trackId||null;
  setRankingTrackPreference(state.rankingTrackLevelId,state.rankingTrackId||"");
  renderRanking();
});
$("rankingTrackSelect").addEventListener("change",e=>{
  state.rankingTrackId=e.target.value;
  setRankingTrackPreference(state.rankingTrackLevelId,state.rankingTrackId);
  renderRanking();
});
$("rankingExamSelect").addEventListener("change",e=>{
  state.rankingExamId=e.target.value;
  state.rankingMode="exam";
  persistRankingMode("exam");
  setLastRankingExamId(state.rankingExamId);
  renderRanking();
});
$("rankingVoucherTrackSelect")?.addEventListener("change",e=>{
  state.voucherRankingTrackId=e.target.value;
  state.voucherRankingExamId=null;
  setVoucherRankingTrackPreference(state.voucherRankingTrackId||"");
  renderRanking();
});
$("rankingVoucherExamSelect")?.addEventListener("change",e=>{
  state.voucherRankingExamId=e.target.value||null;
  state.rankingMode="voucher-exam";
  persistRankingMode("voucher-exam");
  setVoucherRankingExamPreference(state.voucherRankingExamId||"");
  renderRanking();
});
$("refreshLeaderboardBtn").addEventListener("click",()=>renderRanking());

function openValidator(){
  if(window.__DIGILIANS_ADMIN_VERIFIED__!==true){
    closeProfile();
    showToast("Admin access is required for the JSON Validator.");
    return;
  }
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
  const mistakeStats=getMistakeSummary(mistakeOwnerId());
  const activeMistakes=mistakeStats["needs-review"]+mistakeStats.improving;
  if($("profileMistakesCount"))$("profileMistakesCount").textContent=`${activeMistakes} ACTIVE`;
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
let profileReturnFocus=null;

function openProfile(){
  renderProfile();
  profileReturnFocus=document.activeElement;
  $("drawerBackdrop").classList.remove("hidden");
  $("drawerBackdrop").setAttribute("aria-hidden","false");
  $("profileDrawer").classList.add("open");
  $("profileDrawer").setAttribute("aria-hidden","false");
  document.body.classList.add("profile-drawer-open");
  document.querySelector(".app-shell")?.setAttribute("inert","");
  window.requestAnimationFrame(()=>$("profileClose")?.focus());
}

function closeProfile(){
  const wasOpen=$("profileDrawer").classList.contains("open");
  $("drawerBackdrop").classList.add("hidden");
  $("drawerBackdrop").setAttribute("aria-hidden","true");
  $("profileDrawer").classList.remove("open");
  $("profileDrawer").setAttribute("aria-hidden","true");
  document.body.classList.remove("profile-drawer-open");
  document.querySelector(".app-shell")?.removeAttribute("inert");
  if(wasOpen && profileReturnFocus instanceof HTMLElement){
    window.requestAnimationFrame(()=>profileReturnFocus?.focus());
  }
  profileReturnFocus=null;
}

$("profileButton").addEventListener("click",openProfile);
$("openMyMistakesBtn")?.addEventListener("click",()=>{closeProfile();routeTo("mistakesView")});
$("profileClose").addEventListener("click",closeProfile);
$("drawerBackdrop").addEventListener("click",closeProfile);
document.addEventListener("keydown",event=>{
  if(event.key==="Escape" && $("profileDrawer").classList.contains("open")){
    event.preventDefault();
    closeProfile();
  }
});

// Opening a higher-level modal/route from Profile closes the drawer first,
// preventing modal-on-drawer stacking and keeping one clear active layer.
["openMyMistakesBtn","openBackupRestoreBtn","openWhatsNewBtn","openAnalyticsBtn","openValidatorBtn","changeAvatarBtn","changePrimaryTrackBtn"].forEach(id=>{
  $(id)?.addEventListener("click",closeProfile,{capture:true});
});

$("changeAvatarBtn")?.addEventListener("click",()=>{
  openAvatarPicker({
    mode:"change",
    name:state.studentName,
    onDone:async()=>{
      syncUserUI();
      await syncCurrentAvatarToRanking();
      showToast("Profile avatar updated for shared Ranking.");
      if(document.querySelector(".view.active")?.id==="rankingView")renderRanking();
    }
  });
});
$("changePrimaryTrackBtn")?.addEventListener("click",()=>{
  ensurePrimaryTrack({required:false,mode:"change"});
});

$("changeNameBtn").addEventListener("click",()=>{
  closeProfile();closeRankedIdentity();clearStudentName();state.studentName="";syncUserUI();
  $("studentName").value="";$("returningUserEntry").classList.add("hidden");$("newUserEntry").classList.remove("hidden");routeTo("welcomeView");
});

function showToast(message){
  const t=document.createElement("div");t.className="toast";t.textContent=message;$("toastContainer").appendChild(t);
  setTimeout(()=>t.remove(),2600);
}

async function init(){
  let storageWarningShown=false;
  window.addEventListener("digilians:storage-warning",()=>{
    if(storageWarningShown)return;
    storageWarningShown=true;
    showToast("Local progress could not be saved. Check browser storage permissions or export a backup.");
  });
  const storageSafety=initializeStorageSafety();
  if(!storageSafety.ok && storageSafety.reason==="future-schema")throw new Error("Saved learner data was created by a newer platform version. Open the latest platform before continuing.");
  applyTheme(getTheme());
  state.playerId=getPlayerId();

  let dataLoaded=false;
  try{
    await loadData();
    dataLoaded=true;
  }catch(e){
    console.error(e);
    window.dispatchEvent(new CustomEvent("digilians:client-error",{detail:{
      kind:e?.name||"data_load_error",
      message:e?.message||"Platform data could not be loaded.",
      phase:"startup"
    }}));
    $("examLoadError").textContent="Could not load platform data. Open this project through GitHub Pages or a local web server.";
    $("examLoadError").classList.remove("hidden");
  }

  if(!dataLoaded){
    window.__DIGILIANS_SHOW_FATAL__?.("Platform data could not be loaded.");
    return;
  }

  state.studentName=getStudentName();
  state.primaryTrackId=getPrimaryTrack();
  syncUserUI();
  if(state.studentName && hasAvatarProfile())void syncCurrentAvatarToRanking();
  retryPendingAttempts();
  if(state.studentName){
    $("returningUserEntry").classList.remove("hidden");$("newUserEntry").classList.add("hidden");
    $("returningUserName").textContent=state.studentName;
    routeTo("welcomeView");
    openReturningUserAvatarRollout();
  }else routeTo("welcomeView");

  setEntryControlsReady(true);
  window.__DIGILIANS_APP_READY__=true;
  window.__DIGILIANS_CLEAR_FATAL__?.();
}
init().catch(error=>{
  console.error("Fatal application startup error:",error);
  window.dispatchEvent(new CustomEvent("digilians:client-error",{detail:{
    kind:error?.name||"fatal_startup_error",
    message:error?.message||"The application could not start correctly.",
    phase:"startup"
  }}));
  window.__DIGILIANS_SHOW_FATAL__?.("The application could not start correctly.");
});
