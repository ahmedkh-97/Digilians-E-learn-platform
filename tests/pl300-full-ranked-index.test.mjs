import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));

test('PL-300 full ranked index covers all 509 source occurrences with completion-first weights',()=>{
  const index=read('full-ranked-index.json');
  assert.equal(index.schemaVersion,1);
  assert.equal(index.examId,'microsoft-pl-300');
  assert.equal(index.questionCount,509);
  assert.equal(index.sources['source-01'],369);
  assert.equal(index.sources['source-02'],140);
  assert.equal(index.records.length,509);
  assert.equal(new Set(index.records.map(x=>x.occurrenceId)).size,509);
  assert.equal(new Set(index.records.map(x=>x.questionId)).size,509);
  assert.ok(index.records.every(x=>x.ranking?.completionWeight===1));
  assert.ok(index.records.every(x=>['objective','checkpoint'].includes(x.mode)));
  assert.ok(index.records.filter(x=>x.mode==='checkpoint').every(x=>x.ranking?.accuracyWeight===0&&!x.validatedQuestionId));
  assert.ok(index.records.filter(x=>x.mode==='objective').every(x=>x.ranking?.accuracyWeight===1&&x.validatedQuestionId&&String(x.equivalenceClusterId).startsWith('canonical:')));
  const validated=new Set(index.records.filter(x=>x.mode==='objective').map(x=>x.validatedQuestionId));
  assert.equal(validated.size,265,'competitive accuracy must stay anchored to the 265 validated concepts');
  const weightedClusters=new Set(index.records.filter(x=>x.ranking?.accuracyWeight===1).map(x=>x.equivalenceClusterId));
  assert.equal(weightedClusters.size,265,'duplicate source occurrences must collapse to one validated concept weight');
});

test('PL-300 config exposes one 509-question full ranked learning contract',()=>{
  const config=read('config.json');
  assert.equal(config.fullRankedLearning?.questionCount,509);
  assert.equal(config.fullRankedLearning?.validatedConceptCount,265);
  assert.equal(config.fullRankedLearning?.source01Count,369);
  assert.equal(config.fullRankedLearning?.source02Count,140);
  assert.equal(config.fullRankedLearning?.indexFile,'voucher/tracks/data-analysis/microsoft-pl-300/full-ranked-index.json');
  assert.equal(config.fullRankedLearning?.activitySuffix,'full-ranked-learning');
});
