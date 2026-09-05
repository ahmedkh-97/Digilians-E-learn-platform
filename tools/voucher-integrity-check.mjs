import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  validateVoucherRegistry,
  validateVoucherTrackRegistry,
  validateVoucherExamConfig,
  trackAvailability
} from '../assets/js/voucher-registry.js';
import {validateVoucherQuestion} from '../assets/js/voucher-bank-engine.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const full=rel=>path.join(ROOT,rel);
const readJson=rel=>JSON.parse(fs.readFileSync(full(rel),'utf8'));
const exists=rel=>fs.existsSync(full(rel));
const failures=[];
const pass=message=>console.log(`PASS ${message}`);
const fail=message=>{failures.push(message);console.error(`FAIL ${message}`);};

function checkBank(bankFile,{master=false}={}){
  if(!bankFile||!exists(bankFile)){fail(`Missing Voucher bank: ${bankFile||'(blank)'}`);return;}
  let bank;
  try{bank=readJson(bankFile);}catch(error){fail(`Invalid JSON ${bankFile}: ${error.message}`);return;}
  if(!Array.isArray(bank?.questions)){fail(`${bankFile} questions must be an array`);return;}
  const ids=[];
  for(const question of bank.questions){
    ids.push(question?.id);
    for(const error of validateVoucherQuestion(question))fail(`${bankFile}: ${error}`);
    if(master&&question?.status==='conflict')fail(`${bankFile}: unresolved conflict question ${question?.id||'unknown'} is not deliverable`);
    if(question?.visualRequired){
      const asset=question.visualAsset;
      if(!asset||!exists(asset))fail(`${bankFile}: missing visual asset ${asset||'(blank)'} for ${question?.id||'unknown'}`);
    }
  }
  if(new Set(ids).size!==ids.length)fail(`${bankFile}: duplicate question IDs`);
}

let registry;
try{registry=readJson('voucher/registry.json');}catch(error){fail(`voucher/registry.json unavailable: ${error.message}`);}
if(registry){
  for(const error of validateVoucherRegistry(registry))fail(error);
  if(!failures.length)pass(`Voucher registry valid (${registry.tracks.length} tracks)`);
  for(const track of registry.tracks||[]){
    if(!exists(track.registryFile)){fail(`Missing track registry ${track.registryFile}`);continue;}
    let child;
    try{child=readJson(track.registryFile);}catch(error){fail(`Invalid track registry ${track.registryFile}: ${error.message}`);continue;}
    const childErrors=validateVoucherTrackRegistry(child,track.id);
    childErrors.forEach(error=>fail(`${track.id}: ${error}`));
    if(!childErrors.length)pass(`${track.title}: ${trackAvailability(child)==='coming-soon'?'Coming Soon':`${child.exams.length} exam(s)`}`);

    for(const entry of child.exams||[]){
      const configFile=entry?.configFile;
      if(!configFile||!exists(configFile)){fail(`${track.id}/${entry?.id||'unknown'} missing configFile`);continue;}
      let config;
      try{config=readJson(configFile);}catch(error){fail(`Invalid exam config ${configFile}: ${error.message}`);continue;}
      for(const error of validateVoucherExamConfig(config))fail(`${configFile}: ${error}`);
      if(config.trackId!==track.id)fail(`${configFile}: trackId does not match registry ${track.id}`);
      if(config.id!==entry.id)fail(`${configFile}: id does not match track registry ${entry.id}`);
      checkBank(config.masterBankFile,{master:true});
      for(const source of config.sources||[])checkBank(source.bankFile||source.sourceBankFile,{master:false});
    }
  }
}

if(failures.length){
  console.error(`\nVOUCHER INTEGRITY FAILED — ${failures.length} issue(s).`);
  process.exit(1);
}
console.log('\nVOUCHER INTEGRITY PASS');
