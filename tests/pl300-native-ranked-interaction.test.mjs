import test from 'node:test';
import assert from 'node:assert/strict';
import {
  updateStructuredAnswerState,
  confirmStructuredAnswerState,
  voucherSelectionStatusText,
  feedbackStateForQuestion
} from '../assets/js/exam-engine.js';

const q={
  id:'sq',question:'Complete fields',responseType:'structured',options:[],
  nativeResponse:{interaction:'fields',scoring:'normalized-text',fields:[
    {id:'a',label:'First',expected:['One']},{id:'b',label:'Second',expected:['Two']}
  ]}
};

test('ranked structured responses remain editable until explicit instant confirmation',()=>{
  let answers={};
  let result=updateStructuredAnswerState({question:q,fieldId:'a',value:'One',answers,rankedLearning:true,feedbackMode:'instant',confirmed:false});
  answers=result.answers;
  assert.equal(result.changed,true);
  assert.equal(result.complete,false);
  result=updateStructuredAnswerState({question:q,fieldId:'b',value:'Two',answers,rankedLearning:true,feedbackMode:'instant',confirmed:false});
  answers=result.answers;
  assert.equal(result.complete,true);
  result=updateStructuredAnswerState({question:q,fieldId:'b',value:'wrong',answers,rankedLearning:true,feedbackMode:'instant',confirmed:false});
  assert.equal(result.answers.sq.fields.b,'wrong');
});

test('instant confirmation freezes structured response and enters feedback timer phase',()=>{
  const initial=updateStructuredAnswerState({question:q,fieldId:'a',value:'One',answers:{}}).answers;
  const answers=updateStructuredAnswerState({question:q,fieldId:'b',value:'Two',answers:initial}).answers;
  const confirmed=confirmStructuredAnswerState({question:q,answers,confirmedVoucherAnswers:{},rankedLearning:true,alreadyConfirmed:false});
  assert.equal(confirmed.changed,true);
  assert.equal(confirmed.confirmedVoucherAnswers.sq,true);
  assert.equal(confirmed.voucherTimerPhase,'feedback-paused');
  assert.equal(confirmed.stopTimer,true);
  const frozen=updateStructuredAnswerState({question:q,fieldId:'b',value:'changed',answers,rankedLearning:true,feedbackMode:'instant',confirmed:true});
  assert.equal(frozen.changed,false);
  assert.equal(frozen.answers.sq.fields.b,'Two');
});

test('feedback-at-end structured responses stay editable and count ready only when complete',()=>{
  let answers=updateStructuredAnswerState({question:q,fieldId:'a',value:'One',answers:{},rankedLearning:true,feedbackMode:'exam'}).answers;
  assert.match(voucherSelectionStatusText({question:q,selected:answers.sq,feedbackMode:'exam',rankedLearning:true}),/1 of 2 filled/i);
  answers=updateStructuredAnswerState({question:q,fieldId:'b',value:'Two',answers,rankedLearning:true,feedbackMode:'exam'}).answers;
  assert.match(voucherSelectionStatusText({question:q,selected:answers.sq,feedbackMode:'exam',rankedLearning:true}),/2 of 2 filled.*Saved/i);
  const changed=updateStructuredAnswerState({question:q,fieldId:'b',value:'Two again',answers,rankedLearning:true,feedbackMode:'exam'});
  assert.equal(changed.changed,true);
});

test('structured instant feedback opens only after ranked confirmation',()=>{
  const answers=updateStructuredAnswerState({question:q,fieldId:'a',value:'One',answers:{}}).answers;
  const full=updateStructuredAnswerState({question:q,fieldId:'b',value:'Two',answers}).answers;
  assert.equal(feedbackStateForQuestion({question:q,selected:full.sq,feedbackMode:'instant',rankedLearning:true,confirmedVoucher:false}).showFeedback,false);
  assert.equal(feedbackStateForQuestion({question:q,selected:full.sq,feedbackMode:'instant',rankedLearning:true,confirmedVoucher:true}).showFeedback,true);
});

