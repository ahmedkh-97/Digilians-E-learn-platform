import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('result renderer is defined once and has a ranked-Domain result branch',()=>{
  assert.equal((app.match(/function renderResult\(\)\{/g)||[]).length,1);
  assert.match(app,/rankedDomainResult/);
  assert.match(app,/voucherBestRankedDomainAttempt\(/);
  assert.match(app,/First-Pass|First Pass/);
  assert.match(app,/Official Domain Rank|Provisional/);
});

test('ranked-Domain result retake and ranking actions preserve the Domain',()=>{
  assert.match(app,/voucherMode===["']ranked-domain["']/);
  assert.match(app,/prepareVoucherRankedDomain\(voucherCtx\.domainId/);
  assert.match(app,/openVoucherDomainRanking\(voucherCtx\.trackId,voucherCtx\.voucherExamId,voucherCtx\.domainId\)/);
  assert.match(app,/Retake Domain/);
  assert.match(app,/Domain Ranking/);
});

test('legacy ranked-session results remain history-compatible but are no longer primary',()=>{
  assert.match(app,/rankedSessionResult/);
  assert.match(app,/Legacy Session Attempt/);
  assert.match(app,/Retake Legacy Session/);
});
