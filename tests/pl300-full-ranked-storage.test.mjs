import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveVoucherSourcePracticeResult,getVoucherSourcePracticeState,exportVoucherStore,importVoucherStore
} from '../assets/js/voucher-storage.js';
import {mergeBackupIntoStorageData} from '../assets/js/backup-restore.js';

function memoryStorage(){
  const map=new Map();
  return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
}

test('ranked source practice preserves first pass, retries, mastery, and active solve time',()=>{
  const storage=memoryStorage();
  saveVoucherSourcePracticeResult('u','q1',{examId:'microsoft-pl-300',sourceId:'source-01',mode:'auto',selected:['A'],correct:false,activeSeconds:12,answeredAt:'2026-09-05T08:00:00Z'},{storage});
  saveVoucherSourcePracticeResult('u','q1',{examId:'microsoft-pl-300',sourceId:'source-01',mode:'auto',selected:['B'],correct:true,activeSeconds:8,answeredAt:'2026-09-05T08:01:00Z'},{storage});
  const record=getVoucherSourcePracticeState('u','microsoft-pl-300',{storage}).records.q1;
  assert.equal(record.attemptCount,2);
  assert.equal(record.firstPassCorrect,false);
  assert.equal(record.everCorrect,true);
  assert.equal(record.correct,true);
  assert.equal(record.firstAnsweredAt,'2026-09-05T08:00:00Z');
  assert.equal(record.activeSeconds,20);
});

test('ranked study checkpoint completes coverage without self-awarded correctness',()=>{
  const storage=memoryStorage();
  saveVoucherSourcePracticeResult('u','q2',{examId:'microsoft-pl-300',sourceId:'source-02',mode:'checkpoint',reviewStatus:'reviewed',activeSeconds:7,answeredAt:'2026-09-05T08:02:00Z'},{storage});
  const record=getVoucherSourcePracticeState('u','microsoft-pl-300',{storage}).records.q2;
  assert.equal(record.mode,'checkpoint');
  assert.equal(record.reviewStatus,'reviewed');
  assert.equal(record.activeSeconds,7);
  assert.equal(record.correct,undefined);
  assert.equal(record.selfGrade,undefined);
});

test('full ranked source history survives voucher export/import and backup merge',()=>{
  const storage=memoryStorage();
  saveVoucherSourcePracticeResult('u','q1',{examId:'microsoft-pl-300',sourceId:'source-01',mode:'native',answers:{box:'Dual'},correct:true,activeSeconds:4,answeredAt:'2026-09-05T08:00:00Z'},{storage});
  const snapshot=exportVoucherStore({storage});
  const other=memoryStorage();
  assert.equal(importVoucherStore(snapshot,{storage:other}),true);
  const imported=getVoucherSourcePracticeState('u','microsoft-pl-300',{storage:other}).records.q1;
  assert.equal(imported.firstPassCorrect,true);
  assert.equal(imported.everCorrect,true);
  assert.equal(imported.attemptCount,1);
  assert.equal(imported.activeSeconds,4);

  const current={'digilians.voucher':JSON.stringify({schemaVersion:1,owners:{u:{attempts:[],seenByExam:{},sourcePractice:{},updatedAt:'2026-09-05T07:00:00Z'}}})};
  const incoming={'digilians.voucher':JSON.stringify(snapshot)};
  const merged=mergeBackupIntoStorageData(current,incoming);
  const mergedRecord=JSON.parse(merged['digilians.voucher']).owners.u.sourcePractice.q1;
  assert.equal(mergedRecord.firstPassCorrect,true);
  assert.equal(mergedRecord.everCorrect,true);
  assert.equal(mergedRecord.activeSeconds,4);
});
