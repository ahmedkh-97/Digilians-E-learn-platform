import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {voucherSelectionStatusText} from '../assets/js/exam-feedback.js';

const single={id:'q1',correctAnswer:'a',options:[{id:'a',text:'A'},{id:'b',text:'B'}]};

test('ranked session single-choice copy respects Feedback at End',()=>{
  assert.equal(
    voucherSelectionStatusText({question:single,selected:'a',feedbackMode:'exam',rankedLearning:true,confirmed:false}),
    'Choose one answer. Your selection is saved and can be changed before submission.'
  );
  assert.equal(
    voucherSelectionStatusText({question:single,selected:null,feedbackMode:'instant',rankedLearning:true,confirmed:false}),
    'Choose one answer. It will be submitted immediately.'
  );
});

test('ranked session navigator uses saved answer state in Feedback at End instead of confirmation state',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  assert.match(app,/function voucherRankedQuestionAnswered\(q\)/);
  assert.match(app,/isCurrentVoucherSessionRanked\(\).*state\.feedbackMode!==["']instant["']/s);
  assert.match(app,/function voucherQuestionStatus\(q\)[\s\S]*voucherRankedQuestionAnswered\(q\)/);
});
