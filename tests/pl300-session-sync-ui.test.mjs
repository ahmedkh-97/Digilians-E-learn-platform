import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('finished ranked-session sync rebuilds the smart session leaderboard instead of trusting generic exam order',()=>{
  const block=app.slice(app.indexOf('async function syncFinishedAttempt'),app.indexOf('function setResultSyncUI'));
  assert.match(block,/::session::/);
  assert.match(block,/fetchAttemptsForExamIds/);
  assert.match(block,/buildVoucherSessionLeaderboard/);
});

test('result sync status can explain first-pass session tie-break data',()=>{
  const block=app.slice(app.indexOf('function setResultSyncUI'),app.indexOf('function calculateSubjectBreakdown'));
  assert.match(block,/firstPassPercentage/);
  assert.match(block,/First Pass/);
  assert.match(block,/attemptCount/);
});
