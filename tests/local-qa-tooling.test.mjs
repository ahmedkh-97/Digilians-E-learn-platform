import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const exists=p=>fs.existsSync(path.join(ROOT,p));

test('local QA package ships quick check, pre-deploy and local server entry points',()=>{
  for(const file of [
    'QUICK-CHECK.bat','START-LOCAL.bat','TEST-LOCAL.bat','FULL-QA.bat','RUN-PREFLIGHT.bat',
    'tools/quick-local-check.mjs','tools/pre-deploy-check.mjs','tools/local-server.mjs','tools/excel-intake-check.mjs'
  ]) assert.ok(exists(file),`missing local QA file: ${file}`);
});

test('START-LOCAL refuses to start the Windows server until the basic safety check passes',()=>{
  const bat=read('START-LOCAL.bat');
  assert.match(bat,/windows-basic-check\.ps1/i);
  assert.match(bat,/windows-local-server\.ps1/i);
  assert.ok(bat.indexOf('windows-basic-check.ps1') < bat.indexOf('windows-local-server.ps1'));
  assert.match(bat,/if errorlevel 1/i);
});

test('full local test runs pre-deploy before localhost',()=>{
  const bat=read('TEST-LOCAL.bat');
  assert.match(bat,/node tools\\pre-deploy-check\.mjs/i);
  assert.match(bat,/node tools\\local-server\.mjs/i);
  assert.ok(bat.indexOf('pre-deploy-check.mjs') < bat.indexOf('local-server.mjs'));
});

test('quick check protects answered-only My Mistakes behavior before localhost starts',()=>{
  const quick=read('tools/quick-local-check.mjs');
  assert.match(quick,/tests\/my-mistakes-unanswered\.test\.mjs/);
  assert.match(quick,/tests\/my-mistakes-legacy-cleanup\.test\.mjs/);
});


test('quick check blocks localhost on Voucher infrastructure and regression failures',()=>{
  const quick=read('tools/quick-local-check.mjs');
  for(const marker of [
    'voucher/registry.json',
    'assets/js/voucher-registry.js',
    'assets/js/voucher-bank-engine.js',
    'assets/js/voucher-storage.js',
    'assets/js/voucher-ranking.js',
    'tools/voucher-integrity-check.mjs',
    'tests/voucher-registry.test.mjs',
    'tests/voucher-bank-engine.test.mjs',
    'tests/voucher-storage.test.mjs',
    'tests/voucher-primary-track.test.mjs',
    'tests/voucher-runtime-integration.test.mjs',
    'tests/voucher-mistakes.test.mjs',
    'tests/voucher-ranking.test.mjs',
    'tests/voucher-backup.test.mjs',
    'tests/voucher-ui-contract.test.mjs'
  ]) assert.ok(quick.includes(marker),`quick check missing Voucher gate: ${marker}`);
});

test('quick check permanently guards the Windows no-Node local-start fallback',()=>{
  const quick=read('tools/quick-local-check.mjs');
  assert.match(quick,/tools\/windows-basic-check\.ps1/);
  assert.match(quick,/tools\/windows-local-server\.ps1/);
  assert.match(quick,/tests\/windows-local-fallback\.test\.mjs/);
});

test('full pre-deploy validates Voucher JSON alongside core data',()=>{
  const predeploy=read('tools/pre-deploy-check.mjs');
  assert.match(predeploy,/walk\(full\('data'\)\)/);
  assert.match(predeploy,/walk\(full\('voucher'\)\)/);
});


test('local QA gates require the extracted exam session and timer runtime modules',()=>{
  const quick=read('tools/quick-local-check.mjs');
  const predeploy=read('tools/pre-deploy-check.mjs');
  for(const marker of ['assets/js/exam-session.js','assets/js/exam-timer.js','assets/js/exam-answers.js','assets/js/exam-navigation.js','assets/js/exam-persistence.js','assets/js/exam-feedback.js','assets/js/exam-results.js']){
    assert.ok(quick.includes(marker),`quick check missing exam runtime dependency: ${marker}`);
    assert.ok(predeploy.includes(marker),`pre-deploy missing exam runtime dependency: ${marker}`);
  }
  for(const marker of ['tests/refactor-exam-session.test.mjs','tests/refactor-exam-timer.test.mjs','tests/refactor-exam-answers.test.mjs','tests/refactor-exam-navigation.test.mjs','tests/refactor-exam-persistence.test.mjs','tests/refactor-exam-feedback.test.mjs','tests/refactor-exam-results.test.mjs']){
    assert.ok(quick.includes(marker),`quick check missing focused exam refactor regression: ${marker}`);
  }
});

test('quick check permanently guards the PL-300 200Q final-review contract',()=>{
  const quick=read('tools/quick-local-check.mjs');
  assert.match(quick,/tests\/pl300-final-review-wave3\.test\.mjs/);
});
