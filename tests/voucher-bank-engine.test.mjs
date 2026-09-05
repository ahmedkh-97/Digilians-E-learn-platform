import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildVoucherMasterBank,
  isVoucherOptionShuffleSafe,
  shuffleVoucherOptions,
  calculateVoucherDurationMinutes,
  selectVoucherQuestions
} from '../assets/js/voucher-bank-engine.js';

const q=(id,topic='A',correct='o1',question=`Question ${id}`,options=[
  {id:'o1',text:'First'},{id:'o2',text:'Second'},{id:'o3',text:'Third'}
])=>({id,canonicalId:id,question,topic,topicId:topic.toLowerCase(),options,correctAnswer:correct,status:'approved'});

const deterministic=values=>{let i=0;return ()=>values[i++%values.length];};

test('deduplicates canonical duplicates and merges provenance',()=>{
  const one={sourceId:'s1',questions:[{...q('q1'),sourceRef:{sourceId:'s1',questionNumber:1}}]};
  const two={sourceId:'s2',questions:[{...q('q2'),canonicalId:'q1',sourceRef:{sourceId:'s2',questionNumber:9}}]};
  const out=buildVoucherMasterBank({examId:'exam',sourceBanks:[one,two],approvedCorrections:{}});
  assert.equal(out.questions.length,1);
  assert.deepEqual(out.questions[0].sourceRefs.map(x=>x.sourceId),['s1','s2']);
  assert.equal(out.conflicts.length,0);
});

test('conflicting answer keys are excluded until operator-approved correction exists',()=>{
  const options=[{id:'o1',text:'Alpha'},{id:'o2',text:'Beta'}];
  const one={sourceId:'s1',questions:[{...q('q1','A','o1','Same?',options),canonicalId:'same'}]};
  const two={sourceId:'s2',questions:[{...q('q2','A','o2','Same?',options),canonicalId:'same'}]};
  const blocked=buildVoucherMasterBank({examId:'exam',sourceBanks:[one,two],approvedCorrections:{}});
  assert.equal(blocked.questions.length,0);
  assert.equal(blocked.conflicts.length,1);
  const approved=buildVoucherMasterBank({examId:'exam',sourceBanks:[one,two],approvedCorrections:{same:{answerText:'Alpha'}}});
  assert.equal(approved.questions.length,1);
  assert.equal(approved.questions[0].correctAnswer,'o1');
  assert.equal(approved.conflicts.length,0);
});

test('safe shuffle preserves correct answer by stable option ID',()=>{
  const question=q('q-safe');
  const shuffled=shuffleVoucherOptions(question,{rng:deterministic([0.9,0.1,0.4])});
  assert.notDeepEqual(shuffled.options.map(x=>x.id),question.options.map(x=>x.id));
  assert.equal(shuffled.correctAnswer,'o1');
  assert.equal(shuffled.options.some(x=>x.id===shuffled.correctAnswer),true);
});

test('combination answers lock option order',()=>{
  const question=q('q-combo','A','o3','Which is correct?',[{id:'o1',text:'A item'},{id:'o2',text:'B item'},{id:'o3',text:'A and B'}]);
  assert.equal(isVoucherOptionShuffleSafe(question),false);
  assert.deepEqual(shuffleVoucherOptions(question,{rng:()=>0}).options,question.options);
});

test('timed training duration is proportional to real exam size',()=>{
  assert.equal(calculateVoucherDurationMinutes({realQuestionCount:100,realDurationMinutes:120,requestedCount:50}),60);
});

test('Unseen-First selection keeps topic balance before reusing seen questions',()=>{
  const bank=[q('a1','A'),q('a2','A'),q('b1','B'),q('b2','B')];
  const selected=selectVoucherQuestions({questions:bank,count:2,seenIds:['a1','b1'],rng:()=>0.2});
  assert.deepEqual(new Set(selected.map(x=>x.id)),new Set(['a2','b2']));
});

test('official blueprint quotas are honored when available',()=>{
  const bank=[q('a1','A'),q('a2','A'),q('a3','A'),q('b1','B'),q('b2','B'),q('b3','B')];
  const selected=selectVoucherQuestions({questions:bank,count:4,seenIds:[],blueprint:[{topicId:'a',weight:75},{topicId:'b',weight:25}],rng:()=>0.2});
  assert.equal(selected.filter(x=>x.topicId==='a').length,3);
  assert.equal(selected.filter(x=>x.topicId==='b').length,1);
});
