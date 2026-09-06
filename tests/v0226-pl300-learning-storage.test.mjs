import test from 'node:test';
import assert from 'node:assert/strict';
import * as voucherStorage from '../assets/js/voucher-storage.js';
import {mergeBackupIntoStorageData} from '../assets/js/backup-restore.js';
import * as voucherEngine from '../assets/js/voucher-engine.js';

const getFn=(obj,name)=>{assert.equal(typeof obj[name],'function',`${name} must be exported`);return obj[name];};

function memoryStorage(seed={}){
  const map=new Map(Object.entries(seed).map(([k,v])=>[k,String(v)]));
  return {
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value)),
    removeItem:key=>map.delete(key),
    dump:()=>Object.fromEntries(map)
  };
}

const key='digilians.voucher';
const examId='microsoft-pl-300';
const queuedState={version:1,parts:{p1:{transitionSerial:2,pending:[{questionId:'q4',dueAtSerial:4,deferToPartReview:false,updatedAt:'2026-09-06T09:00:00Z'}],updatedAt:'2026-09-06T09:00:00Z'}}};

test('old V0.22.5 voucher owners load an empty learning state without schema migration',()=>{
  const storage=memoryStorage({[key]:JSON.stringify({schemaVersion:1,owners:{u:{attempts:[],seenByExam:{},sourcePractice:{q1:{examId,mode:'auto',selected:['A'],correct:true}},updatedAt:'2026-09-06T08:00:00Z'}}})});
  const get=getFn(voucherStorage,'getVoucherSourceLearningState');
  assert.deepEqual(get('u',examId,{storage}),{version:1,parts:{}});
  assert.equal(JSON.parse(storage.getItem(key)).schemaVersion,1);
});

test('saving learning state is exam-scoped and never mutates source-practice first-pass history',()=>{
  const storage=memoryStorage();
  voucherStorage.saveVoucherSourcePracticeResult('u','q1',{examId,sourceId:'source-01',mode:'auto',selected:['A'],correct:false,answeredAt:'2026-09-06T08:00:00Z'},{storage});
  const before=voucherStorage.getVoucherSourcePracticeState('u',examId,{storage}).records.q1;
  const save=getFn(voucherStorage,'saveVoucherSourceLearningState');
  const get=getFn(voucherStorage,'getVoucherSourceLearningState');
  assert.equal(save('u',examId,queuedState,{storage,updatedAt:'2026-09-06T09:05:00Z'}),true);
  const after=voucherStorage.getVoucherSourcePracticeState('u',examId,{storage}).records.q1;
  assert.deepEqual(after,before);
  const learning=get('u',examId,{storage});
  assert.equal(learning.version,1);
  assert.equal(learning.parts.p1.transitionSerial,2);
  assert.equal(learning.parts.p1.pending[0].questionId,'q4');
  assert.equal(learning.updatedAt,'2026-09-06T09:05:00Z');
});

test('voucher-engine re-exports the learning-state APIs',()=>{
  getFn(voucherEngine,'getVoucherSourceLearningState');
  getFn(voucherEngine,'saveVoucherSourceLearningState');
});

test('voucher export/import preserves delayed retry state and schemaVersion 1',()=>{
  const save=getFn(voucherStorage,'saveVoucherSourceLearningState');
  const get=getFn(voucherStorage,'getVoucherSourceLearningState');
  const source=memoryStorage();
  save('u',examId,queuedState,{storage:source,updatedAt:'2026-09-06T09:10:00Z'});
  const snapshot=voucherStorage.exportVoucherStore({storage:source});
  assert.equal(snapshot.schemaVersion,1);
  const target=memoryStorage();
  assert.equal(voucherStorage.importVoucherStore(snapshot,{storage:target}),true);
  const restored=get('u',examId,{storage:target});
  assert.equal(restored.parts.p1.pending[0].questionId,'q4');
  assert.equal(restored.updatedAt,'2026-09-06T09:10:00Z');
});

