import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const exists=p=>fs.existsSync(path.join(ROOT,p));

test('local QA package ships quick check, pre-deploy and local server entry points',()=>{
  for(const file of [
    'QUICK-CHECK.bat','START-LOCAL.bat','TEST-LOCAL.bat','FULL-QA.bat','RUN-PREFLIGHT.bat',
    'tools/quick-local-check.mjs','tools/pre-deploy-check.mjs','tools/local-server.mjs','tools/excel-intake-check.mjs'
  ]) assert.ok(exists(file),`missing local QA file: ${file}`);
});

test('START-LOCAL refuses to start the server until quick check passes',()=>{
  const bat=read('START-LOCAL.bat');
  assert.match(bat,/node tools\\quick-local-check\.mjs/i);
  assert.match(bat,/node tools\\local-server\.mjs/i);
  assert.ok(bat.indexOf('quick-local-check.mjs') < bat.indexOf('local-server.mjs'));
  assert.match(bat,/if errorlevel 1/i);
});

test('full local test runs pre-deploy before localhost',()=>{
  const bat=read('TEST-LOCAL.bat');
  assert.match(bat,/node tools\\pre-deploy-check\.mjs/i);
  assert.match(bat,/node tools\\local-server\.mjs/i);
  assert.ok(bat.indexOf('pre-deploy-check.mjs') < bat.indexOf('local-server.mjs'));
});
