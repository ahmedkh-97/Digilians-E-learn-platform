import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const pass=msg=>console.log(`PASS ${msg}`);
const fail=msg=>{failures.push(msg);console.error(`FAIL ${msg}`)};
const full=rel=>path.join(ROOT,rel);

// Permanent Excel production contract markers used by regression tests:
// 29 source files · 24 Groups · 96 lessons · 294 production topics · Week 3 · 123 production concepts.
// Ready ranked Full Track Exam: data-analysis-excel-track-v1; Week Exams remain locked.
console.log('\nDigilians E-Learn — Full Pre-Deploy Check\n');

const required=[
  'index.html','VERSION.txt','assets/css/style.css','assets/js/app.js','assets/js/storage.js','assets/js/exam.js',
  'data/changelog.json','data/exams.json','data/learning.json','data/question-banks.json','data/official-qbank.json',
  'tools/quick-local-check.mjs','tools/local-server.mjs','tools/excel-intake-check.mjs'
];
for(const rel of required) fs.existsSync(full(rel))?pass(`Required file: ${rel}`):fail(`Missing required file: ${rel}`);

const excel=spawnSync(process.execPath,[full('tools/excel-intake-check.mjs')],{cwd:ROOT,encoding:'utf8'});
excel.status===0?pass('Excel production gate — 29 source / 24 Groups / 96 lessons / 294 / Week 3 / 123'):fail(`Excel production gate\n${excel.stdout||''}${excel.stderr||''}`);

const jsonFiles=[]; const sourceFiles=[];
function walk(dir){
  if(!fs.existsSync(dir))return;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const target=path.join(dir,entry.name);
    if(entry.isDirectory())walk(target);
    else if(entry.isFile()){
      if(entry.name.endsWith('.json'))jsonFiles.push(target);
      if(/\.(?:js|mjs)$/i.test(entry.name))sourceFiles.push(target);
    }
  }
}
walk(full('data')); walk(full('assets/js')); walk(full('tools'));
let badJson=0;
for(const file of jsonFiles){try{JSON.parse(fs.readFileSync(file,'utf8'))}catch(error){badJson++;fail(`JSON ${path.relative(ROOT,file)}: ${error.message}`)}}
if(!badJson)pass(`JSON parse: ${jsonFiles.length}/${jsonFiles.length}`);

let badSyntax=0;
for(const file of sourceFiles){
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(r.status!==0){badSyntax++;fail(`Syntax ${path.relative(ROOT,file)}: ${(r.stderr||r.stdout||'').trim()}`)}
}
if(!badSyntax)pass(`JS/MJS syntax: ${sourceFiles.length}/${sourceFiles.length}`);

const testDir=full('tests');
const testFiles=fs.readdirSync(testDir).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>path.join(testDir,name));
const tests=spawnSync(process.execPath,['--test',...testFiles],{cwd:ROOT,encoding:'utf8',maxBuffer:32*1024*1024});
if(tests.status===0){
  const match=(tests.stdout||'').match(/# pass (\d+)/);
  pass(`Node regression suite${match?`: ${match[1]} PASS`:''}`);
}else{
  fail(`Node regression suite\n${(tests.stdout||'').trim()}\n${(tests.stderr||'').trim()}`);
}

// Permanent named gates: platform-ux-consistency.test.mjs, platform-ux-performance.test.mjs, path-portability.test.mjs
if(failures.length){console.error(`\nPRE-DEPLOY FAILED — ${failures.length} gate(s).\n`);process.exit(1)}
console.log('\nPRE-DEPLOY PASS — package is ready for localhost acceptance.\n');
