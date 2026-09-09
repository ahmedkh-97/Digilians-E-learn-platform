import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const version=read('VERSION.txt').trim();
const changelog=JSON.parse(read('data/changelog.json'));
const readme=read('README.md');
const workflow=read('.github/workflows/v0223-branch-ci.yml');

const escapeRegExp=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

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
