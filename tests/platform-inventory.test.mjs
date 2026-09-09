import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {classifyPath,buildInventory,runCli,safeOutputPath,sha256} from '../tools/platform-inventory.mjs';
import {buildStage1Report,runCli as runStage1ReportCli,writeStage1Report} from '../tools/platform-hardening-stage1-report.mjs';

const ROOT=new URL('../',import.meta.url);
const ROOT_PATH=fileURLToPath(ROOT);
const policy=JSON.parse(fs.readFileSync(new URL('../tools/platform-audit-policy.json',import.meta.url),'utf8'));
const modulePath=path.join(ROOT_PATH,'tools','platform-inventory.mjs');

function snapshotDirectory(directory){
  const snapshot=[];
  const visit=(current,relative='')=>{
    for(const entry of fs.readdirSync(current,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const childRelative=path.join(relative,entry.name);
      const child=path.join(current,entry.name);
      if(entry.isDirectory())visit(child,childRelative);
      else snapshot.push([childRelative,sha256(fs.readFileSync(child))]);
    }
  };
  visit(directory);
  return snapshot;
}

function fixtureRepo(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'platform-inventory-fixture-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'docs','releases'),{recursive:true});
  fs.mkdirSync(path.join(root,'tools'),{recursive:true});
  fs.writeFileSync(path.join(root,'VERSION.txt'),'0.0.0-test\n');
  fs.writeFileSync(path.join(root,'tools','platform-audit-policy.json'),JSON.stringify({
    schemaVersion:1,
    protectedRoots:[],
    protectedExclusions:[],
    generatedArtifacts:[{output:'declared.json',generator:'tools/generator.mjs',inputs:['source.json'],checkCommand:'node tools/generator.mjs --check'}],
    rules:[{pattern:'^',classification:'runtime-data'}]
  }));
  fs.writeFileSync(path.join(root,'tools','generator.mjs'),'export {};\n');
  fs.writeFileSync(path.join(root,'source.json'),'{}\n');
  fs.writeFileSync(path.join(root,'declared.json'),'{"generatedFrom":"source.json"}\n');
  fs.writeFileSync(path.join(root,'candidate.json'),'{"generatedBy":"manual-review"}\n');
  fs.writeFileSync(path.join(root,'candidate.md'),'@generated\nThis is an advisory candidate.\n');
  execFileSync('git',['init','-q'],{cwd:root});
  execFileSync('git',['add','.'],{cwd:root});
  execFileSync('git',['-c','user.name=Test','-c','user.email=test@example.invalid','commit','-qm','fixture'],{cwd:root});
  return root;
}

test('specific source-review rule wins before broad voucher runtime-data rule',()=>{
  assert.equal(classifyPath('voucher/tracks/data-analysis/microsoft-pl-300/assets/source-review/q.webp',policy),'source');
  assert.equal(classifyPath('voucher/tracks/data-analysis/microsoft-pl-300/master-bank.json',policy),'runtime-data');
});

test('classification normalizes every backslash before applying rules',()=>{
  assert.equal(classifyPath('tools\\platform-inventory.mjs',policy),'tooling');
});

test('sha256 returns the standard digest for known content',()=>{
  assert.equal(sha256(Buffer.from('abc')),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('every tracked file has exactly one primary classification',()=>{
  const inventory=buildInventory({root:ROOT,policy});
  assert.ok(inventory.files.length>=1100);
  assert.deepEqual(inventory.unclassified,[]);
  assert.equal(new Set(inventory.files.map(x=>x.path)).size,inventory.files.length);
});

test('inventory is deterministic',()=>{
  const a=buildInventory({root:ROOT,policy});
  const b=buildInventory({root:ROOT,policy});
  assert.deepEqual(a,b);
});

test('default CLI invocation emits inventory without changing releases files',()=>{
  const releases=path.join(ROOT_PATH,'docs','releases');
  const before=snapshotDirectory(releases);
  const result=spawnSync(process.execPath,[modulePath],{cwd:ROOT_PATH,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(result.stdout).unclassified.length,0);
  assert.deepEqual(snapshotDirectory(releases),before);
});

test('declared generated artifacts have an existing generator and inputs',()=>{
  for(const artifact of policy.generatedArtifacts){
    assert.ok(fs.existsSync(new URL(`../${artifact.output}`,import.meta.url)),artifact.output);
    assert.ok(fs.existsSync(new URL(`../${artifact.generator}`,import.meta.url)),artifact.generator);
    for(const input of artifact.inputs) assert.ok(fs.existsSync(new URL(`../${input}`,import.meta.url)),`${artifact.output} input ${input}`);
  }
});

test('generated metadata and documentation create advisory candidates only when undeclared',t=>{
  const root=fixtureRepo(t);
  const fixturePolicy=JSON.parse(fs.readFileSync(path.join(root,'tools','platform-audit-policy.json'),'utf8'));
  const inventory=buildInventory({root,paths:['declared.json','candidate.json','candidate.md'],policy:fixturePolicy});
  assert.deepEqual(inventory.generatedReviewCandidates,[
    {path:'candidate.json',evidence:'metadata:generatedBy'},
    {path:'candidate.md',evidence:'documentation:generated-marker'}
  ]);
  assert.deepEqual(inventory.provenance.generatedArtifacts,fixturePolicy.generatedArtifacts);
  assert.equal(inventory.files.find(file=>file.path==='candidate.json').classification,'runtime-data');
  assert.equal(inventory.files.find(file=>file.path==='candidate.md').classification,'runtime-data');
});

test('write path rejects every symlink ancestor, symlink destination, and nested output',t=>{
  const root=fixtureRepo(t);
  const releases=path.join(root,'docs','releases');
  const anchored=path.join(root,'docs','releases-anchored');
  fs.renameSync(releases,anchored);
  fs.symlinkSync(anchored,releases,'dir');
  assert.throws(()=>safeOutputPath(root,'docs/releases/inventory.json'),/symlink/);
  fs.unlinkSync(releases);
  fs.renameSync(anchored,releases);
  fs.writeFileSync(path.join(releases,'protected.json'),'outside content\n');
  fs.symlinkSync(path.join(releases,'protected.json'),path.join(releases,'inventory.json'),'file');
  assert.throws(()=>safeOutputPath(root,'docs/releases/inventory.json'),/symlink/);
  assert.throws(()=>safeOutputPath(root,'docs/releases/nested/inventory.json'),/direct child/);
  assert.equal(fs.readFileSync(path.join(releases,'protected.json'),'utf8'),'outside content\n');
});

test('write CLI creates a new release file but cannot overwrite an existing file',t=>{
  const root=fixtureRepo(t);
  runCli({root,args:['--write','docs/releases/inventory.json']});
  const output=path.join(root,'docs','releases','inventory.json');
  const written=fs.readFileSync(output,'utf8');
  assert.equal(JSON.parse(written).unclassified.length,0);
  assert.throws(()=>runCli({root,args:['--write','docs/releases/inventory.json']}),/EEXIST/);
  assert.equal(fs.readFileSync(output,'utf8'),written);
});

test('anchored write rejects a docs ancestor swap after output validation',t=>{
  const root=fixtureRepo(t);
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'platform-inventory-outside-'));
  t.after(()=>fs.rmSync(outside,{recursive:true,force:true}));
  fs.mkdirSync(path.join(outside,'releases'));
  const docs=path.join(root,'docs');
  const originalDocs=path.join(root,'docs-anchored');
  assert.throws(()=>runCli({
    root,
    args:['--write','docs/releases/inventory.json'],
    beforeSecureTraversal:()=>{
      fs.renameSync(docs,originalDocs);
      fs.symlinkSync(outside,docs,'dir');
    }
  }),/ELOOP|ENOTDIR|symlink/);
  assert.equal(fs.existsSync(path.join(originalDocs,'releases','inventory.json')),false);
  assert.equal(fs.existsSync(path.join(outside,'releases','inventory.json')),false);
});

const acceptedBaselineSha='af59e73f7a51d2745430a1de2db298d0f97af728';
const stage1Fixture={
  inventory:{baselineVersion:'0.22.7',baselineSha:'current-audit-head',files:[{size:10,classification:'runtime'}],summary:{runtime:{count:1,bytes:10}}},
  references:{missing:[],outsideRoot:[],currentReleaseQueryMismatches:[],reviewOnlyDynamicReferences:[]},
  security:{blockingFindings:[],reviewInventory:{}},
  protectedStatus:{status:'pass',baselineFile:'docs/releases/V0.22.7-PROTECTED-PAYLOAD-BASELINE.json',baselineSha:acceptedBaselineSha},
  findings:[
    {id:'B',severity:'low',area:'docs',path:'b',evidence:'b',disposition:'keep',stage2Action:'none'},
    {id:'A',severity:'low',area:'docs',path:'a',evidence:'a',disposition:'keep',stage2Action:'none'}
  ]
};

test('Stage 1 report has the closed schema and deterministic finding order',()=>{
  const report=buildStage1Report(stage1Fixture);
  assert.deepEqual(Object.keys(report),['schemaVersion','baselineVersion','baselineSha','inventory','protectedPayloads','references','security','findings']);
  assert.equal(report.baselineSha,acceptedBaselineSha);
  assert.deepEqual(report.inventory,{trackedFiles:1,totalBytes:10,byClassification:{runtime:{count:1,bytes:10}}});
  assert.deepEqual(report.findings.map(x=>x.id),['A','B']);
  assert.deepEqual(buildStage1Report(structuredClone(stage1Fixture)),report);
});

test('Stage 1 report rejects unknown dispositions and undocumented finding fields',()=>{
  assert.throws(()=>buildStage1Report({...stage1Fixture,findings:[{...stage1Fixture.findings[0],disposition:'unknown'}]}),/disposition/);
  assert.throws(()=>buildStage1Report({...stage1Fixture,findings:[{...stage1Fixture.findings[0],browserVerified:true}]}),/field/);
});

test('Stage 1 report closes nested occurrence schemas and serializes comparator ties canonically',()=>{
  const a={path:'same.js',line:7,patternId:'same',severity:'review',category:'htmlSinks',message:'A message'};
  const b={path:'same.js',line:7,patternId:'same',severity:'review',category:'htmlSinks',message:'B message'};
  const forward={...stage1Fixture,security:{blockingFindings:[],reviewInventory:{htmlSinks:[b,a]}},inventory:{...stage1Fixture.inventory,files:[...stage1Fixture.inventory.files,{size:0,classification:'z'}],summary:{z:{bytes:0,count:1},runtime:{bytes:10,count:1}}}};
  const reverse={...forward,security:{blockingFindings:[],reviewInventory:{htmlSinks:[a,b]}},inventory:{...forward.inventory,summary:{runtime:{count:1,bytes:10},z:{count:1,bytes:0}}}};
  assert.equal(JSON.stringify(buildStage1Report(forward)),JSON.stringify(buildStage1Report(reverse)));
  assert.throws(()=>buildStage1Report({...stage1Fixture,references:{...stage1Fixture.references,missing:[{source:'a.js',target:'b.js',kind:'js-import',extra:true}]}}),/reference field/);
  assert.throws(()=>buildStage1Report({...stage1Fixture,security:{blockingFindings:[{path:'a.js',line:1,patternId:'private-key',severity:'block',message:'redacted',extra:true}],reviewInventory:{}}}),/security field/);
  assert.throws(()=>buildStage1Report({...stage1Fixture,security:{blockingFindings:[],reviewInventory:{inventedCategory:[]}}}),/security review category/);
});

test('Stage 1 report rejects non-object security review inventories',()=>{
  for(const reviewInventory of [null,'',[],1,true]){
    assert.throws(()=>buildStage1Report({...stage1Fixture,security:{blockingFindings:[],reviewInventory}}),/reviewInventory.*plain object/);
  }
});

test('Stage 1 report accepts cross-realm and null-prototype records but rejects custom prototypes',()=>{
  const crossRealm=vm.runInNewContext('({htmlSinks:[]})');
  const nullPrototype=Object.assign(Object.create(null),{htmlSinks:[]});
  assert.deepEqual(buildStage1Report({...stage1Fixture,security:{blockingFindings:[],reviewInventory:crossRealm}}).security.reviewInventory,{htmlSinks:[]});
  assert.deepEqual(buildStage1Report({...stage1Fixture,security:{blockingFindings:[],reviewInventory:nullPrototype}}).security.reviewInventory,{htmlSinks:[]});
  class ReviewInventory{}
  for(const reviewInventory of [new ReviewInventory(),Object.create({htmlSinks:[]})]){
    assert.throws(()=>buildStage1Report({...stage1Fixture,security:{blockingFindings:[],reviewInventory}}),/reviewInventory.*plain object/);
  }
});

test('Stage 1 report rejects forged Object prototypes and never reads review inventory accessors',()=>{
  const forgedObjectPrototype=Object.create(null);
  Object.defineProperties(forgedObjectPrototype,Object.getOwnPropertyDescriptors(Object.prototype));
  const forgedInventory=Object.create(forgedObjectPrototype);
  Object.defineProperty(forgedInventory,'htmlSinks',{value:[],enumerable:true,writable:true,configurable:true});
  assert.throws(()=>buildStage1Report({...stage1Fixture,security:{blockingFindings:[],reviewInventory:forgedInventory}}),/reviewInventory.*plain object/);

  let constructorProxyTrapCalls=0;
  const proxiedConstructor=new Proxy(Object,{
    get(target,key,receiver){constructorProxyTrapCalls+=1;return Reflect.get(target,key,receiver);}
  });
  const proxyConstructorPrototype=Object.create(null);
  Object.defineProperties(proxyConstructorPrototype,Object.getOwnPropertyDescriptors(Object.prototype));
  Object.defineProperty(proxyConstructorPrototype,'constructor',{value:proxiedConstructor,writable:true,configurable:true});
  const proxyConstructorInventory=Object.create(proxyConstructorPrototype);
  Object.defineProperty(proxyConstructorInventory,'htmlSinks',{value:[],enumerable:true,writable:true,configurable:true});
  assert.throws(()=>buildStage1Report({...stage1Fixture,security:{blockingFindings:[],reviewInventory:proxyConstructorInventory}}),/reviewInventory.*plain object/);
  assert.equal(constructorProxyTrapCalls,0);

  let getterCalls=0;
  const accessorInventory={};
  Object.defineProperty(accessorInventory,'htmlSinks',{enumerable:true,get(){getterCalls+=1;return [];}});
  assert.throws(()=>buildStage1Report({...stage1Fixture,security:{blockingFindings:[],reviewInventory:accessorInventory}}),/own enumerable data properties/);
  assert.equal(getterCalls,0);
  const symbolInventory={htmlSinks:[],[Symbol('hidden')]:[]};
  assert.throws(()=>buildStage1Report({...stage1Fixture,security:{blockingFindings:[],reviewInventory:symbolInventory}}),/own enumerable data properties/);
  let proxyTrapCalls=0;
  const proxyInventory=new Proxy({htmlSinks:[]},{
    getPrototypeOf(){proxyTrapCalls+=1;return Object.prototype;},
    ownKeys(){proxyTrapCalls+=1;return ['htmlSinks'];},
    getOwnPropertyDescriptor(){proxyTrapCalls+=1;return {value:[],enumerable:true,writable:true,configurable:true};}
  });
  assert.throws(()=>buildStage1Report({...stage1Fixture,security:{blockingFindings:[],reviewInventory:proxyInventory}}),/own enumerable data properties/);
  assert.equal(proxyTrapCalls,0);
  for(const key of ['__proto__','prototype','constructor']){
    const polluted={htmlSinks:[]};
    Object.defineProperty(polluted,key,{value:[],enumerable:true,writable:true,configurable:true});
    assert.throws(()=>buildStage1Report({...stage1Fixture,security:{blockingFindings:[],reviewInventory:polluted}}),/own enumerable data properties/);
  }
});

test('Stage 1 report rejects inventory aggregate drift and non-authoritative protected status',()=>{
  assert.throws(()=>buildStage1Report({...stage1Fixture,inventory:{...stage1Fixture.inventory,summary:{runtime:{count:2,bytes:10}}}}),/inventory summary/);
  assert.throws(()=>buildStage1Report({...stage1Fixture,protectedStatus:{...stage1Fixture.protectedStatus,status:'fail'}}),/protected.*pass/i);
  assert.throws(()=>buildStage1Report({...stage1Fixture,protectedStatus:{...stage1Fixture.protectedStatus,baselineFile:'docs/releases/other.json'}}),/protected.*baseline/i);
  assert.throws(()=>buildStage1Report({...stage1Fixture,protectedStatus:{...stage1Fixture.protectedStatus,baselineSha:'wrong'}}),/protected.*identity/i);
});

test('Stage 1 report write is release-scoped, exclusive, and leaves existing evidence unchanged',t=>{
  const root=fixtureRepo(t);
  const report=buildStage1Report(stage1Fixture);
  assert.throws(()=>writeStage1Report({root,output:'outside.json',report}),/docs\/releases/);
  writeStage1Report({root,output:'docs/releases/stage1.json',report});
  const output=path.join(root,'docs','releases','stage1.json');
  const first=fs.readFileSync(output,'utf8');
  assert.deepEqual(JSON.parse(first),report);
  assert.throws(()=>writeStage1Report({root,output:'docs/releases/stage1.json',report}),/EEXIST/);
  assert.equal(fs.readFileSync(output,'utf8'),first);
});

test('Stage 1 CLI consumes the identity returned by its single protected check',t=>{
  const root=fixtureRepo(t);
  const baseline='docs/releases/V0.22.7-PROTECTED-PAYLOAD-BASELINE.json';
  const baselineFile=path.join(root,...baseline.split('/'));
  fs.writeFileSync(baselineFile,'{"baselineSha":"swapped-value"}\n');
  const inputs={inventory:stage1Fixture.inventory,references:stage1Fixture.references,security:stage1Fixture.security,findings:stage1Fixture.findings};
  const args=[];
  for(const [name,value] of Object.entries(inputs)){
    const input=path.join(root,`${name}.json`);fs.writeFileSync(input,JSON.stringify(value));args.push(`--${name}`,input);
  }
  args.push('--protected-baseline',baseline,'--write','docs/releases/stage1.json');
  let checks=0;
  runStage1ReportCli({root,args,checkBaselineEvidence:()=>{
    checks+=1;fs.unlinkSync(baselineFile);
    return {status:'pass',baselineFile:baseline,changedRoots:[],baselineSha:acceptedBaselineSha};
  }});
  assert.equal(checks,1);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root,'docs','releases','stage1.json'))).baselineSha,acceptedBaselineSha);
});

test('committed Stage 1 audit records the accepted baseline and clean blocking gates',()=>{
  const audit=JSON.parse(fs.readFileSync(new URL('../docs/releases/V0.22.7-PLATFORM-HARDENING-STAGE1-AUDIT.json',import.meta.url),'utf8'));
  assert.equal(audit.baselineVersion,'0.22.7');
  assert.equal(audit.baselineSha,acceptedBaselineSha);
  assert.ok(audit.inventory.trackedFiles>=1100);
  assert.equal(audit.protectedPayloads.status,'pass');
  assert.deepEqual(audit.references.missing,[]);
  assert.deepEqual(audit.references.outsideRoot,[]);
  assert.deepEqual(audit.security.blockingFindings,[]);
  assert.ok(audit.findings.every(x=>['keep','candidate-for-stage2','confirmed-defect','unresolved-keep'].includes(x.disposition)));
});
