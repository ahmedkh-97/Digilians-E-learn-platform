import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));

test('PL-300 draft has source manifest for both PDFs and real exam metadata',()=>{
  const manifest=read('source-manifest.json');
  assert.equal(manifest.examId,'microsoft-pl-300');
  assert.equal(manifest.realExam.questionCount,60);
  assert.equal(manifest.realExam.durationMinutes,120);
  assert.equal(manifest.sources.length,2);
  assert.deepEqual(manifest.sources.map(x=>x.sourceId),['source-01','source-02']);
});

test('PL-300 official-weight blueprint resolves to 60 questions',()=>{
  const blueprint=read('blueprint.json');
  assert.deepEqual(blueprint.realExamQuota,{
    'prepare-data':17,
    'model-data':17,
    'visualize-analyze':16,
    'manage-secure':10
  });
  assert.equal(Object.values(blueprint.realExamQuota).reduce((a,b)=>a+b,0),60);
});

test('PL-300 draft master bank preserves stable option IDs, provenance and multi-select answer sets',()=>{
  const bank=read('draft-master-bank.json');
  assert.equal(bank.examId,'microsoft-pl-300');
  assert.ok(bank.questions.length>=250,'expected a substantial canonical text bank');
  assert.equal(new Set(bank.questions.map(q=>q.id)).size,bank.questions.length);
  assert.ok(bank.questions.some(q=>Array.isArray(q.correctAnswers)&&q.correctAnswers.length>1),'expected native multi-select questions');
  for(const q of bank.questions){
    assert.ok(q.question);
    assert.ok(Array.isArray(q.options)&&q.options.length>=2);
    assert.equal(new Set(q.options.map(o=>o.id)).size,q.options.length);
    assert.ok(Array.isArray(q.sourceRefs)&&q.sourceRefs.length>=1);
    assert.ok(['prepare-data','model-data','visualize-analyze','manage-secure'].includes(q.topicId));
    assert.equal(typeof q.productionReady,'boolean','every canonical question must carry an explicit production gate');
  }
  assert.ok(bank.questions.some(q=>q.productionReady===true),'reviewed questions should be releasable after content approval');
  assert.ok(bank.questions.some(q=>q.productionReady===false),'unreviewed questions must remain fail-closed');
});
