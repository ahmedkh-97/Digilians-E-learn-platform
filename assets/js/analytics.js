import {resolveBuildVersion,displayBuildVersion} from "./build-version.js?v=0.20.3";


const SUPABASE_URL="https://gbyxpwcjfzxpxxbbwnzf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_tb1vaMv8eB98FcaaqLLl3A_k1nXSdgJ";

const EVENTS_ENDPOINT=`${SUPABASE_URL}/rest/v1/analytics_events`;
const ADMINS_ENDPOINT=`${SUPABASE_URL}/rest/v1/analytics_admins`;
const AUTH_TOKEN_ENDPOINT=`${SUPABASE_URL}/auth/v1/token`;

const KEYS={
  visitorId:"digilians.analytics.visitorId",
  sessionId:"digilians.analytics.sessionId",
  adminSession:"digilians.analyticsAdmin.session"
};

const TRACK_LABELS={
  excel:"Excel",
  sql:"SQL & Databases",
  python:"Python for Data Analysis",
  "power-bi":"Power BI",
  tableau:"Tableau",
  looker:"Looker Studio",
  statistics:"Statistics"
};

const ROUTE_LABELS={
  welcomeView:"Welcome",
  dashboardView:"Home",
  learnView:"Learn",
  studyView:"Study",
  officialQbankView:"Official QBank",
  officialJuniorView:"Official Junior",
  officialTrackView:"Official Track",
  officialStudyView:"Official Study",
  examsView:"Exams",
  setupView:"Exam Setup",
  examView:"Exam",
  resultView:"Result",
  reviewView:"Review",
  rankingView:"Ranking",
  analyticsView:"Admin Analytics",
  validatorView:"Validator"
};

const EVENT_LABELS={
  session_start:"Session Start",
  page_view:"Page View",
  track_open:"Track Open",
  study_open:"Study Open",
  practice_start:"Practice Start",
  practice_complete:"Practice Complete",
  exam_start:"Exam Start",
  exam_complete:"Exam Complete",
  update_seen:"Update Seen",
  update_installed:"Update Installed",
  progress_backup_export:"Progress Backup Export",
  progress_backup_restore:"Progress Backup Restore",
  app_error:"App Error"
};

let trackingFailureLogged=false;
let trackingDisabledUntil=0;
let adminSession=null;
let adminVerified=false;
let activeRange="today";
let lastFetchedEvents=[];
let renderingDashboard=false;

const ERROR_LIMIT_PER_SESSION=20;
const ERROR_DEDUPE_MS=60_000;
let reportedErrorCount=0;
const recentErrorSignatures=new Map();

function byId(id){return document.getElementById(id)}

function safeGet(storage,key){
  try{return storage.getItem(key)}catch{return null}
}
function safeSet(storage,key,value){
  try{storage.setItem(key,value)}catch{}
}
function safeRemove(storage,key){
  try{storage.removeItem(key)}catch{}
}

function uuid(){
  if(globalThis.crypto?.randomUUID)return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{
    const r=Math.random()*16|0;
    const v=c==="x"?r:(r&0x3|0x8);
    return v.toString(16);
  });
}

function normalizeId(value,max=160){
  if(value===null||value===undefined||value==="")return null;
  return String(value).slice(0,max);
}

function currentVersion(){
  return resolveBuildVersion(document,"unknown");
}

function isLocalTestEnvironment(){
  const host=String(globalThis.location?.hostname||"").toLowerCase();
  return host==="localhost" || host==="127.0.0.1";
}

export function getOrCreateVisitorId(storage=globalThis.localStorage){
  let id=safeGet(storage,KEYS.visitorId);
  if(!id){
    id=uuid();
    safeSet(storage,KEYS.visitorId,id);
  }
  return id;
}

export function getOrCreateSessionId(storage=globalThis.sessionStorage){
  let id=safeGet(storage,KEYS.sessionId);
  if(!id){
    id=uuid();
    safeSet(storage,KEYS.sessionId,id);
  }
  return id;
}

function sanitizeMetadata(detail={}){
  const out={};
  if(detail.metadata && typeof detail.metadata==="object" && !Array.isArray(detail.metadata)){
    const blocked=new Set([
      "studentname","student_name","learnername","learner_name",
      "name","email","studentemail","student_email","learneremail","learner_email",
      "answer","answers","response","responses","ip","ipaddress","ip_address","password",
      "stack","stacktrace","stack_trace"
    ]);
    for(const [k,v] of Object.entries(detail.metadata)){
      const normalizedKey=String(k).replace(/[\s-]+/g,"").toLowerCase();
      if(blocked.has(normalizedKey) || blocked.has(String(k).toLowerCase()))continue;
      if(v===null || ["string","number","boolean"].includes(typeof v)){
        out[String(k).slice(0,64)]=typeof v==="string"?v.slice(0,240):v;
      }
    }
  }
  for(const key of ["feedbackMode"]){
    const v=detail[key];
    if(v!==undefined && v!==null)out[key]=String(v).slice(0,64);
  }
  return out;
}


