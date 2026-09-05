import test from 'node:test';
import assert from 'node:assert/strict';
import {selectVoucherQuestions} from '../assets/js/voucher-bank-engine.js';

const q=(id,topic='prepare-data')=>({id,question:id,topicId:topic,topic,status:'approved',productionReady:true,options:[{id:'A',text:'A'},{id:'B',text:'B'}],correctAnswer:'A'});

test('session-scoped Voucher selection never leaks questions outside the allowlist',()=>{
  const bank=[q('q1'),q('q2'),q('q3'),q('q4')];
  const selected=selectVoucherQuestions({questions:bank,count:2,allowedQuestionIds:['q2','q4'],rng:()=>0.2});
  assert.deepEqual(new Set(selected.map(x=>x.id)),new Set(['q2','q4']));
});

test('allowlist validation uses the filtered eligible count and ordinary selection stays backward compatible',()=>{
  const bank=[q('q1'),q('q2'),q('q3')];
  assert.throws(()=>selectVoucherQuestions({questions:bank,count:2,allowedQuestionIds:['q1'],rng:()=>0.2}),/only 1 are eligible/);
  assert.equal(selectVoucherQuestions({questions:bank,count:3,rng:()=>0.2}).length,3);
});
