import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const BANK='question-banks/data-analysis/excel/da-excel-track-bank-v1.json';
const COVERAGE='data/coverage-blueprints/excel-track.json';
const SAMPLE='docs/excel-production/excel-track-exam-001.json';
const family=q=>q.questionFamily || ({'direct-knowledge':'direct','scenario-application':'scenario','best-decision':'scenario','calculation-tracing':'tracing','code-tracing':'tracing','troubleshooting':'troubleshooting'}[q.questionType]||q.questionType);
const signature=q=>[q.topicId,q.difficulty,q.sourceType,family(q)].join('|||');
const counts=(items,key)=>items.reduce((m,x)=>{const k=typeof key==='function'?key(x):x[key];m[k]=(m[k]||0)+1;return m;},{});

test('Excel validated form is exactly 50Q with the approved Week/difficulty/family/group profile',()=>{
  const sample=readJson(SAMPLE);
  const qs=sample.questions;
  assert.equal(qs.length,50);
  assert.deepEqual(counts(qs,'weekNumber'),{'1':12,'2':20,'3':18});
  assert.deepEqual(counts(qs,'difficulty'),{Medium:25,Easy:13,Hard:12});
  assert.deepEqual(counts(qs,family),{scenario:20,direct:13,tracing:10,troubleshooting:7});
  assert.deepEqual(counts(qs,'correctAnswer'),{A:13,B:13,C:12,D:12});
  assert.equal(new Set(qs.map(q=>q.conceptKey)).size,50);
  assert.equal(new Set(qs.map(q=>q.groupId)).size,23,'all 23 assessment-capable Excel groups must appear');
  assert.equal(qs.some(q=>q.groupId==='excel-g14-automation-bridge'),false);
  assert.ok(qs.every(q=>q.sourceType==='course'));
});

test('Excel coverage blueprint encodes the approved 12/20/18 and 13/25/12 contract',()=>{
  const bp=readJson(COVERAGE);
  assert.equal(bp.questionCount,50);
  assert.equal(bp.timerMinutes,60);
  assert.equal(bp.passingScore,60);
  assert.deepEqual(bp.weekQuotas,{'1':12,'2':20,'3':18});
  assert.deepEqual(bp.difficultyTarget,{Easy:13,Medium:25,Hard:12});
  assert.deepEqual(bp.sourceTypeTarget,{course:50});
  assert.deepEqual(bp.questionFamilyTarget,{direct:13,scenario:20,tracing:10,troubleshooting:7});
  assert.equal(Object.keys(bp.groupQuotas).length,23);
  assert.equal(Object.values(bp.groupQuotas).reduce((a,b)=>a+b,0),50);
  assert.equal(bp.groupQuotas['excel-g14-automation-bridge'],undefined);
});

test('validated signature quotas are feasible and preserve the full exam shape',()=>{
  const bank=readJson(BANK).questions;
  const bp=readJson(COVERAGE);
  const quotas=bp.selectionProfile.signatureQuotas;
  assert.equal(Object.values(quotas).reduce((a,b)=>a+b,0),50);
  const bySig=new Map();
  for(const q of bank){const s=signature(q);if(!bySig.has(s))bySig.set(s,[]);bySig.get(s).push(q);}
  const expanded=[];
  for(const [sig,quota] of Object.entries(quotas)){
    const available=bySig.get(sig)||[];
    assert.ok(available.length>=quota,`signature shortage ${sig}: ${available.length}/${quota}`);
    expanded.push(...available.slice(0,quota));
  }
  assert.equal(expanded.length,50);
  assert.deepEqual(counts(expanded,'weekNumber'),{'1':12,'2':20,'3':18});
  assert.deepEqual(counts(expanded,'difficulty'),{Medium:25,Easy:13,Hard:12});
  assert.deepEqual(counts(expanded,family),{scenario:20,direct:13,tracing:10,troubleshooting:7});
  assert.deepEqual(counts(expanded,'groupId'),bp.groupQuotas);
});
