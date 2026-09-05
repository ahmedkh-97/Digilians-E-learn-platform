export const VOUCHER_TRACK_IDS=Object.freeze([
  'data-analysis','marketing','graphic-design','ui-ux','media-production'
]);

const isPositiveInteger=value=>Number.isInteger(Number(value))&&Number(value)>0;

export function validateVoucherRegistry(registry){
  const errors=[];
  if(Number(registry?.schemaVersion)!==1)errors.push('Voucher registry schemaVersion must be 1');
  if(!Array.isArray(registry?.tracks))return [...errors,'Voucher registry tracks must be an array'];
  const ids=registry.tracks.map(x=>x?.id);
  if(new Set(ids).size!==ids.length)errors.push('Voucher registry track IDs must be unique');
  if(JSON.stringify(ids)!==JSON.stringify(VOUCHER_TRACK_IDS))errors.push('Voucher registry must contain the five approved tracks in canonical order');
  for(const track of registry.tracks){
    if(!track?.title)errors.push(`Track ${track?.id||'unknown'} is missing title`);
    if(!track?.registryFile)errors.push(`Track ${track?.id||'unknown'} is missing registryFile`);
  }
  return errors;
}

export function validateVoucherTrackRegistry(registry,expectedTrackId){
  const errors=[];
  if(Number(registry?.schemaVersion)!==1)errors.push('Voucher track schemaVersion must be 1');
  if(registry?.trackId!==expectedTrackId)errors.push(`Voucher trackId must equal ${expectedTrackId}`);
  if(!Array.isArray(registry?.exams))errors.push('Voucher track exams must be an array');
  const ids=(registry?.exams||[]).map(x=>x?.id);
  if(new Set(ids).size!==ids.length)errors.push('Voucher exam IDs must be unique within a track');
  return errors;
}

export function validateVoucherExamConfig(config){
  const errors=[];
  if(Number(config?.schemaVersion)!==1)errors.push('Voucher exam schemaVersion must be 1');
  if(!config?.id)errors.push('Voucher exam id is required');
  if(!VOUCHER_TRACK_IDS.includes(config?.trackId))errors.push('Voucher exam trackId is invalid');
  if(!config?.title)errors.push('Voucher exam title is required');
  if(Number(config?.passingScore??70)!==70)errors.push('Voucher passingScore must be 70');
  if(!config?.masterBankFile)errors.push('Voucher exam masterBankFile is required');
  if(!Array.isArray(config?.sources))errors.push('Voucher exam sources must be an array');
  if(config?.realExam?.rankEligible){
    if(!isPositiveInteger(config.realExam.questionCount))errors.push('Real Exam questionCount must be a positive integer');
    if(!isPositiveInteger(config.realExam.durationMinutes))errors.push('Real Exam durationMinutes must be a positive integer');
  }
  if(config?.fullBankExam?.rankEligible){
    if(!isPositiveInteger(config.fullBankExam.questionCount))errors.push('Full Bank Exam questionCount must be a positive integer');
    if(!isPositiveInteger(config.fullBankExam.durationMinutes))errors.push('Full Bank Exam durationMinutes must be a positive integer');
    if(isPositiveInteger(config?.masterBankQuestionCount)&&Number(config.fullBankExam.questionCount)!==Number(config.masterBankQuestionCount))errors.push('Full Bank Exam questionCount must equal masterBankQuestionCount');
  }
  return errors;
}

export function trackAvailability(trackRegistry){
  return Array.isArray(trackRegistry?.exams)&&trackRegistry.exams.length?'ready':'coming-soon';
}

export function findVoucherTrack(registry,trackId){
  return registry?.tracks?.find(x=>x.id===trackId)||null;
}

export function findVoucherExam(trackRegistry,examId){
  return trackRegistry?.exams?.find(x=>x.id===examId)||null;
}
