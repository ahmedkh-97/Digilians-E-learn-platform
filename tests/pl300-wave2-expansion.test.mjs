import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bank = JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/draft-master-bank.json', import.meta.url), 'utf8'));
const questions = bank.questions || [];
const ready = questions.filter(q => q.productionReady === true);
const key = q => `${q.canonicalSourceRef?.sourceId}:${q.canonicalSourceRef?.questionNumber}`;
const byKey = k => questions.find(q => key(q) === k);

const approvedStandaloneSource2 = new Set([
  'source-02:42','source-02:102','source-02:307',
  'source-02:275','source-02:286','source-02:327','source-02:346','source-02:358','source-02:360','source-02:381','source-02:391','source-02:88','source-02:135','source-02:342'
]);

test('PL-300 Wave 2 expands the reviewed current-scope bank beyond 170 questions', () => {
  assert.ok(ready.length >= 170, `expected >=170 reviewed questions, got ${ready.length}`);
  for (const k of ['source-01:10','source-01:32','source-01:48','source-01:105','source-01:80','source-01:121','source-01:236','source-01:245','source-01:264']) {
    assert.equal(byKey(k)?.productionReady, true, `${k} should be reviewed in Wave 2`);
  }
});

test('Wave 2 remains fail-closed for known unresolved or stale answer-key conflicts', () => {
  for (const k of ['source-01:327','source-01:53','source-02:173','source-02:184','source-02:187','source-02:204','source-02:260','source-02:370']) {
    assert.equal(byKey(k)?.productionReady, false, `${k} must remain draft pending correction/review`);
  }
});

test('standalone Source 2 production remains an explicit reviewed allowlist', () => {
  const offenders = ready.filter(q => {
    const sourceIds = new Set((q.sourceRefs || []).map(r => r.sourceId));
    return sourceIds.size === 1 && q.canonicalSourceRef?.sourceId === 'source-02' && !approvedStandaloneSource2.has(key(q));
  });
  assert.deepEqual(offenders.map(key), []);
});

test('Wave 2 does not admit legacy/out-of-scope or incomplete case-study payloads', () => {
  const bad = ready.filter(q => /^Introductory Info Case Study/i.test(q.question) || /Power View|\bQ&A\b/i.test(q.question));
  assert.deepEqual(bad.map(key), []);
});
