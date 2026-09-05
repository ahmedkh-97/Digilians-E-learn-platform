import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('PL-300 primary surface is Domain Ranked Learning instead of legacy 60Q/full-bank/session ranking blocks',()=>{
  assert.match(app,/Microsoft PL-300 — Ranked Learning|PL-300 Ranked Learning/);
  assert.match(app,/Start \/ Resume Domain/);
  assert.match(app,/Instant Feedback/);
  assert.match(app,/Feedback at End/);
  assert.match(app,/View Domain Ranking/);
  assert.match(app,/SECTIONS inside this Domain/);
  assert.doesNotMatch(app,/id="voucherSessionStartBtn"/);
  assert.doesNotMatch(app,/id="voucherSessionRankingBtn"/);
  assert.doesNotMatch(app,/id="voucherStartRealBtn"/);
  assert.doesNotMatch(app,/id="voucherStartFullRankedBtn"/);
  assert.doesNotMatch(app,/PRIMARY PATH · RANKED/);
  assert.doesNotMatch(app,/FULL BANK · RANKED EXAM/);
});

test('legacy custom practice is demoted under More Practice and remains non-ranked',()=>{
  assert.match(app,/More Practice/);
  assert.match(app,/Quick Practice/);
  assert.match(app,/Non-Ranked/);
});
