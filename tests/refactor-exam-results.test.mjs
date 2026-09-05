import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSubjectBreakdown, buildStandardResultRecord, buildOnlineAttemptPayload, resultHeadline} from '../assets/js/exam-results.js';

const questions=[
  {id:'q1',track:'Excel',correctAnswer:'a',options:[{id:'a'},{id:'b'}]},
  {id:'q2',track:'SQL',correctAnswer:'b',options:[{id:'a'},{id:'b'}]},
  {id:'q3',track:'SQL',correctAnswer:'a',options:[{id:'a'},{id:'b'}]}
];
const result={correct:1,wrong:1,unanswered:1,percentage:33,detail:[]};

test('subject breakdown preserves correct wrong and unanswered counts',()=>{
  assert.deepEqual(buildSubjectBreakdown(questions,{q1:'a',q2:'a'}),{
    Excel:{total:1,correct:1,wrong:0,unanswered:0},
    SQL:{total:2,correct:0,wrong:1,unanswered:1}
  });
});

test('standard result record keeps existing persisted result fields',()=>{
  const record=buildStandardResultRecord({
    exam:{id:'exam-1',title:'Exam One',category:'Exam'},result,studentName:'Ahmed',timeTakenSeconds:91,
    submittedAt:'2026-09-04T00:00:00.000Z',autoSubmitted:false,clientAttemptId:'id-1',subjectBreakdown:{},topicBreakdown:[],excelBreakdown:null,officialContext:null,feedbackMode:'exam'
  });
  assert.equal(record.examId,'exam-1');
  assert.equal(record.percentage,33);
  assert.equal(record.correct,1);
  assert.equal(record.feedbackMode,'exam');
  assert.equal(record.onlineSynced,false);
});

test('online attempt payload remains ranking-compatible',()=>{
  const payload=buildOnlineAttemptPayload({
    playerId:'player-1',studentName:'Ahmed',exam:{id:'exam-1',title:'Exam One',version:'2.0'},result,totalQuestions:3,timeTakenSeconds:91,feedbackMode:'exam',clientAttemptId:'id-1'
  });
  assert.deepEqual(payload,{
    player_id:'player-1',student_name:'Ahmed',exam_id:'exam-1',exam_title:'Exam One',exam_version:'2.0',
    score:1,wrong:1,unanswered:1,total_questions:3,percentage:33,time_taken_seconds:91,feedback_mode:'exam',client_attempt_id:'id-1'
  });
});

test('result headline preserves section and score thresholds',()=>{
  assert.equal(resultHeadline({percentage:95,passingScore:60,officialKind:null}),'Excellent work');
  assert.equal(resultHeadline({percentage:85,passingScore:60,officialKind:null}),'Great job');
  assert.equal(resultHeadline({percentage:70,passingScore:60,officialKind:null}),'Good progress');
  assert.equal(resultHeadline({percentage:20,passingScore:60,officialKind:null}),'Keep practicing');
  assert.equal(resultHeadline({percentage:20,passingScore:60,officialKind:'section'}),'Section Completed');
});
