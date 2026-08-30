
import {resolveBuildVersion} from "./build-version.js?v=0.20.4";

const BACKUP_FORMAT="digilians-progress-backup";
const BACKUP_SCHEMA_VERSION=1;
const MAX_BACKUP_BYTES=5*1024*1024;

export const BACKUP_KEYS=[
  "digilians.studentName",
  "digilians.playerId",
  "digilians.avatarProfile",
  "digilians.theme",
  "digilians.results",
  "digilians.examProgress",
  "digilians.lastCourse",
  "digilians.pendingAttempts",
  "digilians.officialQbank",
  "digilians.studyProgress",
  "digilians.quickChecks",
  "digilians.mistakes",
  "digilians_ranking_mode",
  "digilians_ranking_track_level",
  "digilians_ranking_track",
  "digilians_last_ranking_exam_id"
];

const JSON_KEYS=new Set([
  "digilians.results",
  "digilians.avatarProfile",
  "digilians.examProgress",
  "digilians.pendingAttempts",
  "digilians.officialQbank",
  "digilians.studyProgress",
  "digilians.quickChecks",
  "digilians.mistakes"
]);

const ARRAY_KEYS=new Set([
  "digilians.results",
  "digilians.pendingAttempts"
]);

const SENSITIVE_EXCLUDED_PREFIXES=[
  "digilians.analytics",
  "digilians.analyticsAdmin",
  "digilians.update",
  "digilians.whatsNew"
];

function byId(id){return document.getElementById(id)}

function safeGet(storage,key){
  try{return storage.getItem(key)}catch{return null}
}
function safeSet(storage,key,value){
  try{storage.setItem(key,value);return true}catch{return false}
}
function safeRemove(storage,key){
  try{storage.removeItem(key);return true}catch{return false}
}

function canonicalize(value){
  if(Array.isArray(value))return value.map(canonicalize);
  if(value && typeof value==="object"){
    const out={};
    for(const key of Object.keys(value).sort())out[key]=canonicalize(value[key]);
    return out;
  }
  return value;
}

function canonicalStringify(value){
  return JSON.stringify(canonicalize(value));
}

