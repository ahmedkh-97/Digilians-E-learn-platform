import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('pre-deploy runs the path portability regression gate',()=>{
  const source=fs.readFileSync(path.join(ROOT,'tools/pre-deploy-check.mjs'),'utf8');
  assert.match(source,/path-portability\.test\.mjs/);
});
