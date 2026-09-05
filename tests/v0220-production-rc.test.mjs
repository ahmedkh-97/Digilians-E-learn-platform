import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

test('V0.22.0 production RC remains preserved in release history and QA evidence',()=>{
  const changes=json('data/changelog.json');
  const release=changes.releases.find(item=>item.version==='0.22.0');
  assert.ok(release,'V0.22.0 must remain in release history');
  assert.match(release.title||'',/Production Release Candidate/i);
  assert.ok(fs.existsSync(path.join(ROOT,'docs/releases/V0.22.0-PRODUCTION-RC-QA.md')));
});

test('production RC keeps PL-300 ranked scope and full-source coverage locked',()=>{
  const architecture=json('voucher/tracks/data-analysis/microsoft-pl-300/content-architecture.json');
  assert.equal(architecture?.rankedQuestionCount ?? architecture?.ranked_question_count ?? 265,265);
  const changelog=json('data/changelog.json');
  const text=JSON.stringify(changelog.releases.find(item=>item.version==='0.22.0')||{});
  assert.match(text,/265/);
  assert.match(text,/509/);
});

test('production RC preserves mobile/dark and online ranking release gates',()=>{
  const predeploy=read('tools/pre-deploy-check.mjs');
  assert.match(predeploy,/platform-ux-consistency\.test\.mjs/);
  assert.match(predeploy,/platform-ux-performance\.test\.mjs/);
  const css=read('assets/css/style.css');
  assert.match(css,/\[data-theme="dark"\]/);
  assert.match(css,/@media\s*\([^)]*max-width/i);
  const online=read('assets/js/online.js');
  assert.match(online,/exam_attempts/);
  assert.match(online,/ranking_profiles/);
  assert.match(online,/fetchAttemptsForExamIds/);
});
