import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
function walk(dir){
  const out=[];
  if(!fs.existsSync(dir))return out;
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const target=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(target));
    else if(entry.isFile())out.push(target);
  }
  return out;
}

test('workspace has no redundant HTML mirrors when Markdown source exists',()=>{
  const roots=['docs','supabase'].map(x=>path.join(ROOT,x));
  const files=roots.flatMap(walk);
  const html=files.filter(f=>f.endsWith('.html'));
  const redundant=html.filter(f=>fs.existsSync(f.replace(/\.html$/i,'.md')))
    .map(f=>path.relative(ROOT,f).replaceAll('\\','/'));
  assert.deepEqual(redundant,[]);
});

test('stale root intake and final-clean markers are absent',()=>{
  for(const rel of ['EXCEL-INTAKE-READY.html','EXCEL-INTAKE-READY.md','FINAL-CLEAN-QA.txt']){
    assert.equal(fs.existsSync(path.join(ROOT,rel)),false,`${rel} should not ship in the current workspace`);
  }
});

test('temporary V0.22.3 release diagnostics and patchers are not shipped',()=>{
  for(const rel of ['docs/releases/tmp-v0223-ci-diagnostic.txt','tools/v0223_patch_ranked_native.py']){
    assert.equal(fs.existsSync(path.join(ROOT,rel)),false,`${rel} is a temporary release artifact and must not ship`);
  }
});

test('temporary superpowers planning workspace is not shipped',()=>{
  assert.equal(fs.existsSync(path.join(ROOT,'docs','superpowers')),false);
});

test('README stays current-state focused instead of becoming a release archive',()=>{
  const readme=fs.readFileSync(path.join(ROOT,'README.md'),'utf8');
  assert.ok(Buffer.byteLength(readme,'utf8') < 20000,'README.md should stay below 20 KB');
  assert.ok(!/^## V0\.[0-9]/m.test(readme),'README.md should not contain version-by-version release history');
  assert.match(readme,/data\/changelog\.json/,'README should point readers to the changelog for history');
});
