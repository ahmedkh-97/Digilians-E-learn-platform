import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  voucherRankingActivityId,
  isVoucherRankEligibleAttempt,
  buildVoucherExamLeaderboard,
  buildVoucherTrackOverallLeaderboard
} from '../assets/js/voucher-ranking.js';

test('Voucher Real Exam activity IDs are isolated and deterministic',()=>{
  assert.equal(voucherRankingActivityId('marketing','cert-a'),'voucher::marketing::cert-a::real');
  assert.equal(isVoucherRankEligibleAttempt({sizeMode:'real',rankEligible:true}),true);
  assert.equal(isVoucherRankEligibleAttempt({sizeMode:'100',rankEligible:true}),false);
  assert.equal(isVoucherRankEligibleAttempt({sizeMode:'real',rankEligible:false}),false);
});

test('Voucher Exam Ranking keeps each player best raw-score Real Exam attempt',()=>{
  const rows=[
    {player_id:'p1',student_name:'A',score:80,total_questions:100,percentage:80,time_taken_seconds:500,submitted_at:'2026-09-02T10:00:00Z'},
    {player_id:'p1',student_name:'A',score:85,total_questions:100,percentage:85,time_taken_seconds:700,submitted_at:'2026-09-02T11:00:00Z'},
    {player_id:'p2',student_name:'B',score:85,total_questions:100,percentage:85,time_taken_seconds:600,submitted_at:'2026-09-02T12:00:00Z'},
  ];
  const board=buildVoucherExamLeaderboard(rows);
  assert.equal(board.length,2);
  assert.equal(board[0].player_id,'p2');
  assert.equal(board[0].rank,1);
  assert.equal(board[1].player_id,'p1');
  assert.equal(board[1].score,85);
});

test('Track Overall uses fixed total question volume and only matching primary-track users',()=>{
  const trackId='marketing';
  const exams=[
    {examId:'cert-a',activityId:voucherRankingActivityId(trackId,'cert-a'),totalQuestions:100},
    {examId:'cert-b',activityId:voucherRankingActivityId(trackId,'cert-b'),totalQuestions:80},
  ];
  const rows=[
    {player_id:'p1',student_name:'A',exam_id:exams[0].activityId,score:85,total_questions:100,percentage:85,time_taken_seconds:600,submitted_at:'2026-09-02T10:00:00Z'},
    {player_id:'p1',student_name:'A',exam_id:exams[1].activityId,score:60,total_questions:80,percentage:75,time_taken_seconds:500,submitted_at:'2026-09-02T11:00:00Z'},
    {player_id:'p2',student_name:'B',exam_id:exams[0].activityId,score:95,total_questions:100,percentage:95,time_taken_seconds:500,submitted_at:'2026-09-02T10:00:00Z'},
    {player_id:'p3',student_name:'C',exam_id:exams[0].activityId,score:100,total_questions:100,percentage:100,time_taken_seconds:400,submitted_at:'2026-09-02T09:00:00Z'},
  ];
  const primaryTracks=new Map([['p1','marketing'],['p2','marketing'],['p3','data-analysis']]);
  const board=buildVoucherTrackOverallLeaderboard({trackId,exams,rows,primaryTracks});
  assert.deepEqual(board.map(x=>x.player_id),['p1','p2']);
  assert.equal(board[0].totalCorrect,145);
  assert.equal(board[0].totalQuestions,180);
  assert.equal(board[0].percentage,80.6);
  assert.equal(board[1].totalCorrect,95);
  assert.equal(board[1].totalQuestions,180);
  assert.equal(board[1].completedExams,1);
});

test('Voucher runtime wires Real Exam attempts to separate online ranking and dedicated UI',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(app,/voucherRankingActivityId\(ctx\.trackId,ctx\.voucherExamId,ctx\.fullBankRanked\?\"full-bank\":\"real\"\)/);
  assert.match(app,/queuePendingAttempt\(onlineAttempt\)/);
  assert.match(app,/openVoucherExamRanking/);
  assert.match(app,/openVoucherTrackOverallRanking/);
  assert.match(html,/id="voucherRankingView"/);
});