test('malformed pending retry entries are normalized away on learning-state read',()=>{
  const storage=memoryStorage({[key]:JSON.stringify({schemaVersion:1,owners:{u:{attempts:[],seenByExam:{},sourcePractice:{},sourceLearningByExam:{[examId]:{version:1,parts:{p1:{transitionSerial:1,pending:[null,{}, {questionId:'',dueAtSerial:4},{questionId:'q-bad',dueAtSerial:'nope'},{questionId:'q-good',dueAtSerial:4,deferToPartReview:false}]}}}},updatedAt:'2026-09-06T09:00:00Z'}}})});
  const get=getFn(voucherStorage,'getVoucherSourceLearningState');
  const state=get('u',examId,{storage});
  assert.deepEqual(state.parts.p1.pending.map(item=>item.questionId),['q-good']);
});

test('backup merge keeps source-practice history and chooses the latest per-exam learning state',()=>{
  const currentVoucher={schemaVersion:1,owners:{u:{
    attempts:[],seenByExam:{},
    sourcePractice:{q1:{examId,mode:'auto',selected:['A'],correct:false,firstPassCorrect:false,attemptCount:1,answeredAt:'2026-09-06T08:00:00Z'}},
    sourceLearningByExam:{[examId]:{version:1,parts:{p1:{transitionSerial:1,pending:[{questionId:'q1',dueAtSerial:4,deferToPartReview:false}]}},updatedAt:'2026-09-06T09:00:00Z'}},
    updatedAt:'2026-09-06T09:00:00Z'
  }}};
  const incomingVoucher={schemaVersion:1,owners:{u:{
    attempts:[],seenByExam:{},
    sourcePractice:{q1:{examId,mode:'auto',selected:['B'],correct:true,firstPassCorrect:false,everCorrect:true,attemptCount:2,answeredAt:'2026-09-06T09:20:00Z'}},
    sourceLearningByExam:{[examId]:{version:1,parts:{p1:{transitionSerial:4,pending:[]}},updatedAt:'2026-09-06T09:20:00Z'}},
    updatedAt:'2026-09-06T09:20:00Z'
  }}};
  const merged=mergeBackupIntoStorageData({[key]:JSON.stringify(currentVoucher)},{[key]:JSON.stringify(incomingVoucher)});
  const owner=JSON.parse(merged[key]).owners.u;
  assert.equal(owner.sourcePractice.q1.firstPassCorrect,false);
  assert.equal(owner.sourcePractice.q1.everCorrect,true);
  assert.equal(owner.sourcePractice.q1.attemptCount,2);
  assert.equal(owner.sourceLearningByExam[examId].parts.p1.transitionSerial,4);
  assert.equal(owner.sourceLearningByExam[examId].updatedAt,'2026-09-06T09:20:00Z');
});

test('backup merge does not replace a newer current learning state with stale incoming state',()=>{
  const current={[key]:JSON.stringify({schemaVersion:1,owners:{u:{attempts:[],seenByExam:{},sourcePractice:{},sourceLearningByExam:{[examId]:{version:1,parts:{p1:{transitionSerial:9,pending:[]}},updatedAt:'2026-09-06T10:00:00Z'}},updatedAt:'2026-09-06T10:00:00Z'}}})};
  const incoming={[key]:JSON.stringify({schemaVersion:1,owners:{u:{attempts:[],seenByExam:{},sourcePractice:{},sourceLearningByExam:{[examId]:{version:1,parts:{p1:{transitionSerial:2,pending:[]}},updatedAt:'2026-09-06T09:00:00Z'}},updatedAt:'2026-09-06T09:00:00Z'}}})};
  const merged=mergeBackupIntoStorageData(current,incoming);
  assert.equal(JSON.parse(merged[key]).owners.u.sourceLearningByExam[examId].parts.p1.transitionSerial,9);
});
