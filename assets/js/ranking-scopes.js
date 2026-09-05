export const RANKING_MODES=Object.freeze([
  'junior-overall','professional-overall','track','exam','voucher-track','voucher-exam'
]);

const modeSet=new Set(RANKING_MODES);
const voucherModeSet=new Set(['voucher-track','voucher-exam']);

export function isRankingMode(mode){
  return modeSet.has(String(mode||''));
}

export function isVoucherRankingMode(mode){
  return voucherModeSet.has(String(mode||''));
}

export function findRankingLevel(officialRegistry,levelId){
  return (officialRegistry?.levels||[]).find(level=>level.levelId===levelId)||null;
}

export function buildFixedSectionCatalog({officialRegistry,levelId,trackId=null,sectionExamId}={}){
  const level=findRankingLevel(officialRegistry,levelId);
  if(!level||typeof sectionExamId!=='function')return [];
  return (level.tracks||[])
    .filter(track=>!trackId||track.trackId===trackId)
    .flatMap(track=>(track.sections||[]).map(section=>({
      examId:sectionExamId(level.levelId,track.trackId,section.sectionNumber,track.sourceRevision||'source-r1'),
      levelId:level.levelId,
      trackId:track.trackId,
      track:track.track,
      sectionId:section.sectionId,
      sectionTitle:section.title,
      questionCount:section.questionCount
    })));
}

export function rankingLevelIdForMode({mode,trackLevelId}={}){
  if(mode==='professional-overall')return 'professional-data-analysis';
  if(mode==='track')return trackLevelId||'junior-data-analysis';
  return 'junior-data-analysis';
}

export function buildRankingScope({mode,trackLevelId,trackId,officialRegistry,sectionExamId}={}){
  if(mode==='exam'||isVoucherRankingMode(mode))return null;
  const levelId=rankingLevelIdForMode({mode,trackLevelId});
  const level=findRankingLevel(officialRegistry,levelId);
  if(!level)return null;
  const track=mode==='track'?(level.tracks||[]).find(item=>item.trackId===trackId)||null:null;
  const sections=buildFixedSectionCatalog({officialRegistry,levelId,trackId:track?.trackId||null,sectionExamId});
  return {
    levelId,level,track,sections,
    name:track?`${level.title} • ${track.track}`:level.title||'Official QBank',
    maxScore:sections.reduce((sum,section)=>sum+(Number(section.questionCount)||0),0),
    sectionCount:sections.length
  };
}
