import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('final architecture audit is a permanent pre-deploy gate',()=>{
  assert.equal(fs.existsSync('tools/architecture-check.mjs'),true,'tools/architecture-check.mjs must exist');
  const pre=fs.readFileSync('tools/pre-deploy-check.mjs','utf8');
  assert.match(pre,/architecture-check\.mjs/,'pre-deploy must invoke architecture-check.mjs');
  assert.match(pre,/Architecture gate/,'pre-deploy must report the architecture gate');
});
