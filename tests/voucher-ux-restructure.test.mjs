import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8')+fs.readFileSync(new URL('../assets/css/pl300.css',import.meta.url),'utf8');
const registry=JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/registry.json',import.meta.url),'utf8'));
const render=app.match(/function renderVoucherExam\(\)[\s\S]*?\n}\n\nasync function voucherRankedExamSpecs/)?.[0]||'';

test('Voucher child navigation resets scroll instantly instead of smooth-scrolling through the next view',()=>{
  assert.match(app,/function resetVoucherRouteScroll\(/);
  assert.match(app,/behavior:\s*["']auto["']/);
  assert.match(app,/resetVoucherRouteScroll\(id\)/);
});

test('Voucher track exam cards hydrate reviewed count from exam config rather than stale registry copy',()=>{
  assert.match(app,/masterBankQuestionCount/);
  assert.match(app,/renderVoucherTrackExamCard/);
  assert.doesNotMatch(registry.exams[0].subtitle,/\b101 reviewed questions\b/i);
});

test('Quick Practice sizes remain available only as a secondary non-ranked tool',()=>{
  const fn=app.slice(app.indexOf('function voucherRandomSizeButtons'),app.indexOf('function renderVoucherExam'));
  assert.doesNotMatch(fn,/data-voucher-size="real"/);
  assert.match(fn,/Full Reviewed Bank/);
  assert.match(render,/class="voucher-more-practice"/);
  assert.match(render,/Custom subsets • Non-Ranked/);
});

test('PL-300 primary hierarchy is Ranked Learning with Domains and Sections, not legacy challenge or Session-ranked blocks',()=>{
  assert.match(render,/Microsoft PL-300 — Ranked Learning/);
  assert.match(render,/voucherArchitecturePanel/);
  assert.match(app,/voucher-ranked-learning-overview domain-ranked/);
  assert.match(app,/voucher-domain-grid compact/);
  assert.match(app,/SECTIONS inside this Domain/);
  assert.doesNotMatch(app,/voucher-session-grid ranked-learning/);
  assert.doesNotMatch(render,/voucher-readiness-dashboard/);
  assert.doesNotMatch(render,/voucher-ranked-challenge/);
  assert.doesNotMatch(render,/voucher-improvement-section/);
  assert.doesNotMatch(render,/id="voucherStartFullRankedBtn"/);
});

test('Voucher layout supports Domain Ranked Learning, grouped section navigator, secondary source review and mobile cards',()=>{
  assert.match(css,/\.voucher-source-strip/);
  assert.match(css,/\.voucher-empty-compact/);
  assert.match(css,/\.voucher-exam-card\.is-featured/);
  assert.match(css,/\.voucher-ranked-learning-overview/);
  assert.match(css,/\.voucher-domain-ranked-detail/);
  assert.match(css,/\.voucher-domain-section-nav/);
  assert.match(css,/\.voucher-domain-nav-toggle/);
  assert.match(css,/\.voucher-more-practice/);
});
