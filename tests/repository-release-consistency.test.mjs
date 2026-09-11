import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {extractReferences} from '../tools/local-reference-audit.mjs';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const version=read('VERSION.txt').trim();
const changelog=JSON.parse(read('data/changelog.json'));
const readme=read('README.md');
const workflow=read('.github/workflows/v0223-branch-ci.yml');

const escapeRegExp=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

function runtimeJavaScriptPaths(directory){
  return fs.readdirSync(directory,{withFileTypes:true})
    .flatMap(entry=>{
      const entryPath=path.join(directory,entry.name);
      if(entry.isDirectory())return runtimeJavaScriptPaths(entryPath);
      return entry.isFile()&&entry.name.endsWith('.js')?[entryPath]:[];
    })
    .sort();
}

function runtimeCacheIdentityMismatches({references,version}){
  return references
    .filter(reference=>(reference.kind==='js-import'||reference.kind==='js-dynamic')&&reference.target?.includes('?v='))
    .map(reference=>reference.target)
    .filter(target=>target.match(/\?v=([^&#]*)/)?.[1]!==version);
}

test('README current release matches VERSION.txt and changelog',()=>{
  assert.match(readme,new RegExp(`^# Digilians E-Learn Platform V${escapeRegExp(version)}$`,'m'));
  assert.match(readme,new RegExp(`\\*\\*V${escapeRegExp(version)} — ${escapeRegExp(changelog.releases[0].title)}\\*\\*`));
  assert.equal(changelog.latest,version);
  assert.equal(changelog.releases[0].version,version);
});

test('permanent CI validates pull requests and accepted main pushes',()=>{
  assert.match(workflow,/name:\s*Digilians Platform Validation/);
  assert.match(workflow,/push:[\s\S]*?branches:[\s\S]*?- main/);
  assert.match(workflow,/pull_request:[\s\S]*?branches:[\s\S]*?- main/);
  for(const gate of ['Focused learning UX gate','Release identity and startup performance gate','Exhaustive PL-300 509 audit gate','PL-300 full-ranked index check','Full Node regression','Pre-deploy gate']){
    assert.ok(workflow.includes(gate),`missing permanent gate: ${gate}`);
  }
});

test('every runtime JavaScript cache identity matches VERSION.txt',()=>{
  const repositoryPath=fileURLToPath(new URL('../',import.meta.url));
  const runtimeDirectory=path.join(repositoryPath,'assets','js');
  const runtimePaths=runtimeJavaScriptPaths(runtimeDirectory);
  const repoPath=runtimePath=>path.relative(repositoryPath,runtimePath).replaceAll(path.sep,'/');
  const scannedPaths=runtimePaths.map(repoPath);

  for(const requiredPath of [
    'assets/js/exam-answers.js',
    'assets/js/exam-session.js',
    'assets/js/excel-study-render.js',
    'assets/js/python-study-render.js',
    'assets/js/sql-study-render.js'
  ])assert.ok(scannedPaths.includes(requiredPath),`runtime cache scan omitted ${requiredPath}`);

  const stale=[];
  for(const runtimePath of runtimePaths){
    const source=repoPath(runtimePath);
    const references=extractReferences({path:source,text:fs.readFileSync(runtimePath,'utf8')});
    for(const target of runtimeCacheIdentityMismatches({references,version}))stale.push(`${source}: ${target}`);
  }

  assert.deepEqual(stale,[],`stale runtime cache identities (expected ?v=${version}):\n${stale.join('\n')}`);
});

test('runtime cache guard rejects stale literal dynamic imports',()=>{
  const references=extractReferences({
    path:'assets/js/lazy-runtime.js',
    text:'import(\'./lazy-runtime.js?v=0.22.7\');'
  });
  assert.deepEqual(runtimeCacheIdentityMismatches({references,version:'0.22.8'}),['./lazy-runtime.js?v=0.22.7']);
});
