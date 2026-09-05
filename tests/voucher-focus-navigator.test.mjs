import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8');

test('Voucher focus mode keeps the primary topbar visible',()=>{
  assert.match(app,/function setVoucherFocusMode\(/);
  assert.match(app,/voucher-focus-mode/);
  assert.doesNotMatch(css,/\.voucher-focus-mode\s+\.topbar\s*\{[^}]*display\s*:\s*none/i);
  assert.match(app,/setVoucherFocusMode\(id==="examView"/);
});

test('Voucher navigator exposes status summary and four filters',()=>{
  assert.match(html,/id="voucherNavSummary"/);
  for(const filter of ['all','unanswered','answered','marked'])assert.match(html,new RegExp(`data-voucher-nav-filter="${filter}"`));
  assert.match(app,/function setVoucherNavigatorFilter\(/);
  assert.match(app,/function voucherQuestionStatus\(/);
  assert.match(app,/Answered .*Remaining/);
});

test('Question navigation scrolls to question card rather than page top',()=>{
  assert.match(app,/function scrollToQuestionCard\(/);
  assert.match(app,/scrollIntoView\(\{behavior:"auto",block:"start"\}\)/);
  const handlers=app.match(/\$\("prevQuestionBtn"\)[\s\S]*?\$\("submitExamBtn"\)/)?.[0]||'';
  assert.match(handlers,/scrollToQuestionCard/);
});

test('Ranked navigator answered state is based on confirmed answers',()=>{
  assert.match(app,/rankedLearning[\s\S]{0,500}isCurrentQuestionConfirmed/);
  assert.match(html,/id="voucherSelectionStatus"[^>]*aria-live="polite"/);
});


test('PL-300 grouped Domain navigator derives Correct/Wrong status in Instant Feedback and renders it without losing Marked state',()=>{
  const statusBlock=app.match(/function voucherQuestionStatus\(q\)\{[\s\S]*?\n\}/)?.[0]||'';
  assert.match(statusBlock,/feedbackMode\s*!==?\s*["']instant["']|feedbackMode\s*===?\s*["']instant["']/);
  assert.match(statusBlock,/isAnswerCorrect\(/);
  const renderer=app.match(/function renderVoucherDomainQuestionNavigator\(\)\{[\s\S]*?\n\}/)?.[0]||'';
  assert.match(renderer,/entry\.visualStatus/);
  assert.match(renderer,/entry\.marked[\s\S]*marked/);
});
