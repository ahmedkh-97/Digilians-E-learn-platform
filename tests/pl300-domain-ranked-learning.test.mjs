import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  findVoucherContentArchitectureDomain,
  sessionsForVoucherDomain,
  questionsForVoucherDomain
} from '../assets/js/voucher-content-architecture.js';
import {
  voucherDomainRankingActivityId,
  resolveVoucherDomainRankStatus,
  buildVoucherDomainAttemptMeta,
  buildVoucherDomainOnlineOverrides,
  buildVoucherDomainLeaderboard
} from '../assets/js/voucher-domain-ranked-learning.js';
import {buildVoucherExamPayload} from '../assets/js/voucher-bank-engine.js';
import {resolveExamMode,EXAM_MODE_IDS} from '../assets/js/exam-modes.js';
import {buildVoucherResumeDescriptor,voucherSavedAttemptMatches} from '../assets/js/exam-persistence.js';
import {inferExamTimerPolicy} from '../assets/js/exam-timer.js';
import {isVoucherRankedLearningExam} from '../assets/js/voucher-ranked-runtime.js';

const root=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const architecture=JSON.parse(fs.readFileSync(new URL('content-architecture.json',root),'utf8'));
const master=JSON.parse(fs.readFileSync(new URL('master-bank.json',root),'utf8'));
const config=JSON.parse(fs.readFileSync(new URL('config.json',root),'utf8'));

const expectedDomainCounts={
  'prepare-data':75,
  'model-data':63,
  'visualize-analyze':67,
  'manage-secure':60
};

test('domain architecture helpers expose exact sessions and all questions for each domain',()=>{
  for(const [domainId,expectedCount] of Object.entries(expectedDomainCounts)){
    const domain=findVoucherContentArchitectureDomain({architecture,domainId});
    assert.equal(domain?.id,domainId);
    const sessions=sessionsForVoucherDomain({architecture,domainId});
    assert.ok(sessions.length>=1);
    assert.ok(sessions.every(s=>s.domainId===domainId));
    const questions=questionsForVoucherDomain({architecture,questions:master.questions,domainId});
    assert.equal(questions.length,expectedCount,domainId);
    const sessionIds=new Set(sessions.map(s=>s.id));
    assert.ok(questions.every(q=>sessionIds.has(architecture.questionSessionMap[q.id])));
  }
  assert.equal(Object.values(expectedDomainCounts).reduce((a,b)=>a+b,0),265);
});

test('domain ranking identity and official status are domain scoped',()=>{
  assert.equal(voucherDomainRankingActivityId('data-analysis','microsoft-pl-300','prepare-data'),'voucher::data-analysis::microsoft-pl-300::domain::prepare-data');
  assert.deepEqual(resolveVoucherDomainRankStatus({totalQuestions:58,unanswered:0},{expectedQuestions:58}),{official:true,completedQuestions:58,expectedQuestions:58});
  assert.equal(resolveVoucherDomainRankStatus({totalQuestions:58,unanswered:1},{expectedQuestions:58}).official,false);
});

test('domain attempt metadata carries mastery, first pass, active solve and official eligibility',()=>{
  const meta=buildVoucherDomainAttemptMeta({
    domainId:'prepare-data',domainTitle:'Prepare the Data',sectionIds:['s1','s2','s3'],
    result:{unanswered:0},totalQuestions:58,firstPassCorrect:49,attemptNumber:2
  });
  assert.equal(meta.voucherMode,'ranked-domain');
  assert.equal(meta.domainId,'prepare-data');
  assert.equal(meta.officialRankEligible,true);
  assert.equal(meta.firstPassCorrect,49);
  assert.equal(meta.firstPassPercentage,84.5);
  assert.equal(meta.attemptNumber,2);
  assert.equal(meta.solveTimePolicy,'active-solve');
  assert.deepEqual(meta.sectionIds,['s1','s2','s3']);
});

test('domain leaderboard ranks mastery then first pass then attempts-to-best then active solve time',()=>{
  const rows=[
    {player_id:'a',percentage:90,wrong:5,total_questions:58,unanswered:0,time_taken_seconds:500,submitted_at:'2026-09-04T10:00:00Z'},
    {player_id:'b',percentage:90,wrong:4,total_questions:58,unanswered:0,time_taken_seconds:700,submitted_at:'2026-09-04T10:01:00Z'},
    {player_id:'c',percentage:90,wrong:4,total_questions:58,unanswered:0,time_taken_seconds:650,submitted_at:'2026-09-04T10:02:00Z'},
    {player_id:'c',percentage:80,wrong:10,total_questions:58,unanswered:0,time_taken_seconds:400,submitted_at:'2026-09-04T09:00:00Z'}
  ];
  const board=buildVoucherDomainLeaderboard(rows,{expectedQuestions:58});
  assert.deepEqual(board.map(x=>x.player_id),['b','c','a']);
  assert.equal(board[0].attemptCount,1);
  assert.equal(board[1].attemptCount,2);
});

test('domain payload is ranked, supports both feedback modes and never uses countdown duration',()=>{
  const questions=master.questions.filter(q=>questionsForVoucherDomain({architecture,questions:master.questions,domainId:'prepare-data'}).some(x=>x.id===q.id));
  const payload=buildVoucherExamPayload({
    examConfig:config,questions,
    runtime:{attemptKey:'x',mockKind:'domain',sizeMode:'domain',domainRanked:true,domainId:'prepare-data',domainTitle:'Prepare the Data',sectionIds:['pl300-s01-data-sources','pl300-s02-power-query','pl300-s03-refresh-gateways'],feedbackMode:'exam',timerDisplay:true}
  });
  const ctx=payload.exam.generatedFromVoucher;
  assert.equal(ctx.domainRanked,true);
  assert.equal(ctx.domainId,'prepare-data');
  assert.equal(ctx.rankEligible,true);
  assert.equal(ctx.runtimeMode,'ranked-domain');
  assert.equal(ctx.rankingMode,'domain');
  assert.equal(payload.exam.settings.timer.enabled,false);
  assert.equal(payload.exam.settings.timer.durationMinutes,0);
  assert.deepEqual(payload.exam.settings.feedbackModes,['instant','exam']);
  assert.equal(payload.questions.length,75);
});

