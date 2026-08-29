
const UPDATE_KEYS={
  seenVersion:"digilians.whatsNew.seenVersion",
  sessionDismissPrefix:"digilians.update.dismissed."
};

const CHECK_INTERVAL_MS=5*60*1000;
const FOCUS_RECHECK_MS=60*1000;

const FALLBACK_RELEASE={
  version:"0.18.2",
  title:"Live Update & What’s New System",
  date:"2026-08-29",
  summary:"Automatic update notifications and in-platform release notes are now available.",
  highlights:[
    "Automatic update checks every 5 minutes.",
    "Safe updates that never force-reload an active exam.",
    "What’s New appears once per installed version.",
    "Recent release history is available from Profile and Footer."
  ],
  type:"feature"
};

export function normalizeVersion(value){
  const raw=String(value??"").trim().replace(/^v/i,"");
  const match=raw.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if(!match)return null;
  return {
    raw:`${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`,
    parts:[Number(match[1]),Number(match[2]),Number(match[3])]
  };
}

export function compareVersions(a,b){
  const va=normalizeVersion(a),vb=normalizeVersion(b);
  if(!va||!vb)return 0;
  for(let i=0;i<3;i++){
    if(va.parts[i]>vb.parts[i])return 1;
    if(va.parts[i]<vb.parts[i])return -1;
  }
  return 0;
}

export function parseVersionText(text){
  const first=String(text??"").split(/\r?\n/).map(x=>x.trim()).find(Boolean)||"";
  return normalizeVersion(first)?.raw || null;
}

export function buildUpdateUrl(locationLike,latestVersion,now=Date.now()){
  const origin=locationLike.origin && locationLike.origin!=="null"?locationLike.origin:"";
  const path=locationLike.pathname || "/";
  const url=new URL(`${origin}${path}`,origin || "http://localhost");
  url.searchParams.set("updated",String(latestVersion));
  url.searchParams.set("_",String(now));
  return origin?url.href:`${path}${url.search}`;
}

function currentBuildVersion(){
  return normalizeVersion(document.documentElement.dataset.buildVersion)?.raw || FALLBACK_RELEASE.version;
}

function isExamActive(){
  return Boolean(window.__DIGILIANS_EXAM_ACTIVE__) ||
    Boolean(document.getElementById("examView")?.classList.contains("active"));
}

function byId(id){return document.getElementById(id)}

function safeStorageGet(storage,key){
  try{return storage.getItem(key)}catch{return null}
}
function safeStorageSet(storage,key,value){
  try{storage.setItem(key,value)}catch{}
}
function safeStorageRemove(storage,key){
  try{storage.removeItem(key)}catch{}
}

function releaseForVersion(data,version){
  return data?.releases?.find(x=>normalizeVersion(x.version)?.raw===normalizeVersion(version)?.raw) || null;
}

async function fetchNoCache(path){
  const joiner=path.includes("?")?"&":"?";
  const response=await fetch(`${path}${joiner}_update=${Date.now()}`,{
    cache:"no-store",
    headers:{
      "Cache-Control":"no-cache, no-store, max-age=0",
      "Pragma":"no-cache"
    }
  });
  if(!response.ok)throw new Error(`${path} returned ${response.status}`);
  return response;
}

async function fetchLatestVersion(){
  const response=await fetchNoCache("./VERSION.txt");
  return parseVersionText(await response.text());
}

async function fetchChangelog(){
  try{
    const response=await fetchNoCache("./data/changelog.json");
    const data=await response.json();
    if(!Array.isArray(data?.releases))throw new Error("Invalid changelog");
    return data;
  }catch(error){
    console.warn("Changelog unavailable; using bundled release note.",error);
    return {latest:FALLBACK_RELEASE.version,releases:[FALLBACK_RELEASE]};
  }
}

function updateFooterStatus(latest,current){
  const text=byId("footerVersionText");
  const dot=byId("footerUpdateDot");
  const profile=byId("profileVersionBadge");
  if(text)text.textContent=`V${current}`;
  if(profile)profile.textContent=`V${current}`;
  const updateAvailable=latest && compareVersions(latest,current)>0;
  dot?.classList.toggle("hidden",!updateAvailable);
  profile?.classList.toggle("update-available",Boolean(updateAvailable));
}

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function renderReleaseCard(release,{latest=false}={}){
  if(!release)return "";
  const badge=release.type==="fix"?"FIX & RELIABILITY":release.type==="learning"?"LEARNING UPGRADE":"NEW FEATURE";
  return `
    <article class="whats-new-release ${latest?"latest":""}">
      <div class="whats-new-release-head">
        <div>
          <span>${badge}</span>
          <h3>${escapeHtml(release.title||`Version ${release.version}`)}</h3>
        </div>
        <b>V${escapeHtml(release.version||"")}</b>
      </div>
      ${release.summary?`<p>${escapeHtml(release.summary)}</p>`:""}
      <ul>${(release.highlights||[]).map(item=>`<li><span>✓</span><p>${escapeHtml(item)}</p></li>`).join("")}</ul>
      ${release.date?`<small>${escapeHtml(release.date)}</small>`:""}
    </article>`;
}

