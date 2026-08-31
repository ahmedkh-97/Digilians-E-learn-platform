import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const SCAN_DIRS=['tests','tools'];
const BAD=[/\/mnt\/data\//, new RegExp(['excel','exam','v3','work'].join('_'))];

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(full));
    else if(/\.(?:mjs|js|bat|ps1)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

test('tests and tools contain no environment-specific workspace paths',()=>{
  const hits=[];
  for(const rel of SCAN_DIRS){
    const dir=path.join(ROOT,rel);
    if(!fs.existsSync(dir)) continue;
    for(const file of walk(dir)){
      if(path.resolve(file)===fileURLToPath(import.meta.url)) continue;
      const text=fs.readFileSync(file,'utf8');
      for(const pattern of BAD){
        if(pattern.test(text)) hits.push(`${path.relative(ROOT,file)} -> ${pattern}`);
      }
    }
  }
  assert.deepEqual(hits,[],'environment-specific paths make packaged tests non-portable');
});
