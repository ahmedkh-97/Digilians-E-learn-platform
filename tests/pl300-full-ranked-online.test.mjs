import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('full ranked learning syncs completion-first snapshots using the existing attempts transport',()=>{
  assert.match(app,/async function syncPl300FullRankSnapshot/);
  assert.match(app,/buildPl300FullRankOnlineAttempt/);
  assert.match(app,/submitAttemptOnline\(payload\)/);
  assert.match(app,/schedulePl300FullRankSync/);
});

test('full ranked leaderboard uses the dedicated activity and completion-first board builder',()=>{
  assert.match(app,/async function loadVoucherFullRankedLearningRanking/);
  assert.match(app,/pl300FullRankActivityId/);
  assert.match(app,/buildPl300FullRankLeaderboard/);
  assert.match(app,/Completion → Validated Mastery → First Pass → Attempts-to-Best → Active Solve Time/);
});

test('full ranked ranking can be opened from the PL-300 landing and returns to the exam landing',()=>{
  assert.match(app,/function openVoucherFullRankedLearningRanking/);
  assert.match(app,/voucherRankingMode="full-ranked-learning"/);
  assert.match(app,/state\.voucherRankingMode==="full-ranked-learning"/);
});