function markCurrentVersionSeen(){
  safeStorageSet(localStorage,UPDATE_KEYS.seenVersion,currentBuildVersion());
}

async function openWhatsNew({version=null,markSeen=false}={}){
  const modal=byId("whatsNewModal");
  if(!modal)return;
  const data=await fetchChangelog();
  const current=currentBuildVersion();
  const target=version || current;
  const release=releaseForVersion(data,target) || (target===FALLBACK_RELEASE.version?FALLBACK_RELEASE:null) || data.releases[0];

  byId("whatsNewVersion").textContent=`V${release?.version||target}`;
  byId("whatsNewSubtitle").textContent=release?.summary || "Latest improvements, fixes and learning upgrades.";
  byId("whatsNewLatest").innerHTML=renderReleaseCard(release,{latest:true});

  const history=(data.releases||[]).filter(x=>x.version!==release?.version).slice(0,5);
  byId("whatsNewHistoryList").innerHTML=history.length
    ?history.map(item=>renderReleaseCard(item)).join("")
    :`<p class="whats-new-empty">No previous release notes are available yet.</p>`;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("modal-open");

  if(markSeen)markCurrentVersionSeen();
}

function closeWhatsNew({markSeen=true}={}){
  const modal=byId("whatsNewModal");
  if(!modal)return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");
  if(markSeen)markCurrentVersionSeen();
}

function updateBannerForExamState(){
  const banner=byId("updateBanner");
  if(!banner || banner.classList.contains("hidden"))return;
  const button=byId("updateNowBtn");
  const title=byId("updateBannerTitle");
  const message=byId("updateBannerMessage");
  const latest=banner.dataset.latestVersion || "";

  if(isExamActive()){
    banner.classList.add("exam-deferred");
    if(title)title.textContent=`Update V${latest} is ready — finish your exam first.`;
    if(message)message.textContent="Your current attempt will not be interrupted. Update becomes available after submission.";
    if(button){
      button.textContent="Available After Exam";
      button.disabled=true;
    }
  }else{
    banner.classList.remove("exam-deferred");
    if(title)title.textContent=`New Update Available — V${latest}`;
    if(message)message.textContent=banner.dataset.releaseSummary || "New fixes and improvements are ready.";
    if(button){
      button.textContent="Update Now";
      button.disabled=false;
    }
  }
}

async function showUpdateBanner(latestVersion,changelog){
  const current=currentBuildVersion();
  if(compareVersions(latestVersion,current)<=0)return;

  updateFooterStatus(latestVersion,current);

  const dismissed=safeStorageGet(sessionStorage,`${UPDATE_KEYS.sessionDismissPrefix}${latestVersion}`);
  if(dismissed==="1")return;

  const banner=byId("updateBanner");
  if(!banner)return;
  const release=releaseForVersion(changelog,latestVersion);
  banner.dataset.latestVersion=latestVersion;
  banner.dataset.releaseSummary=release?.summary || "";
  byId("updateBannerEyebrow").textContent="NEW UPDATE AVAILABLE";
  banner.classList.remove("hidden");
  updateBannerForExamState();
}

async function clearAppCacheOnly(){
  if(!("caches" in window))return;
  try{
    const names=await caches.keys();
    await Promise.all(names.map(name=>caches.delete(name)));
  }catch(error){
    console.warn("Cache API cleanup skipped.",error);
  }
}

async function installLatestUpdate(){
  const banner=byId("updateBanner");
  const latest=banner?.dataset.latestVersion;
  if(!latest)return;

  if(isExamActive()){
    updateBannerForExamState();
    return;
  }

  const button=byId("updateNowBtn");
  if(button){
    button.disabled=true;
    button.textContent="Updating…";
  }

  try{
    await clearAppCacheOnly();
  }finally{
    // Intentionally preserves localStorage / Study progress / saved results.
    window.location.replace(buildUpdateUrl(window.location,latest));
  }
}

let lastCheckedAt=0;
let checking=false;
let knownLatest=null;
let knownChangelog=null;

