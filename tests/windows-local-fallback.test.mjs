import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const exists=p=>fs.existsSync(path.join(ROOT,p));

test('package ships a Windows-native local-start fallback',()=>{
  assert.ok(exists('tools/windows-basic-check.ps1'),'missing Windows basic check');
  assert.ok(exists('tools/windows-local-server.ps1'),'missing Windows local server');
});

test('START-LOCAL uses the Windows-native PowerShell path for ordinary localhost use',()=>{
  const bat=read('tools/windows/START-LOCAL.bat');
  assert.doesNotMatch(bat,/where node/i);
  assert.doesNotMatch(bat,/quick-local-check\.mjs/i);
  assert.match(bat,/windows-basic-check\.ps1/i);
  assert.match(bat,/windows-local-server\.ps1/i);
  assert.match(bat,/pause/i);
});

test('Windows fallback basic check protects required runtime files and JSON',()=>{
  const ps=read('tools/windows-basic-check.ps1');
  for(const marker of ['index.html','VERSION.txt','assets\\js\\app.js','assets\\js\\exam-session.js','assets\\js\\exam-timer.js','assets\\js\\exam-answers.js','assets\\js\\exam-navigation.js','assets\\js\\exam-persistence.js','assets\\js\\exam-feedback.js','assets\\js\\exam-results.js','voucher\\registry.json']){
    assert.ok(ps.includes(marker),`fallback check missing ${marker}`);
  }
  assert.match(ps,/ConvertFrom-Json/);
  assert.match(ps,/BASIC CHECK PASS/i);
});



test('PowerShell fallback scripts avoid ambiguous unbraced variable-colon interpolation',()=>{
  const allowedScopes=new Set(['env','global','script','local','private','using','variable','function']);
  for(const rel of ['tools/windows-basic-check.ps1','tools/windows-local-server.ps1']){
    const ps=read(rel);
    const unsafe=[...ps.matchAll(/\$([A-Za-z_][A-Za-z0-9_]*):/g)]
      .map(match=>match[1])
      .filter(name=>!allowedScopes.has(name.toLowerCase()));
    assert.deepEqual(unsafe,[],`${rel} contains ambiguous variable-colon interpolation: ${unsafe.join(', ')}`);
  }
});

test('Windows fallback server is loopback-only, prevents path traversal, and chooses a free port',()=>{
  const ps=read('tools/windows-local-server.ps1');
  assert.match(ps,/IPAddress\]::Loopback/);
  assert.match(ps,/TcpListener/);
  assert.match(ps,/OrdinalIgnoreCase/);
  assert.match(ps,/403/);
  assert.match(ps,/Cache-Control/i);
  assert.match(ps,/PortSearchCount/i);
  assert.match(ps,/AddressAlreadyInUse|SocketException/i);
  assert.match(ps,/Trying port|available port|free port/i);
});

test('developer QA scripts explain that Node 20+ is required instead of failing with command-not-found',()=>{
  for(const rel of ['tools/windows/FULL-QA.bat','tools/windows/TEST-LOCAL.bat','tools/windows/RUN-PREFLIGHT.bat']){
    const bat=read(rel);
    assert.match(bat,/where node/i,`${rel} does not detect Node`);
    assert.match(bat,/Node\.js 20\+/i,`${rel} does not explain requirement`);
  }
});

test('local testing guide separates ordinary localhost use from developer QA requirements',()=>{
  const doc=read('docs/development/LOCAL-TESTING.md');
  assert.match(doc,/does not require Node\.js/i);
  assert.match(doc,/Full QA.*Node\.js 20\+/is);
  assert.match(doc,/PowerShell/i);
});
