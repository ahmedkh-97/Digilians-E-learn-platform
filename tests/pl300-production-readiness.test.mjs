import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const bank=JSON.parse(fs.readFileSync(new URL('draft-master-bank.json',root),'utf8'));

test('PL-300 production subset is fail-closed, current-scope and large enough for all configured mock sizes',()=>{
  const ready=bank.questions.filter(q=>q.productionReady===true);
  assert.ok(ready.length>=100,`expected >=100 production-ready questions, got ${ready.length}`);
  assert.ok(ready.every(q=>q.explanationStatus==='reviewed-ar'));
  assert.ok(ready.every(q=>q.deepExplanation?.summary?.length>=120));
  assert.ok(ready.every(q=>q.verification?.status==='approved-for-production'));
  assert.ok(ready.every(q=>!/^Introductory Info Case Study/i.test(q.question)));
  assert.ok(ready.every(q=>!/Power View|\bQ&A\b/i.test(q.question)));
});

test('production subset supports the fixed 60-question real-exam quota after domain review',()=>{
  const ready=bank.questions.filter(q=>q.productionReady===true);
  const count=id=>ready.filter(q=>q.topicId===id).length;
  assert.ok(count('prepare-data')>=17,`prepare=${count('prepare-data')}`);
  assert.ok(count('model-data')>=17,`model=${count('model-data')}`);
  assert.ok(count('visualize-analyze')>=16,`visualize=${count('visualize-analyze')}`);
  assert.ok(count('manage-secure')>=10,`manage=${count('manage-secure')}`);
});

test('non-production questions stay excluded from Random and Real generation by the existing fail-closed engine',()=>{
  const notReady=bank.questions.filter(q=>q.productionReady!==true);
  assert.ok(notReady.length>0,'expected remaining draft questions for later review');
  assert.ok(notReady.every(q=>q.productionReady===false));
});
