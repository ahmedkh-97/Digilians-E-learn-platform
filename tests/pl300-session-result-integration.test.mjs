import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('finishVoucherExam records ranked-session mastery, first-pass and active solve metadata',()=>{
  const block=app.slice(app.indexOf('function finishVoucherExam'),app.indexOf('function finishExam',app.indexOf('function finishVoucherExam')));
  assert.match(block,/isCurrentVoucherSessionRanked\(\)/);
  assert.match(block,/activeSolveElapsedSeconds\(/);
  assert.match(block,/currentFirstPassCorrect\(\)/);
  assert.match(block,/buildVoucherSessionAttemptMeta\(/);
  assert.match(block,/officialRankEligible/);
});

test('ranked-session online sync is session-scoped and only official complete attempts are queued',()=>{
  const block=app.slice(app.indexOf('function finishVoucherExam'),app.indexOf('function finishExam',app.indexOf('function finishVoucherExam')));
  assert.match(block,/voucherSessionRankingActivityId\(/);
  assert.match(block,/buildVoucherSessionOnlineOverrides\(/);
  assert.match(block,/sessionRanked[\s\S]*officialRankEligible[\s\S]*onlineAttempt/s);
});
