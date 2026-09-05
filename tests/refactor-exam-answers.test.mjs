import test from 'node:test';
import assert from 'node:assert/strict';
import {
  selectSingleAnswerState,
  toggleMultiSelectAnswerState,
  confirmMultiSelectAnswerState,
  confirmVoucherRankedAnswerState
} from '../assets/js/exam-answers.js';

const single={id:'q1',correctAnswer:'b',options:[{id:'a'},{id:'b'}]};
const multi={id:'q2',correctAnswers:['b','d'],options:[{id:'a'},{id:'b'},{id:'c'},{id:'d'}]};

test('single-choice ranked learning auto-confirms instant feedback and enters feedback phase',()=>{
  const result=selectSingleAnswerState({
    question:single,optionId:'b',answers:{},confirmedVoucherAnswers:{},
    rankedLearning:true,feedbackMode:'instant',alreadyConfirmed:false
  });
  assert.deepEqual(result.answers,{q1:'b'});
  assert.deepEqual(result.confirmedVoucherAnswers,{q1:true});
  assert.equal(result.voucherTimerPhase,'feedback-paused');
  assert.equal(result.stopTimer,true);
  assert.equal(result.changed,true);
});

test('single-choice instant non-ranked refuses replacing an already answered question',()=>{
  const result=selectSingleAnswerState({
    question:single,optionId:'a',answers:{q1:'b'},confirmedVoucherAnswers:{},
    rankedLearning:false,feedbackMode:'instant',alreadyConfirmed:false
  });
  assert.deepEqual(result.answers,{q1:'b'});
  assert.equal(result.changed,false);
});

test('multi-select toggles selections but never exceeds required answer count',()=>{
  const one=toggleMultiSelectAnswerState({question:multi,optionId:'b',answers:{},rankedLearning:false,feedbackMode:'exam',confirmed:false});
  assert.deepEqual(one.answers,{q2:['b']});
  const two=toggleMultiSelectAnswerState({question:multi,optionId:'d',answers:one.answers,rankedLearning:false,feedbackMode:'exam',confirmed:false});
  assert.deepEqual(two.answers,{q2:['b','d']});
  const blocked=toggleMultiSelectAnswerState({question:multi,optionId:'a',answers:two.answers,rankedLearning:false,feedbackMode:'exam',confirmed:false});
  assert.deepEqual(blocked.answers,{q2:['b','d']});
  assert.equal(blocked.changed,false);
});

test('multi-select confirmation requires exactly the configured number of answers',()=>{
  const incomplete=confirmMultiSelectAnswerState({question:multi,answers:{q2:['b']},confirmedMultiAnswers:{}});
  assert.equal(incomplete.changed,false);
  const ready=confirmMultiSelectAnswerState({question:multi,answers:{q2:['b','d']},confirmedMultiAnswers:{}});
  assert.deepEqual(ready.confirmedMultiAnswers,{q2:true});
  assert.equal(ready.changed,true);
});

test('voucher ranked multi-select confirmation updates both confirmation maps and pauses solve timer',()=>{
  const result=confirmVoucherRankedAnswerState({
    question:multi,answers:{q2:['b','d']},confirmedMultiAnswers:{},confirmedVoucherAnswers:{},
    rankedLearning:true,alreadyConfirmed:false
  });
  assert.deepEqual(result.confirmedVoucherAnswers,{q2:true});
  assert.deepEqual(result.confirmedMultiAnswers,{q2:true});
  assert.equal(result.voucherTimerPhase,'feedback-paused');
  assert.equal(result.stopTimer,true);
  assert.equal(result.changed,true);
});
