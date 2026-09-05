import {getStoredAvatarProfile,setStoredAvatarProfile,clearStoredAvatarProfile} from "./storage.js?v=0.22.1";


const PROFILE_VERSION=2;

const AVATARS=[
  {id:"boy-3d-1",gender:"male",name:"Boy 3D 1",mood:"Friendly",image:"assets/avatars/boy-3d-1.webp"},
  {id:"boy-3d-2",gender:"male",name:"Boy 3D 2",mood:"Cool",image:"assets/avatars/boy-3d-2.webp"},
  {id:"boy-3d-3",gender:"male",name:"Boy 3D 3",mood:"Playful",image:"assets/avatars/boy-3d-3.webp"},
  {id:"boy-3d-4",gender:"male",name:"Boy 3D 4",mood:"Chill",image:"assets/avatars/boy-3d-4.webp"},

  {id:"girl-3d-1",gender:"female",name:"Girl 3D 1",mood:"Cheerful",image:"assets/avatars/girl-3d-1.webp"},
  {id:"girl-3d-2",gender:"female",name:"Girl 3D 2",mood:"Smart",image:"assets/avatars/girl-3d-2.webp"},
  {id:"girl-3d-3",gender:"female",name:"Girl 3D 3",mood:"Fun",image:"assets/avatars/girl-3d-3.webp"},
  {id:"girl-3d-4",gender:"female",name:"Girl 3D 4",mood:"Calm",image:"assets/avatars/girl-3d-4.webp"},

  {id:"cat-3d",gender:"neutral",name:"Cat 3D",mood:"Too Cool",image:"assets/avatars/cat-3d.webp"},
  {id:"bear-3d",gender:"neutral",name:"Bear 3D",mood:"Cozy",image:"assets/avatars/bear-3d.webp"},
  {id:"penguin-3d",gender:"neutral",name:"Penguin 3D",mood:"Chill",image:"assets/avatars/penguin-3d.webp"},
  {id:"otter-3d",gender:"neutral",name:"Otter 3D",mood:"Happy",image:"assets/avatars/otter-3d.webp"},
  {id:"koala-3d",gender:"neutral",name:"Koala 3D",mood:"Sleepy",image:"assets/avatars/koala-3d.webp"},
  {id:"rabbit-3d",gender:"neutral",name:"Rabbit 3D",mood:"Bubbly",image:"assets/avatars/rabbit-3d.webp"},
  {id:"lion-3d",gender:"neutral",name:"Lion 3D",mood:"Brave",image:"assets/avatars/lion-3d.webp"},
  {id:"sloth-3d",gender:"neutral",name:"Sloth 3D",mood:"Relaxed",image:"assets/avatars/sloth-3d.webp"}
];

let currentFilter="all";
let selectedAvatarId=null;
let pickerContext={mode:"change",name:"",onDone:null,required:false};
let pickerReturnFocus=null;

function byId(id){return document.getElementById(id)}
function esc(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]));
}
function initials(name){
  return (name||"Guest").trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"G";
}

function normalizeProfile(parsed){
  if(!parsed || typeof parsed!=="object")return null;

  // V0.19.2 SVG avatars are intentionally reset because V0.19.3 replaces
  // the entire catalog with the requested Soft 3D image pack.
  if(parsed.version!==PROFILE_VERSION)return null;

  const avatar=AVATARS.find(x=>x.id===parsed.avatarId);
  if(!avatar)return null;
  if(!["male","female","neutral"].includes(parsed.gender))return null;
  if(avatar.gender!==parsed.gender)return null;

  return parsed;
}

export function getAvatarProfile(){
  const raw=getStoredAvatarProfile();
  if(!raw)return null;
  try{return normalizeProfile(JSON.parse(raw))}catch{return null}
}
export function hasAvatarProfile(){return Boolean(getAvatarProfile())}

