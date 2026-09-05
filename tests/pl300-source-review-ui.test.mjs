import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const fullRank=fs.readFileSync(new URL('../assets/js/pl300-full-ranked-learning.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('PL-300 full source view is the dedicated 509-question ranked learning journey',()=>{
  assert.match(html,/id="voucherSourceReviewView"/);
  assert.match(html,/id="voucherSourceReviewBody"/);
  assert.match(app,/function renderVoucherSourceReview\(/);
  assert.match(app,/openVoucherFullRankedLearning\(/);
  assert.match(fullRank,/FULL RANKED LEARNING · 509\/509/);
});

test('PL-300 landing opens both source PDFs through one full-ranked entry point',()=>{
  assert.match(app,/sourceReviewSources/);
  assert.match(app,/Promise\.all\(/);
  assert.match(app,/pl300FullRankStartBtn/);
  assert.match(app,/openVoucherFullRankedLearning\(\{filter:"all",continueIncomplete:true\}\)/);
});
