import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.cwd();
const storagePath=path.join(root,'assets/js/storage.js');
const appPath=path.join(root,'assets/js/app.js');

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

async function loadStorage(){
  return import(`${pathToFileURL(storagePath).href}?t=${Date.now()}-${Math.random()}`);
}

test('ranking UI preferences are persisted through storage facade using exact legacy keys',async()=>{
  const memory=new MemoryStorage({
    'digilians_ranking_mode':'track',
    'digilians_ranking_track_level':'professional-data-analysis',
    'digilians_ranking_track':'sql',
    'digilians_last_ranking_exam_id':'official::sql::final',
    'digilians_voucher_ranking_track':'data-analysis',
    'digilians_voucher_ranking_exam':'pl300'
  });
  globalThis.localStorage=memory;
  const storage=await loadStorage();

  assert.deepEqual(storage.getRankingPreferences(),{
    mode:'track',trackLevelId:'professional-data-analysis',trackId:'sql',lastExamId:'official::sql::final',
    voucherTrackId:'data-analysis',voucherExamId:'pl300'
  });

  assert.equal(storage.setRankingMode('exam'),true);
  assert.equal(storage.setRankingTrackPreference('junior-data-analysis','excel'),true);
  assert.equal(storage.setLastRankingExamId('exam-123'),true);
  assert.equal(storage.setVoucherRankingTrackPreference('data-analysis'),true);
  assert.equal(storage.setVoucherRankingExamPreference('pl300-full'),true);

  assert.equal(memory.getItem('digilians_ranking_mode'),'exam');
  assert.equal(memory.getItem('digilians_ranking_track_level'),'junior-data-analysis');
  assert.equal(memory.getItem('digilians_ranking_track'),'excel');
  assert.equal(memory.getItem('digilians_last_ranking_exam_id'),'exam-123');
  assert.equal(memory.getItem('digilians_voucher_ranking_track'),'data-analysis');
  assert.equal(memory.getItem('digilians_voucher_ranking_exam'),'pl300-full');
});

test('ranking preference defaults preserve current app behavior',async()=>{
  globalThis.localStorage=new MemoryStorage();
  const storage=await loadStorage();
  assert.deepEqual(storage.getRankingPreferences(),{
    mode:'',trackLevelId:'',trackId:'',lastExamId:'',voucherTrackId:'',voucherExamId:''
  });
});

test('app.js does not bypass storage facade for ranking preference keys',()=>{
  const app=fs.readFileSync(appPath,'utf8');
  const keys=[
    'digilians_ranking_mode','digilians_ranking_track_level','digilians_ranking_track',
    'digilians_last_ranking_exam_id','digilians_voucher_ranking_track','digilians_voucher_ranking_exam'
  ];
  for(const key of keys){
    assert.doesNotMatch(app,new RegExp(`localStorage\\.(?:getItem|setItem)\\(\\s*["']${key}["']`),`${key} must be accessed through storage.js`);
  }
});
