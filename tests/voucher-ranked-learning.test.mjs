import test from 'node:test';
import assert from 'node:assert/strict';
import {
  voucherSessionRankingActivityId,
  buildVoucherSessionLeaderboard,
  resolveVoucherSessionRankStatus,
  firstPassPercentage
} from '../assets/js/voucher-ranked-learning.js';

test('session ranking activity id is stable and session-scoped',()=>{
  assert.equal(
    voucherSessionRankingActivityId('data-analysis','microsoft-pl-300','d2-s5'),
    'voucher::data-analysis::microsoft-pl-300::session::d2-s5'
  );
  assert.throws(()=>voucherSessionRankingActivityId('data-analysis','microsoft-pl-300',''),/sessionId/);
});

test('first pass percentage uses completed question volume',()=>{
  assert.equal(firstPassPercentage({firstPassCorrect:7,totalQuestions:10}),70);
  assert.equal(firstPassPercentage({firstPassCorrect:0,totalQuestions:0}),0);
});

test('session rank status is official only when every expected question has an answer',()=>{
  assert.deepEqual(resolveVoucherSessionRankStatus({totalQuestions:14,unanswered:0},{expectedQuestions:14}),{official:true,completedQuestions:14,expectedQuestions:14});
  assert.deepEqual(resolveVoucherSessionRankStatus({totalQuestions:14,unanswered:2},{expectedQuestions:14}),{official:false,completedQuestions:12,expectedQuestions:14});
  assert.deepEqual(resolveVoucherSessionRankStatus({totalQuestions:12,unanswered:0},{expectedQuestions:14}),{official:false,completedQuestions:12,expectedQuestions:14});
});

test('session leaderboard ranks mastery, first-pass accuracy, fewer attempts, active solve time, then earliest achievement',()=>{
  const rows=[
    {player_id:'a',student_name:'A',percentage:90,score:9,wrong:2,unanswered:0,total_questions:10,time_taken_seconds:500,submitted_at:'2026-09-04T10:00:00Z'},
    {player_id:'a',student_name:'A',percentage:90,score:9,wrong:1,unanswered:0,total_questions:10,time_taken_seconds:650,submitted_at:'2026-09-04T11:00:00Z'},
    {player_id:'a',student_name:'A',percentage:80,score:8,wrong:2,unanswered:0,total_questions:10,time_taken_seconds:400,submitted_at:'2026-09-04T13:00:00Z'},
    {player_id:'b',student_name:'B',percentage:90,score:9,wrong:1,unanswered:0,total_questions:10,time_taken_seconds:620,submitted_at:'2026-09-04T12:00:00Z'},
    {player_id:'c',student_name:'C',percentage:95,score:9.5,wrong:3,unanswered:0,total_questions:10,time_taken_seconds:900,submitted_at:'2026-09-04T09:00:00Z'},
    {player_id:'d',student_name:'D',percentage:90,score:9,wrong:1,unanswered:1,total_questions:10,time_taken_seconds:300,submitted_at:'2026-09-04T08:00:00Z'}
  ];
  const board=buildVoucherSessionLeaderboard(rows,{expectedQuestions:10});
  assert.deepEqual(board.map(x=>x.player_id),['c','b','a']);
  assert.equal(board[0].rank,1);
  assert.equal(board.find(x=>x.player_id==='a').attemptCount,2);
  assert.equal(board.find(x=>x.player_id==='a').firstPassPercentage,90);
  assert.equal(board.find(x=>x.player_id==='b').attemptCount,1);
});

test('session attempt metadata distinguishes official completion and first-pass accuracy', async()=>{
  const mod=await import('../assets/js/voucher-ranked-learning.js');
  assert.equal(typeof mod.buildVoucherSessionAttemptMeta,'function');
  const meta=mod.buildVoucherSessionAttemptMeta({
    sessionId:'d2-s5',domainId:'d2',sessionTitle:'DAX & Time Intelligence',
    result:{correct:12,wrong:2,unanswered:0,percentage:86},totalQuestions:14,firstPassCorrect:10,attemptNumber:3
  });
  assert.equal(meta.officialRankEligible,true);
  assert.equal(meta.firstPassCorrect,10);
  assert.equal(meta.firstPassPercentage,71.4);
  assert.equal(meta.attemptNumber,3);
  assert.equal(meta.voucherMode,'ranked-session');
  assert.equal(meta.solveTimePolicy,'active-solve');

  const provisional=mod.buildVoucherSessionAttemptMeta({
    sessionId:'d2-s5',domainId:'d2',sessionTitle:'DAX & Time Intelligence',
    result:{correct:8,wrong:2,unanswered:4,percentage:57},totalQuestions:14,firstPassCorrect:8,attemptNumber:1
  });
  assert.equal(provisional.officialRankEligible,false);
});

test('session online overrides encode first-pass misses without changing final mastery percentage', async()=>{
  const mod=await import('../assets/js/voucher-ranked-learning.js');
  assert.equal(typeof mod.buildVoucherSessionOnlineOverrides,'function');
  assert.deepEqual(mod.buildVoucherSessionOnlineOverrides({totalQuestions:14,firstPassCorrect:10}),{
    wrong:4,
    unanswered:0,
    total_questions:14
  });
});
