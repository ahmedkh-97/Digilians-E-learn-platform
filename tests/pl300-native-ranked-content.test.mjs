import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));
const key=q=>`${q.sourceId}:${q.questionNumber}`;

test('all 78 native candidates have an explicit fail-closed ranking review decision',()=>{
  const review=read('native-ranked-review.json');
  assert.equal(review.candidateCount,78);
  assert.equal(review.decisions.length,78);
  assert.equal(new Set(review.decisions.map(d=>d.sourceKey)).size,78);
  assert.equal(review.approvedCount,64);
  assert.equal(review.withheldCount,14);
  assert.ok(review.decisions.every(d=>['approved','withheld'].includes(d.status)));
  assert.ok(review.decisions.filter(d=>d.status==='approved').every(d=>d.sessionId&&d.domainId));
});

test('approved native candidates are promoted exactly once as structured ranked questions',()=>{
  const review=read('native-ranked-review.json');
  const master=read('master-bank.json');
  const architecture=read('content-architecture.json');
  const native=master.questions.filter(q=>q.responseType==='structured');
  assert.equal(master.questions.length,265);
  assert.equal(native.length,64);
  assert.equal(master.questionCount,265);
  const promotedKeys=native.map(q=>`${q.nativeRankedReview?.sourceId}:${q.nativeRankedReview?.questionNumber}`);
  assert.equal(new Set(promotedKeys).size,64);
  assert.deepEqual(new Set(promotedKeys),new Set(review.decisions.filter(d=>d.status==='approved').map(d=>d.sourceKey)));
  for(const q of native){
    assert.equal(q.productionReady,true);
    assert.equal(q.status,'approved-native-structured');
    assert.ok((q.nativeResponse?.fields||[]).length>0);
    assert.ok(q.nativeResponse.fields.every(f=>Array.isArray(f.expected)&&f.expected.some(v=>String(v).trim())));
    assert.ok(architecture.questionSessionMap[q.id]);
  }
});

test('withheld native duplicates, conflicts and ambiguous items never enter ranked master bank',()=>{
  const review=read('native-ranked-review.json');
  const master=read('master-bank.json');
  const promoted=new Set(master.questions.filter(q=>q.responseType==='structured').map(q=>`${q.nativeRankedReview.sourceId}:${q.nativeRankedReview.questionNumber}`));
  for(const decision of review.decisions.filter(d=>d.status==='withheld'))assert.equal(promoted.has(decision.sourceKey),false,decision.sourceKey);
  for(const sourceKey of ['source-02:8','source-02:50','source-02:157','source-02:281','source-02:378','source-01:197','source-02:20','source-02:174','source-02:396']){
    assert.equal(review.decisions.find(d=>d.sourceKey===sourceKey)?.status,'withheld',sourceKey);
  }
});

test('ranked metadata and architecture totals reflect 265 questions while source practice stays 509',()=>{
  const config=read('config.json');
  const architecture=read('content-architecture.json');
  const manifest=read('source-manifest.json');
  assert.equal(config.masterBankQuestionCount,265);
  assert.equal(config.fullBankExam.questionCount,265);
  assert.equal(config.fullBankExam.durationMinutes,530);
  assert.match(config.subtitle,/265 ranked/);
  assert.equal(architecture.questionCount,265);
  assert.equal(Object.keys(architecture.questionSessionMap).length,265);
  assert.equal(manifest.fullSourceReview.releasedCount,509);
  assert.equal(manifest.fullSourceReview.nativeStructuredVisualBlocks,78);
  assert.equal(manifest.audit.productionReadyQuestions,265);
  assert.equal(manifest.audit.productionReadyTextQuestions,201);
  assert.equal(manifest.audit.nativeRankedQuestions,64);
  assert.equal(manifest.audit.totalRankedQuestions,265);
});
