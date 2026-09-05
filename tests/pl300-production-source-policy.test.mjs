import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bank = JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/draft-master-bank.json', import.meta.url), 'utf8'));
const ready = bank.questions.filter(q => q.productionReady === true);
const sourceKey = q => `${q.canonicalSourceRef?.sourceId}:${q.canonicalSourceRef?.questionNumber}`;
const allowedStandaloneSource2 = new Set(['source-02:42','source-02:102','source-02:307','source-02:275','source-02:286','source-02:327','source-02:346','source-02:358','source-02:360','source-02:381','source-02:391','source-02:88','source-02:135','source-02:342']);

test('production PL-300 excludes unreviewed standalone Source 2 questions', () => {
  const offenders = ready.filter(q => {
    const sourceIds = new Set((q.sourceRefs || []).map(r => r.sourceId));
    if (sourceIds.size >= 2) return false;
    if (q.canonicalSourceRef?.sourceId !== 'source-02') return false;
    return !allowedStandaloneSource2.has(sourceKey(q));
  });
  assert.deepEqual(offenders.map(sourceKey), [], `unreviewed Source 2 questions must stay draft: ${offenders.map(sourceKey).join(', ')}`);
});

test('owner-approved Source 2 RLS conflict Q307 uses RLS scoring and enters the reviewed production set', () => {
  const q = bank.questions.find(x => sourceKey(x) === 'source-02:307');
  assert.ok(q, 'source-02 Q307 should remain traceable');
  assert.equal(q.productionReady, true);
  assert.equal(q.correctAnswer, 'A');
  assert.equal(q.topicId, 'manage-secure');
  assert.equal(q.answerReview?.correctionId, 'C-015');
  assert.equal(q.options.find(o=>o.id===q.correctAnswer)?.text, 'From Power BI Desktop, create a new role that has the following filter.[countryRegionName]= “United States” && [ProductCategory]= “Clothing”');
});

test('conservative PL-300 production set still supports all mock sizes and the fixed real-exam quota', () => {
  const counts = Object.fromEntries(['prepare-data','model-data','visualize-analyze','manage-secure'].map(id => [id, ready.filter(q => q.topicId === id).length]));
  assert.ok(ready.length >= 100, `need at least 100 production questions, found ${ready.length}`);
  assert.ok(counts['prepare-data'] >= 17, JSON.stringify(counts));
  assert.ok(counts['model-data'] >= 17, JSON.stringify(counts));
  assert.ok(counts['visualize-analyze'] >= 16, JSON.stringify(counts));
  assert.ok(counts['manage-secure'] >= 10, JSON.stringify(counts));
});
