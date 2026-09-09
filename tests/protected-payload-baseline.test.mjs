import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildProtectedBaseline,checkProtectedBaseline,checkProtectedBaselineEvidence,runCli} from '../tools/protected-payload-baseline.mjs';

const ROOT=new URL('../',import.meta.url);
const policy=JSON.parse(fs.readFileSync(new URL('../tools/platform-audit-policy.json',import.meta.url),'utf8'));
const expected=JSON.parse(fs.readFileSync(new URL('../docs/releases/V0.22.7-PROTECTED-PAYLOAD-BASELINE.json',import.meta.url),'utf8'));

test('protected production payloads match the accepted V0.22.7 baseline',()=>{
  const actual=buildProtectedBaseline({root:ROOT,policy,baselineSha:expected.baselineSha});
  assert.deepEqual(actual,expected);
});

test('baseline excludes release-only changelog metadata',()=>{
  assert.ok(expected.exclusions.includes('data/changelog.json'));
  assert.ok(!expected.roots.some(root=>root.files?.includes?.('data/changelog.json')));
});

function fixture(){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'protected-baseline-'));
  fs.mkdirSync(path.join(root,'tools'),{recursive:true});
  fs.mkdirSync(path.join(root,'docs','releases'),{recursive:true});
  fs.mkdirSync(path.join(root,'payload','nested'),{recursive:true});
  fs.writeFileSync(path.join(root,'VERSION.txt'),'9.9.9\n');
  fs.writeFileSync(path.join(root,'payload','z.txt'),'z');
  fs.writeFileSync(path.join(root,'payload','nested','a.txt'),'alpha');
  const fixturePolicy={protectedRoots:['payload/'],protectedExclusions:[],generatedArtifacts:[],rules:[]};
  fs.writeFileSync(path.join(root,'tools','platform-audit-policy.json'),JSON.stringify(fixturePolicy));
  execFileSync('git',['init','-q'],{cwd:root});
  execFileSync('git',['config','user.email','test@example.invalid'],{cwd:root});
  execFileSync('git',['config','user.name','Test'],{cwd:root});
  execFileSync('git',['add','.'],{cwd:root});
  execFileSync('git',['commit','-qm','fixture'],{cwd:root});
  return {root,policy:fixturePolicy};
}

function removeFixture(root){
  fs.rmSync(root,{recursive:true,force:true});
}

test('aggregate is deterministic and uses sorted path-null-sha-null records',()=>{
  const sample=fixture();
  try{
    const first=buildProtectedBaseline({root:sample.root,policy:sample.policy,baselineSha:'accepted'});
    const second=buildProtectedBaseline({root:sample.root,policy:sample.policy,baselineSha:'accepted'});
    assert.deepEqual(first,second);
    assert.equal(first.baselineVersion,'0.22.7');
    const digest=createHash('sha256');
    for(const relative of ['payload/nested/a.txt','payload/z.txt']){
      const fileHash=createHash('sha256').update(fs.readFileSync(path.join(sample.root,relative))).digest('hex');
      digest.update(relative); digest.update('\0'); digest.update(fileHash); digest.update('\0');
    }
    assert.equal(first.roots[0].sha256,digest.digest('hex'));
  }finally{removeFixture(sample.root);}
});

test('check API reports clean and identifies only changed protected roots',()=>{
  const sample=fixture();
  try{
    const baseline=buildProtectedBaseline({root:sample.root,policy:sample.policy,baselineSha:'accepted'});
    const baselinePath=path.join(sample.root,'docs','releases','baseline.json');
    fs.writeFileSync(baselinePath,JSON.stringify(baseline));
    assert.deepEqual(checkProtectedBaseline({root:sample.root,policy:sample.policy,baselinePath:'docs/releases/baseline.json'}),{
      status:'pass',baselineFile:'docs/releases/baseline.json',changedRoots:[]
    });
    fs.writeFileSync(path.join(sample.root,'payload','z.txt'),'changed');
    assert.deepEqual(checkProtectedBaseline({root:sample.root,policy:sample.policy,baselinePath:'docs/releases/baseline.json'}),{
      status:'fail',baselineFile:'docs/releases/baseline.json',changedRoots:['payload/']
    });
  }finally{removeFixture(sample.root);}
});

test('evidence check returns identity from its single baseline read while public check keeps its exact contract',()=>{
  const sample=fixture();
  try{
    const baseline=buildProtectedBaseline({root:sample.root,policy:sample.policy,baselineSha:'accepted'});
    const baselinePath=path.join(sample.root,'docs','releases','baseline.json');
    fs.writeFileSync(baselinePath,JSON.stringify(baseline));
    let reads=0;
    const evidence=checkProtectedBaselineEvidence({
      root:sample.root,policy:sample.policy,baselinePath:'docs/releases/baseline.json',
      readBaseline:location=>{reads+=1;return fs.readFileSync(location,'utf8');}
    });
    assert.equal(reads,1);
    assert.deepEqual(evidence,{status:'pass',baselineFile:'docs/releases/baseline.json',baselineSha:'accepted',changedRoots:[]});
    assert.deepEqual(Object.keys(checkProtectedBaseline({root:sample.root,policy:sample.policy,baselinePath:'docs/releases/baseline.json'})),['status','baselineFile','changedRoots']);
  }finally{removeFixture(sample.root);}
});

test('default and check modes are read-only',()=>{
  const sample=fixture();
  try{
    const baseline=buildProtectedBaseline({root:sample.root,policy:sample.policy,baselineSha:'accepted'});
    const baselinePath=path.join(sample.root,'docs','releases','baseline.json');
    fs.writeFileSync(baselinePath,`${JSON.stringify(baseline)}\n`);
    const before=fs.readFileSync(baselinePath,'utf8');
    const entriesBefore=fs.readdirSync(path.join(sample.root,'docs','releases'));
    assert.match(runCli({root:sample.root,args:[]}).output,/"roots"/);
    assert.equal(runCli({root:sample.root,args:['--check','docs/releases/baseline.json']}).exitCode,0);
    assert.equal(fs.readFileSync(baselinePath,'utf8'),before);
    assert.deepEqual(fs.readdirSync(path.join(sample.root,'docs','releases')),entriesBefore);
  }finally{removeFixture(sample.root);}
});

test('CLI prints changed roots and exits non-zero on drift',()=>{
  const sample=fixture();
  try{
    const sourceRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
    fs.copyFileSync(path.join(sourceRoot,'tools','protected-payload-baseline.mjs'),path.join(sample.root,'tools','protected-payload-baseline.mjs'));
    fs.copyFileSync(path.join(sourceRoot,'tools','platform-inventory.mjs'),path.join(sample.root,'tools','platform-inventory.mjs'));
    const baseline=buildProtectedBaseline({root:sample.root,policy:sample.policy,baselineSha:'accepted'});
    fs.writeFileSync(path.join(sample.root,'docs','releases','baseline.json'),JSON.stringify(baseline));
    fs.writeFileSync(path.join(sample.root,'payload','nested','a.txt'),'drift');
    const result=spawnSync(process.execPath,['tools/protected-payload-baseline.mjs','--check','docs/releases/baseline.json'],{
      cwd:sample.root,encoding:'utf8'
    });
    assert.equal(result.status,1);
    assert.match(result.stdout,/protected payload baseline changed: payload\//);
  }finally{removeFixture(sample.root);}
});
