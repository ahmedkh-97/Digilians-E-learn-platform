import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const version=read('VERSION.txt').trim();
const html=read('index.html');
const app=read('assets/js/app.js');
const nativePractice=read('assets/js/voucher-source-practice-native.js');
const updateManager=read('assets/js/update-manager.js');
const changelog=JSON.parse(read('data/changelog.json'));

test('V0.22.6 PL-300 learning release has a distinct release identity so browsers cannot reuse older modules',()=>{
  assert.equal(version,'0.22.6');
  assert.match(html,/data-build-version="0\.22\.6"/);
  const cacheVersions=[...html.matchAll(/(?:src|href)="[^"]+\?v=([0-9]+\.[0-9]+\.[0-9]+)"/g)].map(match=>match[1]);
  assert.ok(cacheVersions.length>=4);
  assert.deepEqual([...new Set(cacheVersions)],['0.22.6']);
  assert.match(app,/import\("\.\/voucher-source-practice-native\.js\?v=0\.22\.6"\)/);
  assert.match(app,/import\("\.\/pl300-full-ranked-learning\.js\?v=0\.22\.6"\)/);
  assert.match(nativePractice,/import '\.\/pl300-source-practice-selection-guard\.js\?v=0\.22\.6';/);
  assert.match(updateManager,/FALLBACK_RELEASE=\{version:"0\.22\.6"/);
  assert.equal(changelog.latest,'0.22.6');
  assert.equal(changelog.releases?.[0]?.version,'0.22.6');
});
