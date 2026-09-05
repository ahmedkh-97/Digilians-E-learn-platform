import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import path from 'node:path';

const ROOT=process.cwd();

test('PL-300 visual audit accepts approved native structured source-evidence visuals',()=>{
  const result=spawnSync(process.execPath,[path.join(ROOT,'tools/pl300-visual-audit.mjs')],{cwd:ROOT,encoding:'utf8'});
  assert.equal(result.status,0,`${result.stdout||''}${result.stderr||''}`);
  assert.match(result.stdout,/Native structured visual-backed questions:\s*64/);
});
