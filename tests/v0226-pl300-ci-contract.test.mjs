import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow=fs.readFileSync(new URL('../.github/workflows/v0223-branch-ci.yml',import.meta.url),'utf8');

test('V0.22.6 release workflow targets feature branch and main PRs',()=>{
  assert.match(workflow,/name:\s*V0\.22\.6 PL-300 Learning UX Validation/);
  assert.match(workflow,/feature\/v0\.22\.6-pl300-learning-ux/);
  assert.match(workflow,/pull_request:[\s\S]*?- main/);
});

test('V0.22.6 release workflow protects focused UX, 509 audit, full regression and pre-deploy',()=>{
  for(const token of [
    'v0226-pl300-learning-loop.test.mjs',
    'v0226-pl300-learning-storage.test.mjs',
    'v0226-pl300-study-ux.test.mjs',
    'v0226-pl300-answer-area.test.mjs',
    'v0226-pl300-learning-controller.test.mjs',
    'v0226-pl300-release-identity.test.mjs',
    'v0226-pl300-native-choice-fidelity.test.mjs',
    'v0224-pl300-preselect-dropdowns.test.mjs',
    'pl300-source-practice-selection-guard.test.mjs',
    'pl300-source-practice-freeze-regression.test.mjs',
    'v0223-pl300-native-arabic-regression.test.mjs',
    'node --test tests/*.test.mjs',
    'node tools/pre-deploy-check.mjs'
  ]) assert.ok(workflow.includes(token),`missing CI protection: ${token}`);
});
