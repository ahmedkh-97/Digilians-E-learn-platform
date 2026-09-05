import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveVoucherAttempt,getVoucherAttempts,getBestVoucherAttempt,
  markVoucherQuestionsSeen,getVoucherSeenQuestionIds,
  exportVoucherStore,importVoucherStore
} from '../assets/js/voucher-storage.js';

function memoryStorage(){
  const map=new Map();
  return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
}

test('Voucher attempts stay in their own store and best eligible attempt is selected',()=>{
  const storage=memoryStorage();
  const base={examId:'cert-a',trackId:'marketing',studentName:'A',total:100,submittedAt:'2026-09-02T10:00:00Z'};
  saveVoucherAttempt('p1',{...base,id:'a1',correct:90,percentage:90,timeTakenSeconds:500,rankEligible:true},{storage});
  saveVoucherAttempt('p1',{...base,id:'a2',correct:95,percentage:95,timeTakenSeconds:600,rankEligible:false},{storage});
  assert.equal(getVoucherAttempts('p1','cert-a',{storage}).length,2);
  assert.equal(getBestVoucherAttempt('p1','cert-a',{storage,rankEligibleOnly:true}).id,'a1');
});

test('seen question IDs are deduplicated per exam',()=>{
  const storage=memoryStorage();
  markVoucherQuestionsSeen('p1','cert-a',['q1','q2'],{storage});
  markVoucherQuestionsSeen('p1','cert-a',['q2','q3'],{storage});
  assert.deepEqual(new Set(getVoucherSeenQuestionIds('p1','cert-a',{storage})),new Set(['q1','q2','q3']));
});

test('Voucher store round-trips independently',()=>{
  const storage=memoryStorage();
  saveVoucherAttempt('p1',{id:'a1',examId:'cert-a',trackId:'marketing',correct:10,percentage:100,timeTakenSeconds:20,submittedAt:'2026-09-02T10:00:00Z'},{storage});
  const snapshot=exportVoucherStore({storage});
  const other=memoryStorage();
  assert.equal(importVoucherStore(snapshot,{storage:other}),true);
  assert.equal(getVoucherAttempts('p1','cert-a',{storage:other}).length,1);
});

test('best Voucher ranked attempt can be isolated by size mode',()=>{
  const storage=memoryStorage();
  const base={examId:'cert-a',trackId:'data-analysis',studentName:'A',rankEligible:true};
  saveVoucherAttempt('p1',{...base,id:'challenge',sizeMode:'real',correct:55,percentage:91.7,timeTakenSeconds:1000,submittedAt:'2026-09-04T10:00:00Z'},{storage});
  saveVoucherAttempt('p1',{...base,id:'full',sizeMode:'full-ranked',correct:170,percentage:94.4,timeTakenSeconds:5000,submittedAt:'2026-09-04T11:00:00Z'},{storage});
  assert.equal(getBestVoucherAttempt('p1','cert-a',{storage,rankEligibleOnly:true,sizeMode:'real'}).id,'challenge');
  assert.equal(getBestVoucherAttempt('p1','cert-a',{storage,rankEligibleOnly:true,sizeMode:'full-ranked'}).id,'full');
});
