import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8');

test('Voucher surfaces define a valid accent token so selected practice sizes remain visible',()=>{
  assert.match(css,/#voucherView,#voucherTrackView,#voucherExamView,#voucherRankingView\{--accent:var\(--primary\);--border:var\(--line\)\}/);
  assert.match(css,/\.voucher-size-btn\.active\{[^}]*background:var\(--accent\)[^}]*color:#fff/);
});

test('Multi-select confirm clearly distinguishes incomplete, ready and confirmed states',()=>{
  const render=app.match(/const confirm=\$\("multiSelectConfirmBtn"\);[\s\S]*?renderInstantFeedback\(q\);/)?.[0]||'';
  assert.match(render,/Select \$\{required\} answers first/);
  assert.match(render,/Select \$\{required-selectedCount\} more answer/);
  assert.match(render,/Confirm Answer ✓/);
  assert.match(render,/classList\.toggle\("is-ready"/);
  assert.match(render,/classList\.toggle\("is-confirmed"/);
  assert.match(css,/\.multi-select-confirm:disabled:not\(\.is-confirmed\)/);
});

test('Voucher instant feedback exposes sticky question navigation and scrolls feedback into view',()=>{
  const render=app.match(/function renderQuestion\(\)[\s\S]*?\n}\nfunction isCurrentVoucherRankedLearning/)?.[0]||'';
  assert.match(render,/voucher-sticky-actions/);
  assert.match(css,/\.exam-actions\.voucher-sticky-actions\{[^}]*position:sticky[^}]*bottom:/);
  assert.match(app,/function scrollVoucherFeedbackIntoView\(/);
  const select=app.match(/function selectAnswer\([\s\S]*?\n}\nfunction toggleMultiSelectAnswer/)?.[0]||'';
  assert.match(select,/scrollVoucherFeedbackIntoView\(\)/);
  const confirm=app.match(/function confirmVoucherRankedAnswer\([\s\S]*?\n}\nfunction handleVoucherAnswerConfirm/)?.[0]||'';
  assert.match(confirm,/scrollVoucherFeedbackIntoView\(\)/);
});
