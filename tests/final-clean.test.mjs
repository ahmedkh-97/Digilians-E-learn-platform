import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));
const exists=rel=>fs.existsSync(path.join(ROOT,rel));

const restored=[
  'PRE-DEPLOY-CHECKLIST.md','RELEASE-WORKFLOW.md','RUN-PREFLIGHT.bat',
  'data/excel-intake/week-2-coverage-map.json','data/excel-intake/week-2-slide-extract.json',
  'docs/excel-production/WEEK-2-FULL-CONTENT-AUDIT.md',
  'docs/excel-production/WEEK-2-SEQUENCE-DEPENDENCIES.md',
  'docs/excel-production/WEEK-2-SOURCE-INVENTORY.md',
  'docs/excel-production/WEEK-2-SOURCE-QA-OVERLAPS.md',
  'docs/excel-production/WEEK-2-STUDY-PRODUCTION-V1.md',
  'docs/excel-production/WEEK-2-STUDY-V1-PREDEPLOY.txt',
  'docs/excel-production/WEEK-2-STUDY-V1-QA.md',
  'tools/build-excel-week2-study.py','tools/excel-intake-check.mjs','tools/local-server.mjs','tools/pre-deploy-check.mjs'
];

test('V0.20.6 Final Clean restores the V0.20.2 release/QA support files',()=>{
  const missing=restored.filter(x=>!exists(x));
  assert.deepEqual(missing,[]);
});

test('Excel source manifest registers the complete 29-source / 3-week course',()=>{
  const manifest=json('data/excel-intake/source-manifest.json');
  const curriculum=json('data/curriculum/excel.json');
  assert.equal(manifest.sources.length,29);
  const weekCounts=Object.fromEntries([1,2,3].map(w=>[w,manifest.sources.filter(x=>x.week===w).length]));
  assert.deepEqual(weekCounts,{1:9,2:10,3:10});
  const manifestIds=new Set(manifest.sources.map(x=>x.id));
  const curriculumIds=new Set(curriculum.processedSources.map(x=>x.id));
  assert.deepEqual([...manifestIds].sort(),[...curriculumIds].sort());
});

test('Week 2 syllabus references resolve to restored audit artifacts',()=>{
  const syllabus=json('data/syllabus-maps/excel.json');
  assert.equal(syllabus.week2CoverageMap,'data/excel-intake/week-2-coverage-map.json');
  assert.ok(exists(syllabus.week2CoverageMap));
  assert.ok(exists('data/excel-intake/week-2-slide-extract.json'));
});

test('V0.20.6 fallback release copy describes Excel Week 3, not Reset My Mistakes',()=>{
  const update=read('assets/js/update-manager.js');
  assert.match(update,/version:\s*["']0\.20\.6["']/);
  assert.match(update,/title:\s*["']Excel Week 3 Study Production["']/);
  assert.doesNotMatch(update,/title:\s*["']Reset My Mistakes["']/);
});

test('Excel intake status no longer says Study production is next after Study completion',()=>{
  const weekStatus=read('data/excel-intake/week-status.json');
  assert.doesNotMatch(weekStatus,/Study production is next/i);
  const d=JSON.parse(weekStatus);
  assert.equal(d.weeks.find(x=>x.week===3)?.status,'study-production');
});

test('local release workflow runs pre-deploy before starting the test server',()=>{
  const bat=read('TEST-LOCAL.bat');
  assert.match(bat,/node tools\\pre-deploy-check\.mjs/i);
  assert.match(bat,/node tools\\local-server\.mjs/i);
  assert.ok(bat.indexOf('pre-deploy-check.mjs') < bat.indexOf('local-server.mjs'));
});

test('pre-deploy has explicit complete Excel 3-week gates',()=>{
  const pre=read('tools/pre-deploy-check.mjs');
  for(const marker of ['24 Groups','96 lessons','294','29 source','Week 3','123']) assert.ok(pre.includes(marker),`missing predeploy marker: ${marker}`);
});
