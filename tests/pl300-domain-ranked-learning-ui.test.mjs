import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8');

const architectureBlock=app.slice(app.indexOf('function renderVoucherArchitecturePanel'),app.indexOf('async function prepareVoucherRankedSession'));

test('PL-300 primary architecture makes the selected domain the ranked activity and sessions section previews only',()=>{
  assert.match(architectureBlock,/RANKED DOMAIN/);
  assert.match(architectureBlock,/Start \/ Resume Domain|Start Domain|Resume Domain/);
  assert.match(architectureBlock,/View Domain Ranking/);
  assert.match(architectureBlock,/Instant Feedback/);
  assert.match(architectureBlock,/Feedback at End/);
  assert.match(architectureBlock,/Sections inside this Domain|SECTIONS/);
  assert.doesNotMatch(architectureBlock,/voucherSessionStartBtn/);
  assert.doesNotMatch(architectureBlock,/View Session Ranking/);
  assert.doesNotMatch(architectureBlock,/Start \/ Continue Session/);
});

test('domain start uses prepareVoucherRankedDomain and not session-size mock validation',()=>{
  assert.match(app,/async function prepareVoucherRankedDomain\(/);
  assert.match(app,/mockKind:\s*"domain"/);
  assert.match(app,/sizeMode:\s*"domain"/);
  assert.match(app,/domainRanked:\s*true/);
  assert.match(app,/questionsForVoucherDomain/);
});

test('exam view supports grouped domain section navigator on desktop and a mobile drawer trigger',()=>{
  assert.match(index,/voucherDomainSectionNav/);
  assert.match(index,/voucherDomainNavToggle/);
  assert.match(css,/voucher-domain-section-nav/);
  assert.match(css,/voucher-domain-nav-toggle/);
  assert.match(css,/@media[^}]*max-width[\s\S]*voucher-domain-section-nav/);
});
