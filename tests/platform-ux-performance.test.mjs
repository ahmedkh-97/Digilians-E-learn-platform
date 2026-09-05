import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const full=p=>path.join(ROOT,p);
const read=p=>fs.readFileSync(full(p),'utf8');
const version=fs.readFileSync(full('VERSION.txt'),'utf8').split(/\r?\n/,1)[0].trim();
const escapedVersion=version.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function startupPayloadPaths(){
  const curriculum=JSON.parse(read('data/curriculum.json'));
  const syllabus=JSON.parse(read('data/syllabus-maps.json'));
  const coverage=JSON.parse(read('data/coverage-blueprints.json'));
  return [...new Set([
    'index.html','assets/css/style.css','assets/js/app.js','assets/js/analytics.js','assets/js/update-manager.js','assets/js/backup-restore.js',
    'data/exams.json','data/learning.json','data/question-banks.json','data/exam-blueprints.json','data/curriculum.json','data/syllabus-maps.json','data/coverage-blueprints.json','data/official-qbank.json','data/official-final-blueprints.json',
    ...(curriculum.tracks||[]).map(x=>x.file),
    ...(syllabus.maps||[]).map(x=>x.file),
    ...(coverage.blueprints||[]).map(x=>x.file)
  ])];
}

test('entry CTA is inert until platform data is ready',()=>{
  const html=read('index.html');
  const app=read('assets/js/app.js');
  assert.match(html,/id="startBtn"[^>]*\bdisabled\b/,'start button must be disabled in static HTML before app startup');
  assert.match(app,/setEntryControlsReady\(true\)/,'app must explicitly enable entry controls only after startup data is ready');
  const loadIndex=app.indexOf('await loadData()');
  const readyIndex=app.indexOf('setEntryControlsReady(true)');
  assert.ok(loadIndex>=0 && readyIndex>loadIndex,'entry controls may only become ready after loadData completes');
});

test('saved theme is applied before the main stylesheet to avoid a light-mode flash',()=>{
  const html=read('index.html');
  const styleIndex=html.indexOf('assets/css/style.css');
  const themeReadIndex=html.indexOf('localStorage.getItem("digilians.theme")');
  assert.ok(themeReadIndex>=0,'early theme bootstrap must read the saved theme');
  assert.ok(themeReadIndex<styleIndex,'saved theme must be applied before the stylesheet is loaded');
});

test('startup payload stays within the stabilization performance budget',()=>{
  const paths=startupPayloadPaths();
  let raw=0,gzip=0;
  for(const p of paths){
    assert.ok(fs.existsSync(full(p)),`startup dependency must exist: ${p}`);
    const data=fs.readFileSync(full(p));
    raw+=data.length;
    gzip+=zlib.gzipSync(data,{level:6}).length;
  }
  assert.ok(paths.length<=40,`startup dependency count ${paths.length} exceeds budget 40`);
  assert.ok(raw<=3*1024*1024,`startup raw payload ${(raw/1024).toFixed(1)}KB exceeds 3072KB budget`);
  assert.ok(gzip<=450*1024,`startup gzip estimate ${(gzip/1024).toFixed(1)}KB exceeds 450KB budget`);
});

test('startup has an independent recovery state for load failures and timeouts',()=>{
  const html=read('index.html');
  assert.match(html,/id="fatalRecovery"[^>]*role="alertdialog"/);
  assert.match(html,/window\.__DIGILIANS_SHOW_FATAL__/);
  assert.match(html,/8000/,'startup timeout recovery must remain bounded');
});

test('pre-deploy permanently enforces the UX/performance stabilization gate',()=>{
  const predeploy=read('tools/pre-deploy-check.mjs');
  assert.match(predeploy,/platform-ux-performance\.test\.mjs/);
});

test('PL-300 feature CSS is lazy-loaded instead of inflating the startup stylesheet',()=>{
  const app=read('assets/js/app.js');
  const globalCss=read('assets/css/style.css');
  assert.ok(fs.existsSync(full('assets/css/pl300.css')),'PL-300 feature stylesheet must exist');
  const pl300Css=read('assets/css/pl300.css');
  assert.doesNotMatch(globalCss,/V0\.21\.4 PL-300 content architecture/);
  assert.match(pl300Css,/V0\.21\.4 PL-300 content architecture/);
  assert.match(pl300Css,/ranked-structured-field/);
  assert.match(app,/ensurePl300Styles/);
  assert.match(app,new RegExp(`assets\\/css\\/pl300\\.css\\?v=${escapedVersion}`));
});
