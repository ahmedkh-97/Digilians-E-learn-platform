import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('ranked Domain completion records Domain mastery, first pass, active solve and scoped ranking ID',()=>{
  const block=app.match(/function finishVoucherExam\([\s\S]*?\n}\n\nfunction finishExam/)?.[0]||'';
  assert.match(block,/rankedMeta=buildVoucherDomainAttemptMeta/);
  assert.match(block,/voucherMode:rankedMeta\?\.voucherMode\|\|mode\.resultMode/);
  assert.match(block,/solveTimePolicy:activeSolveRanked\?"active-solve"/);
  assert.match(block,/currentFirstPassCorrect\(\)/);
  assert.match(block,/voucherDomainRankingActivityId\(ctx\.trackId,ctx\.voucherExamId,ctx\.domainId\)/);
  assert.match(block,/if\(domainRanked&&record\.officialRankEligible\)/);
  assert.match(block,/buildVoucherDomainOnlineOverrides/);
});

test('legacy challenge and full-bank activity IDs remain in completion code only for historical compatibility',()=>{
  const block=app.match(/function finishVoucherExam\([\s\S]*?\n}\n\nfunction finishExam/)?.[0]||'';
  assert.match(block,/else if\(!activeSolveRanked&&rankEligible\)/);
  assert.match(block,/voucherRankingActivityId\(ctx\.trackId,ctx\.voucherExamId,ctx\.fullBankRanked\?"full-bank":"real"\)/);
});

test('ranked Domain result exposes Retake Domain, Domain Ranking and My Mistakes while hiding improvement',()=>{
  assert.match(html,/id="voucherResultImproveBtn"/);
  assert.match(app,/rankedDomainResult\?"Retake Domain"/);
  assert.match(app,/openVoucherDomainRanking\(voucherCtx\.trackId,voucherCtx\.voucherExamId,voucherCtx\.domainId\)/);
  assert.match(app,/viewMistakesBtn/);
  assert.match(app,/voucherResultImproveBtn[^\n]*classList\.toggle\("hidden",rankedDomainResult\|\|/);
});

test('Voucher attempt history distinguishes official, provisional, practice and legacy attempts',()=>{
  assert.match(app,/Official|OFFICIAL/);
  assert.match(app,/Provisional|PROVISIONAL/);
  assert.match(app,/Legacy Attempt|Legacy Session Attempt/);
  assert.match(app,/First pass/);
  assert.match(app,/Active solve/);
});
