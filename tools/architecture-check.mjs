import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const jsDir=path.join(ROOT,'assets/js');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const fail=message=>{throw new Error(message)};

function localImportGraph(){
  const files=fs.readdirSync(jsDir).filter(name=>name.endsWith('.js')).sort();
  const fileSet=new Set(files);
  const graph=new Map(files.map(name=>[name,[]]));
  const importPattern=/(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
  for(const name of files){
    const text=fs.readFileSync(path.join(jsDir,name),'utf8');
    for(const match of text.matchAll(importPattern)){
      const spec=match[1].split('?')[0];
      if(!spec.startsWith('./'))continue;
      const target=spec.slice(2).replace(/^\.\//,'');
      if(fileSet.has(target))graph.get(name).push(target);
    }
  }
  return graph;
}

function assertNoCycles(graph){
  const visited=new Set();
  const active=new Set();
  const stack=[];
  function visit(node){
    visited.add(node);active.add(node);stack.push(node);
    for(const next of graph.get(node)||[]){
      if(!visited.has(next))visit(next);
      else if(active.has(next)){
        const start=stack.indexOf(next);
        fail(`Circular JS import: ${[...stack.slice(start),next].join(' -> ')}`);
      }
    }
    stack.pop();active.delete(node);
  }
  for(const node of graph.keys())if(!visited.has(node))visit(node);
}

function assertStorageBoundaries(){
  const orchestrators=['app.js','avatar-profile.js','ranking-scopes.js','exam-engine.js','exam-modes.js','voucher-engine.js'];
  for(const name of orchestrators){
    const text=fs.readFileSync(path.join(jsDir,name),'utf8');
    if(/\blocalStorage\b|globalThis\.localStorage/.test(text))fail(`${name} bypasses storage boundary`);
  }
}

function assertCssTokens(){
  const css=[read('assets/css/tokens.css'),read('assets/css/style.css')].join('\n');
  const definitions=new Set([...css.matchAll(/--([\w-]+)\s*:/g)].map(match=>match[1]));
  const missing=new Set();
  for(const match of css.matchAll(/var\(\s*--([\w-]+)([^)]*)\)/g)){
    const [,name,tail]=match;
    if(definitions.has(name))continue;
    if(tail.includes(','))continue;
    if(name==='x')continue; // supplied inline by excel-study-render.js
    missing.add(name);
  }
  if(missing.size)fail(`CSS custom properties missing without fallback: ${[...missing].sort().join(', ')}`);
}

function assertFacadeBoundaries(){
  const app=read('assets/js/app.js');
  for(const required of ['./exam-engine.js?v=','./voucher-engine.js?v=','./ranking-scopes.js?v=','./storage.js?v=']){
    if(!app.includes(required))fail(`app.js missing facade import ${required}`);
  }
  const forbidden=[
    'exam-modes.js','exam-session.js','exam-timer.js','exam-answers.js','exam-navigation.js','exam-persistence.js','exam-feedback.js','exam-results.js',
    'voucher-registry.js','voucher-bank-engine.js','voucher-storage.js','voucher-ranking.js','voucher-learning.js','voucher-ranked-runtime.js'
  ];
  for(const name of forbidden){
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    if(new RegExp(`from ["']\\./${escaped}\\?v=`).test(app))fail(`app.js directly imports core module ${name}`);
  }
}

const graph=localImportGraph();
assertNoCycles(graph);
assertStorageBoundaries();
assertCssTokens();
assertFacadeBoundaries();

console.log(`ARCHITECTURE PASS — ${graph.size} JS modules, no cycles, storage/facade boundaries clean, CSS tokens resolved.`);
