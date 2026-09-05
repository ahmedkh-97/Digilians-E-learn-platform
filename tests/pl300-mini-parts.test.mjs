import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  buildPl300MiniParts,
  filterPl300QuestionsByPart,
  buildPl300PartOptionsMarkup
} from '../assets/js/pl300-full-ranked-learning.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const index=JSON.parse(fs.readFileSync(path.join(root,'voucher/tracks/data-analysis/microsoft-pl-300/full-ranked-index.json'),'utf8'));
const architecture=JSON.parse(fs.readFileSync(path.join(root,'voucher/tracks/data-analysis/microsoft-pl-300/content-architecture.json'),'utf8'));
const source01=JSON.parse(fs.readFileSync(path.join(root,'voucher/tracks/data-analysis/microsoft-pl-300/source-01-review-bank.json'),'utf8'));
const source02=JSON.parse(fs.readFileSync(path.join(root,'voucher/tracks/data-analysis/microsoft-pl-300/source-02-review-bank.json'),'utf8'));
const questions=[...source01.questions,...source02.questions];

test('mini parts cover every one of the 509 ranked source occurrences exactly once',()=>{
  const parts=buildPl300MiniParts({index,architecture,targetSize:18,maxSize:20});
  const ids=parts.flatMap(part=>part.questionIds);
  assert.equal(ids.length,509);
  assert.equal(new Set(ids).size,509);
  assert.deepEqual(new Set(ids),new Set(index.records.map(record=>record.questionId)));
  assert.ok(parts.every(part=>part.count===part.questionIds.length));
  assert.ok(parts.every(part=>part.count<=20),`largest part was ${Math.max(...parts.map(part=>part.count))}`);
});

test('mini parts use the existing PL-300 domain and study-section architecture when classification exists',()=>{
  const parts=buildPl300MiniParts({index,architecture,targetSize:18,maxSize:20});
  const powerQuery=parts.filter(part=>part.sectionId==='pl300-s02-power-query');
  assert.ok(powerQuery.length>=2);
  assert.ok(powerQuery.every(part=>part.domainId==='prepare-data'));
  assert.ok(powerQuery.every(part=>part.domainTitle==='Prepare the Data'));
  assert.ok(powerQuery.every(part=>part.sectionTitle==='Power Query & Data Cleaning'));
  assert.deepEqual(powerQuery.map(part=>part.partNumber),powerQuery.map((_,i)=>i+1));
});

test('unclassified source occurrences stay studyable in explicit Source Review mini parts instead of disappearing',()=>{
  const parts=buildPl300MiniParts({index,architecture,targetSize:18,maxSize:20});
  const unclassified=parts.filter(part=>part.domainId==='source-review');
  assert.ok(unclassified.length>0);
  assert.equal(unclassified.reduce((sum,part)=>sum+part.count,0),index.unclassifiedOccurrences);
  assert.ok(unclassified.every(part=>part.sectionTitle==='Unclassified Source Questions'));
});

test('part filtering keeps source-bank order and limits navigation to the selected mini part',()=>{
  const parts=buildPl300MiniParts({index,architecture,targetSize:18,maxSize:20});
  const part=parts.find(item=>item.sectionId==='pl300-s02-power-query');
  const filtered=filterPl300QuestionsByPart({questions,partId:part.id,parts});
  assert.equal(filtered.length,part.count);
  assert.deepEqual(filtered.map(q=>q.id),part.questionIds);
});

test('part selector markup exposes All 509 plus grouped domain → section → part labels',()=>{
  const parts=buildPl300MiniParts({index,architecture,targetSize:18,maxSize:20});
  const html=buildPl300PartOptionsMarkup({parts,activePartId:'all'});
  assert.match(html,/value="all"[^>]*>All 509 Questions</);
  assert.match(html,/Prepare the Data → Power Query &amp; Data Cleaning · Part 1 · \d+ Questions/);
  assert.match(html,/Source Review → Unclassified Source Questions · Part 1 · \d+ Questions/);
});

test('part view state centralizes selector label and progress without bloating startup app code',async()=>{
  const {buildPl300PartViewState}=await import('../assets/js/pl300-full-ranked-learning.js');
  const parts=buildPl300MiniParts({index,architecture,targetSize:18,maxSize:20});
  const part=parts.find(item=>item.sectionId==='pl300-s02-power-query');
  const records=Object.fromEntries(part.questionIds.slice(0,4).map(id=>[id,{mode:'auto'}]));
  const view=buildPl300PartViewState({parts,activePartId:part.id,records,totalAll:509,completedAll:9,activeFilter:'objective'});
  assert.equal(view.activePart.id,part.id);
  assert.equal(view.partCompleted,4);
  assert.equal(view.partTotal,part.count);
  assert.match(view.partOptionsHtml,new RegExp(`value="${part.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}" selected`));
  assert.match(view.filterLabel,/Power Query & Data Cleaning/);
  assert.match(view.filterLabel,/Validated Objective/);
});