export function saveAvatarProfile({gender,avatarId}){
  const avatar=AVATARS.find(x=>x.id===avatarId);
  if(!avatar)throw new Error("Unknown avatar.");
  if(avatar.gender!==gender)throw new Error("Avatar category does not match.");

  const profile={
    version:PROFILE_VERSION,
    gender,
    avatarId,
    updatedAt:new Date().toISOString()
  };
  setStoredAvatarProfile(JSON.stringify(profile));
  return profile;
}

export function clearAvatarProfile(){clearStoredAvatarProfile()}
export function getAvatarById(id){return AVATARS.find(x=>x.id===id)||null}
export function listAvatars(filter="all"){
  return filter==="all"?[...AVATARS]:AVATARS.filter(x=>x.gender===filter);
}

export function avatarMarkup(avatarOrId,{lazy=true}={}){
  const avatar=typeof avatarOrId==="string"?getAvatarById(avatarOrId):avatarOrId;
  if(!avatar)return "";
  return `<img src="${esc(avatar.image)}" alt="${esc(avatar.name)}" ${lazy?'loading="lazy" ':''}decoding="async" draggable="false">`;
}

// Kept as a compatibility alias for the V0.19.2 test/API surface.
export function avatarSvg(avatarOrId){
  return avatarMarkup(avatarOrId);
}

export function renderAvatarInto(element,profile,name="Guest"){
  if(!element)return;
  const resolved=profile||getAvatarProfile();
  const avatar=resolved?getAvatarById(resolved.avatarId):null;

  element.classList.toggle("has-profile-avatar",Boolean(avatar));
  if(avatar){
    element.innerHTML=avatarMarkup(avatar,{lazy:false});
    element.setAttribute("aria-label",`${avatar.name} avatar`);
    element.dataset.avatarId=avatar.id;
  }else{
    element.textContent=initials(name);
    element.removeAttribute("data-avatar-id");
    element.setAttribute("aria-label",`${name||"Guest"} initials`);
  }
}

function renderPickerGrid(){
  const grid=byId("avatarPickerGrid");
  if(!grid)return;

  const items=listAvatars(currentFilter);
  grid.innerHTML=items.map(avatar=>`
    <button type="button"
      class="avatar-choice ${selectedAvatarId===avatar.id?"selected":""}"
      data-avatar-id="${esc(avatar.id)}"
      aria-pressed="${selectedAvatarId===avatar.id?"true":"false"}">
      <span class="avatar-choice-art">${avatarMarkup(avatar)}</span>
      <span class="avatar-choice-copy">
        <strong>${esc(avatar.name)}</strong>
        <small>${esc(avatar.mood)}</small>
      </span>
      <span class="avatar-choice-check">✓</span>
    </button>`).join("");

  grid.querySelectorAll("[data-avatar-id]").forEach(button=>{
    button.addEventListener("click",()=>{
      selectedAvatarId=button.dataset.avatarId;
      updatePickerControls();
      renderPickerGrid();
    });
  });
}

function updatePickerControls(){
  document.querySelectorAll("[data-avatar-filter]").forEach(button=>{
    const active=button.dataset.avatarFilter===currentFilter;
    button.classList.toggle("active",active);
    button.setAttribute("aria-selected",active?"true":"false");
  });
  const save=byId("saveAvatarBtn");
  if(save)save.disabled=!selectedAvatarId;
}

function randomFromCurrent(){
  const pool=listAvatars(currentFilter);
  if(!pool.length)return;

  const currentIndex=pool.findIndex(x=>x.id===selectedAvatarId);
  let index=Math.floor(Math.random()*pool.length);
  if(pool.length>1 && index===currentIndex)index=(index+1)%pool.length;

  selectedAvatarId=pool[index].id;
  updatePickerControls();
  renderPickerGrid();
}

function finishPicker(saved){
  const modal=byId("avatarPickerModal");
  if(!modal)return;

  const callback=pickerContext.onDone;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("avatar-picker-open");
  document.querySelector(".app-shell")?.removeAttribute("inert");
  pickerContext={mode:"change",name:"",onDone:null,required:false};

  callback?.({saved,profile:getAvatarProfile()});

  if(pickerReturnFocus instanceof HTMLElement){
    window.requestAnimationFrame(()=>pickerReturnFocus?.focus());
  }
  pickerReturnFocus=null;
}

