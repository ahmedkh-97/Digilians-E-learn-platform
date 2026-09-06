import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPl300LearningController} from '../assets/js/pl300-learning-controller.js';

function makeController(filter){
  const state={
    voucherSourceReviewBank:{questions:[{id:'q1'},{id:'q2'},{id:'q3'}]},
    voucherSourceReviewPartId:'all',
    voucherSourceReviewParts:[],
    voucherSourceReviewWeakIds:null,
    voucherSourceReviewFilter:filter,
    voucherFullRankedIndexByQuestion:new Map([
      ['q1',{questionId:'q1',mode:'objective'}],
      ['q2',{questionId:'q2',mode:'checkpoint'}],
      ['q3',{questionId:'q3',mode:'objective'}]
    ])
  };
  return createPl300LearningController({
    state,
    getRecords:()=>({}),
    saveLearningState:()=>{},
    learningLoop:null,
    fullRankedLearning:{filterPl300QuestionsByPart:({questions})=>questions},
    renderReview:()=>{},
    scrollTop:()=>{},
    loadJson:async()=>({}),
    renderRichText:String
  });
}

test('controller preserves Objective and Checkpoints toolbar filters after lazy extraction',()=>{
  assert.deepEqual(makeController('objective').filteredQuestions().map(q=>q.id),['q1','q3']);
  assert.deepEqual(makeController('checkpoint').filteredQuestions().map(q=>q.id),['q2']);
});

test('full-ranked index loader initializes lazy learning dependencies before dereferencing the controller',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  const match=app.match(/async function loadVoucherFullRankedIndex\([^\n]*\)\{[^\n]*\}/);
  assert.ok(match,'loadVoucherFullRankedIndex wrapper must exist');
  assert.match(match[0],/await ensurePl300LearningLoop\(\)/);
  assert.match(match[0],/await ensurePl300LearningController\(\)/);
  assert.match(match[0],/pl300LearningController\.loadFullRankedIndex\(config\)/);
});