test('domain exam mode preserves learner-selected feedback style',()=>{
  const exam={generatedFromVoucher:{runtimeMode:'ranked-domain',domainRanked:true,rankEligible:true}};
  const instant=resolveExamMode({exam,feedbackMode:'instant',rankedActivity:true});
  const end=resolveExamMode({exam,feedbackMode:'exam',rankedActivity:true});
  assert.equal(instant.id,EXAM_MODE_IDS.VOUCHER_RANKED_DOMAIN);
  assert.equal(end.id,EXAM_MODE_IDS.VOUCHER_RANKED_DOMAIN);
  assert.equal(instant.feedbackMode,'instant');
  assert.equal(end.feedbackMode,'exam');
  assert.equal(instant.rankingMode,'domain');
  assert.equal(isVoucherRankedLearningExam(exam),true);
  assert.equal(inferExamTimerPolicy({exam,feedbackMode:'instant',rankedActivity:true}),'active-solve');
});

test('domain online overrides encode first-pass misses in shared ranking tie-break field',()=>{
  assert.deepEqual(buildVoucherDomainOnlineOverrides({totalQuestions:58,firstPassCorrect:49}),{wrong:9,unanswered:0,total_questions:58});
});


test('domain resume descriptor preserves domain identity, sections, feedback and active-solve display preference',()=>{
  const ctx={trackId:'data-analysis',voucherExamId:'microsoft-pl-300',mockKind:'domain',sizeMode:'domain',domainRanked:true,domainId:'prepare-data',domainTitle:'Prepare the Data',sectionIds:['s1','s2','s3'],timerDisplay:false,rankEligible:true};
  const descriptor=buildVoucherResumeDescriptor({voucherContext:ctx,questions:[{id:'q1',options:[{id:'a'}]}],feedbackMode:'exam'});
  assert.equal(descriptor.domainRanked,true);
  assert.equal(descriptor.domainId,'prepare-data');
  assert.equal(descriptor.domainTitle,'Prepare the Data');
  assert.deepEqual(descriptor.sectionIds,['s1','s2','s3']);
  assert.equal(descriptor.feedbackMode,'exam');
  assert.equal(descriptor.timerDisplay,false);
  assert.equal(voucherSavedAttemptMatches({voucherResume:descriptor},{...ctx}),true);
  assert.equal(voucherSavedAttemptMatches({voucherResume:descriptor},{...ctx,domainId:'model-data'}),false);
});


test('overall PL-300 leaderboard requires an official best attempt in every Domain and ranks mastery, first pass, attempts, then active solve time',async()=>{
  const mod=await import('../assets/js/voucher-domain-ranked-learning.js');
  assert.equal(typeof mod.buildVoucherOverallLeaderboard,'function');
  const domains=[
    {domainId:'prepare-data',activityId:'voucher::data-analysis::microsoft-pl-300::domain::prepare-data',totalQuestions:58},
    {domainId:'model-data',activityId:'voucher::data-analysis::microsoft-pl-300::domain::model-data',totalQuestions:40}
  ];
  const rows=[
    {exam_id:domains[0].activityId,player_id:'a',student_name:'A',score:52,percentage:90,wrong:5,total_questions:58,unanswered:0,time_taken_seconds:500,submitted_at:'2026-09-04T10:00:00Z'},
    {exam_id:domains[0].activityId,player_id:'a',student_name:'A',score:55,percentage:95,wrong:4,total_questions:58,unanswered:0,time_taken_seconds:520,submitted_at:'2026-09-04T11:00:00Z'},
    {exam_id:domains[1].activityId,player_id:'a',student_name:'A',score:36,percentage:90,wrong:3,total_questions:40,unanswered:0,time_taken_seconds:400,submitted_at:'2026-09-04T12:00:00Z'},
    {exam_id:domains[0].activityId,player_id:'b',student_name:'B',score:58,percentage:100,wrong:0,total_questions:58,unanswered:0,time_taken_seconds:450,submitted_at:'2026-09-04T10:00:00Z'},
    {exam_id:domains[0].activityId,player_id:'c',student_name:'C',score:54,percentage:93.1,wrong:3,total_questions:58,unanswered:0,time_taken_seconds:400,submitted_at:'2026-09-04T10:00:00Z'},
    {exam_id:domains[1].activityId,player_id:'c',student_name:'C',score:38,percentage:95,wrong:2,total_questions:40,unanswered:0,time_taken_seconds:380,submitted_at:'2026-09-04T11:00:00Z'}
  ];
  const board=mod.buildVoucherOverallLeaderboard(rows,{domains});
  assert.deepEqual(board.map(row=>row.player_id),['c','a']);
  assert.equal(board[0].completedDomains,2);
  assert.equal(board[0].totalDomains,2);
  assert.equal(board[0].totalQuestions,98);
  assert.equal(board[0].totalCorrect,92);
  assert.equal(board[0].firstPassCorrect,93);
  assert.equal(board[0].attemptsToBest,2);
  assert.equal(board[0].totalTimeSeconds,780);
  assert.equal(board[1].attemptsToBest,3);
});
