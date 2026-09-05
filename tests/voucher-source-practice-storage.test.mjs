import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getVoucherSourcePracticeState,
  saveVoucherSourcePracticeResult
} from '../assets/js/voucher-storage.js';

class MemoryStorage{
  constructor(){this.map=new Map()}
  getItem(k){return this.map.has(k)?this.map.get(k):null}
  setItem(k,v){this.map.set(k,String(v))}
  removeItem(k){this.map.delete(k)}
}

test('voucher source practice persists auto-scored and self-graded source items',()=>{
  const storage=new MemoryStorage();
  const ownerId='learner-1';
  saveVoucherSourcePracticeResult(ownerId,'pl300-source-01-q002',{
    examId:'microsoft-pl-300',sourceId:'source-01',mode:'auto',selected:['A'],correct:true
  },{storage});
  saveVoucherSourcePracticeResult(ownerId,'pl300-source-02-q001',{
    examId:'microsoft-pl-300',sourceId:'source-02',mode:'self',selfGrade:'incorrect'
  },{storage});

  const state=getVoucherSourcePracticeState(ownerId,'microsoft-pl-300',{storage});
  assert.equal(Object.keys(state.records).length,2);
  assert.deepEqual(state.records['pl300-source-01-q002'].selected,['A']);
  assert.equal(state.records['pl300-source-01-q002'].correct,true);
  assert.equal(state.records['pl300-source-02-q001'].selfGrade,'incorrect');
  assert.equal(state.summary.answered,2);
  assert.equal(state.summary.correct,1);
  assert.equal(state.summary.incorrect,1);
});
