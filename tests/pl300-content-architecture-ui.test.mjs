import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8')+fs.readFileSync(new URL('../assets/css/pl300.css',import.meta.url),'utf8');
const render=app.match(/function renderVoucherExam\(\)[\s\S]*?\n}\n\nasync function voucherRankedExamSpecs/)?.[0]||'';

test('PL-300 loads and stores content architecture through the Voucher flow',()=>{
  assert.match(app,/voucherContentArchitecture/);
  assert.match(app,/contentArchitectureFile/);
  assert.match(app,/buildVoucherContentArchitectureView/);
});

test('PL-300 landing makes ranked domains the primary path and sessions study sections',()=>{
  assert.match(render,/voucherArchitecturePanel/);
  assert.match(render,/Microsoft PL-300 — Ranked Learning/);
  assert.match(render,/Ranked Domains/);
  assert.match(render,/Study Sections/);
  assert.match(app,/data-voucher-domain/);
  assert.match(app,/SECTIONS inside this Domain/);
  assert.doesNotMatch(app,/data-voucher-session=/);
  assert.doesNotMatch(render,/id="voucherStartRealBtn"/);
  assert.doesNotMatch(render,/id="voucherStartFullRankedBtn"/);
  assert.doesNotMatch(render,/voucher-ranked-challenge/);
});

test('domain detail exposes one ranked Domain setup with instant or end feedback and Domain Ranking',()=>{
  assert.match(app,/id="voucherDomainStartBtn"/);
  assert.match(app,/id="voucherDomainRankingBtn"/);
  assert.match(app,/name="voucherDomainFeedback" value="instant"/);
  assert.match(app,/name="voucherDomainFeedback" value="exam"/);
  assert.match(app,/Instant Feedback/);
  assert.match(app,/Feedback at End/);
  assert.match(app,/Complete every released question in this Domain for an Official Domain Rank/);
  assert.doesNotMatch(app,/SESSION PRACTICE · NON-RANKED/);
  assert.doesNotMatch(app,/id="voucherSessionStartBtn"/);
  assert.doesNotMatch(app,/id="voucherSessionRankingBtn"/);
});

test('quick practice is secondary and explicitly non-ranked',()=>{
  assert.match(render,/class="voucher-more-practice"/);
  assert.match(render,/More Practice/);
  assert.match(render,/Quick Practice/);
  assert.match(render,/Custom subsets • Non-Ranked/);
});

test('content architecture has responsive token-based Domain and section-navigator styling',()=>{
  assert.match(css,/\.voucher-domain-grid/);
  assert.match(css,/\.voucher-domain-ranked-detail/);
  assert.match(css,/\.voucher-domain-section-nav/);
  assert.match(css,/\.voucher-domain-section-grid/);
  assert.match(css,/\.voucher-domain-nav-toggle/);
  assert.match(css,/\.voucher-ranked-learning-overview/);
  assert.match(css,/\[data-theme="dark"\][^{]*\.ranked-learning-hero|\[data-theme="dark"\] \.ranked-learning-hero/);
  assert.doesNotMatch(css,/voucher-domain-card[^}]*#[0-9a-f]{3,8}/i);
});

test('saved PL-300 ranked Domain restores the Domain and section context from content architecture',()=>{
  assert.match(app,/descriptor\.mockKind==="domain"[\s\S]*contentArchitectureFile[\s\S]*descriptor\.domainId/);
  assert.match(app,/domainRanked:Boolean\(descriptor\.domainRanked\)/);
  assert.match(app,/domainTitle/);
  assert.match(app,/sectionIds/);
});
