import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/pl300.css',import.meta.url),'utf8');
const fullRank=fs.readFileSync(new URL('../assets/js/pl300-full-ranked-learning.js',import.meta.url),'utf8');
const version=fs.readFileSync(new URL('../VERSION.txt',import.meta.url),'utf8').trim();

test('PL-300 landing makes the 509-question ranked journey primary and visible',()=>{
  assert.match(fullRank,/Full Ranked Bank[^\n]*509 Questions/);
  assert.match(fullRank,/id="pl300FullRankCompletion"/);
  assert.match(fullRank,/id="pl300FullRankAccuracy"/);
  assert.match(fullRank,/id="pl300FullRankStartBtn"/);
  assert.match(fullRank,/id="pl300FullRankRankingBtn"/);
  assert.match(fullRank,/369[^\n]*Source 01/);
  assert.match(fullRank,/140[^\n]*Source 02/);
  assert.match(fullRank,/265[^\n]*Validated/);
  assert.match(css,/\.pl300-full-ranked-card/);
});

test('PL-300 full ranked learning loads both source banks into one 509-question journey',()=>{
  assert.match(app,/async function openVoucherFullRankedLearning/);
  assert.match(app,/Promise\.all\(/);
  assert.match(app,/sourceReviewSources/);
  assert.match(app,/questionCount:509|fullRankedLearning\?\.questionCount/);
  assert.match(fullRank,/filterButton\('source-01','Source 01'/);
  assert.match(fullRank,/filterButton\('source-02','Source 02'/);
  assert.match(fullRank,/filterButton\('objective','Objective'/);
  assert.match(fullRank,/filterButton\('checkpoint','Checkpoints'/);
});

test('ranked study checkpoints require evidence review and never expose self-awarded competitive correctness',()=>{
  assert.match(fullRank,/id="sourcePracticeCheckpointBtn"/);
  assert.match(fullRank,/إكمال نقطة المذاكرة/);
  assert.match(app,/mode:"checkpoint"/);
  assert.match(app,/reviewStatus:"reviewed"/);
  assert.doesNotMatch(app,/data-source-self-grade/);
  assert.doesNotMatch(app,/SELF-GRADED PRACTICE/);
});

test('PL-300 full ranked UI consumes completion-first metrics from the dedicated lazy module',()=>{
  assert.ok(app.includes(`pl300-full-ranked-learning.js?v=${version}`));
  assert.match(app,/buildPl300FullRankMetrics/);
  assert.match(app,/voucherFullRankedIndex/);
  assert.match(fullRank,/Validated Accuracy/);
  assert.match(fullRank,/Study Checkpoint/);
});


test('full ranked source-review presentation is lazy-rendered by the PL-300 module instead of inflating startup app payload',()=>{
  assert.match(fullRank,/export function buildPl300FullRankedReviewMarkup/);
  assert.match(fullRank,/export function buildPl300FullRankedAnswerMarkup/);
  assert.match(fullRank,/filterButton\('source-01','Source 01'/);
  assert.match(fullRank,/RANKED STUDY CHECKPOINT/);
  assert.match(app,/buildPl300FullRankedReviewMarkup/);
  assert.match(app,/buildPl300FullRankedAnswerMarkup/);
  assert.doesNotMatch(app,/FULL RANKED LEARNING · 509\/509<\/span><h2>/);
});
