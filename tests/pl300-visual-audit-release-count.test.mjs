import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const tool=fs.readFileSync(new URL('../tools/pl300-visual-audit.mjs',import.meta.url),'utf8');
const predeploy=fs.readFileSync(new URL('../tools/pre-deploy-check.mjs',import.meta.url),'utf8');

test('PL-300 visual audit derives released question count from config instead of a stale literal',()=>{
  assert.match(tool,/config\.masterBankQuestionCount/);
  assert.doesNotMatch(tool,/production\.length!==200/);
  assert.doesNotMatch(predeploy,/200 released/);
});
