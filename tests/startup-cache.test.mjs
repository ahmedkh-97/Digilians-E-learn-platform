import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app=await readFile(new URL('../assets/js/app.js',import.meta.url),'utf8');
const storage=await readFile(new URL('../assets/js/storage.js',import.meta.url),'utf8');
const version=(await readFile(new URL('../VERSION.txt',import.meta.url),'utf8')).split(/\r?\n/,1)[0].trim();
const escapedVersion=version.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

test('startup-critical storage import is cache-busted with the current release',()=>{
  assert.match(app,new RegExp(`from\\s+["']\\.\\/storage\\.js\\?v=${escapedVersion}["']`));
});

test('storage module exposes the reset API required by app startup',()=>{
  assert.match(storage,/export\s+function\s+clearOfficialMistakeFlags\s*\(/);
});
