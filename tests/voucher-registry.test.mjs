import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  VOUCHER_TRACK_IDS,
  validateVoucherRegistry,
  validateVoucherTrackRegistry,
  validateVoucherExamConfig,
  trackAvailability
} from '../assets/js/voucher-registry.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));

test('Voucher registry exposes exactly the five approved tracks',()=>{
  const registry=read('voucher/registry.json');
  assert.deepEqual(registry.tracks.map(x=>x.id),VOUCHER_TRACK_IDS);
  assert.deepEqual(validateVoucherRegistry(registry),[]);
});

test('Data Analysis is released while the other approved Voucher tracks remain Coming Soon',()=>{
  const registry=read('voucher/registry.json');
  for(const track of registry.tracks){
    const child=read(track.registryFile);
    assert.deepEqual(validateVoucherTrackRegistry(child,track.id),[]);
    assert.equal(trackAvailability(child),track.id==='data-analysis'?'ready':'coming-soon');
  }
});

test('exam config fails closed when Real Exam metadata is incomplete',()=>{
  const config={
    schemaVersion:1,id:'sample-cert',trackId:'marketing',title:'Sample Certification',
    passingScore:70,masterBankFile:'voucher/tracks/marketing/sample-cert/master-bank.json',
    realExam:{questionCount:100,durationMinutes:null,rankEligible:true},sources:[]
  };
  const errors=validateVoucherExamConfig(config);
  assert.ok(errors.some(x=>x.includes('durationMinutes')));
});
