import {
  getStudentName,setStudentName,clearStudentName,getPlayerId,getTheme,setTheme,getResults,saveResult,
  markResultSynced,getBestForExam,getPreviousBestForExam,saveExamProgress,getExamProgress,clearExamProgress,
  setLastCourse,getPendingAttempts,queuePendingAttempt,removePendingAttempt,
  getOfficialQbankState,getOfficialTrackState,updateOfficialTrackState,toggleOfficialBookmark,markOfficialReviewed,saveOfficialMistakes
} from "./storage.js";

import {validateExamPayload,calculateResult,formatDuration} from "./exam.js";
import {submitAttemptOnline,getLeaderboard} from "./online.js";
import {validateExamJson,buildRegistryEntry} from "./json-validator.js";
import {validateQuestionBank,buildBankRegistryEntry} from "./bank-validator.js";
import {getBlueprintReadiness,buildExamFromBlueprint} from "./bank-engine.js";
import {evaluateTrackReadiness,finalStatusFromTracks} from "./readiness.js";
import {evaluateCoverageReadiness,topicPerformance} from "./coverage-engine.js";
import {loadOfficialTrack,buildOfficialTrackExam,buildOfficialFinal} from "./official-qbank.js";

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
  currentIndex:0,
  feedbackMode:"instant",
  startedAt:null,
  remainingSeconds:null,
  timerId:null,
  lastResult:null,
  previousBest:null,
  filter:"All",
  playerId:null,
  rankingExamId:null,
  lastValidatorRoute:"dashboardView",
  validatorPayload:null,
  validatorRegistryEntry:null,
  officialRegistry:{tracks:[]},officialFinalBlueprint:null,officialTrackId:null,officialQuestions:[],officialFiltered:[],officialIndex:0
};

const $=id=>document.getElementById(id);
const views=["welcomeView","dashboardView","learnView","studyView","officialQbankView","officialStudyView","examsView","setupView","examView","resultView","reviewView","rankingView","validatorView"];

function initials(name){
  return (name || "Guest").trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()).join("") || "G";
}

function routeTo(id){
  views.forEach(v=>$(v)?.classList.toggle("active",v===id));
  updateNav(id);
  window.scrollTo({top:0,behavior:"smooth"});
  if(id==="dashboardView") renderDashboard();
  if(id==="learnView") renderLearn();
  if(id==="officialQbankView") renderOfficialHub();
  if(id==="examsView") renderExamLibrary($("examSearch")?.value || "");
  if(id==="rankingView") renderRanking();
}

function updateNav(viewId){
  const map={dashboardView:"dashboardView",learnView:"learnView",officialQbankView:"officialQbankView",officialStudyView:"officialQbankView",examsView:"examsView",rankingView:"rankingView"};
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
  const [registry,learning,bankRegistry,blueprints,curriculumRegistry,syllabusRegistry,coverageRegistry,officialRegistry,officialFinalBlueprint]=await Promise.all([
    loadJson("data/exams.json"),
    loadJson("data/learning.json"),
    loadJson("data/question-banks.json"),
    loadJson("data/exam-blueprints.json"),
    loadJson("data/curriculum.json"),
    loadJson("data/syllabus-maps.json"),
    loadJson("data/coverage-blueprints.json"),
    loadJson("data/official-qbank.json"),
    loadJson("data/official-final-blueprint.json")
  ]);
  state.registry=registry.exams || [];
  state.learning=learning;
  state.bankRegistry=bankRegistry;
  state.blueprints=blueprints;
  state.curriculumRegistry=curriculumRegistry;
  state.syllabusRegistry=syllabusRegistry;
  state.coverageRegistry=coverageRegistry;
  state.officialRegistry=officialRegistry;
  state.officialFinalBlueprint=officialFinalBlueprint;

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
  if($("officialHomeCount")) $("officialHomeCount").textContent=state.officialRegistry.totalQuestions || 0;
  renderCourses("homeCourseGrid",true);
  renderHomeExams();
  renderMiniAchievements();
  renderProfile();
}

function renderContinueCard(){
  const progress=getExamProgress();
  if(progress && progress.studentName===state.studentName){
    const registryItem=state.registry.find(x=>x.id===progress.examId);
    const total=registryItem?.questionCount || progress.totalQuestions || 1;
    const percent=Math.round(((progress.currentIndex+1)/total)*100);
    $("continueTitle").textContent=registryItem?.title || "Continue your exam";
    $("continueSubtitle").textContent=`Question ${progress.currentIndex+1} of ${total} • ${progress.feedbackMode==="instant"?"Instant Feedback":"Exam Mode"}`;
    $("continuePercent").textContent=`${percent}%`;
    $("continueAction").innerHTML='Continue Exam <span>→</span>';
    $("continueAction").onclick=()=>resumeProgress(progress);
    return;
  }
  const latest=[...getUserResults()].sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt))[0];
  if(latest){
    const exam=state.registry.find(x=>x.id===latest.examId);
    $("continueTitle").textContent=exam?`Improve ${exam.title}`:"Beat your personal best";
    $("continueSubtitle").textContent=`Last score: ${latest.percentage}% • Try again or choose another exam.`;
    $("continuePercent").textContent=`${latest.percentage}%`;
    $("continueAction").innerHTML='Practice Again <span>→</span>';
    $("continueAction").onclick=()=>exam?prepareExam(exam):routeTo("examsView");
  }else{
    $("continueTitle").textContent="Start your first exam";
    $("continueSubtitle").textContent="Choose a course and begin building your progress.";
    $("continuePercent").textContent="0%";
    $("continueAction").innerHTML='Explore Exams <span>→</span>';
    $("continueAction").onclick=()=>routeTo("examsView");
  }
}


