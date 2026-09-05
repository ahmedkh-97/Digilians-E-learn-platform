import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

test('V0.22.1 release identity documents Full Ranked Learning 509/509',()=>{
  assert.equal(read('VERSION.txt').trim(),'0.22.1');
  const changes=json('data/changelog.json');
  assert.equal(changes.latest,'0.22.1');
  assert.equal(changes.releases[0]?.version,'0.22.1');
  const text=JSON.stringify(changes.releases[0]||{});
  assert.match(text,/509/);
  assert.match(text,/265/);
  assert.match(text,/Completion/i);
  assert.ok(fs.existsSync(path.join(ROOT,'docs/releases/V0.22.1-PL300-FULL-RANKED-LEARNING-509-QA.md')));
});

test('pre-deploy enforces the generated 509 full-ranked index against source drift',()=>{
  const generator=read('tools/pl300-full-ranked-index.mjs');
  const predeploy=read('tools/pre-deploy-check.mjs');
  assert.match(generator,/--check/);
  assert.match(predeploy,/pl300-full-ranked-index\.mjs/);
  const index=json('voucher/tracks/data-analysis/microsoft-pl-300/full-ranked-index.json');
  assert.equal(index.questionCount,509);
  assert.equal(index.validatedConceptCount,265);
});

test('PL-300 config exposes one full ranked 509 source journey',()=>{
  const config=json('voucher/tracks/data-analysis/microsoft-pl-300/config.json');
  assert.equal(config.fullRankedLearning?.questionCount,509);
  assert.equal(config.fullRankedLearning?.validatedConceptCount,265);
  assert.equal(config.fullRankedLearning?.rankingPolicy,'completion-first');
  assert.match(config.subtitle||'',/509/);
});