function saveSelected(){
  const avatar=getAvatarById(selectedAvatarId);
  if(!avatar)return;
  saveAvatarProfile({gender:avatar.gender,avatarId:avatar.id});
  finishPicker(true);
}

export function openAvatarPicker({mode="change",name="",onDone=null,required=false}={}){
  const modal=byId("avatarPickerModal");
  if(!modal)return;

  pickerContext={mode,name,onDone,required:Boolean(required||mode==="rollout")};
  pickerReturnFocus=document.activeElement;

  const current=getAvatarProfile();
  selectedAvatarId=current?.avatarId||null;
  currentFilter=current?.gender||"all";

  const title=byId("avatarPickerTitle");
  const subtitle=byId("avatarPickerSubtitle");
  const skip=byId("avatarUseInitialsBtn");

  const rollout=mode==="rollout";
  if(title)title.textContent=rollout
    ?"New avatars are here — pick yours 🎉"
    :mode==="onboarding"?"Pick your Soft 3D avatar":"Change your Soft 3D avatar";
  if(subtitle)subtitle.textContent=rollout
    ?`${name?`Hey ${name}! `:""}We upgraded profiles with Soft 3D avatars. Choose one once to continue.`
    :mode==="onboarding"
      ?`Nice to meet you${name?`, ${name}`:""} — choose Boys, Girls or Animals and pick your favorite.`
      :"Pick a new character. Your choice stays on this device.";
  if(skip){
    skip.textContent=mode==="onboarding"?"Use Initials for Now":"Reset to Initials";
    skip.classList.toggle("hidden",pickerContext.required);
    skip.disabled=pickerContext.required;
  }
  byId("avatarPickerCloseBtn")?.classList.toggle("hidden",pickerContext.required);
  byId("avatarPickerModal")?.classList.toggle("avatar-rollout-required",pickerContext.required);
  const badge=byId("avatarRolloutBadge");
  if(badge)badge.classList.toggle("hidden",!pickerContext.required);

  updatePickerControls();
  renderPickerGrid();

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("avatar-picker-open");
  document.querySelector(".app-shell")?.setAttribute("inert","");
  window.requestAnimationFrame(()=>byId("avatarRandomBtn")?.focus());
}

function resetToInitials(){
  if(pickerContext.required)return;
  clearAvatarProfile();
  finishPicker(false);
}

function bindUi(){
  document.querySelectorAll("[data-avatar-filter]").forEach(button=>{
    button.addEventListener("click",()=>{
      currentFilter=button.dataset.avatarFilter;
      const selected=getAvatarById(selectedAvatarId);
      if(selected && currentFilter!=="all" && selected.gender!==currentFilter){
        selectedAvatarId=null;
      }
      updatePickerControls();
      renderPickerGrid();
    });
  });

  byId("avatarRandomBtn")?.addEventListener("click",randomFromCurrent);
  byId("saveAvatarBtn")?.addEventListener("click",saveSelected);
  byId("avatarUseInitialsBtn")?.addEventListener("click",resetToInitials);
  byId("avatarPickerCloseBtn")?.addEventListener("click",()=>{if(!pickerContext.required)finishPicker(false)});
  byId("avatarPickerModal")?.addEventListener("click",event=>{
    if(event.target===byId("avatarPickerModal") && !pickerContext.required)finishPicker(false);
  });

  document.addEventListener("keydown",event=>{
    if(event.key==="Escape" && !byId("avatarPickerModal")?.classList.contains("hidden") && !pickerContext.required){
      finishPicker(false);
    }
  });
}

function init(){
  bindUi();
  window.__DIGILIANS_AVATAR_PROFILE_READY__=true;
}

if(typeof window!=="undefined" && typeof document!=="undefined"){
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
}

export const avatarProfileTestApi={
  PROFILE_VERSION,
  AVATARS,
  initials,
  isRequired:()=>pickerContext.required
};