function officialTrackMeta(trackId){return (state.officialRegistry.tracks||[]).find(x=>x.trackId===trackId)||null}
function officialReviewedTotal(){
  const stored=getOfficialQbankState();let total=0;for(const meta of state.officialRegistry.tracks||[]){total+=new Set(stored.tracks?.[meta.trackId]?.reviewed||[]).size}return total;
}
function renderOfficialHub(){
  if(!$("officialTrackGrid"))return;
  $("officialTotalQuestions").textContent=state.officialRegistry.totalQuestions||0;
  const reviewed=officialReviewedTotal(),total=state.officialRegistry.totalQuestions||1;
  $("officialOverallProgress").textContent=`${Math.round(reviewed/total*100)}%`;
  const colors={excel:'#1f9d63','power-bi':'#d9a51f',sql:'#1caee8',python:'#7c5ce7',tableau:'#4d8fd6',looker:'#7656d6'};
  const grid=$("officialTrackGrid");grid.innerHTML="";
  for(const meta of state.officialRegistry.tracks||[]){
    const st=getOfficialTrackState(meta.trackId);const pct=Math.round(new Set(st.reviewed||[]).size/Math.max(1,meta.questionCount)*100);
    const card=document.createElement('button');card.className='official-track-card';card.style.setProperty('--track-accent',colors[meta.trackId]||'var(--primary)');
    card.innerHTML=`<span class="official-source-badge">OFFICIAL</span><h4>${escapeHtml(meta.track)}</h4><p>${Object.keys(meta.topics||{}).length} mapped navigation topics</p><div class="official-card-count">${meta.questionCount}</div><div class="official-card-footer"><span>${pct}% reviewed</span><span>Study all →</span></div>`;
    card.addEventListener('click',()=>openOfficialTrack(meta.trackId));grid.appendChild(card);
  }
}
async function openOfficialTrack(trackId){
  const meta=officialTrackMeta(trackId);if(!meta)return;
  state.officialTrackId=trackId;state.officialQuestions=await loadOfficialTrack(state.officialRegistry,trackId,loadJson);
  const st=getOfficialTrackState(trackId);state.officialIndex=Math.min(st.lastIndex||0,Math.max(0,state.officialQuestions.length-1));
  $("officialStudyBreadcrumb").textContent=`Official QBank / ${meta.track}`;$("officialStudyTitle").textContent=`${meta.track} Official QBank`;$("officialStudyMeta").textContent=`${meta.questionCount} official questions • original wording preserved`;
  const topicSelect=$("officialTopicFilter");topicSelect.innerHTML='<option value="all">All topics</option>';
  const topics=[...new Set(state.officialQuestions.map(q=>q.topic))].sort();for(const topic of topics){const o=document.createElement('option');o.value=topic;o.textContent=topic;topicSelect.appendChild(o)}
  $("officialSearch").value='';$("officialStateFilter").value='all';applyOfficialFilters();routeTo('officialStudyView');
}
function applyOfficialFilters(){
  const query=($("officialSearch")?.value||'').trim().toLowerCase(),topic=$("officialTopicFilter")?.value||'all',kind=$("officialStateFilter")?.value||'all';
  const st=getOfficialTrackState(state.officialTrackId);const reviewed=new Set(st.reviewed||[]),bookmarks=new Set(st.bookmarks||[]),mistakes=new Set(st.mistakes||[]);
  state.officialFiltered=state.officialQuestions.filter(q=>{
    if(query && !(`${q.question} ${q.options.map(o=>o.text).join(' ')}`).toLowerCase().includes(query))return false;
    if(topic!=='all' && q.topic!==topic)return false;
    if(kind==='unseen' && reviewed.has(q.id))return false;if(kind==='reviewed'&&!reviewed.has(q.id))return false;if(kind==='bookmarks'&&!bookmarks.has(q.id))return false;if(kind==='mistakes'&&!mistakes.has(q.id))return false;return true;
  });
  if(!state.officialFiltered.length){state.officialIndex=0;renderOfficialQuestionList();renderOfficialEmpty();return}
  const currentId=state.officialQuestions[state.officialIndex]?.id;let idx=state.officialFiltered.findIndex(q=>q.id===currentId);if(idx<0)idx=0;state.officialIndex=state.officialQuestions.findIndex(q=>q.id===state.officialFiltered[idx].id);renderOfficialQuestionList();renderOfficialStudyQuestion();
}
function renderOfficialEmpty(){
  $("officialQuestionText").textContent='No questions match the current filters.';$("officialOptions").innerHTML='';$("officialAnswerBox").classList.add('hidden');$("officialSourceLine").textContent='';
}
function renderOfficialQuestionList(){
  const list=$("officialQuestionList");if(!list)return;list.innerHTML='';const st=getOfficialTrackState(state.officialTrackId),rev=new Set(st.reviewed||[]),bm=new Set(st.bookmarks||[]);const visible=state.officialFiltered.length?state.officialFiltered:[];
  for(const q of visible){const btn=document.createElement('button');btn.className='official-qnum';btn.textContent=q.originalOrder;if(q.id===state.officialQuestions[state.officialIndex]?.id)btn.classList.add('current');if(rev.has(q.id))btn.classList.add('reviewed');if(bm.has(q.id))btn.classList.add('bookmarked');btn.addEventListener('click',()=>{state.officialIndex=state.officialQuestions.findIndex(x=>x.id===q.id);renderOfficialQuestionList();renderOfficialStudyQuestion()});list.appendChild(btn)}
}
function officialVisibleQuestions(){
  return state.officialFiltered.length?state.officialFiltered:state.officialQuestions;
}
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
    heading=isCorrect
      ?`Correct ✓ — Official Answer: ${escapeHtml(q.correctAnswer)}`
      :`Incorrect ✕ — Official Answer: ${escapeHtml(q.correctAnswer)}`;
    statusClass=isCorrect?"official-answer-correct":"official-answer-wrong";

    const exactReason=deep?.options?.[selected];
    if(isCorrect){
      verdict=`<div class="official-arabic-verdict correct-note">
        <strong>ليه إجابتك صح؟</strong>
        <p>${escapeHtml(exactReason || "اختيارك يطابق الإجابة الرسمية المنشورة.")}</p>
      </div>`;
    }else{
      verdict=`<div class="official-arabic-verdict wrong-note">
        <strong>ليه إجابتك غلط؟</strong>
        <p><b>اختيارك ${escapeHtml(selected)}:</b> ${escapeHtml(exactReason || selectedOption?.text || "")}</p>
      </div>`;
    }
  }

  let explanationHtml="";
  if(deep){
    explanationHtml=`
      <div class="official-ai-explanation deep">
        <span class="official-ai-label">DETAILED EXPLANATION — ARABIC</span>
        <p dir="rtl">${escapeHtml(deep.summary)}</p>

        <details class="official-option-analysis" open>
          <summary>تحليل كل الاختيارات A / B / C / D</summary>
          <div class="official-option-analysis-grid">
            ${q.options.map(o=>{
              const isCorrect=o.id===q.correctAnswer;
              return `<div class="official-option-reason ${isCorrect?"is-correct":"is-wrong"}">
                <div class="reason-head"><span>${o.id}</span><strong>${isCorrect?"✓ صح":"✕ غلط"}</strong></div>
                <p dir="rtl">${escapeHtml(deep.options?.[o.id] || "")}</p>
              </div>`;
            }).join("")}
          </div>
        </details>
      </div>`;
  }else{
    const aiAr=q.aiExplanation?.ar || "الشرح التفصيلي لهذا السؤال لم يتم إضافته بعد.";
    explanationHtml=`
      <div class="official-ai-explanation">
        <span class="official-ai-label">AI EXPLANATION — ARABIC</span>
        <p dir="rtl">${escapeHtml(aiAr)}</p>
        <small class="deep-pilot-note">الشرح Option-by-Option قيد الإضافة لهذا الجزء من البنك.</small>
      </div>`;
  }

  box.className=`official-answer-box ${statusClass}`;
  box.innerHTML=`
    <strong>${heading}</strong>
    <div class="official-answer-text">${escapeHtml(correct?.text||"")}</div>
    ${verdict}
    ${explanationHtml}
    <small>الإجابة أعلاه من المصدر الرسمي. الشرح التفصيلي العربي إضافة تعليمية من Digilians E-Learn وليس جزءًا من ملف الوزارة.</small>
  `;
}
function answerOfficialQuestion(q,optionId){
  const st=getOfficialTrackState(state.officialTrackId);
  const answers={...(st.answers||{})};
  if(answers[q.id])return;

  answers[q.id]=optionId;
  const reviewed=new Set(st.reviewed||[]);
  const mistakes=new Set(st.mistakes||[]);
  reviewed.add(q.id);
  if(optionId!==q.correctAnswer)mistakes.add(q.id);

  updateOfficialTrackState(state.officialTrackId,{
    answers,
    reviewed:[...reviewed],
    mistakes:[...mistakes],
    lastIndex:state.officialIndex
  });

  renderOfficialQuestionList();
  renderOfficialStudyQuestion();
}
function renderOfficialStudyQuestion(){
  const q=state.officialQuestions[state.officialIndex];
  if(!q)return renderOfficialEmpty();

  const st=getOfficialTrackState(state.officialTrackId);
  const rev=new Set(st.reviewed||[]);
  const bm=new Set(st.bookmarks||[]);
  const selected=st.answers?.[q.id]||null;

  $("officialQuestionTopic").textContent=q.topic;
  $("officialSourceLine").textContent=`Source: ${q.officialSource.file} • Page ${q.officialSource.page}${q.originalQuestionNumber?` • Original Q${q.originalQuestionNumber}`:''} • Set ${q.officialSet}`;
  $("officialQuestionText").textContent=q.question;

  const opts=$("officialOptions");
  opts.innerHTML="";
  for(const o of q.options){
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="official-option";

    const letter=document.createElement("span");
    letter.className="option-letter";
    letter.textContent=o.id;

    const text=document.createElement("span");
    text.textContent=o.text;

    btn.append(letter,text);

    if(selected){
      btn.classList.add("locked");
      if(o.id===selected)btn.classList.add("selected");
      if(o.id===q.correctAnswer)btn.classList.add("correct");
      if(o.id===selected && selected!==q.correctAnswer)btn.classList.add("wrong");
    }

    btn.addEventListener("click",()=>answerOfficialQuestion(q,o.id));
    opts.appendChild(btn);
  }

  if(selected){
    renderOfficialAnswerBox(q,selected,false);
  }else{
    $("officialAnswerBox").className="official-answer-box hidden";
    $("officialAnswerBox").innerHTML="";
  }

  $("officialShowAnswerBtn").textContent=selected?"Official Answer Shown":"Show Official Answer";
  $("officialBookmarkBtn").classList.toggle("active",bm.has(q.id));
  $("officialBookmarkBtn").textContent=bm.has(q.id)?"★":"☆";

  const pos=officialVisiblePosition();
  const visible=officialVisibleQuestions();
  $("officialPrevBtn").disabled=pos<=0;
  $("officialNextBtn").disabled=pos<0 || pos>=visible.length-1;
  updateOfficialProgress();
}
function updateOfficialProgress(){
  const st=getOfficialTrackState(state.officialTrackId),meta=officialTrackMeta(state.officialTrackId);const reviewed=new Set(st.reviewed||[]).size,pct=Math.round(reviewed/Math.max(1,meta?.questionCount||1)*100);$("officialTrackProgress").textContent=`${pct}%`;$("officialTrackProgressFill").style.width=`${pct}%`;$("officialReviewedCount").textContent=`${reviewed} of ${meta?.questionCount||0} reviewed`;
}
function moveOfficial(delta){
  const visible=officialVisibleQuestions();
  if(!visible.length)return;
  let pos=officialVisiblePosition();
  if(pos<0)pos=0;
  const nextPos=Math.max(0,Math.min(visible.length-1,pos+delta));
  const target=visible[nextPos];
  const next=state.officialQuestions.findIndex(q=>q.id===target.id);
  if(next<0)return;
  state.officialIndex=next;
  updateOfficialTrackState(state.officialTrackId,{lastIndex:next});
  renderOfficialQuestionList();
  renderOfficialStudyQuestion();
}
async function prepareOfficialTrack(mode){
  const meta=officialTrackMeta(state.officialTrackId);if(!meta)return;const payload=buildOfficialTrackExam({trackId:meta.trackId,track:meta.track,title:`${meta.track} - Official Ministry QBank ${mode==='instant'?'Practice':'Exam'}`,questions:state.officialQuestions,count:mode==='instant'?40:50,feedbackModes:[mode],timerMinutes:mode==='exam'?60:null,category:mode==='instant'?'Official Practice':'Official Exam'});const item={id:payload.exam.id,title:payload.exam.title,course:'Data Analysis',module:meta.track,questionCount:payload.questions.length,generator:'official-qbank'};configureExamSetup(payload,item,mode);
}
async function prepareOfficialFinalExam(){
  const payload=await buildOfficialFinal({registry:state.officialRegistry,blueprint:state.officialFinalBlueprint,loadJson});const item={id:payload.exam.id,title:payload.exam.title,course:'Data Analysis',module:'Official QBank',questionCount:100,generator:'official-qbank'};configureExamSetup(payload,item,'exam');
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
    const card=document.createElement("button");
    card.className="track-card";
    card.style.setProperty("--track-accent",track.accent || "var(--primary)");
    card.innerHTML=`
      <div class="track-icon">${track.icon || track.title[0]}</div>
      <h4>${track.title}</h4>
      <p>${track.description || ""}</p>
      <div class="track-footer">
        <span>${track.modules?.length ? `${track.modules.length} module${track.modules.length===1?"":"s"}` : "Coming soon"}</span>
        <span class="track-arrow">→</span>
      </div>
    `;
    card.addEventListener("click",()=>openTrack(course,track));
    grid.appendChild(card);
  });

  renderCurriculumStatus(course);
  renderCoverageStatus(course);
  renderCourseFinalExamSlot(course);
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
  const readiness={
    ready:poolReadiness.ready && curriculumFinal.ready,
    readyTracks:trackStatuses.filter(x=>x.readiness?.status==="final-ready").length,
    totalTracks:trackStatuses.length,
    tracks:poolReadiness.tracks
  };
  const pct=readiness.totalTracks?Math.round((readiness.readyTracks/readiness.totalTracks)*100):0;

  const wrapper=document.createElement("article");
  wrapper.className="course-final-card";
  wrapper.innerHTML=`
    <div class="course-final-head">
      <div>
        <span class="eyebrow">FINAL EXAM</span>
        <h4>${blueprint.title}</h4>
        <p>${blueprint.description}</p>
      </div>
      <span class="pool-chip ${readiness.ready?"ready":"building"}">${readiness.ready?"READY":"POOL BUILDING"}</span>
    </div>

    <div class="final-meta-grid">
      <div><span>QUESTIONS</span><strong>${blueprint.questionCount}</strong></div>
      <div><span>TIME</span><strong>${blueprint.timerMinutes} min</strong></div>
      <div><span>DIFFICULTY</span><strong>25 / 50 / 25</strong></div>
    </div>

    <div class="final-track-pills">
      ${blueprint.tracks.map(t=>`<span class="final-track-pill">${t.label} ${t.count}</span>`).join("")}
    </div>

    <div class="final-readiness">
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
      <strong>${readiness.readyTracks}/${readiness.totalTracks} pools ready</strong>
    </div>
    <div class="readiness-detail">${readinessShortText(readiness)}</div>
    <button class="primary-btn wide" ${readiness.ready?"":"data-building='true'"}>
      ${readiness.ready?"Start Final Exam →":"Check Final Pool →"}
    </button>
  `;
  wrapper.querySelector("button").addEventListener("click",()=>{
    if(!readiness.ready){
      showToast(readinessShortText(readiness));
      return;
    }
    const item=state.registry.find(x=>x.blueprintId===blueprint.id);
    if(item) prepareExam(item);
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

function renderModulePanel(course,track=null){
  const trackPanel=$("trackPanel");
  const panel=$("modulePanel");
  const modules=track ? (track.modules || []) : (course.modules || []);

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

  list.innerHTML="";
  modules.forEach((module,index)=>{
    const row=document.createElement("button");
    row.className="module-row";
    row.innerHTML=`
      <div class="course-icon">${String(index+1).padStart(2,"0")}</div>
      <div class="module-row-copy">
        <strong>${module.title}</strong>
        <small>${module.description || ""}</small>
      </div>
      <span class="module-row-arrow">→</span>
    `;
    row.addEventListener("click",()=>{
      state.selectedModule=module;
      $("modulePanelTitle").textContent=module.title;
      $("modulePanelDescription").textContent=module.description || "";
      panel.querySelector(".learning-flow").classList.remove("hidden");
      panel.scrollIntoView({behavior:"smooth",block:"start"});
    });
    list.appendChild(row);
  });

  state.selectedModule=modules[0];
  $("modulePanelTitle").textContent=modules[0].title;
  $("modulePanelDescription").textContent=modules[0].description || "";

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

function openStudy(){
  const c=state.selectedCourse,m=state.selectedModule;
  if(!c||!m?.study)return;
  $("studyBreadcrumb").textContent=`${c.title} / ${m.title} / Study`;
  $("studyTitle").textContent=m.study.title;
  $("studyDescription").textContent=m.study.description || "";
  const toc=$("studyTocList"),sections=$("studySections");
  toc.innerHTML="";sections.innerHTML="";
  m.study.sections.forEach((s,i)=>{
    const id=`study-section-${s.id || i}`;
    const tocBtn=document.createElement("button");
    tocBtn.textContent=s.title;
    tocBtn.addEventListener("click",()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth"}));
    toc.appendChild(tocBtn);

    const article=document.createElement("section");
    article.className="study-section";article.id=id;
    const paragraphs=(s.paragraphs||[]).map(p=>`<p>${p}</p>`).join("");
    const bullets=s.bullets?.length?`<ul>${s.bullets.map(b=>`<li>${b}</li>`).join("")}</ul>`:"";
    const callout=s.callout?`<div class="study-callout"><strong>${s.callout.label}:</strong> ${s.callout.text}</div>`:"";
    article.innerHTML=`<span class="eyebrow">SECTION ${String(i+1).padStart(2,"0")}</span><h3>${s.title}</h3>${paragraphs}${bullets}${callout}`;
    sections.appendChild(article);
  });
  routeTo("studyView");
}
$("studyBackBtn").addEventListener("click",()=>routeTo("learnView"));
$("studyToPracticeBtn").addEventListener("click",()=>openModuleExam("instant"));
$("studyToPracticeTop").addEventListener("click",()=>openModuleExam("instant"));

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
  renderExamFilters();
  grid.innerHTML="";
  const list=state.registry.filter(x=>x.active!==false)
    .filter(x=>state.filter==="All" || x.course===state.filter)
    .filter(x=>`${x.title} ${x.course} ${x.module} ${x.category}`.toLowerCase().includes(filter.toLowerCase()));
  list.forEach(item=>{
    const best=getBestForExam(item.id,state.studentName);
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
      <button class="primary-btn wide">${readiness && !readiness.ready?"Check Pool":"Open Exam"} <span>→</span></button>`;
    card.querySelector("button").addEventListener("click",()=>{
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
if($("startOfficialFinalBtn"))$("startOfficialFinalBtn").addEventListener('click',prepareOfficialFinalExam);
if($("officialStudyBackBtn"))$("officialStudyBackBtn").addEventListener('click',()=>routeTo('officialQbankView'));
if($("officialSearch"))$("officialSearch").addEventListener('input',applyOfficialFilters);
if($("officialTopicFilter"))$("officialTopicFilter").addEventListener('change',applyOfficialFilters);
if($("officialStateFilter"))$("officialStateFilter").addEventListener('change',applyOfficialFilters);
if($("officialPrevBtn"))$("officialPrevBtn").addEventListener('click',()=>moveOfficial(-1));
if($("officialNextBtn"))$("officialNextBtn").addEventListener('click',()=>moveOfficial(1));
if($("officialShowAnswerBtn"))$("officialShowAnswerBtn").addEventListener("click",()=>{
  const q=state.officialQuestions[state.officialIndex];
  if(!q)return;
  const st=getOfficialTrackState(state.officialTrackId);
  markOfficialReviewed(state.officialTrackId,q.id,state.officialIndex);
  renderOfficialAnswerBox(q,st.answers?.[q.id]||null,true);
  renderOfficialQuestionList();
  updateOfficialProgress();
});
if($("officialBookmarkBtn"))$("officialBookmarkBtn").addEventListener('click',()=>{const q=state.officialQuestions[state.officialIndex];if(!q)return;toggleOfficialBookmark(state.officialTrackId,q.id);renderOfficialQuestionList();renderOfficialStudyQuestion()});
if($("officialPracticeBtn"))$("officialPracticeBtn").addEventListener('click',()=>prepareOfficialTrack('instant'));
if($("officialExamBtn"))$("officialExamBtn").addEventListener('click',()=>prepareOfficialTrack('exam'));


async function prepareExam(registryItem,forcedMode=null){
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
  state.previousBest=getPreviousBestForExam(payload.exam.id,state.studentName);

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
$("backToLibraryBtn").addEventListener("click",()=>routeTo(state.currentExam?.exam?.generatedFromOfficialQbank?"officialQbankView":"examsView"));

$("beginExamBtn").addEventListener("click",()=>{
  state.feedbackMode=document.querySelector('input[name="feedbackMode"]:checked')?.value || "instant";
  startExam();
});

function startExam(restored=null){
  stopTimer();
  if(restored){
    state.answers=restored.answers || {};
    state.currentIndex=restored.currentIndex || 0;
    state.feedbackMode=restored.feedbackMode || "instant";
    state.startedAt=Date.now()-(restored.elapsedSeconds || 0)*1000;
    state.remainingSeconds=restored.remainingSeconds ?? null;
  }else{
    state.answers={};state.currentIndex=0;state.startedAt=Date.now();
    const timer=state.currentExam.exam.settings?.timer;
    state.remainingSeconds=timer?.enabled?timer.durationMinutes*60:null;
  }
  buildQuestionNavigator();renderQuestion();startTimerIfNeeded();persistProgress();routeTo("examView");
}

async function resumeProgress(progress){
  const item=state.registry.find(x=>x.id===progress.examId);
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
    state.currentExam=payload;state.currentRegistryItem=item;
    state.previousBest=getPreviousBestForExam(payload.exam.id,state.studentName);
    startExam(progress);
  }catch(e){clearExamProgress();showToast("Saved progress could not be restored.");routeTo("examsView")}
}

function persistProgress(){
  if(!state.currentExam || !state.studentName)return;
  saveExamProgress({
    studentName:state.studentName,
    examId:state.currentExam.exam.id,
    answers:state.answers,
    currentIndex:state.currentIndex,
    totalQuestions:state.currentExam.questions.length,
    feedbackMode:state.feedbackMode,
    remainingSeconds:state.remainingSeconds,
    elapsedSeconds:Math.max(0,Math.floor((Date.now()-state.startedAt)/1000)),
    generatedExam:["question-bank","official-qbank"].includes(state.currentRegistryItem?.generator)?state.currentExam:null
  });
}

function buildQuestionNavigator(){
  const nav=$("questionNavigator");nav.innerHTML="";
  state.currentExam.questions.forEach((q,index)=>{
    const btn=document.createElement("button");btn.className="nav-number";btn.textContent=index+1;
    btn.addEventListener("click",()=>{state.currentIndex=index;persistProgress();renderQuestion()});
    nav.appendChild(btn);
  });
}

function renderQuestion(){
  const qs=state.currentExam.questions,q=qs[state.currentIndex];
  $("questionCounter").textContent=`Question ${state.currentIndex+1} / ${qs.length}`;
  $("progressFill").style.width=`${((state.currentIndex+1)/qs.length)*100}%`;
  $("questionTopic").textContent=q.topic || "General";
  $("questionDifficulty").textContent=q.difficulty || "Medium";
  $("questionText").textContent=q.question;

  const list=$("optionsList");list.innerHTML="";
  q.options.forEach(option=>{
    const btn=document.createElement("button");btn.className="option-btn";
    btn.innerHTML=`<span class="option-letter">${escapeHtml(option.id)}</span><span>${escapeHtml(option.text)}</span>`;
    const selected=state.answers[q.id];
    if(selected===option.id)btn.classList.add("selected");
    if(state.feedbackMode==="instant" && selected){
      if(option.id===q.correctAnswer)btn.classList.add("correct");
      if(option.id===selected && selected!==q.correctAnswer)btn.classList.add("wrong");
    }
    btn.addEventListener("click",()=>selectAnswer(q,option.id));
    list.appendChild(btn);
  });
  renderInstantFeedback(q);updateNavigator();
  $("prevQuestionBtn").disabled=state.currentIndex===0;
  $("nextQuestionBtn").classList.toggle("hidden",state.currentIndex===qs.length-1);
  $("submitExamBtn").classList.toggle("hidden",state.currentIndex!==qs.length-1);
}

function selectAnswer(q,optionId){
  if(state.feedbackMode==="instant" && state.answers[q.id])return;
  state.answers[q.id]=optionId;persistProgress();renderQuestion();
}

function renderInstantFeedback(q){
  const box=$("instantFeedback");box.className="feedback-box hidden";box.innerHTML="";
  const selected=state.answers[q.id];
  if(state.feedbackMode!=="instant" || !selected)return;
  const correct=selected===q.correctAnswer;
  const explanation=q.explanation?.ar || q.explanation?.en || "No explanation provided.";
  box.className=`feedback-box ${correct?"success":"error"}`;
  box.innerHTML=`<strong>${correct?"Correct ✓":`Incorrect ✕ — Correct answer: ${q.correctAnswer}`}</strong><div>${explanation}</div>`;
}

function updateNavigator(){
  const answered=Object.keys(state.answers).length;
  $("answeredCount").textContent=`${answered} answered`;
  document.querySelectorAll(".nav-number").forEach((btn,index)=>{
    const q=state.currentExam.questions[index];
    btn.classList.toggle("current",index===state.currentIndex);
    btn.classList.toggle("answered",Boolean(state.answers[q.id]));
  });
}
$("prevQuestionBtn").addEventListener("click",()=>{if(state.currentIndex>0){state.currentIndex--;persistProgress();renderQuestion()}});
$("nextQuestionBtn").addEventListener("click",()=>{if(state.currentIndex<state.currentExam.questions.length-1){state.currentIndex++;persistProgress();renderQuestion()}});
$("submitExamBtn").addEventListener("click",()=>finishExam(false));

$("exitExamBtn").addEventListener("click",()=>{
  const ok=confirm("Exit the exam? Your current progress is saved on this device and you can continue later.");
  if(!ok)return;stopTimer();persistProgress();routeTo("dashboardView");
});

function startTimerIfNeeded(){
  if(state.remainingSeconds===null){$("timerDisplay").classList.add("hidden");return}
  $("timerDisplay").classList.remove("hidden");updateTimerDisplay();
  state.timerId=setInterval(()=>{
    state.remainingSeconds--;updateTimerDisplay();
    if(state.remainingSeconds%5===0)persistProgress();
    if(state.remainingSeconds<=0)finishExam(true);
  },1000);
}
function updateTimerDisplay(){
  const total=Math.max(0,state.remainingSeconds ?? 0);
  $("timerDisplay").textContent=`${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}
function stopTimer(){if(state.timerId)clearInterval(state.timerId);state.timerId=null}

function finishExam(autoSubmitted){
  stopTimer();
  const beforeAchievements=getAchievements(getUserResults()).filter(a=>a.unlocked).map(a=>a.id);
  const result=calculateResult(state.currentExam.questions,state.answers);
  const timeTakenSeconds=Math.max(0,Math.floor((Date.now()-state.startedAt)/1000));
  const clientAttemptId=crypto.randomUUID();

  const subjectBreakdown=calculateSubjectBreakdown();
  const topicBreakdown=topicPerformance(state.currentExam.questions,state.answers);
  const record={
    examId:state.currentExam.exam.id,examTitle:state.currentExam.exam.title,studentName:state.studentName,
    percentage:result.percentage,correct:result.correct,wrong:result.wrong,unanswered:result.unanswered,
    timeTakenSeconds,submittedAt:new Date().toISOString(),autoSubmitted,
    clientAttemptId,onlineSynced:false,subjectBreakdown,topicBreakdown
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
    Object.entries(wrongByTrack).forEach(([trackId,ids])=>saveOfficialMistakes(trackId,ids));
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
  const mins=Math.floor(total/60);
  const secs=total%60;
  return mins?`${mins}m ${secs}s`:`${secs}s`;
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
  setResultSyncUI("syncing");
  let headline="Keep practicing";
  if(record.percentage>=90)headline="Excellent work";
  else if(record.percentage>=80)headline="Great job";
  else if(record.percentage>=pass)headline="Good progress";
  $("resultHeadline").textContent=headline;$("resultPercent").textContent="0%";
  $("resultScore").textContent=`${record.correct} / ${state.currentExam.questions.length}`;
  $("correctCount").textContent=score.correct;$("wrongCount").textContent=score.wrong;$("unansweredCount").textContent=score.unanswered;
  $("timeTaken").textContent=formatDuration(record.timeTakenSeconds);
  renderSubjectBreakdown();
  renderTopicBreakdown();
  $("celebration").classList.toggle("hidden",record.percentage<80);
  setTimeout(()=>animateScore(record.percentage),120);

  const best=getBestForExam(record.examId,state.studentName);
  $("resultBestScore").textContent=best?`${best.percentage}%`:`${record.percentage}%`;

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
$("nextExamBtn").addEventListener("click",()=>routeTo("examsView"));

function renderReview(){
  const list=$("reviewList");list.innerHTML="";$("reviewTitle").textContent=state.currentExam.exam.title;
  state.currentExam.questions.forEach((q,index)=>{
    const selected=state.answers[q.id] ?? null;
    const selectedOption=q.options.find(o=>o.id===selected),correctOption=q.options.find(o=>o.id===q.correctAnswer);
    const isCorrect=selected===q.correctAnswer;
    const item=document.createElement("article");item.className="review-item";
    item.innerHTML=`
      <span class="eyebrow">QUESTION ${String(index+1).padStart(2,"0")}</span>
      <h3>${escapeHtml(q.question)}</h3>
      <div class="review-answer ${isCorrect?"correct":"wrong"}"><strong>Your answer:</strong> ${selected?`${escapeHtml(selected)}. ${escapeHtml(selectedOption?.text || "")}`:"Unanswered"}</div>
      <div class="review-answer correct"><strong>Correct answer:</strong> ${escapeHtml(q.correctAnswer)}. ${escapeHtml(correctOption?.text || "")}</div>
      <div class="review-explanation"><strong>Explanation:</strong><br>${q.explanation?.ar || q.explanation?.en || "No explanation provided."}</div>`;
    list.appendChild(item);
  });
  routeTo("reviewView");
}
$("reviewHomeBtn").addEventListener("click",()=>routeTo(state.currentExam?.exam?.generatedFromOfficialQbank?"officialQbankView":"examsView"));

function populateRankingExamSelect(){
  const select=$("rankingExamSelect");
  if(!select)return;

  const current=state.rankingExamId || state.registry.find(x=>x.active!==false)?.id || "";
  select.innerHTML="";

  state.registry.filter(x=>x.active!==false).forEach(item=>{
    const option=document.createElement("option");
    option.value=item.id;
    option.textContent=`${item.course} — ${item.title}`;
    if(item.id===current)option.selected=true;
    select.appendChild(option);
  });

  state.rankingExamId=select.value || current;
}

async function renderRanking(){
  const stats=getStats();
  $("rankingLocalName").textContent=state.studentName || "Guest";
  $("rankingAttempts").textContent=stats.attempts;

  populateRankingExamSelect();

  const examId=state.rankingExamId;
  const status=$("leaderboardStatus");
  const content=$("leaderboardContent");

  if(!examId){
    status.classList.remove("hidden");
    content.classList.add("hidden");
    status.innerHTML=`<div class="status-icon">↗</div><div><strong>No exams available</strong><p>Add an active exam to start a leaderboard.</p></div>`;
    return;
  }

  status.className="status-card info";
  status.classList.remove("hidden");
  status.innerHTML=`<div class="status-icon">↗</div><div><strong>Loading leaderboard…</strong><p>Fetching the latest shared results from Supabase.</p></div>`;
  content.classList.add("hidden");

  try{
    const board=await getLeaderboard(examId);
    renderOnlineLeaderboard(board);
    status.classList.add("hidden");
    content.classList.remove("hidden");
  }catch(error){
    console.error("Leaderboard fetch failed:",error);
    status.className="status-card danger";
    status.innerHTML=`<div class="status-icon">!</div><div><strong>Leaderboard is temporarily unavailable</strong><p>Your local exam results are still safe. Check your connection and try Refresh.</p></div>`;
    content.classList.add("hidden");
  }
}

function renderOnlineLeaderboard(board){
  const podium=$("leaderboardPodium");
  const list=$("leaderboardList");
  podium.innerHTML="";
  list.innerHTML="";

  if(!board.length){
    podium.innerHTML=`<div class="status-card info"><div class="status-icon">✦</div><div><strong>Be the first on this leaderboard</strong><p>No online attempts have been submitted for this exam yet.</p></div></div>`;
    list.innerHTML=`<div class="leaderboard-row"><span>—</span><span class="leaderboard-name">No scores yet</span><span>—</span><span>—</span></div>`;
  }else{
    const top=board.slice(0,3);
    const order=top.length>=3?[top[1],top[0],top[2]]:top.length===2?[top[1],top[0]]:top;

    order.forEach(entry=>{
      const place=document.createElement("div");
      const classes=entry.rank===1?"first":entry.rank===2?"second":"third";
      place.className=`podium-place ${classes} ${entry.player_id===state.playerId?"you":""}`;
      place.innerHTML=`
        <span>${entry.rank}</span>
        <div class="avatar">${escapeHtml(initials(entry.student_name))}</div>
        <strong class="podium-name">${escapeHtml(entry.student_name)}</strong>
        <div class="podium-score">${entry.percentage}%</div>`;
      podium.appendChild(place);
    });

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

  const gap=$("rankingGap");
  if(!me){
    gap.textContent="Complete this exam to join the leaderboard.";
  }else if(me.rank===1){
    gap.textContent="You are currently leading this exam.";
  }else{
    const previous=board[me.rank-2];
    if(previous.percentage>me.percentage){
      gap.textContent=`You are ${previous.percentage-me.percentage} point${previous.percentage-me.percentage===1?"":"s"} behind #${previous.rank}.`;
    }else{
      gap.textContent=`Same score as #${previous.rank}; improve your completion time to move up.`;
    }
  }
}

$("rankingExamSelect").addEventListener("change",e=>{
  state.rankingExamId=e.target.value;
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
  closeProfile();clearStudentName();state.studentName="";syncUserUI();
  $("studentName").value="";$("returningUserEntry").classList.add("hidden");$("newUserEntry").classList.remove("hidden");routeTo("welcomeView");
});

function showToast(message){
  const t=document.createElement("div");t.className="toast";t.textContent=message;$("toastContainer").appendChild(t);
  setTimeout(()=>t.remove(),2600);
}

async function init(){
  applyTheme(getTheme());
  state.playerId=getPlayerId();
  try{await loadData()}catch(e){
    console.error(e);
    $("examLoadError").textContent="Could not load platform data. Open this project through GitHub Pages or a local web server.";
    $("examLoadError").classList.remove("hidden");
  }
  state.studentName=getStudentName();syncUserUI();
  retryPendingAttempts();
  if(state.studentName){
    $("returningUserEntry").classList.remove("hidden");$("newUserEntry").classList.add("hidden");
    $("returningUserName").textContent=state.studentName;
    routeTo("welcomeView");
  }else routeTo("welcomeView");
}
init();
