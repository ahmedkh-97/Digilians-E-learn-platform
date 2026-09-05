import test from 'node:test';
import assert from 'node:assert/strict';
import {
  voucherReadinessLevel,
  voucherRankedImprovement,
  voucherNextRankTarget,
  voucherWeakDomains,
  selectVoucherImprovementQuestions
} from '../assets/js/voucher-learning.js';

test('Voucher readiness thresholds match the approved learning indicators',()=>{
  assert.equal(voucherReadinessLevel(null).label,'Not measured yet');
  assert.equal(voucherReadinessLevel(49).label,'Building Foundations');
  assert.equal(voucherReadinessLevel(50).label,'Developing');
  assert.equal(voucherReadinessLevel(70).label,'Exam Ready');
  assert.equal(voucherReadinessLevel(85).label,'Advanced Readiness');
});

test('Ranked improvement uses first ranked attempt and personal best',()=>{
  const summary=voucherRankedImprovement([
    {rankEligible:true,percentage:64,submittedAt:'2026-09-01T10:00:00Z'},
    {rankEligible:true,percentage:78,submittedAt:'2026-09-02T10:00:00Z'},
    {rankEligible:false,percentage:100,submittedAt:'2026-09-03T10:00:00Z'}
  ]);
  assert.deepEqual(summary,{kind:'improved',firstPercentage:64,bestPercentage:78,delta:14});
});

test('Next-rank target distinguishes score gap from same-score time tie',()=>{
  const gapBoard=[
    {player_id:'p2',rank:1,score:50,percentage:83,time_taken_seconds:500},
    {player_id:'p1',rank:2,score:47,percentage:78,time_taken_seconds:450}
  ];
  assert.deepEqual(voucherNextRankTarget(gapBoard,'p1'),{
    kind:'score-gap',message:'4 more correct answers to move to #1.',additionalCorrect:4,targetRank:1
  });
  const tieBoard=[
    {player_id:'p2',rank:1,score:50,percentage:83,time_taken_seconds:500},
    {player_id:'p1',rank:2,score:50,percentage:83,time_taken_seconds:560}
  ];
  assert.equal(voucherNextRankTarget(tieBoard,'p1').kind,'time-tie');
});

test('Weak domains use the most recent ranked attempt breakdown',()=>{
  assert.deepEqual(voucherWeakDomains({topicBreakdown:[
    {topic:'manage-secure',percentage:45},
    {topic:'prepare-data',percentage:70},
    {topic:'model-data',percentage:52}
  ]},2),['manage-secure','model-data']);
});

test('Improvement session prioritizes weak domains, mistakes, and unseen reviewed questions',()=>{
  const questions=Array.from({length:40},(_,i)=>({
    id:`q${i+1}`,
    topicId:i<20?'weak-a':i<30?'weak-b':'other',
    productionReady:true,
    status:'approved'
  }));
  const selected=selectVoucherImprovementQuestions({
    questions,
    weakDomains:['weak-a','weak-b'],
    mistakeQuestionIds:['q1','q21','q35'],
    seenIds:['q1','q2','q3'],
    count:25,
    rng:()=>0.2
  });
  assert.equal(selected.length,25);
  assert.ok(selected.filter(q=>['weak-a','weak-b'].includes(q.topicId)).length>=15);
  assert.equal(new Set(selected.map(q=>q.id)).size,25);
});
