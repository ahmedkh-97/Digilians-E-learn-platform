import test from 'node:test';
import assert from 'node:assert/strict';
import {getVoucherSourcePracticeState,saveVoucherSourcePracticeResult} from '../assets/js/voucher-storage.js';

function fakeStorage(){
  const map=new Map();
  return {getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,String(value))};
}

test('native structured source answers persist and contribute only to local practice summary',()=>{
  const storage=fakeStorage();
  saveVoucherSourcePracticeResult('u1','q-native',{examId:'microsoft-pl-300',sourceId:'source-01',mode:'native',answers:{'box-1':'Dual','box-2':'Import'},correct:true},{storage});
  const state=getVoucherSourcePracticeState('u1','microsoft-pl-300',{storage});
  assert.deepEqual(state.records['q-native'].answers,{'box-1':'Dual','box-2':'Import'});
  assert.equal(state.records['q-native'].mode,'native');
  assert.deepEqual(state.summary,{answered:1,correct:1,incorrect:0});
});

test('native structured source result fails closed when no answer fields are provided',()=>{
  const storage=fakeStorage();
  assert.throws(()=>saveVoucherSourcePracticeResult('u1','q-native',{examId:'microsoft-pl-300',mode:'native',answers:{}},{storage}),/requires structured answers/);
});
