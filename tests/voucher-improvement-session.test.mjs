import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {selectVoucherImprovementQuestions} from '../assets/js/voucher-learning.js';
import {isVoucherRankEligibleAttempt} from '../assets/js/voucher-ranking.js';
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('Improvement selection is reviewed-only, unique and weak-domain weighted',()=>{
  const questions=Array.from({length:40},(_,i)=>({id:`q${i}`,topicId:i<20?'weak':i<30?'other':'third',productionReady:i!==39,status:i===38?'conflict':'approved'}));
  const out=selectVoucherImprovementQuestions({questions,weakDomains:['weak'],mistakeQuestionIds:['q1','q25'],seenIds:['q1','q2'],count:25,rng:()=>0.1});
  assert.equal(out.length,25);
  assert.ok(out.filter(q=>q.topicId==='weak').length>=15);
  assert.ok(out.every(q=>q.productionReady!==false&&q.status!=='conflict'));
  assert.equal(new Set(out.map(q=>q.id)).size,out.length);
});

test('Improvement runtime is explicitly non-ranked and fixed to instant untimed 25',()=>{
  assert.match(app,/async function prepareVoucherImprovementSession\(/);
  const block=app.match(/async function prepareVoucherImprovementSession\([\s\S]*?\n}\n/)?.[0]||'';
  assert.match(block,/sizeMode:"improvement-25"/);
  assert.match(block,/mockKind:"improvement"/);
  assert.match(block,/timed:false/);
  assert.match(block,/feedbackMode:"instant"/);
  assert.match(block,/improvementSession:true/);
  assert.equal(isVoucherRankEligibleAttempt({sizeMode:'improvement-25',rankEligible:false}),false);
});

test('Improvement session uses weak domains, Voucher mistakes and unseen coverage',()=>{
  const block=app.match(/async function prepareVoucherImprovementSession\([\s\S]*?\n}\n/)?.[0]||'';
  assert.match(block,/voucherWeakDomains/);
  assert.match(block,/getMistakes/);
  assert.match(block,/getVoucherSeenQuestionIds/);
  assert.match(block,/selectVoucherImprovementQuestions/);
});