export function sanitizeErrorMessage(value){
  let text=String(value??"").trim();
  if(!text)return "Unknown client error";

  text=text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,"[id]")
    .replace(/https?:\/\/[^\s)]+/gi,"[url]")
    .replace(/\b\d{7,}\b/g,"[number]")
    .replace(/(["'`])([^"'`]{48,})\1/g,'$1[redacted]$1')
    .replace(/\s+/g," ")
    .slice(0,180);

  return text||"Unknown client error";
}

function safeSourceFile(value){
  if(!value)return "";
  try{
    const url=new URL(String(value),location.href);
    return (url.pathname.split("/").filter(Boolean).pop()||"resource").slice(0,100);
  }catch{
    return String(value).split(/[\\/]/).pop().split("?")[0].slice(0,100);
  }
}

function activeRouteId(){
  return document.querySelector(".view.active")?.id || "unknown";
}

function errorSignature(kind,message,source,line){
  return [kind,message,source,line||0].join("|");
}

function shouldReportError(signature){
  if(reportedErrorCount>=ERROR_LIMIT_PER_SESSION)return false;
  const now=Date.now();
  const prior=recentErrorSignatures.get(signature)||0;
  if(now-prior<ERROR_DEDUPE_MS)return false;

  recentErrorSignatures.set(signature,now);
  for(const [key,time] of recentErrorSignatures){
    if(now-time>ERROR_DEDUPE_MS*2)recentErrorSignatures.delete(key);
  }
  reportedErrorCount++;
  return true;
}

function reportClientError(kind,message,details={}){
  if(isLocalTestEnvironment())return false;

  const safeMessage=sanitizeErrorMessage(message);
  const source=safeSourceFile(details.source||"");
  const line=Number(details.line)||0;
  const column=Number(details.column)||0;
  const signature=errorSignature(kind,safeMessage,source,line);
  if(!shouldReportError(signature))return false;

  sendAnalyticsEvent("app_error",{
    route:details.route||activeRouteId(),
    metadata:{
      kind:String(kind||"error").slice(0,50),
      message:safeMessage,
      source,
      line,
      column,
      phase:String(details.phase||"runtime").slice(0,40)
    }
  });
  return true;
}

export function buildAnalyticsEvent(eventType,detail={},env={}){
  return {
    visitor_id:env.visitorId||getOrCreateVisitorId(),
    session_id:env.sessionId||getOrCreateSessionId(),
    event_type:normalizeId(eventType,80),
    route:normalizeId(detail.route||detail.viewId,120),
    course_id:normalizeId(detail.courseId,120),
    track_id:normalizeId(detail.trackId,120),
    module_id:normalizeId(detail.moduleId,160),
    exam_id:normalizeId(detail.examId,180),
    platform_version:normalizeId(env.version||currentVersion(),40),
    metadata:sanitizeMetadata(detail)
  };
}

async function sendAnalyticsEvent(eventType,detail={}){
  if(!eventType || isLocalTestEnvironment() || Date.now()<trackingDisabledUntil)return false;

  const payload=buildAnalyticsEvent(eventType,detail);

  try{
    const response=await fetch(EVENTS_ENDPOINT,{
      method:"POST",
      keepalive:true,
      headers:{
        apikey:SUPABASE_PUBLISHABLE_KEY,
        "Content-Type":"application/json",
        Prefer:"return=minimal"
      },
      body:JSON.stringify(payload)
    });
    if(!response.ok)throw new Error(`analytics insert ${response.status}`);
    trackingFailureLogged=false;
    return true;
  }catch(error){
    trackingDisabledUntil=Date.now()+60_000;
    if(!trackingFailureLogged){
      trackingFailureLogged=true;
      console.warn("Anonymous analytics is unavailable. Learning features are unaffected.",error);
    }
    return false;
  }
}

export function rangeStartFor(range,now=new Date()){
  const d=new Date(now);
  if(range==="all")return null;
  if(range==="today"){
    d.setHours(0,0,0,0);
    return d;
  }
  if(range==="7d"){
    d.setDate(d.getDate()-6);
    d.setHours(0,0,0,0);
    return d;
  }
  if(range==="30d"){
    d.setDate(d.getDate()-29);
    d.setHours(0,0,0,0);
    return d;
  }
  return null;
}

function dayKey(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "Unknown";
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,"0");
  const day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function fmtDateShort(key){
  if(key==="Unknown")return key;
  const [y,m,d]=key.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric"}).format(new Date(y,m-1,d));
}

function fmtTime(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return "—";
  return new Intl.DateTimeFormat(undefined,{
    month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"
  }).format(d);
}

function distinct(values){
  return new Set(values.filter(Boolean)).size;
}

function countBy(items,keyFn){
  const map=new Map();
  for(const item of items){
    const key=keyFn(item);
    if(!key)continue;
    map.set(key,(map.get(key)||0)+1);
  }
  return [...map.entries()].sort((a,b)=>b[1]-a[1]);
}

export function buildTrendSeries(events){
  const grouped=new Map();
  for(const e of events){
    const key=dayKey(e.created_at);
    if(!grouped.has(key))grouped.set(key,{date:key,visitors:new Set(),sessions:new Set()});
    const row=grouped.get(key);
    if(e.visitor_id)row.visitors.add(e.visitor_id);
    if(e.session_id)row.sessions.add(e.session_id);
  }
  return [...grouped.values()]
    .map(x=>({date:x.date,visitors:x.visitors.size,sessions:x.sessions.size}))
    .sort((a,b)=>a.date.localeCompare(b.date));
}

export function aggregateAnalytics(events){
  const clean=Array.isArray(events)?events:[];
  const visitorIds=clean.map(x=>x.visitor_id).filter(Boolean);
  const sessionIds=clean.map(x=>x.session_id).filter(Boolean);

  const visitorSessions=new Map();
  for(const e of clean){
    if(!e.visitor_id||!e.session_id)continue;
    if(!visitorSessions.has(e.visitor_id))visitorSessions.set(e.visitor_id,new Set());
    visitorSessions.get(e.visitor_id).add(e.session_id);
  }

  const returning=[...visitorSessions.values()].filter(s=>s.size>=2).length;

  const eventCount=type=>clean.filter(e=>e.event_type===type).length;
  const examStarts=eventCount("exam_start");
  const examCompletions=eventCount("exam_complete");
  const practiceStarts=eventCount("practice_start");
  const practiceCompletions=eventCount("practice_complete");
  const studyOpens=eventCount("study_open");
  const trackOpens=eventCount("track_open");
  const pageViews=eventCount("page_view");

  const trackUsage=countBy(
    clean.filter(e=>["track_open","study_open","practice_start","exam_start"].includes(e.event_type)),
    e=>e.track_id
  );

  const latestByVisitor=new Map();
  for(const e of clean){
    if(!e.visitor_id)continue;
    const prev=latestByVisitor.get(e.visitor_id);
    if(!prev || new Date(e.created_at)>new Date(prev.created_at))latestByVisitor.set(e.visitor_id,e);
  }
  const versions=countBy([...latestByVisitor.values()],e=>e.platform_version||"unknown");

  const qbankViews=clean.filter(e=>e.event_type==="page_view" && /^official/i.test(String(e.route||""))).length;
  const officialPractice=clean.filter(e=>e.event_type==="practice_start" && e.metadata?.official===true).length;
  const officialExams=clean.filter(e=>e.event_type==="exam_start" && e.metadata?.official===true).length;

  const errorEvents=clean.filter(e=>e.event_type==="app_error");
  const errorSessions=distinct(errorEvents.map(e=>e.session_id));
  const totalSessions=distinct(sessionIds);
  const errorFreeRate=totalSessions
    ?Math.max(0,Math.round(((totalSessions-errorSessions)/totalSessions)*100))
    :100;
  const errorKinds=countBy(errorEvents,e=>e.metadata?.kind||"error");

  return {
    visitors:distinct(visitorIds),
    sessions:distinct(sessionIds),
    returning,
    pageViews,
    studyOpens,
    trackOpens,
    practiceStarts,
    practiceCompletions,
    examStarts,
    examCompletions,
    completionRate:examStarts?Math.round((examCompletions/examStarts)*100):0,
    trackUsage,
    versions,
    qbank:{
      views:qbankViews,
      practiceStarts:officialPractice,
      examStarts:officialExams
    },
    updates:{
      seen:eventCount("update_seen"),
      installed:eventCount("update_installed")
    },
    health:{
      errors:errorEvents.length,
      affectedSessions:errorSessions,
      errorFreeRate,
      errorKinds,
      recent:[...errorEvents].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,12)
    },
    trend:buildTrendSeries(clean)
  };
}

async function authFetch(url,options={},retry=true){
  const session=await ensureAdminSession();
  if(!session?.access_token)throw new Error("Admin login required.");

  const response=await fetch(url,{
    ...options,
    headers:{
      apikey:SUPABASE_PUBLISHABLE_KEY,
      Authorization:`Bearer ${session.access_token}`,
      ...(options.headers||{})
    }
  });

  if(response.status===401 && retry && session.refresh_token){
    const refreshed=await refreshAdminSession(session.refresh_token);
    if(refreshed)return authFetch(url,options,false);
  }

  if(!response.ok){
    const text=await response.text().catch(()=> "");
    throw new Error(`Supabase admin request failed (${response.status})${text?`: ${text}`:""}`);
  }
  return response;
}

function sessionExpiryMs(session){
  const expiresAt=Number(session?.expires_at||0);
  if(expiresAt>10_000_000_000)return expiresAt;
  if(expiresAt)return expiresAt*1000;
  return 0;
}

function saveAdminSession(session){
  if(!session)return;
  const expiresAt=session.expires_at || Math.floor(Date.now()/1000)+(Number(session.expires_in)||3600);
  adminSession={...session,expires_at:expiresAt};
  safeSet(localStorage,KEYS.adminSession,JSON.stringify(adminSession));
}

function clearAdminSession(){
  adminSession=null;
  adminVerified=false;
  safeRemove(localStorage,KEYS.adminSession);
  byId("adminProfileTools")?.classList.add("hidden");
  byId("adminProfileTools")?.setAttribute("aria-hidden","true");
  window.__DIGILIANS_ADMIN_VERIFIED__=false;
}

function loadAdminSession(){
  if(adminSession)return adminSession;
  const raw=safeGet(localStorage,KEYS.adminSession);
  if(!raw)return null;
  try{
    adminSession=JSON.parse(raw);
    return adminSession;
  }catch{
    clearAdminSession();
    return null;
  }
}

async function refreshAdminSession(refreshToken){
  try{
    const response=await fetch(`${AUTH_TOKEN_ENDPOINT}?grant_type=refresh_token`,{
      method:"POST",
      headers:{
        apikey:SUPABASE_PUBLISHABLE_KEY,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({refresh_token:refreshToken})
    });
    if(!response.ok)throw new Error(`refresh ${response.status}`);
    const data=await response.json();
    saveAdminSession(data);
    return adminSession;
  }catch(error){
    console.warn("Analytics admin session refresh failed.",error);
    clearAdminSession();
    return null;
  }
}

async function ensureAdminSession(){
  const session=loadAdminSession();
  if(!session)return null;
  if(sessionExpiryMs(session)-Date.now()<90_000){
    return refreshAdminSession(session.refresh_token);
  }
  return session;
}

async function signInAdmin(email,password){
  const response=await fetch(`${AUTH_TOKEN_ENDPOINT}?grant_type=password`,{
    method:"POST",
    headers:{
      apikey:SUPABASE_PUBLISHABLE_KEY,
      "Content-Type":"application/json"
    },
    body:JSON.stringify({email,password})
  });

  if(!response.ok){
    const data=await response.json().catch(()=>({}));
    throw new Error(data.error_description||data.msg||data.message||"Invalid admin email or password.");
  }

  const data=await response.json();
  saveAdminSession(data);

  const allowed=await verifyAdminAccess();
  if(!allowed){
    clearAdminSession();
    throw new Error("This account is signed in, but it is not approved as an Analytics Admin.");
  }
  return adminSession;
}

async function verifyAdminAccess(){
  const session=await ensureAdminSession();
  if(!session)return false;
  try{
    const response=await authFetch(`${ADMINS_ENDPOINT}?select=email&limit=1`,{},false);
    const rows=await response.json();
    adminVerified=Array.isArray(rows)&&rows.length>0;
    if(adminVerified){
      byId("adminProfileTools")?.classList.remove("hidden");
      byId("adminProfileTools")?.setAttribute("aria-hidden","false");
      window.__DIGILIANS_ADMIN_VERIFIED__=true;
      const identity=byId("analyticsAdminIdentity");
      if(identity)identity.textContent=session.user?.email||"Approved Admin";
    }
    return adminVerified;
  }catch(error){
    console.warn("Analytics admin verification failed.",error);
    adminVerified=false;
    byId("adminProfileTools")?.classList.add("hidden");
    byId("adminProfileTools")?.setAttribute("aria-hidden","true");
    window.__DIGILIANS_ADMIN_VERIFIED__=false;
    return false;
  }
}

async function signOutAdmin(){
  const session=loadAdminSession();
  try{
    if(session?.access_token){
      await fetch(`${SUPABASE_URL}/auth/v1/logout`,{
        method:"POST",
        headers:{
          apikey:SUPABASE_PUBLISHABLE_KEY,
          Authorization:`Bearer ${session.access_token}`
        }
      });
    }
  }catch{}
  clearAdminSession();
}

function setGate(message,type="info"){
  const gate=byId("analyticsGate");
  if(!gate)return;
  gate.classList.remove("hidden");
  gate.innerHTML=`
    <div class="status-card ${type}">
      <div class="status-icon">${type==="danger"?"!":"⌁"}</div>
      <div><strong>${escapeHtml(message.title)}</strong><p>${escapeHtml(message.text)}</p></div>
    </div>`;
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

async function fetchAnalyticsEvents(range){
  const start=rangeStartFor(range);
  const fields=[
    "visitor_id","session_id","event_type","route","course_id","track_id",
    "module_id","exam_id","platform_version","metadata","created_at"
  ].join(",");

  const rows=[];
  let offset=0;
  const limit=1000;

  while(true){
    const params=new URLSearchParams({
      select:fields,
      order:"created_at.asc",
      limit:String(limit),
      offset:String(offset)
    });
    if(start)params.set("created_at",`gte.${start.toISOString()}`);

    const response=await authFetch(`${EVENTS_ENDPOINT}?${params.toString()}`);
    const page=await response.json();
    rows.push(...page);
    if(page.length<limit)break;
    offset+=limit;
    if(offset>50_000)break;
  }

  return rows;
}

function renderKpis(summary){
  const pairs={
    analyticsVisitors:summary.visitors,
    analyticsSessions:summary.sessions,
    analyticsReturning:summary.returning,
    analyticsPageViews:summary.pageViews,
    analyticsExamCompletions:summary.examCompletions,
    analyticsCompletionRate:`${summary.completionRate}%`
  };
  for(const [id,value] of Object.entries(pairs)){
    const el=byId(id);
    if(el)el.textContent=String(value);
  }
}

function renderTrend(summary){
  const el=byId("analyticsTrendChart");
  if(!el)return;
  const data=summary.trend;
  if(!data.length){
    el.innerHTML=`<div class="analytics-empty">No activity in this range yet.</div>`;
    return;
  }

  const max=Math.max(1,...data.flatMap(x=>[x.visitors,x.sessions]));
  el.innerHTML=`
    <div class="analytics-chart-legend">
      <span><i class="visitors"></i>Visitors</span>
      <span><i class="sessions"></i>Sessions</span>
    </div>
    <div class="analytics-bar-chart">
      ${data.map(row=>{
        const vh=Math.max(3,Math.round(row.visitors/max*100));
        const sh=Math.max(3,Math.round(row.sessions/max*100));
        return `<div class="analytics-day-column" title="${escapeHtml(row.date)} • ${row.visitors} visitors • ${row.sessions} sessions">
          <div class="analytics-day-bars">
            <i class="visitors" style="height:${vh}%"></i>
            <i class="sessions" style="height:${sh}%"></i>
          </div>
          <span>${escapeHtml(fmtDateShort(row.date))}</span>
        </div>`;
      }).join("")}
    </div>`;
}

function renderFunnel(summary){
  const el=byId("analyticsLearningFunnel");
  if(!el)return;
  const items=[
    ["Study Opens",summary.studyOpens],
    ["Practice Starts",summary.practiceStarts],
    ["Practice Completes",summary.practiceCompletions],
    ["Exam Starts",summary.examStarts],
    ["Exam Completes",summary.examCompletions]
  ];
  const max=Math.max(1,...items.map(x=>x[1]));
  el.innerHTML=items.map(([label,value])=>`
    <div class="analytics-funnel-row">
      <div><span>${escapeHtml(label)}</span><strong>${value}</strong></div>
      <div class="analytics-funnel-track"><i style="width:${Math.round(value/max*100)}%"></i></div>
    </div>`).join("");
}

function renderRankedBars(id,items,labelFn=(x)=>x){
  const el=byId(id);
  if(!el)return;
  if(!items.length){
    el.innerHTML=`<div class="analytics-empty">No activity in this range yet.</div>`;
    return;
  }
  const max=Math.max(1,...items.map(x=>x[1]));
  el.innerHTML=items.slice(0,8).map(([key,value],index)=>`
    <div class="analytics-ranked-row">
      <span class="analytics-rank-number">${index+1}</span>
      <div class="analytics-ranked-main">
        <div><strong>${escapeHtml(labelFn(key))}</strong><span>${value}</span></div>
        <div class="analytics-ranked-track"><i style="width:${Math.round(value/max*100)}%"></i></div>
      </div>
    </div>`).join("");
}

function renderVersions(summary){
  const el=byId("analyticsVersionUsage");
  if(!el)return;
  if(!summary.versions.length){
    el.innerHTML=`<div class="analytics-empty">No version data yet.</div>`;
    return;
  }
  const total=summary.versions.reduce((s,x)=>s+x[1],0)||1;
  el.innerHTML=summary.versions.slice(0,8).map(([version,count],index)=>`
    <div class="analytics-version-row">
      <div>
        <span class="analytics-version-dot ${index===0?"current":""}"></span>
        <strong>${escapeHtml(displayBuildVersion(version))}</strong>
      </div>
      <span>${count} visitor${count===1?"":"s"}</span>
      <b>${Math.round(count/total*100)}%</b>
    </div>`).join("");
}

function renderMiniStats(id,items){
  const el=byId(id);
  if(!el)return;
  el.innerHTML=items.map(([label,value])=>`
    <div><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`).join("");
}


function renderHealth(summary){
  const health=summary.health||{errors:0,affectedSessions:0,errorFreeRate:100,recent:[]};

  const pairs={
    analyticsErrorEvents:health.errors,
    analyticsAffectedSessions:health.affectedSessions,
    analyticsErrorFreeRate:`${health.errorFreeRate}%`
  };
  for(const [id,value] of Object.entries(pairs)){
    const el=byId(id);
    if(el)el.textContent=String(value);
  }

  const list=byId("analyticsRecentErrors");
  if(!list)return;

  if(!health.recent.length){
    list.innerHTML=`
      <div class="analytics-health-empty">
        <span>✓</span>
        <div><strong>No tracked client errors</strong><p>No app errors were reported in the selected range.</p></div>
      </div>`;
    return;
  }

  list.innerHTML=health.recent.map(e=>{
    const meta=e.metadata||{};
    return `
      <div class="analytics-error-row">
        <span class="analytics-error-mark">!</span>
        <div class="analytics-error-main">
          <div>
            <strong>${escapeHtml(meta.kind||"error")}</strong>
            <span>${escapeHtml(fmtTime(e.created_at))}</span>
          </div>
          <p>${escapeHtml(meta.message||"Unknown client error")}</p>
          <small>${escapeHtml(ROUTE_LABELS[e.route]||e.route||"Unknown route")}${meta.source?` • ${escapeHtml(meta.source)}`:""}${meta.line?`:${Number(meta.line)}`:""} • ${escapeHtml(displayBuildVersion(e.platform_version))}</small>
        </div>
      </div>`;
  }).join("");
}

function recentContext(e){
  if(e.track_id)return TRACK_LABELS[e.track_id]||e.track_id;
  if(e.route)return ROUTE_LABELS[e.route]||e.route;
  if(e.exam_id)return e.exam_id;
  return "—";
}

function renderRecent(events){
  const el=byId("analyticsRecentEvents");
  if(!el)return;
  const rows=[...events].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,18);
  if(!rows.length){
    el.innerHTML=`<div class="analytics-empty">No events in this range yet.</div>`;
    return;
  }
  el.innerHTML=rows.map(e=>`
    <div class="analytics-table-row">
      <span>${escapeHtml(fmtTime(e.created_at))}</span>
      <strong>${escapeHtml(EVENT_LABELS[e.event_type]||e.event_type||"Event")}</strong>
      <span>${escapeHtml(recentContext(e))}</span>
      <span>${escapeHtml(displayBuildVersion(e.platform_version))}</span>
    </div>`).join("");
}

function rangeLabel(range){
  return range==="today"?"Today":range==="7d"?"Last 7 Days":range==="30d"?"Last 30 Days":"All Time";
}

async function renderAnalyticsDashboard(range=activeRange){
  if(renderingDashboard)return;
  renderingDashboard=true;
  activeRange=range;

  setGate({
    title:"Loading private analytics…",
    text:"Reading anonymous events through your authenticated Supabase admin session."
  },"info");
  byId("analyticsDashboard")?.classList.add("hidden");

  try{
    if(!adminVerified){
      const allowed=await verifyAdminAccess();
      if(!allowed){
        setGate({
          title:"Admin login required",
          text:"Use the private admin login to access this dashboard."
        },"info");
        openLoginModal();
        return;
      }
    }

    const events=await fetchAnalyticsEvents(range);
    lastFetchedEvents=events;
    const summary=aggregateAnalytics(events);

    renderKpis(summary);
    renderTrend(summary);
    renderFunnel(summary);
    renderRankedBars("analyticsTrackUsage",summary.trackUsage,key=>TRACK_LABELS[key]||key);
    renderVersions(summary);
    renderMiniStats("analyticsQbankUsage",[
      ["QBank Page Views",summary.qbank.views],
      ["Official Practice Starts",summary.qbank.practiceStarts],
      ["Official Exam Starts",summary.qbank.examStarts]
    ]);
    renderMiniStats("analyticsUpdateUsage",[
      ["Update Notices Seen",summary.updates.seen],
      ["Update Installs",summary.updates.installed]
    ]);
    renderHealth(summary);
    renderRecent(events);

    byId("analyticsLastUpdated").textContent=new Intl.DateTimeFormat(undefined,{
      hour:"2-digit",minute:"2-digit",second:"2-digit"
    }).format(new Date());
    byId("analyticsTrendLabel").textContent=rangeLabel(range);

    document.querySelectorAll("[data-analytics-range]").forEach(btn=>{
      btn.classList.toggle("active",btn.dataset.analyticsRange===range);
    });

    byId("analyticsGate")?.classList.add("hidden");
    byId("analyticsDashboard")?.classList.remove("hidden");
  }catch(error){
    console.error("Analytics dashboard load failed.",error);
    setGate({
      title:"Analytics could not be loaded",
      text:"Check your admin session and confirm the Supabase Analytics SQL setup has been run."
    },"danger");
  }finally{
    renderingDashboard=false;
  }
}

function openLoginModal(){
  const modal=byId("analyticsLoginModal");
  if(!modal)return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  byId("analyticsLoginError").textContent="";
  setTimeout(()=>byId("analyticsLoginEmail")?.focus(),40);
}

function closeLoginModal(){
  const modal=byId("analyticsLoginModal");
  if(!modal)return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
  byId("analyticsLoginError").textContent="";
  const pass=byId("analyticsLoginPassword");
  if(pass)pass.value="";
}

async function handleAdminLogin(){
  const email=String(byId("analyticsLoginEmail")?.value||"").trim();
  const password=String(byId("analyticsLoginPassword")?.value||"");
  const error=byId("analyticsLoginError");
  const button=byId("analyticsLoginBtn");

  if(!email||!password){
    error.textContent="Enter the approved admin email and password.";
    return;
  }

  button.disabled=true;
  button.textContent="Signing in…";
  error.textContent="";

  try{
    await signInAdmin(email,password);
    closeLoginModal();
    byId("adminProfileTools")?.classList.remove("hidden");
    byId("adminProfileTools")?.setAttribute("aria-hidden","false");
    window.__DIGILIANS_ADMIN_VERIFIED__=true;
    await openAnalyticsRouteWhenReady();
  }catch(err){
    error.textContent=err.message||"Admin login failed.";
  }finally{
    button.disabled=false;
    button.textContent="Sign In to Analytics →";
  }
}

async function openAnalyticsRouteWhenReady(){
  for(let i=0;i<40;i++){
    const btn=byId("openAnalyticsBtn");
    if(window.__DIGILIANS_APP_READY__ && btn){
      byId("adminProfileTools")?.classList.remove("hidden");
      byId("adminProfileTools")?.setAttribute("aria-hidden","false");
      window.__DIGILIANS_ADMIN_VERIFIED__=true;
      btn.click();
      return;
    }
    await new Promise(r=>setTimeout(r,100));
  }
}

function cleanAdminQuery(){
  try{
    const url=new URL(window.location.href);
    if(url.searchParams.get("admin")==="analytics"){
      url.searchParams.delete("admin");
      history.replaceState(null,"",url.pathname+(url.search?url.search:"")+url.hash);
    }
  }catch{}
}

async function initializeAdminAccess(){
  const wantsAdmin=(()=>{
    try{return new URL(window.location.href).searchParams.get("admin")==="analytics"}catch{return false}
  })();

  if(loadAdminSession()){
    const allowed=await verifyAdminAccess();
    if(allowed && wantsAdmin){
      cleanAdminQuery();
      await openAnalyticsRouteWhenReady();
      return;
    }
  }

  if(wantsAdmin){
    cleanAdminQuery();
    openLoginModal();
  }
}

function bindAdminUi(){
  byId("analyticsLoginBtn")?.addEventListener("click",handleAdminLogin);
  byId("analyticsLoginCloseBtn")?.addEventListener("click",closeLoginModal);
  byId("analyticsLoginModal")?.addEventListener("click",e=>{
    if(e.target===byId("analyticsLoginModal"))closeLoginModal();
  });
  byId("analyticsLoginPassword")?.addEventListener("keydown",e=>{
    if(e.key==="Enter")handleAdminLogin();
    if(e.key==="Escape")closeLoginModal();
  });
  byId("analyticsLoginEmail")?.addEventListener("keydown",e=>{
    if(e.key==="Enter")byId("analyticsLoginPassword")?.focus();
    if(e.key==="Escape")closeLoginModal();
  });

  byId("analyticsRefreshBtn")?.addEventListener("click",()=>renderAnalyticsDashboard(activeRange));
  byId("analyticsLogoutBtn")?.addEventListener("click",async()=>{
    await signOutAdmin();
    byId("analyticsDashboard")?.classList.add("hidden");
    setGate({
      title:"Admin session ended",
      text:"Sign in again to view private platform analytics."
    },"info");
    byId("brandHome")?.click();
  });

  document.querySelectorAll("[data-analytics-range]").forEach(btn=>{
    btn.addEventListener("click",()=>renderAnalyticsDashboard(btn.dataset.analyticsRange));
  });

  window.addEventListener("digilians:routechange",e=>{
    if(e.detail?.viewId==="analyticsView"){
      renderAnalyticsDashboard(activeRange);
    }
  });
}

function bindTracking(){
  window.addEventListener("error",event=>{
    const target=event.target;
    if(target && target!==window && !event.error){
      const tag=String(target.tagName||"resource").toLowerCase();
      const source=target.src||target.href||"";
      reportClientError("resource_error",`Failed to load ${tag}`,{
        source,
        phase:window.__DIGILIANS_APP_READY__?"runtime":"startup"
      });
      return;
    }

    if(event.error || event.message){
      reportClientError(event.error?.name||"javascript_error",event.message||event.error?.message,{
        source:event.filename,
        line:event.lineno,
        column:event.colno,
        phase:window.__DIGILIANS_APP_READY__?"runtime":"startup"
      });
    }
  },true);

  window.addEventListener("unhandledrejection",event=>{
    const reason=event.reason;
    reportClientError(reason?.name||"unhandled_rejection",reason?.message||String(reason||"Unhandled promise rejection"),{
      phase:window.__DIGILIANS_APP_READY__?"runtime":"startup"
    });
  });

  window.addEventListener("digilians:client-error",event=>{
    const d=event.detail||{};
    reportClientError(d.kind||"handled_error",d.message||"Handled application error",{
      source:d.source,
      line:d.line,
      column:d.column,
      route:d.route,
      phase:d.phase||"runtime"
    });
  });

  window.addEventListener("digilians:routechange",e=>{
    const viewId=e.detail?.viewId;
    if(!viewId || viewId==="analyticsView")return;
    sendAnalyticsEvent("page_view",{route:viewId});
  });

  window.addEventListener("digilians:analytics",e=>{
    const detail=e.detail||{};
    if(!detail.eventType)return;
    const {eventType,...rest}=detail;
    sendAnalyticsEvent(eventType,rest);
  });

  window.addEventListener("online",()=>{
    trackingDisabledUntil=0;
  });
}

async function initAnalytics(){
  bindTracking();
  bindAdminUi();

  // Anonymous session tracking is fire-and-forget so analytics can never delay platform/admin UI startup.
  // No learner name/email/IP/question answers are read by this tracking path.
  sendAnalyticsEvent("session_start",{route:"platform_start"});

  initializeAdminAccess().catch(error=>{
    console.warn("Analytics admin initialization skipped.",error);
  });

  window.__DIGILIANS_ANALYTICS_READY__=true;
}

if(typeof window!=="undefined" && typeof document!=="undefined"){
  initAnalytics().catch(error=>{
    console.warn("Analytics module failed safely. Learning remains available.",error);
  });
}

export const analyticsTestApi={
  sanitizeMetadata,
  countBy,
  dayKey,
  TRACK_LABELS,
  ROUTE_LABELS,
  EVENT_LABELS,
  isLocalTestEnvironment,
  currentVersion,
  displayBuildVersion,
  sanitizeErrorMessage,
  reportClientError
};
