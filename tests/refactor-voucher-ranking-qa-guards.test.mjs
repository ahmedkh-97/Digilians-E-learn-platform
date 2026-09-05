import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

for(const [file,label] of [
  ['tools/quick-local-check.mjs','Quick Check'],
  ['tools/pre-deploy-check.mjs','Pre-Deploy'],
  ['tools/windows-basic-check.ps1','Windows Basic Check']
]){
  test(`${label} requires the Phase 4 core modules`,()=>{
    const text=fs.readFileSync(file,'utf8');
    assert.match(text,/voucher-engine\.js/);
    assert.match(text,/ranking-scopes\.js/);
  });
}
