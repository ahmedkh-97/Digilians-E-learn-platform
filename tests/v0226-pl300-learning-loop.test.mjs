import test from 'node:test';
import assert from 'node:assert/strict';

const mod=await import('../assets/js/pl300-learning-loop.js').catch(()=>({}));
const fn=name=>{assert.equal(typeof mod[name],'function',`${name} must be exported`);return mod[name];};

const sampleIndex={records:[
  {questionId:'q1',mode:'objective',equivalenceClusterId:'c1',ranking:{accuracyWeight:1}},
  {questionId:'q2',mode:'objective',equivalenceClusterId:'c1',ranking:{accuracyWeight:1}},
  {questionId:'q3',mode:'objective',validatedQuestionId:'v2',ranking:{accuracyWeight:1}},
  {questionId:'q4',mode:'checkpoint',ranking:{accuracyWeight:0}},
  {questionId:'q5',mode:'objective',validatedQuestionId:'v3',ranking:{accuracyWeight:1}},
  {questionId:'q6',mode:'objective',validatedQuestionId:'v4',ranking:{accuracyWeight:1}}
]};
const part={id:'p1',questionIds:['q1','q2','q3','q4','q5','q6']};

test('normalizes missing learning state to a backward-compatible empty version-1 shape',()=>{
  const normalize=fn('normalizePl300LearningState');
  assert.deepEqual(normalize(),{version:1,parts:{}});
});

test('queues a wrong answer four transitions later when enough first-pass questions remain',()=>{
  assert.equal(mod.PL300_RETRY_DELAY_TRANSITIONS,4);
  const normalize=fn('normalizePl300LearningState');
  const enqueue=fn('enqueuePl300DelayedRetry');
  const queued=enqueue({state:normalize(),partId:'p1',questionId:'q4',remainingFirstPassCount:8,now:'2026-09-06T09:00:00Z'});
  assert.equal(queued.parts.p1.pending.length,1);
  assert.equal(queued.parts.p1.pending[0].questionId,'q4');
  assert.equal(queued.parts.p1.pending[0].dueAtSerial,4);
  assert.equal(queued.parts.p1.pending[0].deferToPartReview,false);
});

test('deduplicates repeated queue entries and defers near-end wrong answers to part review',()=>{
  const normalize=fn('normalizePl300LearningState');
  const enqueue=fn('enqueuePl300DelayedRetry');
  let state=enqueue({state:normalize(),partId:'p1',questionId:'q2',remainingFirstPassCount:2});
  state=enqueue({state,partId:'p1',questionId:'q2',remainingFirstPassCount:2});
  assert.equal(state.parts.p1.pending.length,1);
  assert.equal(state.parts.p1.pending[0].deferToPartReview,true);
});

test('transition serial advances only when moving to a different question and matures at transition four',()=>{
  const normalize=fn('normalizePl300LearningState');
  const enqueue=fn('enqueuePl300DelayedRetry');
  const advance=fn('advancePl300RetryQueue');
  let state=enqueue({state:normalize(),partId:'p1',questionId:'q1',remainingFirstPassCount:8});
  let result=advance({state,partId:'p1',fromQuestionId:'q2',toQuestionId:'q2'});
  state=result.state;
  assert.equal(state.parts.p1.transitionSerial,0);
  assert.equal(result.maturedQuestionId,null);
  for(let serial=1;serial<=3;serial++){
    result=advance({state,partId:'p1',fromQuestionId:`q${serial+1}`,toQuestionId:`q${serial+2}`});
    state=result.state;
    assert.equal(state.parts.p1.transitionSerial,serial);
    assert.equal(result.maturedQuestionId,null);
  }
  result=advance({state,partId:'p1',fromQuestionId:'q5',toQuestionId:'q6'});
  assert.equal(result.state.parts.p1.transitionSerial,4);
  assert.equal(result.maturedQuestionId,'q1');
});

test('retry queues stay scoped to their active part',()=>{
  const normalize=fn('normalizePl300LearningState');
  const enqueue=fn('enqueuePl300DelayedRetry');
  const advance=fn('advancePl300RetryQueue');
  let state=enqueue({state:normalize(),partId:'p1',questionId:'q1',remainingFirstPassCount:8});
  state=enqueue({state,partId:'p2',questionId:'q9',remainingFirstPassCount:8});
  const result=advance({state,partId:'p2',fromQuestionId:'q10',toQuestionId:'q11',transitions:4});
  assert.equal(result.maturedQuestionId,'q9');
  assert.equal(result.state.parts.p1.transitionSerial,0);
});

