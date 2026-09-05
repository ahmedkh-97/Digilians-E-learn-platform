import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=rel=>fs.readFileSync(new URL(`../${rel}`,import.meta.url),'utf8');
const quick=read('tools/quick-local-check.mjs');
const pre=read('tools/pre-deploy-check.mjs');
const win=read('tools/windows-basic-check.ps1');

test('local and pre-deploy QA require ranked learning and domain-ranked runtime cores',()=>{
  for(const text of [quick,pre]){
    assert.match(text,/assets\/js\/voucher-ranked-learning\.js/);
    assert.match(text,/assets\/js\/voucher-domain-ranked-learning\.js/);
    assert.match(text,/assets\/js\/voucher-domain-navigation\.js/);
  }
  assert.match(win,/voucher-ranked-learning\.js/);
  assert.match(win,/voucher-domain-ranked-learning\.js/);
  assert.match(win,/voucher-domain-navigation\.js/);
});

test('quick QA executes domain-ranked and release-identity focused tests',()=>{
  assert.match(quick,/release-identity-gate\.test\.mjs/);
  assert.match(quick,/voucher-ranked-learning\.test\.mjs/);
  assert.match(quick,/pl300-ranked-session-runtime\.test\.mjs/);
  assert.match(quick,/pl300-ranked-session-feedback-navigation\.test\.mjs/);
  assert.match(quick,/pl300-domain-ranked-learning\.test\.mjs/);
  assert.match(quick,/pl300-domain-navigation\.test\.mjs/);
  assert.match(quick,/pl300-domain-ranked-learning-ui\.test\.mjs/);
  assert.match(quick,/pl300-domain-integration-ui\.test\.mjs/);
  assert.match(pre,/release-identity-gate\.test\.mjs/);
});
