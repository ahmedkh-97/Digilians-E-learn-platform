import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const pass=msg=>console.log(`PASS ${msg}`);
const fail=msg=>{failures.push(msg);console.error(`FAIL ${msg}`)};
const full=rel=>path.join(ROOT,rel);

console.log('\nDigilians E-Learn — Quick Local Check\n');

for(const rel of ['index.html','VERSION.txt','assets/css/style.css','assets/js/app.js','assets/js/exam.js','assets/js/exam-context.js','assets/js/technical-content.js','data/changelog.json']){
  fs.existsSync(full(rel))?pass(`Required file: ${rel}`):fail(`Missing required file: ${rel}`);
}

try{
  const version=fs.readFileSync(full('VERSION.txt'),'utf8').split(/\r?\n/).map(x=>x.trim()).find(Boolean)||'';
  /^\d+\.\d+\.\d+$/.test(version)?pass(`VERSION.txt = ${version}`):fail(`Invalid VERSION.txt: ${version}`);
}catch(error){fail(`VERSION.txt unreadable: ${error.message}`)}

const jsonFiles=[];
function walk(dir){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const target=path.join(dir,entry.name);
    if(entry.isDirectory())walk(target);
    else if(entry.isFile() && entry.name.endsWith('.json'))jsonFiles.push(target);
  }
}
walk(full('data'));
let jsonBad=0;
for(const file of jsonFiles){
  try{JSON.parse(fs.readFileSync(file,'utf8'))}catch(error){jsonBad++;fail(`JSON ${path.relative(ROOT,file)}: ${error.message}`)}
}
if(!jsonBad)pass(`JSON parse: ${jsonFiles.length}/${jsonFiles.length}`);

for(const rel of ['assets/js/app.js','assets/js/exam.js','assets/js/exam-context.js','assets/js/technical-content.js','assets/js/storage.js','assets/js/update-manager.js']){
  const result=spawnSync(process.execPath,['--check',full(rel)],{encoding:'utf8'});
  result.status===0?pass(`Syntax: ${rel}`):fail(`Syntax ${rel}: ${(result.stderr||result.stdout||'').trim()}`);
}

for(const rel of ['tests/exam-context.test.mjs','tests/exam-navigator-track-grouping.test.mjs','tests/exam-navigator-runtime-metadata.test.mjs','tests/legacy-word-bullet-rendering.test.mjs','tests/my-mistakes-unanswered.test.mjs','tests/my-mistakes-legacy-cleanup.test.mjs','tests/platform-health-stability.test.mjs','tests/platform-health-scope-ui.test.mjs','tests/official-final-feedback-modes.test.mjs','tests/local-qa-tooling.test.mjs']){
  const result=spawnSync(process.execPath,['--test',full(rel)],{cwd:ROOT,encoding:'utf8'});
  result.status===0?pass(`Targeted test: ${rel}`):fail(`Targeted test ${rel}\n${(result.stdout||'').trim()}\n${(result.stderr||'').trim()}`);
}

const excel=spawnSync(process.execPath,[full('tools/excel-intake-check.mjs')],{cwd:ROOT,encoding:'utf8'});
excel.status===0?pass('Excel intake gate'):fail(`Excel intake gate\n${(excel.stdout||'').trim()}\n${(excel.stderr||'').trim()}`);

if(failures.length){
  console.error(`\nQUICK CHECK FAILED — ${failures.length} issue(s). Local server was not started.\n`);
  process.exit(1);
}
console.log('\nQUICK CHECK PASS — safe to start localhost.\n');
