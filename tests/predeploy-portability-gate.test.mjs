import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('pre-deploy runs the path portability regression gate',()=>{
  const source=fs.readFileSync(path.join(ROOT,'tools/pre-deploy-check.mjs'),'utf8');
  assert.match(source,/path-portability\.test\.mjs/);
});

test('pre-deploy requires the lazy PL-300 stylesheet used by ranked/source-review views',()=>{
  const source=fs.readFileSync(path.join(ROOT,'tools/pre-deploy-check.mjs'),'utf8');
  assert.match(source,/assets\/css\/pl300\.css/);
});

test('pre-deploy enforces the stable platform hardening audits',()=>{
  const predeploy=fs.readFileSync(path.join(ROOT,'tools/pre-deploy-check.mjs'),'utf8');
  for(const token of [
    'protected-payload-baseline.mjs',
    'V0.22.7-PROTECTED-PAYLOAD-BASELINE.json',
    'local-reference-audit.mjs',
    'security-privacy-audit.mjs'
  ]) assert.ok(predeploy.includes(token),`pre-deploy missing ${token}`);
});
