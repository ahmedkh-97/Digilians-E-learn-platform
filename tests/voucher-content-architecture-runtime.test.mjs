import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateVoucherContentArchitecture,
  buildVoucherContentArchitectureView,
  questionsForVoucherSession,
  findVoucherContentArchitectureSession
} from '../assets/js/voucher-content-architecture.js';

const architecture={
  schemaVersion:1,
  examId:'microsoft-pl-300',
  domains:[
    {id:'prepare-data',order:1,title:'Prepare the Data'},
    {id:'model-data',order:2,title:'Model the Data'}
  ],
  sessions:[
    {id:'s1',domainId:'prepare-data',order:1,title:'Sources'},
    {id:'s2',domainId:'prepare-data',order:2,title:'Power Query'},
    {id:'s3',domainId:'model-data',order:3,title:'Relationships'}
  ],
  questionSessionMap:{q1:'s1',q2:'s2',q3:'s2',q4:'s3'}
};
const questions=[
  {id:'q1',question:'A'},{id:'q2',question:'B'},{id:'q3',question:'C'},{id:'q4',question:'D'}
];

test('content architecture validation fails closed on missing, unknown, or duplicate mapping contracts',()=>{
  assert.deepEqual(validateVoucherContentArchitecture({architecture,questions,examId:'microsoft-pl-300'}),[]);
  assert.match(validateVoucherContentArchitecture({architecture:{...architecture,examId:'other'},questions,examId:'microsoft-pl-300'}).join('; '),/examId/);
  assert.match(validateVoucherContentArchitecture({architecture:{...architecture,questionSessionMap:{...architecture.questionSessionMap,q5:'s1'}},questions,examId:'microsoft-pl-300'}).join('; '),/unknown question q5/);
  assert.match(validateVoucherContentArchitecture({architecture:{...architecture,questionSessionMap:{q1:'s1',q2:'s2',q3:'missing'}},questions,examId:'microsoft-pl-300'}).join('; '),/missing canonical question q4|unknown session missing/);
});

test('session filtering returns only mapped questions and preserves master-bank order',()=>{
  assert.deepEqual(questionsForVoucherSession({architecture,questions,sessionId:'s2'}).map(q=>q.id),['q2','q3']);
  assert.deepEqual(questionsForVoucherSession({architecture,questions,sessionId:'unknown'}),[]);
});

test('view model aggregates deterministic domain/session counts and seen progress',()=>{
  const view=buildVoucherContentArchitectureView({architecture,questions,seenIds:['q1','q3','q4']});
  assert.equal(view.totalQuestions,4);
  assert.equal(view.seenQuestions,3);
  assert.equal(view.progressPercentage,75);
  assert.deepEqual(view.domains.map(d=>[d.id,d.questionCount,d.sessionCount,d.seenCount,d.progressPercentage]),[
    ['prepare-data',3,2,2,67],
    ['model-data',1,1,1,100]
  ]);
  assert.deepEqual(view.sessions.map(s=>[s.id,s.questionCount,s.seenCount,s.progressPercentage]),[
    ['s1',1,1,100],['s2',2,1,50],['s3',1,1,100]
  ]);
});


test('session lookup returns the exact architecture session used by resume context',()=>{
  assert.equal(findVoucherContentArchitectureSession({architecture,sessionId:'s2'})?.title,'Power Query');
  assert.equal(findVoucherContentArchitectureSession({architecture,sessionId:'missing'}),null);
});
