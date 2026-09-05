import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackStateForQuestion, voucherSelectionStatusText} from '../assets/js/exam-feedback.js';

const single={id:'q1',correctAnswer:'b',options:[{id:'a'},{id:'b'}]};
const multi={id:'q2',correctAnswers:['b','d'],options:[{id:'a'},{id:'b'},{id:'c'},{id:'d'}]};

test('instant single-choice feedback is ready as soon as a non-ranked answer exists',()=>{
  const state=feedbackStateForQuestion({question:single,selected:'b',feedbackMode:'instant',rankedLearning:false});
  assert.equal(state.multi,false);
  assert.equal(state.feedbackReady,true);
  assert.equal(state.showFeedback,true);
  assert.equal(state.correct,true);
});

test('ranked learning feedback remains hidden until the answer is confirmed',()=>{
  const pending=feedbackStateForQuestion({question:single,selected:'b',feedbackMode:'instant',rankedLearning:true,confirmedVoucher:false});
  assert.equal(pending.feedbackReady,false);
  assert.equal(pending.showFeedback,false);
  const confirmed=feedbackStateForQuestion({question:single,selected:'b',feedbackMode:'instant',rankedLearning:true,confirmedVoucher:true});
  assert.equal(confirmed.feedbackReady,true);
  assert.equal(confirmed.showFeedback,true);
});

test('instant multi-select waits for confirmation before feedback',()=>{
  const pending=feedbackStateForQuestion({question:multi,selected:['b','d'],feedbackMode:'instant',rankedLearning:false,confirmedMulti:false});
  assert.equal(pending.feedbackReady,false);
  assert.equal(pending.showFeedback,false);
  const confirmed=feedbackStateForQuestion({question:multi,selected:['b','d'],feedbackMode:'instant',rankedLearning:false,confirmedMulti:true});
  assert.equal(confirmed.showFeedback,true);
  assert.equal(confirmed.correct,true);
});

test('exam mode never shows instant feedback even when answered',()=>{
  const state=feedbackStateForQuestion({question:single,selected:'b',feedbackMode:'exam',rankedLearning:false});
  assert.equal(state.feedbackReady,true);
  assert.equal(state.showFeedback,false);
});

test('voucher multi-select status communicates remaining selections and confirmation',()=>{
  assert.equal(voucherSelectionStatusText({question:multi,selected:[],feedbackMode:'instant',confirmed:false}), 'Select 2 answers · 0 of 2 selected');
  assert.equal(voucherSelectionStatusText({question:multi,selected:['b'],feedbackMode:'instant',confirmed:false}), 'Select 2 answers · 1 of 2 selected');
  assert.equal(voucherSelectionStatusText({question:multi,selected:['b','d'],feedbackMode:'instant',confirmed:false}), '2 of 2 selected · Ready to confirm');
  assert.equal(voucherSelectionStatusText({question:multi,selected:['b','d'],feedbackMode:'instant',confirmed:true}), 'Answer submitted. Review the feedback, then continue.');
});