test('recovered retry is removed while a repeated wrong retry remains available for part review',()=>{
  const normalize=fn('normalizePl300LearningState');
  const enqueue=fn('enqueuePl300DelayedRetry');
  const resolve=fn('resolvePl300PendingRetry');
  let state=enqueue({state:normalize(),partId:'p1',questionId:'q1',remainingFirstPassCount:8});
  state=resolve({state,partId:'p1',questionId:'q1',correct:true});
  assert.deepEqual(state.parts.p1.pending,[]);
  state=enqueue({state,partId:'p1',questionId:'q2',remainingFirstPassCount:8});
  state=resolve({state,partId:'p1',questionId:'q2',correct:false});
  assert.equal(state.parts.p1.pending.length,1);
  assert.equal(state.parts.p1.pending[0].questionId,'q2');
  assert.equal(state.parts.p1.pending[0].deferToPartReview,true);
});

test('part metrics separate studied, first-pass correct, recovered, unresolved and checkpoints without duplicate mastery inflation',()=>{
  const metrics=fn('buildPl300PartStudyMetrics')({
    part,index:sampleIndex,
    records:{
      q1:{mode:'auto',firstPassCorrect:true,everCorrect:true},
      q2:{mode:'auto',firstPassCorrect:true,everCorrect:true},
      q3:{mode:'native',firstPassCorrect:false,everCorrect:true},
      q4:{mode:'checkpoint',reviewStatus:'reviewed'},
      q5:{mode:'auto',firstPassCorrect:false,everCorrect:false}
    }
  });
  assert.equal(metrics.total,6);
  assert.equal(metrics.studied,5);
  assert.equal(metrics.scored,4);
  assert.equal(metrics.firstPassCorrect,2);
  assert.equal(metrics.recovered,1);
  assert.equal(metrics.needReview,1);
  assert.equal(metrics.checkpoints,1);
  assert.equal(metrics.firstPassAccuracy,50);
  assert.equal(metrics.masteredConcepts,2,'q1/q2 share one concept, q3 is one recovered concept');
  assert.deepEqual(metrics.needReviewQuestionIds,['q5']);
});

test('part review model exposes weak questions and never treats checkpoints as wrong answers',()=>{
  const review=fn('buildPl300PartReviewModel')({
    part,index:sampleIndex,
    records:{
      q1:{mode:'auto',firstPassCorrect:true,everCorrect:true},
      q2:{mode:'auto',firstPassCorrect:true,everCorrect:true},
      q3:{mode:'native',firstPassCorrect:false,everCorrect:true},
      q4:{mode:'checkpoint',reviewStatus:'reviewed'},
      q5:{mode:'auto',firstPassCorrect:false}
    }
  });
  assert.equal(review.studied,5);
  assert.equal(review.firstPassCorrect,2);
  assert.equal(review.recovered,1);
  assert.equal(review.needReview,1);
  assert.deepEqual(review.weakQuestionIds,['q5']);
});

test('resume targets first unstudied occurrence, then review, then complete',()=>{
  const resume=fn('resolvePl300PartResume');
  const partial=resume({part,index:sampleIndex,records:{q1:{mode:'auto'},q2:{mode:'auto'}}});
  assert.deepEqual(partial,{mode:'question',questionId:'q3',index:2});
  const reviewed=resume({part,index:sampleIndex,records:{
    q1:{mode:'auto',firstPassCorrect:true},q2:{mode:'auto',firstPassCorrect:true},q3:{mode:'native',firstPassCorrect:false,everCorrect:true},q4:{mode:'checkpoint'},q5:{mode:'auto',firstPassCorrect:false},q6:{mode:'auto',firstPassCorrect:true}
  }});
  assert.equal(reviewed.mode,'review');
  assert.deepEqual(reviewed.questionIds,['q5']);
  const complete=resume({part,index:sampleIndex,records:{
    q1:{mode:'auto',firstPassCorrect:true},q2:{mode:'auto',firstPassCorrect:true},q3:{mode:'native',firstPassCorrect:false,everCorrect:true},q4:{mode:'checkpoint'},q5:{mode:'auto',firstPassCorrect:false,everCorrect:true},q6:{mode:'auto',firstPassCorrect:true}
  }});
  assert.deepEqual(complete,{mode:'complete'});
});
