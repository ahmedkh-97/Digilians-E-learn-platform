import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const css=fs.readFileSync(path.join(root,'assets/css/pl300.css'),'utf8');
const nativeCss=fs.readFileSync(path.join(root,'assets/css/source-practice-native.css'),'utf8');

test('PL-300 study UX styles the mini-part picker and Arabic-first explanation',()=>{
  assert.match(css,/\.pl300-study-part-picker\{/);
  assert.match(css,/\.pl300-study-part-control select\{/);
  assert.match(css,/\.source-review-explanation-ar\{/);
  assert.match(css,/\.source-original-explanation\{/);
});

test('locked answers remain readable and source-backed dropdowns match native inputs',()=>{
  assert.match(css,/\.source-review-option:disabled\{/);
  assert.match(nativeCss,/\.source-native-field select/);
});
