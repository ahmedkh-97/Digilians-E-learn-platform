import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredRuntime=[
  'assets/js/voucher-content-architecture.js',
  'voucher/tracks/data-analysis/microsoft-pl-300/content-architecture.json'
];

for(const [file,label] of [
  ['tools/quick-local-check.mjs','Quick Check'],
  ['tools/pre-deploy-check.mjs','Pre-Deploy']
]){
  test(`${label} requires the PL-300 content architecture runtime and registry`,()=>{
    const text=fs.readFileSync(file,'utf8');
    for(const marker of requiredRuntime){
      assert.ok(text.includes(marker),`${label} missing ${marker}`);
    }
  });
}

test('Quick Check runs focused PL-300 content architecture regressions',()=>{
  const text=fs.readFileSync('tools/quick-local-check.mjs','utf8');
  for(const marker of [
    'tests/pl300-content-architecture.test.mjs',
    'tests/voucher-content-architecture-runtime.test.mjs',
    'tests/pl300-content-architecture-ui.test.mjs',
    'tests/pl300-session-practice.test.mjs'
  ]) assert.ok(text.includes(marker),`Quick Check missing focused regression ${marker}`);
});

test('Windows Basic Check requires the PL-300 architecture module and registry',()=>{
  const text=fs.readFileSync('tools/windows-basic-check.ps1','utf8');
  for(const marker of [
    'assets\\js\\voucher-content-architecture.js',
    'voucher\\tracks\\data-analysis\\microsoft-pl-300\\content-architecture.json'
  ]) assert.ok(text.includes(marker),`Windows Basic Check missing ${marker}`);
});