async function sha256Hex(text){
  const bytes=new TextEncoder().encode(text);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

function currentVersion(){
  return resolveBuildVersion(document,"unknown");
}

export function collectBackupData(storage=globalThis.localStorage){
  const data={};
  for(const key of BACKUP_KEYS){
    const value=safeGet(storage,key);
    if(value!==null)data[key]=value;
  }
  return data;
}

function parseJsonKey(key,raw){
  if(raw===null || raw===undefined)return null;
  try{
    const parsed=JSON.parse(raw);
    if(ARRAY_KEYS.has(key) && !Array.isArray(parsed))throw new Error(`${key} must contain an array`);
    if(!ARRAY_KEYS.has(key) && (parsed===null || typeof parsed!=="object" || Array.isArray(parsed))){
      throw new Error(`${key} must contain an object`);
    }
    return parsed;
  }catch(error){
    throw new Error(`Invalid saved data for ${key}`);
  }
}

export function summarizeBackupData(data={}){
  const parse=(key,fallback)=>{
    try{return data[key]?JSON.parse(data[key]):fallback}catch{return fallback}
  };

  const results=parse("digilians.results",[]);
  const study=parse("digilians.studyProgress",{users:{}});
  const quick=parse("digilians.quickChecks",{users:{}});
  const mistakes=parse("digilians.mistakes",{schemaVersion:1,owners:{}});
  const official=parse("digilians.officialQbank",{tracks:{}});
  const examProgress=parse("digilians.examProgress",null);

  let studyModules=0;
  for(const modules of Object.values(study?.users||{}))studyModules+=Object.keys(modules||{}).length;

  let quickChecks=0;
  for(const modules of Object.values(quick?.users||{})){
    for(const sections of Object.values(modules||{}))quickChecks+=Object.keys(sections||{}).length;
  }

  return {
    studentName:data["digilians.studentName"]||"",
    results:Array.isArray(results)?results.length:0,
    studyModules,
    quickChecks,
    mistakes:Object.values(mistakes?.owners||{}).reduce((sum,owner)=>sum+Object.keys(owner?.items||{}).length,0),
    officialTracks:Object.keys(official?.tracks||{}).length,
    hasExamProgress:Boolean(examProgress),
    keyCount:Object.keys(data).length
  };
}

export async function createBackupDocument(storage=globalThis.localStorage,options={}){
  const data=collectBackupData(storage);
  const base={
    format:BACKUP_FORMAT,
    schemaVersion:BACKUP_SCHEMA_VERSION,
    platformVersion:options.platformVersion||currentVersion(),
    exportedAt:options.exportedAt||new Date().toISOString(),
    data
  };
  const checksum=await sha256Hex(canonicalStringify(base));
  return {...base,checksum:`sha256:${checksum}`};
}

function validateScalar(key,value){
  if(typeof value!=="string")throw new Error(`Invalid value type for ${key}`);
  if(value.length>2_000_000)throw new Error(`Saved value is too large: ${key}`);

  if(key==="digilians.theme" && !["light","dark","system"].includes(value)){
    throw new Error("Invalid theme value");
  }
  if(key==="digilians.playerId" && value && !/^[0-9a-f-]{20,}$/i.test(value)){
    throw new Error("Invalid player ID");
  }
  if(key==="digilians_ranking_mode" && value && !["exam","track"].includes(value)){
    throw new Error("Invalid ranking mode");
  }
  if(JSON_KEYS.has(key))parseJsonKey(key,value);
}

export async function validateBackupDocument(doc,{verifyChecksum=true}={}){
  if(!doc || typeof doc!=="object" || Array.isArray(doc))throw new Error("Backup file must contain a JSON object.");
  if(doc.format!==BACKUP_FORMAT)throw new Error("This is not a Digilians progress backup.");
  if(Number(doc.schemaVersion)!==BACKUP_SCHEMA_VERSION)throw new Error(`Unsupported backup schema: ${doc.schemaVersion}`);
  if(!doc.data || typeof doc.data!=="object" || Array.isArray(doc.data))throw new Error("Backup data section is missing.");

  const unknownKeys=[];
  const acceptedData={};
  for(const [key,value] of Object.entries(doc.data)){
    if(!BACKUP_KEYS.includes(key)){
      unknownKeys.push(key);
      continue;
    }
    validateScalar(key,value);
    acceptedData[key]=value;
  }

  if(!Object.keys(acceptedData).length)throw new Error("The backup does not contain any supported learner progress.");

  if(verifyChecksum && doc.checksum){
    const expected=String(doc.checksum).replace(/^sha256:/,"");
    const base={
      format:doc.format,
      schemaVersion:doc.schemaVersion,
      platformVersion:doc.platformVersion,
      exportedAt:doc.exportedAt,
      data:doc.data
    };
    const actual=await sha256Hex(canonicalStringify(base));
    if(actual!==expected)throw new Error("Backup checksum does not match. The file may be corrupted or edited.");
  }

  return {
    valid:true,
    data:acceptedData,
    unknownKeys,
    summary:summarizeBackupData(acceptedData),
    platformVersion:String(doc.platformVersion||"unknown"),
    exportedAt:String(doc.exportedAt||"")
  };
}

function uniqBy(items,keyFn){
  const map=new Map();
  for(const item of items||[]){
    const key=keyFn(item);
    if(!map.has(key))map.set(key,item);
  }
  return [...map.values()];
}

function resultKey(item,index){
  return item?.clientAttemptId || item?.client_attempt_id ||
    [item?.examId,item?.studentName,item?.submittedAt,item?.score,index].join("|");
}
function pendingKey(item,index){
  return item?.client_attempt_id || item?.clientAttemptId || [item?.exam_id,item?.submitted_at,index].join("|");
}

function mergeStudyProgress(current,incoming){
  const out=structuredClone(current||{users:{}});
  out.users ||= {};
  for(const [user,modules] of Object.entries(incoming?.users||{})){
    out.users[user] ||= {};
    for(const [moduleId,record] of Object.entries(modules||{})){
      const cur=out.users[user][moduleId]||{};
      const curTime=Date.parse(cur.updatedAt||0)||0;
      const inTime=Date.parse(record?.updatedAt||0)||0;
      out.users[user][moduleId]={
        ...cur,
        ...record,
        completed:Boolean(cur.completed||record?.completed),
        completedSections:[...new Set([...(cur.completedSections||[]),...(record?.completedSections||[])])],
        lastSectionId:inTime>=curTime?(record?.lastSectionId??cur.lastSectionId):cur.lastSectionId,
        updatedAt:new Date(Math.max(curTime,inTime,Date.now())).toISOString()
      };
    }
  }
  return out;
}

function mergeQuickChecks(current,incoming){
  const out=structuredClone(current||{users:{}});
  out.users ||= {};
  for(const [user,modules] of Object.entries(incoming?.users||{})){
    out.users[user] ||= {};
    for(const [moduleId,sections] of Object.entries(modules||{})){
      out.users[user][moduleId] ||= {};
      for(const [sectionId,record] of Object.entries(sections||{})){
        const cur=out.users[user][moduleId][sectionId];
        if(!cur){
          out.users[user][moduleId][sectionId]=record;
          continue;
        }
        const curTime=Date.parse(cur.answeredAt||0)||0;
        const inTime=Date.parse(record?.answeredAt||0)||0;
        if(inTime>=curTime)out.users[user][moduleId][sectionId]=record;
      }
    }
  }
  return out;
}

function mergeOfficialQbank(current,incoming){
  const out=structuredClone(current||{tracks:{}});
  out.tracks ||= {};
  for(const [trackKey,record] of Object.entries(incoming?.tracks||{})){
    const cur=out.tracks[trackKey]||{};
    out.tracks[trackKey]={
      ...cur,
      ...record,
      reviewed:[...new Set([...(cur.reviewed||[]),...(record?.reviewed||[])])],
      bookmarks:[...new Set([...(cur.bookmarks||[]),...(record?.bookmarks||[])])],
      mistakes:[...new Set([...(cur.mistakes||[]),...(record?.mistakes||[])])],
      answers:{...(cur.answers||{}),...(record?.answers||{})},
      lastIndex:Math.max(Number(cur.lastIndex)||0,Number(record?.lastIndex)||0)
    };
  }
  return out;
}

function mergeMistakes(current,incoming){
  const out=structuredClone(current||{schemaVersion:1,owners:{}});
  out.schemaVersion=1;
  out.owners ||= {};
  for(const [ownerId,record] of Object.entries(incoming?.owners||{})){
    out.owners[ownerId] ||= {studentName:record?.studentName||"",items:{},updatedAt:null};
    const target=out.owners[ownerId];
    target.items ||= {};
    if(record?.studentName)target.studentName=record.studentName;
    for(const [key,item] of Object.entries(record?.items||{})){
      const cur=target.items[key];
      if(!cur){target.items[key]=item;continue}
      const curTime=Date.parse(cur.updatedAt||cur.lastAnsweredAt||0)||0;
      const inTime=Date.parse(item?.updatedAt||item?.lastAnsweredAt||0)||0;
      if(inTime>=curTime){
        target.items[key]={
          ...cur,
          ...item,
          wrongCount:Math.max(Number(cur.wrongCount)||0,Number(item?.wrongCount)||0),
          recoveryCorrectCount:Math.max(Number(cur.recoveryCorrectCount)||0,Number(item?.recoveryCorrectCount)||0)
        };
      }
    }
    const curOwnerTime=Date.parse(target.updatedAt||0)||0;
    const incomingTime=Date.parse(record?.updatedAt||0)||0;
    if(incomingTime>=curOwnerTime)target.updatedAt=record?.updatedAt||target.updatedAt;
  }
  return out;
}

function parsed(storage,key,fallback){
  try{
    const raw=safeGet(storage,key);
    return raw===null?fallback:JSON.parse(raw);
  }catch{return fallback}
}

export function mergeBackupIntoStorageData(currentData,incomingData){
  const out={...currentData};

  for(const key of BACKUP_KEYS){
    if(!(key in incomingData))continue;

    if(key==="digilians.results"){
      const current=(()=>{try{return JSON.parse(currentData[key]||"[]")}catch{return []}})();
      const incoming=JSON.parse(incomingData[key]||"[]");
      out[key]=JSON.stringify(uniqBy([...current,...incoming],resultKey));
      continue;
    }

    if(key==="digilians.pendingAttempts"){
      const current=(()=>{try{return JSON.parse(currentData[key]||"[]")}catch{return []}})();
      const incoming=JSON.parse(incomingData[key]||"[]");
      out[key]=JSON.stringify(uniqBy([...current,...incoming],pendingKey));
      continue;
    }

    if(key==="digilians.studyProgress"){
      const current=(()=>{try{return JSON.parse(currentData[key]||'{"users":{}}')}catch{return {users:{}}}})();
      out[key]=JSON.stringify(mergeStudyProgress(current,JSON.parse(incomingData[key])));
      continue;
    }

    if(key==="digilians.quickChecks"){
      const current=(()=>{try{return JSON.parse(currentData[key]||'{"users":{}}')}catch{return {users:{}}}})();
      out[key]=JSON.stringify(mergeQuickChecks(current,JSON.parse(incomingData[key])));
      continue;
    }

    if(key==="digilians.officialQbank"){
      const current=(()=>{try{return JSON.parse(currentData[key]||'{"tracks":{}}')}catch{return {tracks:{}}}})();
      out[key]=JSON.stringify(mergeOfficialQbank(current,JSON.parse(incomingData[key])));
      continue;
    }

    if(key==="digilians.mistakes"){
      const current=(()=>{try{return JSON.parse(currentData[key]||'{"schemaVersion":1,"owners":{}}')}catch{return {schemaVersion:1,owners:{}}}})();
      out[key]=JSON.stringify(mergeMistakes(current,JSON.parse(incomingData[key])));
      continue;
    }

    if(key==="digilians.examProgress"){
      if(!currentData[key])out[key]=incomingData[key];
      continue;
    }

    // Identity/preferences in the backup intentionally follow the imported file.
    out[key]=incomingData[key];
  }

  return out;
}

export function applyBackupData(storage,incomingData,mode="merge"){
  if(!["merge","replace"].includes(mode))throw new Error("Invalid restore mode.");

  const current=collectBackupData(storage);
  const next=mode==="merge"?mergeBackupIntoStorageData(current,incomingData):{...incomingData};

  if(mode==="replace"){
    for(const key of BACKUP_KEYS)safeRemove(storage,key);
  }

  for(const [key,value] of Object.entries(next)){
    if(BACKUP_KEYS.includes(key))safeSet(storage,key,value);
  }

  return summarizeBackupData(collectBackupData(storage));
}

function downloadJson(filename,data){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function backupFilename(prefix="digilians-progress-backup"){
  const d=new Date();
  const stamp=[d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");
  return `${prefix}-${stamp}.json`;
}

function setStatus(message,type="info"){
  const el=byId("backupRestoreStatus");
  if(!el)return;
  el.className=`backup-restore-status ${type}`;
  el.textContent=message;
}

function renderSummary(summary){
  const el=byId("backupImportSummary");
  if(!el)return;
  el.innerHTML=`
    <div><span>Results</span><strong>${summary.results}</strong></div>
    <div><span>Study Modules</span><strong>${summary.studyModules}</strong></div>
    <div><span>Quick Checks</span><strong>${summary.quickChecks}</strong></div>
    <div><span>My Mistakes</span><strong>${summary.mistakes}</strong></div>
    <div><span>QBank Tracks</span><strong>${summary.officialTracks}</strong></div>
    <div><span>Exam Resume</span><strong>${summary.hasExamProgress?"Yes":"No"}</strong></div>
    <div><span>Saved Keys</span><strong>${summary.keyCount}</strong></div>`;
}

let selectedImport=null;

function openModal(){
  const modal=byId("backupRestoreModal");
  if(!modal)return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("modal-open");
  setStatus("Your admin login and anonymous Analytics identity are excluded from backups.","info");
  byId("backupImportPreview")?.classList.add("hidden");
  const input=byId("backupFileInput");
  if(input)input.value="";
  selectedImport=null;
}

function closeModal(){
  const modal=byId("backupRestoreModal");
  if(!modal)return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");
  const input=byId("backupFileInput");
  if(input)input.value="";
  selectedImport=null;
}

async function exportBackup(){
  const button=byId("exportProgressBackupBtn");
  if(button){button.disabled=true;button.textContent="Preparing…";}
  try{
    const doc=await createBackupDocument(localStorage);
    downloadJson(backupFilename(),doc);
    setStatus("Backup downloaded. Keep this JSON file somewhere safe.","success");
    window.dispatchEvent(new CustomEvent("digilians:analytics",{detail:{
      eventType:"progress_backup_export",
      metadata:{schemaVersion:BACKUP_SCHEMA_VERSION,keyCount:Object.keys(doc.data).length}
    }}));
  }catch(error){
    console.error(error);
    setStatus("Could not create the backup on this browser.","danger");
  }finally{
    if(button){button.disabled=false;button.textContent="Export Progress Backup ↓";}
  }
}

async function handleBackupFile(file){
  if(!file)return;
  if(file.size>MAX_BACKUP_BYTES){
    setStatus("Backup file is larger than the 5 MB safety limit.","danger");
    return;
  }

  try{
    const text=await file.text();
    const doc=JSON.parse(text);
    const validated=await validateBackupDocument(doc);
    selectedImport=validated;
    renderSummary(validated.summary);
    byId("backupImportMeta").textContent=
      `Exported ${validated.exportedAt?new Date(validated.exportedAt).toLocaleString():"at an unknown time"} • Platform ${validated.platformVersion}`;
    byId("backupImportPreview")?.classList.remove("hidden");
    setStatus(
      validated.unknownKeys.length
        ?`Backup is valid. ${validated.unknownKeys.length} unsupported keys will be ignored.`
        :"Backup is valid and ready to restore.",
      "success"
    );
  }catch(error){
    console.error(error);
    selectedImport=null;
    byId("backupImportPreview")?.classList.add("hidden");
    setStatus(error.message||"This backup file is invalid.","danger");
  }
}

async function restoreSelected(){
  if(!selectedImport){
    setStatus("Choose and validate a backup file first.","danger");
    return;
  }

  const mode=document.querySelector('input[name="backupRestoreMode"]:checked')?.value||"merge";
  const button=byId("confirmRestoreBackupBtn");
  if(button){button.disabled=true;button.textContent="Restoring…";}

  try{
    // Download a safety snapshot immediately before changing learner progress.
    const safety=await createBackupDocument(localStorage);
    downloadJson(backupFilename("digilians-before-restore"),safety);

    const summary=applyBackupData(localStorage,selectedImport.data,mode);
    safeSet(sessionStorage,"digilians.backup.restoreNotice",
      `Progress restored successfully: ${summary.results} results, ${summary.studyModules} study modules, ${summary.mistakes} saved mistakes.`);

    window.dispatchEvent(new CustomEvent("digilians:analytics",{detail:{
      eventType:"progress_backup_restore",
      metadata:{mode,schemaVersion:BACKUP_SCHEMA_VERSION,keyCount:Object.keys(selectedImport.data).length}
    }}));

    setStatus("Restore complete. Reloading the platform with your restored progress…","success");
    setTimeout(()=>location.reload(),450);
  }catch(error){
    console.error(error);
    setStatus(error.message||"Restore failed. Your current data was not intentionally cleared.","danger");
    if(button){button.disabled=false;button.textContent="Restore Progress & Reload";}
  }
}

function showRestoreNotice(){
  const message=safeGet(sessionStorage,"digilians.backup.restoreNotice");
  if(!message)return;
  safeRemove(sessionStorage,"digilians.backup.restoreNotice");

  const host=byId("toastContainer");
  if(!host)return;
  const toast=document.createElement("div");
  toast.className="toast success";
  toast.innerHTML=`<strong>Progress Restored</strong><span>${message}</span>`;
  host.appendChild(toast);
  setTimeout(()=>toast.remove(),5200);
}

function bindUi(){
  byId("openBackupRestoreBtn")?.addEventListener("click",openModal);
  byId("backupRestoreCloseBtn")?.addEventListener("click",closeModal);
  byId("backupRestoreModal")?.addEventListener("click",e=>{
    if(e.target===byId("backupRestoreModal"))closeModal();
  });

  byId("exportProgressBackupBtn")?.addEventListener("click",exportBackup);
  byId("chooseBackupFileBtn")?.addEventListener("click",()=>byId("backupFileInput")?.click());
  byId("backupFileInput")?.addEventListener("change",e=>handleBackupFile(e.target.files?.[0]));
  byId("confirmRestoreBackupBtn")?.addEventListener("click",restoreSelected);

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape" && !byId("backupRestoreModal")?.classList.contains("hidden"))closeModal();
  });
}

function init(){
  bindUi();
  showRestoreNotice();
  window.__DIGILIANS_BACKUP_RESTORE_READY__=true;
}

if(typeof window!=="undefined" && typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
}

export const backupRestoreTestApi={
  canonicalStringify,
  mergeStudyProgress,
  mergeQuickChecks,
  mergeOfficialQbank,
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  SENSITIVE_EXCLUDED_PREFIXES
};
