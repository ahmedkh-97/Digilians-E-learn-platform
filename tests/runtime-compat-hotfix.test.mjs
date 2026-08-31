import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.cwd();
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const compatPath=path.join(root,'assets/js/runtime-compat.js');

async function loadCompat(){
  assert.equal(fs.existsSync(compatPath),true,'runtime compatibility helper must exist');
  return import(`${pathToFileURL(compatPath).href}?test=${Date.now()}`);
}

test('startup and exam code do not call crypto.randomUUID directly',()=>{
  const storage=read('assets/js/storage.js');
  const app=read('assets/js/app.js');
  assert.equal(storage.includes('crypto.randomUUID()'),false,'storage.js must use compatibility UUID helper');
  assert.equal(app.includes('crypto.randomUUID()'),false,'app.js must use compatibility UUID helper');
});

test('createUuid falls back to crypto.getRandomValues when randomUUID is unavailable',async()=>{
  const {createUuid}=await loadCompat();
  const cryptoStub={
    getRandomValues(bytes){
      for(let i=0;i<bytes.length;i++)bytes[i]=(i*17+3)&255;
      return bytes;
    }
  };
  const id=createUuid(cryptoStub,()=>0.5);
  assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('createUuid has a last-resort UUID fallback when Web Crypto is absent',async()=>{
  const {createUuid}=await loadCompat();
  const id=createUuid(null,()=>0.25);
  assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('only the known ResizeObserver loop notification is treated as benign',async()=>{
  const {isBenignClientError}=await loadCompat();
  assert.equal(isBenignClientError('ResizeObserver loop completed with undelivered notifications.'),true);
  assert.equal(isBenignClientError('ResizeObserver loop limit exceeded'),true);
  assert.equal(isBenignClientError('ResizeObserver failed while rendering Excel Study'),false);
  assert.equal(isBenignClientError('crypto.randomUUID is not a function'),false);
});

test('analytics filters benign browser noise before counting/reporting app errors',()=>{
  const analytics=read('assets/js/analytics.js');
  assert.match(analytics,/isBenignClientError/,'analytics must use benign-error classifier');
  const classifierStart=analytics.indexOf('export function classifyClientError');
  const classifierBenign=analytics.indexOf('isBenignClientError(',classifierStart);
  const reportStart=analytics.indexOf('function reportClientError');
  const classifyCall=analytics.indexOf('classifyClientError(',reportStart);
  const shouldReport=analytics.indexOf('shouldReportError(',reportStart);
  assert.ok(classifierStart>=0 && classifierBenign>classifierStart,
    'client error classifier must recognize benign browser noise');
  assert.ok(reportStart>=0 && classifyCall>reportStart && classifyCall<shouldReport,
    'benign classification must happen before rate-limit counting/reporting');
});

test('runtime compatibility helper stays cache-busted across the current release',()=>{
  const version=read('VERSION.txt').split(/\r?\n/,1)[0].trim();
  const escaped=version.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const index=read('index.html');
  const app=read('assets/js/app.js');
  const storage=read('assets/js/storage.js');
  const analytics=read('assets/js/analytics.js');
  for(const asset of ['style.css','analytics.js','update-manager.js','backup-restore.js','app.js']){
    assert.match(index,new RegExp(asset.replace('.','\\.')+`\\?v=${escaped}`));
  }
  assert.match(app,new RegExp(`storage\\.js\\?v=${escaped}`));
  assert.match(app,new RegExp(`runtime-compat\\.js\\?v=${escaped}`));
  assert.match(storage,new RegExp(`runtime-compat\\.js\\?v=${escaped}`));
  assert.match(analytics,new RegExp(`runtime-compat\\.js\\?v=${escaped}`));
});
