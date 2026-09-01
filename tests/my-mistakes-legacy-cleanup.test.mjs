import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {isLegacyUnansweredOfficialSeed} from '../assets/js/mistakes.js';

const baseItem={
  key:'official-qbank|junior-data-analysis|excel|Q-1',
  question:{id:'Q-1',trackId:'excel'},
  context:{sourceType:'official-qbank',levelId:'junior-data-analysis',trackId:'excel',examId:'',examTitle:''}
};

test('legacy unanswered Official seed is identifiable for cleanup',()=>{
  assert.equal(isLegacyUnansweredOfficialSeed(baseItem,{answers:{}}),true);
});

test('real Official Study wrong answer is preserved',()=>{
  assert.equal(isLegacyUnansweredOfficialSeed(baseItem,{answers:{'Q-1':'B'}}),false);
});

test('real Official Exam mistake is preserved even when Official Study has no saved answer',()=>{
  const examItem={...baseItem,context:{...baseItem.context,examId:'official-excel-random-50'}};
  assert.equal(isLegacyUnansweredOfficialSeed(examItem,{answers:{}}),false);
});

test('My Mistakes import path prunes only identified legacy unanswered seeds',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  assert.match(app,/isLegacyUnansweredOfficialSeed\(item,matchingRecord\)/);
  assert.match(app,/removeMistake\(mistakeOwnerId\(\),item\.key\)/);
});
