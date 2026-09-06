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

test('V0.22.7 has one fresh runtime/cache identity',()=>{
  assert.equal(version,'0.22.7');
  assert.match(html,/data-build-version="0\.22\.7"/);
  const cacheVersions=[...html.matchAll(/(?:src|href)="[^"]+\?v=([0-9]+\.[0-9]+\.[0-9]+)"/g)].map(match=>match[1]);
  assert.ok(cacheVersions.length>=4);
  assert.deepEqual([...new Set(cacheVersions)],['0.22.7']);
  assert.match(app,/const BUILD_VERSION=['"]0\.22\.7['"]/);
  assert.match(app,/import\("\.\/voucher-source-practice-native\.js\?v=0\.22\.7"\)/);
  assert.match(app,/import\("\.\/pl300-full-ranked-learning\.js\?v=0\.22\.7"\)/);
  assert.match(app,/import\(`\.\/pl300-learning-loop\.js\?v=\$\{BUILD_VERSION\}`\)/);
  assert.match(nativePractice,/import '\.\/pl300-source-practice-selection-guard\.js\?v=0\.22\.7';/);
  assert.match(nativePractice,/source-practice-native\.css\?v=0\.22\.7/);
  assert.match(updateManager,/FALLBACK_RELEASE=\{version:"0\.22\.7"/);
  assert.equal(changelog.latest,'0.22.7');
  assert.equal(changelog.releases?.[0]?.version,'0.22.7');
  assert.equal(changelog.releases?.[0]?.type,'fix');
});

test('V0.22.7 changelog describes the repeat-part hotfix',()=>{
  const release=changelog.releases?.[0]||{};
  const text=[release.title,release.summary,...(release.highlights||[])].join(' ');
  for(const phrase of ['Review & solve again','first-pass','checkpoint','450KB','509']) assert.match(text,new RegExp(phrase,'i'));
});
