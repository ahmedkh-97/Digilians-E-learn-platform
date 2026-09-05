import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNavigatorFilter,
  toggleMarkedQuestionState,
  moveQuestionIndex,
  setQuestionIndex
} from '../assets/js/exam-navigation.js';

test('navigator filter accepts only the four supported filters',()=>{
  for(const value of ['all','unanswered','answered','marked'])assert.equal(normalizeNavigatorFilter(value),value);
  assert.equal(normalizeNavigatorFilter('wrong'),'all');
  assert.equal(normalizeNavigatorFilter(null),'all');
});

test('mark toggle deduplicates stored state and toggles only the requested question',()=>{
  assert.deepEqual(toggleMarkedQuestionState(['q1','q1','q2'],'q1'),['q2']);
  assert.deepEqual(toggleMarkedQuestionState(['q2'],'q1'),['q2','q1']);
  assert.deepEqual(toggleMarkedQuestionState(['q2'],''),['q2']);
});

test('previous and next movement stays inside exam bounds',()=>{
  assert.equal(moveQuestionIndex({currentIndex:0,totalQuestions:5,direction:-1}),0);
  assert.equal(moveQuestionIndex({currentIndex:0,totalQuestions:5,direction:1}),1);
  assert.equal(moveQuestionIndex({currentIndex:4,totalQuestions:5,direction:1}),4);
  assert.equal(moveQuestionIndex({currentIndex:3,totalQuestions:5,direction:-1}),2);
});

test('direct navigator index is clamped to available questions',()=>{
  assert.equal(setQuestionIndex({targetIndex:99,totalQuestions:5}),4);
  assert.equal(setQuestionIndex({targetIndex:-4,totalQuestions:5}),0);
  assert.equal(setQuestionIndex({targetIndex:2,totalQuestions:5}),2);
  assert.equal(setQuestionIndex({targetIndex:3,totalQuestions:0}),0);
});
