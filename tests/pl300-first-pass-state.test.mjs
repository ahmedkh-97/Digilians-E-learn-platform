import test from 'node:test';
import assert from 'node:assert/strict';
import {createFreshExamSession,restoreExamSession} from '../assets/js/exam-session.js';
import {buildExamProgressSnapshot} from '../assets/js/exam-persistence.js';

test('fresh exam session initializes first-pass state without affecting existing answer state',()=>{
  const session=createFreshExamSession({exam:{settings:{timer:{enabled:false}}},feedbackMode:'instant',rankedActivity:true,nowEpoch:1000});
  assert.deepEqual(session.firstPassAnswers,{});
  assert.deepEqual(session.firstPassCommitted,{});
  assert.deepEqual(session.answers,{});
});

test('restored exam session preserves first-pass maps with backward-safe empty defaults',()=>{
  const exam={settings:{timer:{enabled:false}}};
  const restored=restoreExamSession({
    exam,questions:[{id:'q1'}],rankedActivity:true,nowEpoch:5000,
    restored:{answers:{q1:'b'},firstPassAnswers:{q1:'a'},firstPassCommitted:{q1:true},savedAtEpoch:4000,elapsedSeconds:1}
  });
  assert.deepEqual(restored.firstPassAnswers,{q1:'a'});
  assert.deepEqual(restored.firstPassCommitted,{q1:true});

  const legacy=restoreExamSession({exam,questions:[{id:'q1'}],restored:{answers:{q1:'b'}}});
  assert.deepEqual(legacy.firstPassAnswers,{});
  assert.deepEqual(legacy.firstPassCommitted,{});
});

test('progress snapshot persists first-pass state',()=>{
  const snapshot=buildExamProgressSnapshot({
    studentName:'A',currentExam:{exam:{id:'e',title:'E'},questions:[{id:'q1',options:[]}]},
    answers:{q1:'b'},firstPassAnswers:{q1:'a'},firstPassCommitted:{q1:true},startedAt:0,nowEpoch:1000
  });
  assert.deepEqual(snapshot.firstPassAnswers,{q1:'a'});
  assert.deepEqual(snapshot.firstPassCommitted,{q1:true});
});
