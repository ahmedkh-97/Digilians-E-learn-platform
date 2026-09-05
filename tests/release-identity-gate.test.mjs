import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

function versionFromVersionTxt(){
  const m=read('VERSION.txt').match(/^([0-9]+\.[0-9]+\.[0-9]+)/m);
  assert.ok(m,'VERSION.txt must start with semantic version');
  return m[1];
}

function attr(html,name){
  const m=html.match(new RegExp(`${name}=["']([^"']+)["']`));
  return m?.[1]||null;
}

function textById(html,id){
  const m=html.match(new RegExp(`<[^>]+id=["']${id}["'][^>]*>([^<]*)<`));
  return (m?.[1]||'').trim();
}

test('release identity is identical across version file, HTML runtime identity, cache busting, update fallback, and changelog',()=>{
  const version=versionFromVersionTxt();
  const html=read('index.html');
  const update=read('assets/js/update-manager.js');
  const changelog=json('data/changelog.json');

  assert.equal(attr(html,'data-build-version'),version,'html data-build-version must match VERSION.txt');
  assert.equal(textById(html,'footerVersionText'),`V${version}`,'footer version must match VERSION.txt');
  assert.equal(textById(html,'profileVersionBadge'),`V${version}`,'profile version must match VERSION.txt');
  assert.equal(textById(html,'whatsNewVersion'),`V${version}`,'what’s-new version must match VERSION.txt');
  assert.match(html,new RegExp(`RECOVERY MODE · V${version.replaceAll('.','\\.')}`),'recovery badge must match VERSION.txt');
  assert.match(html,new RegExp(`<b>V${version.replaceAll('.','\\.')}</b>`),'environment banner must match VERSION.txt');

  const cacheVersions=[...html.matchAll(/(?:src|href)=["'][^"']+\?v=([0-9]+\.[0-9]+\.[0-9]+)["']/g)].map(m=>m[1]);
  assert.ok(cacheVersions.length>=4,'expected release cache-busted runtime assets');
  assert.deepEqual([...new Set(cacheVersions)],[version],'all index cache-busting versions must match VERSION.txt');

  assert.match(update,new RegExp(`version:\\s*["']${version.replaceAll('.','\\.')}["']`),'update fallback version must match VERSION.txt');
  assert.equal(changelog.latest,version,'changelog latest must match VERSION.txt');
});
