import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8')+fs.readFileSync(new URL('../assets/css/pl300.css',import.meta.url),'utf8');
const render=app.match(/function renderVoucherExam\(\)[\s\S]*?\n}\n\nasync function voucherRankedExamSpecs/)?.[0]||'';

test('PL-300 launches full ranked sessions directly through the prepared exam flow',()=>{
  assert.match(app,/function launchPreparedVoucherExam\(/);
  assert.match(app,/async function prepareVoucherRankedSession\(/);
  assert.match(app,/sessionRanked:true/);
  assert.match(app,/allowedQuestionIds/);
  assert.match(app,/rankedLearning:true/);
  const prep=app.match(/async function prepareVoucherMock\([\s\S]*?\n}\n\nasync function prepareExam/)?.[0]||'';
  assert.doesNotMatch(prep,/configureExamSetup\(payload,state\.currentRegistryItem/);
});

test('PL-300 primary hierarchy is ranked learning first instead of challenge first',()=>{
  assert.match(render,/Microsoft PL-300 — Ranked Learning/);
  assert.match(render,/id="voucherArchitecturePanel"/);
  assert.match(render,/Ranked Learning History/);
  assert.match(render,/class="voucher-more-practice"/);
  assert.doesNotMatch(render,/voucher-readiness-dashboard/);
  assert.doesNotMatch(render,/voucher-ranked-challenge/);
  assert.doesNotMatch(render,/voucher-improvement-section/);
  assert.doesNotMatch(render,/id="voucherStartRealBtn"/);
  assert.doesNotMatch(render,/id="voucherStartFullRankedBtn"/);
});

test('ranked-learning controls preserve accessible dialog, live regions and text-labelled states',()=>{
  assert.match(html,/id="voucherSavedAttemptDialog"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html,/id="voucherSelectionStatus"[^>]*aria-live="polite"/);
  assert.match(html,/id="voucherNavSummary"[^>]*aria-live="polite"/);
  for(const filter of ['all','unanswered','answered','marked']){
    assert.match(html,new RegExp(`data-voucher-nav-filter="${filter}"[^>]*aria-pressed=`));
  }
  assert.match(app,/Confirm Answer/);
  assert.match(app,/Instant Feedback/);
  assert.match(app,/Feedback at End/);
  assert.match(css,/\.voucher-ranked-session-choice/);
  assert.match(css,/@media\(max-width:620px\)[\s\S]*voucher-ranked-learning-stats/);
});
