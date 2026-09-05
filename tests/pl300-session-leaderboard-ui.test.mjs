import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('PL-300 session ranking has a session-scoped loader and opener',()=>{
  assert.match(app,/async function voucherSessionRankingSpec\(/);
  assert.match(app,/async function loadVoucherSessionRanking\(/);
  assert.match(app,/function openVoucherSessionRanking\(/);
  assert.match(app,/voucherSessionRankingActivityId\(/);
  assert.match(app,/buildVoucherSessionLeaderboard\(/);
});

test('session leaderboard copy explains mastery, first pass, attempts and active solve time',()=>{
  assert.match(app,/Session Ranking/);
  assert.match(app,/Mastery[\s\S]*First Pass[\s\S]*Attempts[\s\S]*Active Solve Time/s);
  assert.match(app,/Complete the full session to join/i);
});
