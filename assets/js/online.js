const SUPABASE_URL = "https://gbyxpwcjfzxpxxbbwnzf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_tb1vaMv8eB98FcaaqLLl3A_k1nXSdgJ";
const ATTEMPTS_ENDPOINT = `${SUPABASE_URL}/rest/v1/exam_attempts`;
const RANKING_PROFILES_ENDPOINT = `${SUPABASE_URL}/rest/v1/ranking_profiles`;
const VOUCHER_PROFILES_ENDPOINT = `${SUPABASE_URL}/rest/v1/voucher_profiles`;

const SHARED_AVATAR_IDS = new Set([
  "boy-3d-1","boy-3d-2","boy-3d-3","boy-3d-4",
  "girl-3d-1","girl-3d-2","girl-3d-3","girl-3d-4",
  "cat-3d","bear-3d","penguin-3d","otter-3d",
  "koala-3d","rabbit-3d","lion-3d","sloth-3d"
]);

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`Supabase request failed (${response.status})${message ? `: ${message}` : ""}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function submitAttemptOnline(attempt) {
  await apiFetch(ATTEMPTS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(attempt)
  });
  return true;
}


export async function syncRankingAvatarProfile(playerId,avatarId){
  if(!playerId || !SHARED_AVATAR_IDS.has(String(avatarId||"")))return false;

  const url=`${RANKING_PROFILES_ENDPOINT}?on_conflict=player_id`;
  await apiFetch(url,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Prefer:"resolution=merge-duplicates,return=minimal"
    },
    body:JSON.stringify({
      player_id:playerId,
      avatar_id:avatarId,
      updated_at:new Date().toISOString()
    })
  });
  return true;
}

export async function fetchRankingProfiles(playerIds,{chunkSize=100}={}){
  const unique=[...new Set((playerIds||[]).filter(Boolean))];
  if(!unique.length)return new Map();

  const out=new Map();
  for(let start=0;start<unique.length;start+=chunkSize){
    const chunk=unique.slice(start,start+chunkSize);
    const filter=encodeURIComponent(`in.(${chunk.join(",")})`);
    const url=
      `${RANKING_PROFILES_ENDPOINT}?select=player_id,avatar_id,updated_at`+
      `&player_id=${filter}&limit=${chunk.length}`;
    const rows=(await apiFetch(url))||[];
    for(const row of rows){
      if(row?.player_id && SHARED_AVATAR_IDS.has(row.avatar_id)){
        out.set(row.player_id,row.avatar_id);
      }
    }
  }
  return out;
}

export async function syncVoucherPrimaryTrack(playerId,primaryTrackId){
  const allowed=new Set(["data-analysis","marketing","graphic-design","ui-ux","media-production"]);
  if(!playerId || !allowed.has(String(primaryTrackId||"")))return false;
  const url=`${VOUCHER_PROFILES_ENDPOINT}?on_conflict=player_id`;
  await apiFetch(url,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Prefer:"resolution=merge-duplicates,return=minimal"
    },
    body:JSON.stringify({
      player_id:playerId,
      primary_track_id:String(primaryTrackId),
      updated_at:new Date().toISOString()
    })
  });
  return true;
}

export async function fetchVoucherPrimaryTracks(playerIds,{chunkSize=100}={}){
  const unique=[...new Set((playerIds||[]).filter(Boolean))];
  if(!unique.length)return new Map();
  const out=new Map();
  for(let start=0;start<unique.length;start+=chunkSize){
    const chunk=unique.slice(start,start+chunkSize);
    const filter=encodeURIComponent(`in.(${chunk.join(",")})`);
    const url=
      `${VOUCHER_PROFILES_ENDPOINT}?select=player_id,primary_track_id,updated_at`+
      `&player_id=${filter}&limit=${chunk.length}`;
    const rows=(await apiFetch(url))||[];
    for(const row of rows){
      if(row?.player_id && row?.primary_track_id)out.set(row.player_id,row.primary_track_id);
    }
  }
  return out;
}

export async function fetchExamAttempts(examId) {
  const id = encodeURIComponent(examId);
  const select = [
    "player_id",
    "student_name",
    "exam_id",
    "exam_title",
    "exam_version",
    "score",
    "wrong",
    "unanswered",
    "total_questions",
    "percentage",
    "time_taken_seconds",
    "feedback_mode",
    "submitted_at"
  ].join(",");

  const url =
    `${ATTEMPTS_ENDPOINT}?select=${select}` +
    `&exam_id=eq.${id}` +
    `&order=percentage.desc,time_taken_seconds.asc,submitted_at.asc` +
    `&limit=1000`;

  return (await apiFetch(url)) || [];
}

const ATTEMPT_SELECT = [
  "player_id",
  "student_name",
  "exam_id",
  "exam_title",
  "exam_version",
  "score",
  "wrong",
  "unanswered",
  "total_questions",
  "percentage",
  "time_taken_seconds",
  "feedback_mode",
  "submitted_at"
].join(",");

export async function fetchAttemptsForExamIds(examIds,{chunkSize=8,pageSize=1000}={}){
  const unique=[...new Set((examIds||[]).filter(Boolean))];
  if(!unique.length)return [];

  const out=[];
  for(let start=0;start<unique.length;start+=chunkSize){
    const chunk=unique.slice(start,start+chunkSize);
    const filter=encodeURIComponent(`in.(${chunk.join(",")})`);
    let offset=0;

    while(true){
      const url=
        `${ATTEMPTS_ENDPOINT}?select=${ATTEMPT_SELECT}`+
        `&exam_id=${filter}`+
        `&order=submitted_at.asc`+
        `&limit=${pageSize}&offset=${offset}`;
      const page=(await apiFetch(url))||[];
      out.push(...page);
      if(page.length<pageSize)break;
      offset+=pageSize;
    }
  }
  return out;
}

function isBetterAttempt(candidate, current) {
  if (!current) return true;
  if (candidate.percentage !== current.percentage) {
    return candidate.percentage > current.percentage;
  }
  if (candidate.time_taken_seconds !== current.time_taken_seconds) {
    return candidate.time_taken_seconds < current.time_taken_seconds;
  }
  return new Date(candidate.submitted_at) < new Date(current.submitted_at);
}

export function buildLeaderboard(rows) {
  const bestByPlayer = new Map();

  for (const row of rows) {
    const current = bestByPlayer.get(row.player_id);
    if (isBetterAttempt(row, current)) {
      bestByPlayer.set(row.player_id, row);
    }
  }

  return [...bestByPlayer.values()]
    .sort((a, b) =>
      b.percentage - a.percentage ||
      a.time_taken_seconds - b.time_taken_seconds ||
      new Date(a.submitted_at) - new Date(b.submitted_at)
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function getLeaderboard(examId) {
  return buildLeaderboard(await fetchExamAttempts(examId));
}
