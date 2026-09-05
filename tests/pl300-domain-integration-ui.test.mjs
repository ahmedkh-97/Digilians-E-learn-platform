import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const context=fs.readFileSync(new URL('../assets/js/exam-context.js',import.meta.url),'utf8');

test('domain ranked exam replaces flat navigator with grouped section navigator and mobile drawer behavior',()=>{
  assert.match(app,/function renderVoucherDomainQuestionNavigator\(/);
  assert.match(app,/buildQuestionNavigator\(\)[\s\S]*isCurrentVoucherDomainRanked\(\)/);
  assert.match(app,/buildVoucherDomainNavigatorModel\(/);
  assert.match(app,/voucherDomainNavToggle[\s\S]*domain-nav-open/);
});

test('domain resume reconstructs architecture and ranked domain identity',()=>{
  const block=app.slice(app.indexOf('async function reconstructVoucherProgress'),app.indexOf('async function resumeProgress'));
  assert.match(block,/descriptor\.mockKind==="domain"/);
  assert.match(block,/findVoucherContentArchitectureDomain/);
  assert.match(block,/domainRanked:Boolean\(descriptor\.domainRanked\)/);
  assert.match(block,/domainTitle/);
  assert.match(block,/sectionIds/);
});

test('voucher finish path creates official domain rank metadata and domain shared leaderboard payload',()=>{
  const block=app.slice(app.indexOf('function finishVoucherExam'),app.indexOf('function finishExam'));
  assert.match(block,/const domainRanked=isCurrentVoucherDomainRanked\(\)/);
  assert.match(block,/buildVoucherDomainAttemptMeta\(/);
  assert.match(block,/voucherDomainRankingActivityId\(/);
  assert.match(block,/buildVoucherDomainOnlineOverrides\(/);
});

test('domain ranking has dedicated open load spec and render mode',()=>{
  assert.match(app,/async function voucherDomainRankingSpec\(/);
  assert.match(app,/async function loadVoucherDomainRanking\(/);
  assert.match(app,/function openVoucherDomainRanking\(/);
  assert.match(app,/mode==="domain"/);
  assert.match(app,/Domain Ranking/);
});

test('result screen recognizes ranked-domain and provides domain retake ranking and section breakdown context',()=>{
  const block=app.slice(app.indexOf('function renderResult'),app.indexOf('function renderReview'));
  assert.match(block,/rankedDomainResult/);
  assert.match(block,/Official Domain Rank/);
  assert.match(block,/Retake Domain/);
  assert.match(app,/voucherMode==="ranked-domain"[\s\S]*prepareVoucherRankedDomain/);
  assert.match(app,/voucherMode==="ranked-domain"[\s\S]*openVoucherDomainRanking/);
});

test('voucher exam context supports domain and section labels',()=>{
  assert.match(context,/domainTitle/);
  assert.match(context,/sectionTitle|visibleTopic/);
});


test('PL-300 Domain Ranked Learning exposes a real Overall Ranking built from all four Domain leaderboards',()=>{
  assert.match(app,/id="voucherOverallRankingBtn"/);
  assert.match(app,/function openVoucherOverallRanking\(/);
  assert.match(app,/async function loadVoucherOverallRanking\(/);
  assert.match(app,/buildVoucherOverallLeaderboard/);
  assert.match(app,/PL-300 Overall Ranking/);
});
