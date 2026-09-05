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

for(const rel of ['index.html','VERSION.txt','assets/css/tokens.css','assets/css/style.css','assets/js/app.js','assets/js/exam.js','assets/js/exam-structured.js','assets/js/exam-engine.js','assets/js/exam-modes.js','assets/js/exam-session.js','assets/js/exam-timer.js','assets/js/exam-answers.js','assets/js/exam-navigation.js','assets/js/exam-persistence.js','assets/js/exam-feedback.js','assets/js/exam-results.js','assets/js/exam-context.js','assets/js/technical-content.js','assets/js/voucher-engine.js','assets/js/voucher-content-architecture.js','assets/js/voucher-ranked-learning.js','assets/js/voucher-domain-ranked-learning.js','assets/js/voucher-domain-navigation.js','assets/js/ranking-scopes.js','data/changelog.json','voucher/registry.json','voucher/tracks/data-analysis/microsoft-pl-300/content-architecture.json','assets/js/voucher-registry.js','assets/js/voucher-bank-engine.js','assets/js/voucher-storage.js','assets/js/voucher-ranking.js','assets/js/voucher-learning.js','assets/js/voucher-ranked-runtime.js','tools/voucher-integrity-check.mjs','tools/windows-basic-check.ps1','tools/windows-local-server.ps1']){
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

for(const rel of ['assets/js/app.js','assets/js/exam.js','assets/js/exam-structured.js','assets/js/exam-engine.js','assets/js/exam-modes.js','assets/js/exam-session.js','assets/js/exam-timer.js','assets/js/exam-answers.js','assets/js/exam-navigation.js','assets/js/exam-persistence.js','assets/js/exam-feedback.js','assets/js/exam-results.js','assets/js/exam-context.js','assets/js/technical-content.js','assets/js/storage.js','assets/js/update-manager.js','assets/js/voucher-engine.js','assets/js/voucher-content-architecture.js','assets/js/voucher-domain-ranked-learning.js','assets/js/voucher-domain-navigation.js','assets/js/ranking-scopes.js','assets/js/voucher-learning.js','assets/js/voucher-ranked-runtime.js']){
  const result=spawnSync(process.execPath,['--check',full(rel)],{encoding:'utf8'});
  result.status===0?pass(`Syntax: ${rel}`):fail(`Syntax ${rel}: ${(result.stderr||result.stdout||'').trim()}`);
}

for(const rel of ['tests/exam-context.test.mjs','tests/exam-navigator-track-grouping.test.mjs','tests/exam-navigator-runtime-metadata.test.mjs','tests/legacy-word-bullet-rendering.test.mjs','tests/my-mistakes-unanswered.test.mjs','tests/my-mistakes-legacy-cleanup.test.mjs','tests/platform-health-stability.test.mjs','tests/platform-health-scope-ui.test.mjs','tests/official-final-feedback-modes.test.mjs','tests/local-qa-tooling.test.mjs','tests/voucher-registry.test.mjs','tests/voucher-bank-engine.test.mjs','tests/voucher-storage.test.mjs','tests/voucher-primary-track.test.mjs','tests/voucher-runtime-integration.test.mjs','tests/voucher-mistakes.test.mjs','tests/voucher-ranking.test.mjs','tests/voucher-ranking-center-tabs.test.mjs','tests/voucher-backup.test.mjs','tests/voucher-ui-contract.test.mjs','tests/voucher-visual-redesign.test.mjs','tests/voucher-ux-restructure.test.mjs','tests/voucher-multi-select.test.mjs','tests/pl300-production-draft.test.mjs','tests/pl300-approved-conflicts.test.mjs','tests/pl300-domain-classification.test.mjs','tests/pl300-explanation-quality.test.mjs','tests/pl300-production-readiness.test.mjs','tests/pl300-production-source-policy.test.mjs','tests/pl300-final-review-wave3.test.mjs','tests/pl300-wave2-expansion.test.mjs','tests/pl300-visual-assets.test.mjs','tests/pl300-release-integration.test.mjs','tests/voucher-learning.test.mjs','tests/voucher-ranked-runtime.test.mjs','tests/voucher-competitive-ui.test.mjs','tests/voucher-ranked-resume.test.mjs','tests/voucher-cycle-flow.test.mjs','tests/voucher-saved-attempt-modal.test.mjs','tests/voucher-improvement-session.test.mjs','tests/voucher-focus-navigator.test.mjs','tests/voucher-explanation-surface.test.mjs','tests/voucher-result-learning-loop.test.mjs','tests/voucher-full-bank-ranked.test.mjs','tests/refactor-exam-session.test.mjs','tests/refactor-exam-timer.test.mjs','tests/refactor-exam-answers.test.mjs','tests/refactor-exam-navigation.test.mjs','tests/refactor-exam-persistence.test.mjs','tests/refactor-exam-feedback.test.mjs','tests/refactor-exam-results.test.mjs','tests/refactor-exam-engine-integration.test.mjs','tests/refactor-exam-modes.test.mjs','tests/refactor-voucher-engine.test.mjs','tests/refactor-ranking-scopes.test.mjs','tests/refactor-voucher-ranking-qa-guards.test.mjs','tests/pl300-content-architecture.test.mjs','tests/voucher-content-architecture-runtime.test.mjs','tests/pl300-content-architecture-ui.test.mjs','tests/pl300-session-practice.test.mjs','tests/pl300-content-architecture-qa-guards.test.mjs','tests/release-identity-gate.test.mjs','tests/voucher-ranked-learning.test.mjs','tests/pl300-ranked-session-runtime.test.mjs','tests/pl300-ranked-session-feedback-navigation.test.mjs','tests/pl300-session-result-integration.test.mjs','tests/pl300-session-leaderboard-ui.test.mjs','tests/pl300-ranked-session-result-ui.test.mjs','tests/pl300-ranked-learning-css.test.mjs','tests/pl300-ranked-learning-qa-guards.test.mjs','tests/pl300-domain-ranked-learning.test.mjs','tests/pl300-domain-navigation.test.mjs','tests/pl300-domain-ranked-learning-ui.test.mjs','tests/pl300-domain-integration-ui.test.mjs','tests/pl300-native-ranked-engine.test.mjs','tests/pl300-native-ranked-interaction.test.mjs','tests/pl300-native-ranked-results-mistakes.test.mjs','tests/pl300-native-ranked-content.test.mjs','tests/windows-local-fallback.test.mjs']){
  const result=spawnSync(process.execPath,['--test',full(rel)],{cwd:ROOT,encoding:'utf8'});
  result.status===0?pass(`Targeted test: ${rel}`):fail(`Targeted test ${rel}\n${(result.stdout||'').trim()}\n${(result.stderr||'').trim()}`);
}

const voucher=spawnSync(process.execPath,[full('tools/voucher-integrity-check.mjs')],{cwd:ROOT,encoding:'utf8'});
voucher.status===0?pass('Voucher integrity gate'):fail(`Voucher integrity gate\n${(voucher.stdout||'').trim()}\n${(voucher.stderr||'').trim()}`);

const excel=spawnSync(process.execPath,[full('tools/excel-intake-check.mjs')],{cwd:ROOT,encoding:'utf8'});
excel.status===0?pass('Excel intake gate'):fail(`Excel intake gate\n${(excel.stdout||'').trim()}\n${(excel.stderr||'').trim()}`);

if(failures.length){
  console.error(`\nQUICK CHECK FAILED — ${failures.length} issue(s). Local server was not started.\n`);
  process.exit(1);
}
console.log('\nQUICK CHECK PASS — safe to start localhost.\n');