async function checkForUpdates({force=false}={}){
  if(checking)return null;
  const now=Date.now();
  if(!force && now-lastCheckedAt<FOCUS_RECHECK_MS)return null;
  checking=true;
  lastCheckedAt=now;

  const current=currentBuildVersion();

  try{
    const [latest,changelog]=await Promise.all([
      fetchLatestVersion(),
      fetchChangelog()
    ]);
    knownLatest=latest;
    knownChangelog=changelog;

    updateFooterStatus(latest,current);

    if(latest && compareVersions(latest,current)>0){
      await showUpdateBanner(latest,changelog);
      return {current,latest,updateAvailable:true};
    }

    byId("updateBanner")?.classList.add("hidden");
    return {current,latest:latest||current,updateAvailable:false};
  }catch(error){
    console.warn("Update check failed. The platform will retry later.",error);
    updateFooterStatus(null,current);
    return {current,latest:null,updateAvailable:false,error};
  }finally{
    checking=false;
  }
}

async function maybeShowInstalledWhatsNew(updateState=null){
  const current=currentBuildVersion();
  const seen=safeStorageGet(localStorage,UPDATE_KEYS.seenVersion);
  if(seen===current)return;
  if(updateState?.updateAvailable)return;
  if(isExamActive())return;

  window.setTimeout(()=>{
    if(!isExamActive() && safeStorageGet(localStorage,UPDATE_KEYS.seenVersion)!==current){
      openWhatsNew({version:current,markSeen:false});
    }
  },900);
}

function bindUi(){
  byId("updateNowBtn")?.addEventListener("click",installLatestUpdate);

  byId("updateLaterBtn")?.addEventListener("click",()=>{
    const banner=byId("updateBanner");
    const latest=banner?.dataset.latestVersion;
    if(latest)safeStorageSet(sessionStorage,`${UPDATE_KEYS.sessionDismissPrefix}${latest}`,"1");
    banner?.classList.add("hidden");
  });

  byId("updateDetailsBtn")?.addEventListener("click",()=>{
    const latest=byId("updateBanner")?.dataset.latestVersion || knownLatest || currentBuildVersion();
    openWhatsNew({version:latest,markSeen:false});
  });

  ["openWhatsNewBtn","footerWhatsNewBtn"].forEach(id=>{
    byId(id)?.addEventListener("click",()=>{
      const current=currentBuildVersion();
      const target=knownLatest && compareVersions(knownLatest,current)>0?knownLatest:current;
      openWhatsNew({version:target,markSeen:false});
    });
  });

  byId("whatsNewGotItBtn")?.addEventListener("click",()=>closeWhatsNew({markSeen:true}));
  byId("whatsNewCloseBtn")?.addEventListener("click",()=>closeWhatsNew({markSeen:true}));

  byId("whatsNewModal")?.addEventListener("click",event=>{
    if(event.target===byId("whatsNewModal"))closeWhatsNew({markSeen:true});
  });

  document.addEventListener("keydown",event=>{
    if(event.key==="Escape" && !byId("whatsNewModal")?.classList.contains("hidden")){
      closeWhatsNew({markSeen:true});
    }
  });

  window.addEventListener("digilians:routechange",event=>{
    updateBannerForExamState();
    if(event.detail?.viewId==="resultView" && knownLatest && compareVersions(knownLatest,currentBuildVersion())>0){
      safeStorageRemove(sessionStorage,`${UPDATE_KEYS.sessionDismissPrefix}${knownLatest}`);
      showUpdateBanner(knownLatest,knownChangelog||{releases:[]});
    }
  });

  window.addEventListener("online",()=>checkForUpdates({force:true}));
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible")checkForUpdates();
  });
}

async function initUpdateManager(){
  bindUi();
  const current=currentBuildVersion();
  updateFooterStatus(null,current);

  const updateState=await checkForUpdates({force:true});
  await maybeShowInstalledWhatsNew(updateState);

  window.setInterval(()=>checkForUpdates({force:true}),CHECK_INTERVAL_MS);
  window.__DIGILIANS_UPDATE_MANAGER_READY__=true;
  window.dispatchEvent(new CustomEvent("digilians:update-manager-ready",{detail:{version:current}}));
}

if(typeof window!=="undefined" && typeof document!=="undefined"){
  initUpdateManager().catch(error=>{
    console.warn("Update manager could not initialize.",error);
  });
}

export const updateManagerTestApi={
  releaseForVersion,
  CHECK_INTERVAL_MS,
  FOCUS_RECHECK_MS
};
