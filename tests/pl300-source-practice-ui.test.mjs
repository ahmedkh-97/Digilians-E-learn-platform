import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8')+fs.readFileSync(new URL('../assets/css/pl300.css',import.meta.url),'utf8');
const fullRank=fs.readFileSync(new URL('../assets/js/pl300-full-ranked-learning.js',import.meta.url),'utf8');
const nativeCss=fs.existsSync(new URL('../assets/css/source-practice-native.css',import.meta.url))?fs.readFileSync(new URL('../assets/css/source-practice-native.css',import.meta.url),'utf8'):'';

test('PL-300 source review supports auto-scored text practice',()=>{
  assert.match(app,/function voucherSourcePracticeRecord\(/);
  assert.match(fullRank,/data-source-practice-option/);
  assert.match(fullRank,/id="sourcePracticeCheckBtn"/);
  assert.match(fullRank,/Check answer/);
  assert.match(app,/buildSourcePracticeOptionsMarkup/);
  assert.match(app,/saveVoucherSourcePracticeResult/);
});

test('fail-closed source questions use required study checkpoints without self-awarded correctness',()=>{
  assert.match(fullRank,/id="sourcePracticeCheckpointBtn"/);
  assert.match(fullRank,/إكمال نقطة المذاكرة/);
  assert.match(app,/mode:"checkpoint"/);
  assert.match(app,/reviewStatus:"reviewed"/);
  assert.doesNotMatch(app,/data-source-self-grade/);
});

test('full ranked source practice displays persistent completion and objective answer-state styling',()=>{
  assert.match(fullRank,/source-practice-summary/);
  assert.match(fullRank,/Completion/);
  assert.match(fullRank,/Validated Accuracy/);
  assert.match(css,/\.source-review-option\.selected/);
  assert.match(css,/\.source-review-option\.correct/);
  assert.match(css,/\.source-review-option\.incorrect/);
});

test('native structured source practice has responsive answer-field styling',()=>{
  assert.match(nativeCss,/\.source-native-practice/);
  assert.match(nativeCss,/\.source-native-fields/);
  assert.match(nativeCss,/\.source-native-field\.correct/);
  assert.match(nativeCss,/\.source-native-field\.incorrect/);
});
