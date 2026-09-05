import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const appPath=path.join(process.cwd(),'assets/js/app.js');

const requiredExports=[
  'validateVoucherRegistry','validateVoucherTrackRegistry','validateVoucherExamConfig','trackAvailability',
  'selectVoucherQuestions','shuffleVoucherOptions','buildVoucherExamPayload',
  'getVoucherSeenQuestionIds','markVoucherQuestionsSeen','saveVoucherAttempt','getBestVoucherAttempt','getVoucherAttempts',
  'voucherRankingActivityId','isVoucherRankEligibleAttempt','buildVoucherExamLeaderboard','buildVoucherTrackOverallLeaderboard',
  'VOUCHER_TIMER_PHASE_SOLVING','VOUCHER_TIMER_PHASE_FEEDBACK','voucherTimerPhaseForQuestion','applyVoucherRankedAwayTime','voucherRankedSolveTimeSeconds',
  'voucherReadinessLevel','voucherRankedImprovement','voucherWeakDomains','voucherNextRankTarget','selectVoucherImprovementQuestions'
];

test('voucher engine facade exposes the existing app-facing voucher core contract',async()=>{
  const engine=await import(`../assets/js/voucher-engine.js?t=${Date.now()}-${Math.random()}`);
  for(const name of requiredExports)assert.ok(name in engine,`missing ${name}`);
});

test('app imports voucher core through the voucher engine facade only',()=>{
  const app=fs.readFileSync(appPath,'utf8');
  assert.match(app,/from\s+["']\.\/voucher-engine\.js\?v=/);
  for(const file of ['voucher-registry.js','voucher-bank-engine.js','voucher-storage.js','voucher-ranking.js','voucher-ranked-runtime.js','voucher-learning.js']){
    assert.doesNotMatch(app,new RegExp(`from\\s+["']\\.\\/${file.replace('.','\\.')}\\?v=`),`${file} must be behind voucher-engine.js`);
  }
});
