import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as loop from '../assets/js/pl300-learning-loop.js';
import * as fullRank from '../assets/js/pl300-full-ranked-learning.js';

const appSource=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const guardSource=fs.readFileSync(new URL('../assets/js/pl300-source-practice-selection-guard.js',import.meta.url),'utf8');

test('PL-300 controller lazily loads and persists the per-part learning queue',()=>{
  assert.match(appSource,/getVoucherSourceLearningState/);
  assert.match(appSource,/saveVoucherSourceLearningState/);
  assert.match(appSource,/import\(`\.\/pl300-learning-loop\.js\?v=\$\{BUILD_VERSION\}`\)|import\(["']\.\/pl300-learning-loop\.js\?v=/);
  assert.match(appSource,/enqueuePl300DelayedRetry/);
  assert.match(appSource,/advancePl300RetryQueue/);
  assert.match(appSource,/resolvePl300PendingRetry/);
  assert.match(appSource,/function\s+navigateVoucherSourceQuestion\s*\(/);
});

test('delayed retry matures after four different-question transitions and near-end items defer',()=>{
  let state=loop.enqueuePl300DelayedRetry({state:{},partId:'part-1',questionId:'q1',remainingFirstPassCount:8});
  for(let i=0;i<3;i++){
    const advanced=loop.advancePl300RetryQueue({state,partId:'part-1',fromQuestionId:`q${i+2}`,toQuestionId:`q${i+3}`});
    state=advanced.state;
    assert.equal(advanced.maturedQuestionId,null);
  }
  const fourth=loop.advancePl300RetryQueue({state,partId:'part-1',fromQuestionId:'q5',toQuestionId:'q6'});
  assert.equal(fourth.maturedQuestionId,'q1');

  const nearEnd=loop.enqueuePl300DelayedRetry({state:{},partId:'part-2',questionId:'q9',remainingFirstPassCount:2});
  assert.equal(nearEnd.parts['part-2'].pending[0].deferToPartReview,true);
});

test('wrong saved scored-text answer recommends retry later while keeping Retry now available',()=>{
  const question={id:'q1',reviewMode:'scored-text',options:[{id:'A',text:'Alpha'},{id:'B',text:'Beta'}],correctAnswer:'A'};
  const html=fullRank.buildSourcePracticeOptionsMarkup({question,record:{mode:'auto',selected:['B'],correct:false,firstPassCorrect:false,everCorrect:false,attemptCount:1},selected:['B'],locked:true,renderRichText:String});
  assert.match(html,/id="sourcePracticeRetryLaterBtn"[^>]*>Review & retry later</i);
  assert.match(html,/id="sourcePracticeRetryBtn"[^>]*>Retry now</i);
});

test('question navigation distinguishes unanswered skip from saved next',()=>{
  assert.equal(typeof fullRank.pl300SourceNextActionLabel,'function');
  assert.equal(fullRank.pl300SourceNextActionLabel(null),'Skip for now →');
  assert.equal(fullRank.pl300SourceNextActionLabel({mode:'auto',correct:false}),'Next →');
});

test('end-of-part review exposes study recovery metrics and weak-question actions',()=>{
  assert.equal(typeof fullRank.buildPl300EndOfPartReviewMarkup,'function');
  const weakHtml=fullRank.buildPl300EndOfPartReviewMarkup({
    part:{id:'part-1',domainTitle:'Prepare data',sectionTitle:'Get data',partNumber:1},
    review:{studied:18,total:18,firstPassCorrect:12,recovered:3,needReview:3,weakQuestionIds:['q2','q7','q9']},
    nextPart:{id:'part-2',label:'Prepare data → Get data · Part 2 · 18 Questions'}
  });
  assert.match(weakHtml,/End-of-Part Review/i);
  assert.match(weakHtml,/Studied\s*<strong>18\s*\/\s*18/i);
  assert.match(weakHtml,/First-pass correct\s*<strong>12/i);
  assert.match(weakHtml,/Recovered\s*<strong>3/i);
  assert.match(weakHtml,/Need review\s*<strong>3/i);
  assert.match(weakHtml,/data-pl300-review-weak[^>]*>Review 3 weak questions/i);
  assert.doesNotMatch(weakHtml,/data-pl300-continue-next-part/i);

  const masteredHtml=fullRank.buildPl300EndOfPartReviewMarkup({
    part:{id:'part-1',domainTitle:'Prepare data',sectionTitle:'Get data',partNumber:1},
    review:{studied:18,total:18,firstPassCorrect:15,recovered:3,needReview:0,weakQuestionIds:[]},
    nextPart:{id:'part-2',label:'Prepare data → Get data · Part 2 · 18 Questions'}
  });
  assert.match(masteredHtml,/data-pl300-continue-next-part/i);
  assert.doesNotMatch(masteredHtml,/data-pl300-review-weak/i);
});

test('controller preserves review and retry actions across post-render selection guard',()=>{
  assert.match(guardSource,/#sourcePracticeRetryLaterBtn/);
  assert.match(guardSource,/\[data-pl300-review-weak\]/);
  assert.match(guardSource,/\[data-pl300-continue-next-part\]/);
});

test('part resume sends completed weak parts to review and mastered parts to complete',()=>{
  const part={id:'part-1',questionIds:['q1','q2']};
  const index={records:[
    {questionId:'q1',mode:'objective',ranking:{accuracyWeight:1},validatedQuestionId:'v1'},
    {questionId:'q2',mode:'objective',ranking:{accuracyWeight:1},validatedQuestionId:'v2'}
  ]};
  const weak=loop.resolvePl300PartResume({part,index,records:{
    q1:{mode:'auto',firstPassCorrect:true,everCorrect:true},
    q2:{mode:'auto',firstPassCorrect:false,everCorrect:false}
  }});
  assert.deepEqual(weak,{mode:'review',questionIds:['q2']});
  const mastered=loop.resolvePl300PartResume({part,index,records:{
    q1:{mode:'auto',firstPassCorrect:true,everCorrect:true},
    q2:{mode:'auto',firstPassCorrect:false,everCorrect:true}
  }});
  assert.deepEqual(mastered,{mode:'complete'});
});
