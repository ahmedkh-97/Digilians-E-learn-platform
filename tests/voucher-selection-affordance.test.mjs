import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8');

test('Voucher surfaces map their legacy border token to the platform line token',()=>{
  assert.match(css,/#voucherView,#voucherTrackView,#voucherExamView,#voucherRankingView\{--accent:var\(--primary\);--border:var\(--line\)\}/);
});

test('Custom Practice explicitly tells learners that question counts are selectable controls',()=>{
  assert.match(app,/voucher-size-picker-head/);
  assert.match(app,/Choose number of questions/);
  assert.match(app,/Select one option to continue/);
});

test('Practice size cards expose strong default, hover, focus and selected affordances',()=>{
  const base=css.match(/\.voucher-size-btn\{[^}]*\}/)?.[0]||'';
  assert.match(base,/position:relative/);
  assert.match(base,/border:2px solid var\(--line-strong\)/);
  assert.match(base,/background:var\(--surface-solid\)/);
  assert.match(css,/@media\(hover:hover\) and \(pointer:fine\)\{[^}]*\.voucher-size-btn:hover/);
  assert.match(css,/\.voucher-size-btn:focus-visible\{[^}]*outline:/);
  assert.match(css,/\.voucher-size-btn\.active::after\{[^}]*content:"✓"/);
});

test('Practice size cards have dedicated dark-mode default, hover and selected treatments',()=>{
  assert.match(css,/\[data-theme="dark"\] \.voucher-size-btn\{[^}]*background:var\(--surface-soft\)/);
  assert.match(css,/\[data-theme="dark"\] \.voucher-size-btn\.active\{[^}]*background:color-mix\(in srgb,var\(--primary\) 28%,var\(--surface-solid\)\)[^}]*color:var\(--text\)/);
});
