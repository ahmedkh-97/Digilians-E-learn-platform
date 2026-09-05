import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isStructuredQuestion,
  normalizeStructuredValue,
  structuredAnswerComplete,
  structuredAnswerState,
  structuredAnswerCorrect,
  isQuestionAnswered,
  isAnswerCorrect,
  validateExamPayload,
  calculateResult
} from '../assets/js/exam-engine.js';
import {buildSubjectBreakdown} from '../assets/js/exam-results.js';
import {topicPerformance} from '../assets/js/coverage-engine.js';

const q={
  id:'native-q1',
  question:'Choose the storage modes.',
  responseType:'structured',
  nativeResponse:{
    interaction:'fields',
    scoring:'normalized-text',
    fields:[
      {id:'customer',label:'Customer',expected:['Dual']},
      {id:'sales',label:'Sales',expected:['DirectQuery','Direct Query']}
    ]
  },
  options:[]
};

test('structured normalization is case, punctuation, unicode and whitespace tolerant',()=>{
  assert.equal(normalizeStructuredValue(' Direct-Query '),'directquery');
  assert.equal(normalizeStructuredValue('Ｄｕａｌ'),'dual');
});

test('structured answer state is complete only when all required fields are filled',()=>{
  const partial=structuredAnswerState(q,{customer:'Dual'});
  assert.equal(partial.complete,false);
  assert.equal(structuredAnswerComplete(q,partial),false);
  const complete=structuredAnswerState(q,{customer:' dual ',sales:'Direct Query'});
  assert.equal(complete.complete,true);
  assert.equal(isQuestionAnswered(q,complete),true);
});

test('structured answers score against source-backed expected values',()=>{
  const correct=structuredAnswerState(q,{customer:'DUAL',sales:'Direct Query'});
  const wrong=structuredAnswerState(q,{customer:'Import',sales:'DirectQuery'});
  assert.equal(isStructuredQuestion(q),true);
  assert.equal(structuredAnswerCorrect(q,correct),true);
  assert.equal(isAnswerCorrect(q,correct),true);
  assert.equal(structuredAnswerCorrect(q,wrong),false);
});

test('shared result engine includes structured questions without changing MCQ scoring',()=>{
  const mcq={id:'mcq',question:'A?',options:[{id:'a',text:'A'},{id:'b',text:'B'}],correctAnswer:'a'};
  const answers={
    'native-q1':structuredAnswerState(q,{customer:'Dual',sales:'DirectQuery'}),
    mcq:'b'
  };
  const result=calculateResult([q,mcq],answers);
  assert.deepEqual({correct:result.correct,wrong:result.wrong,unanswered:result.unanswered,percentage:result.percentage},{correct:1,wrong:1,unanswered:0,percentage:50});
});

test('payload validation accepts complete structured scoring contracts and rejects malformed ones',()=>{
  assert.deepEqual(validateExamPayload({exam:{id:'x',title:'X'},questions:[q]}),[]);
  const bad={...q,id:'bad',nativeResponse:{...q.nativeResponse,fields:[{id:'box',label:'Box',expected:[]}]}};
  assert.ok(validateExamPayload({exam:{id:'x',title:'X'},questions:[bad]}).some(e=>/structured/i.test(e)||/expected/i.test(e)));
});


test('subject and topic analytics count complete structured responses as answered',()=>{
  const tagged={...q,track:'Power BI',topicId:'prepare-data',topic:'Prepare the Data'};
  const answers={[tagged.id]:structuredAnswerState(tagged,{customer:'Dual',sales:'DirectQuery'})};
  assert.deepEqual(buildSubjectBreakdown([tagged],answers)['Power BI'],{total:1,correct:1,wrong:0,unanswered:0});
  const topic=topicPerformance([tagged],answers)[0];
  assert.deepEqual({correct:topic.correct,wrong:topic.wrong,unanswered:topic.unanswered,percentage:topic.percentage},{correct:1,wrong:0,unanswered:0,percentage:100});
});
