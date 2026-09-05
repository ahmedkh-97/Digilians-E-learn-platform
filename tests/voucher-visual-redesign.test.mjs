import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8');

test('Voucher hub uses a premium hero with capability highlights',()=>{
  assert.match(html,/voucher-hero/);
  assert.match(html,/voucher-hero-kicker/);
  assert.match(html,/voucher-hero-highlights/);
  assert.match(html,/Real Exam Ranking/);
  assert.match(html,/Detailed Explanations/);
});

test('Voucher track cards expose track-specific visual tone and richer coming-soon state',()=>{
  assert.match(app,/voucherTrackPresentation/);
  assert.match(app,/data-voucher-tone=/);
  assert.match(app,/voucher-track-number/);
  assert.match(app,/voucher-track-meta/);
  assert.match(app,/voucher-coming-soon-panel/);
});

test('Voucher redesign provides premium interaction styling without hiding content',()=>{
  assert.match(css,/\.voucher-hero\{/);
  assert.match(css,/\.voucher-track-card::before/);
  assert.match(css,/@media\(hover:hover\) and \(pointer:fine\)/);
  assert.match(css,/\.voucher-track-card:hover/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
