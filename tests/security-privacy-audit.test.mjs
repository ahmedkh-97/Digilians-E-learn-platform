import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {auditSecurityPrivacy,runCli,scanText} from '../tools/security-privacy-audit.mjs';

const ROOT=new URL('../',import.meta.url);
const ROOT_PATH=fileURLToPath(ROOT);
const MODULE_PATH=path.join(ROOT_PATH,'tools','security-privacy-audit.mjs');

function fixtureRepo(t,files){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'security-privacy-audit-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  for(const [name,content] of Object.entries(files)){
    const destination=path.join(root,name);
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    fs.writeFileSync(destination,content);
  }
  execFileSync('git',['init','-q'],{cwd:root});
  execFileSync('git',['add','.'],{cwd:root});
  return root;
}

test('blocks private credentials and service-role secrets without returning matched values',()=>{
  const samples=[
    {id:'private-key',text:'-----BEGIN '+'PRIVATE KEY-----'},
    {id:'github-pat',text:['ghp','A'.repeat(40)].join('_')},
    {id:'github-pat',text:['github','pat','B'.repeat(40)].join('_')},
    {id:'supabase-service-role',text:['SUPABASE','SERVICE','ROLE','KEY=secret-value'].join('_')}
  ];
  for(const sample of samples){
    const findings=scanText({path:'fixture.txt',text:`safe\n${sample.text}\n`});
    assert.equal(findings.length,1);
    assert.deepEqual(findings[0],{
      path:'fixture.txt',line:2,patternId:sample.id,severity:'block',
      message:'High-confidence committed credential signature; rotate and remove it.'
    });
    assert.equal(JSON.stringify(findings).includes(sample.text),false);
  }
});

test('does not classify documented public Supabase client configuration as a secret',()=>{
  const text='const SUPABASE_ANON_KEY="public-client-config";\nconst url="https://example.supabase.co";';
  assert.deepEqual(scanText({path:'fixture.js',text}).filter(x=>x.severity==='block'),[]);
});

test('inventories sinks, storage, endpoints, dynamic code, and window.open as review-only',()=>{
  const findings=scanText({path:'src\\fixture.js',text:[
    'node.innerHTML = markup;',
    'node.outerHTML = markup;',
    'node.insertAdjacentHTML("beforeend",markup);',
    'localStorage.getItem("x"); sessionStorage.setItem("x","y");',
    'fetch("/api/data"); const endpoint="https://example.invalid/path";',
    'eval(code); new Function(code); document.write(markup);',
    'window.open(target);'
  ].join('\n')});
  assert.equal(findings.filter(x=>x.severity==='block').length,0);
  assert.deepEqual([...new Set(findings.map(x=>x.category))].sort(),[
    'dynamicCode','externalEndpoints','htmlSinks','storageAccess','windowOpen'
  ]);
  assert.ok(findings.every(x=>x.severity==='review'&&x.path==='src/fixture.js'));
  assert.ok(findings.every(x=>!Object.hasOwn(x,'match')&&!Object.hasOwn(x,'value')));
});

test('scan order is deterministic by line, category, and pattern ID',()=>{
  const text='localStorage.getItem("x"); node.innerHTML = x; fetch("/x");';
  assert.deepEqual(scanText({path:'x.js',text}),scanText({path:'x.js',text}));
  assert.deepEqual(scanText({path:'x.js',text}).map(x=>x.patternId),[
    'fetch-call','html-inner','storage-local'
  ]);
});

test('audit scans only tracked regular text files and skips binary extensions and symlinks',t=>{
  const secret=['ghp','C'.repeat(40)].join('_');
  const outside=path.join(os.tmpdir(),`security-outside-${process.pid}-${Date.now()}.txt`);
  fs.writeFileSync(outside,secret);
  t.after(()=>fs.rmSync(outside,{force:true}));
  const root=fixtureRepo(t,{
    'safe.js':'localStorage.getItem("learner");\n',
    'ignored.png':secret,
    'nul.txt':Buffer.from(`prefix\0${secret}`)
  });
  fs.symlinkSync(outside,path.join(root,'escape.txt'));
  execFileSync('git',['add','escape.txt'],{cwd:root});
  const report=auditSecurityPrivacy({root});
  assert.deepEqual(report.blockingFindings,[]);
  assert.deepEqual(report.reviewInventory.storageAccess.map(x=>x.path),['safe.js']);
  assert.deepEqual(report.skippedFiles,[
    {path:'escape.txt',reason:'symlink'},
    {path:'ignored.png',reason:'binary-extension'},
    {path:'nul.txt',reason:'binary-content'}
  ]);
});

test('audit cannot follow a tracked path through a symlinked ancestor',t=>{
  const secret=['ghp','D'.repeat(40)].join('_');
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'security-audit-outside-'));
  fs.writeFileSync(path.join(outside,'secret.js'),secret);
  t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  const root=fixtureRepo(t,{'linked/secret.js':'safe\n'});
  fs.rmSync(path.join(root,'linked'),{recursive:true,force:true});
  fs.symlinkSync(outside,path.join(root,'linked'),'dir');

  const report=auditSecurityPrivacy({root});

  assert.deepEqual(report.blockingFindings,[]);
  assert.deepEqual(report.skippedFiles,[{path:'linked/secret.js',reason:'symlink'}]);
});

test('audit ordering and CLI JSON are deterministic and redact credentials',t=>{
  const secret=['SUPABASE','SERVICE','ROLE','KEY=very-secret-value'].join('_');
  const root=fixtureRepo(t,{'z.js':'window.open(url);\n','a.env':`${secret}\n`});
  const a=auditSecurityPrivacy({root});
  const b=auditSecurityPrivacy({root});
  assert.deepEqual(a,b);
  assert.equal(a.blockingFindings.length,1);
  const cli=runCli({root});
  assert.equal(cli.exitCode,1);
  assert.equal(cli.stdout.includes(secret),false);
  assert.deepEqual(JSON.parse(cli.stdout),a);
});

test('CLI exits 1 only for blocking findings and emits parseable review inventory',t=>{
  const root=fixtureRepo(t,{'review.js':'el.innerHTML = html;\n'});
  const clean=runCli({root});
  assert.equal(clean.exitCode,0);
  assert.equal(JSON.parse(clean.stdout).reviewInventory.htmlSinks.length,1);

  const result=spawnSync(process.execPath,[MODULE_PATH,'--root',root],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).blockingFindings.length,0);

  const secret=['ghp','E'.repeat(40)].join('_');
  fs.writeFileSync(path.join(root,'blocked.env'),`${secret}\n`);
  execFileSync('git',['add','blocked.env'],{cwd:root});
  const blocked=spawnSync(process.execPath,[MODULE_PATH,'--root',root],{encoding:'utf8'});
  assert.equal(blocked.status,1,blocked.stderr);
  assert.equal(blocked.stdout.includes(secret),false);
  assert.equal(JSON.parse(blocked.stdout).blockingFindings.length,1);
});

test('repository has no high-confidence committed secret',()=>{
  const report=auditSecurityPrivacy({root:ROOT});
  assert.deepEqual(report.blockingFindings,[]);
  assert.ok(Array.isArray(report.reviewInventory.htmlSinks));
  assert.ok(Array.isArray(report.reviewInventory.storageAccess));
  assert.ok(Array.isArray(report.reviewInventory.externalEndpoints));
});
