import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  sourcePracticeRequiredCountFromText,
  sourcePracticeSelectionPolicy
} from '../assets/js/pl300-source-practice-selection-guard.js';

const nativePractice=fs.readFileSync(new URL('../assets/js/voucher-source-practice-native.js',import.meta.url),'utf8');

test('PL-300 source-practice selection guard is lazy-loaded with the source-practice module',()=>{
  assert.match(nativePractice,/import '\.\/pl300-source-practice-selection-guard\.js\?v=0\.22\.4';/);
});

test('selection guard resolves Select 2 and Select 3 requirements',()=>{
  assert.equal(sourcePracticeRequiredCountFromText('Select 2 answers.'),2);
  assert.equal(sourcePracticeRequiredCountFromText('Select 3 answers.'),3);
  assert.equal(sourcePracticeRequiredCountFromText('Select one answer.'),null);
});

test('multi-select blocks choices beyond the required count but keeps deselection available',()=>{
  assert.equal(sourcePracticeSelectionPolicy({requiredCount:2,selectedCount:1,isSelected:false}).blockOption,false);
  assert.equal(sourcePracticeSelectionPolicy({requiredCount:2,selectedCount:2,isSelected:false}).blockOption,true);
  assert.equal(sourcePracticeSelectionPolicy({requiredCount:2,selectedCount:2,isSelected:true}).blockOption,false);
  assert.equal(sourcePracticeSelectionPolicy({requiredCount:3,selectedCount:3,isSelected:false}).blockOption,true);
});

test('Check is enabled only when the selected count exactly matches the required count',()=>{
  assert.equal(sourcePracticeSelectionPolicy({requiredCount:2,selectedCount:1}).checkDisabled,true);
  assert.equal(sourcePracticeSelectionPolicy({requiredCount:2,selectedCount:2}).checkDisabled,false);
  assert.equal(sourcePracticeSelectionPolicy({requiredCount:3,selectedCount:2}).checkDisabled,true);
  assert.equal(sourcePracticeSelectionPolicy({requiredCount:3,selectedCount:3}).checkDisabled,false);
});

test('single answer becomes instant-submit ready after exactly one selection',()=>{
  assert.equal(sourcePracticeSelectionPolicy({requiredCount:1,selectedCount:0}).autoSubmit,false);
  assert.equal(sourcePracticeSelectionPolicy({requiredCount:1,selectedCount:1}).autoSubmit,true);
});
