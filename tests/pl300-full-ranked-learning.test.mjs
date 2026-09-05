import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPl300FullRankMetrics,buildPl300FullRankLeaderboard,
  buildPl300FullRankOnlineAttempt,encodePl300FullRankMeta,parsePl300FullRankMeta,
  pl300FullRankActivityId
} from '../assets/js/pl300-full-ranked-learning.js';

const index={questionCount:4,validatedConceptCount:2,records:[
  {questionId:'q1',mode:'objective',equivalenceClusterId:'canonical:c1',validatedQuestionId:'c1',ranking:{completionWeight:1,accuracyWeight:1}},
  {questionId:'q2',mode:'objective',equivalenceClusterId:'canonical:c1',validatedQuestionId:'c1',ranking:{completionWeight:1,accuracyWeight:1}},
  {questionId:'q3',mode:'objective',equivalenceClusterId:'canonical:c2',validatedQuestionId:'c2',ranking:{completionWeight:1,accuracyWeight:1}},
  {questionId:'q4',mode:'checkpoint',equivalenceClusterId:'NQ-x',validatedQuestionId:null,ranking:{completionWeight:1,accuracyWeight:0}}
]};

test('full ranked metrics count every occurrence for completion but dedupe validated mastery by concept',()=>{
  const records={
    q1:{mode:'auto',correct:true,firstPassCorrect:false,everCorrect:true,attemptCount:2,firstAnsweredAt:'2026-09-05T08:00:00Z',activeSeconds:10},
    q2:{mode:'auto',correct:true,firstPassCorrect:true,everCorrect:true,attemptCount:1,firstAnsweredAt:'2026-09-05T08:10:00Z',activeSeconds:5},
    q3:{mode:'native',correct:true,firstPassCorrect:true,everCorrect:true,attemptCount:1,firstAnsweredAt:'2026-09-05T08:20:00Z',activeSeconds:7},
    q4:{mode:'checkpoint',reviewStatus:'reviewed',activeSeconds:3,answeredAt:'2026-09-05T08:30:00Z'}
  };
  const m=buildPl300FullRankMetrics({index,records});
  assert.equal(m.completedOccurrences,4);
  assert.equal(m.totalOccurrences,4);
  assert.equal(m.completionPercentage,100);
  assert.equal(m.objectiveAttemptedClusters,2);
  assert.equal(m.masteredClusters,2);
  assert.equal(m.validatedAccuracy,100);
  assert.equal(m.firstPassCorrectClusters,1,'earliest duplicate encounter defines first pass for the concept');
  assert.equal(m.firstPassPercentage,50);
  assert.equal(m.activeSolveSeconds,25);
  assert.equal(m.checkpointCompletions,1);
});

test('legacy self-grade can seed completion but never competitive accuracy',()=>{
  const m=buildPl300FullRankMetrics({index,records:{q4:{mode:'self',selfGrade:'correct',answeredAt:'2026-09-05T08:00:00Z'}}});
  assert.equal(m.completedOccurrences,1);
  assert.equal(m.masteredClusters,0);
  assert.equal(m.objectiveAttemptedClusters,0);
  assert.equal(m.validatedAccuracy,0);
});

test('full ranked metadata round-trips and online payload fits existing attempt columns',()=>{
  const meta=encodePl300FullRankMeta({objectiveAttemptedClusters:123,firstPassCorrectClusters:101,attemptsToBest:140});
  assert.deepEqual(parsePl300FullRankMeta(meta),{objectiveAttemptedClusters:123,firstPassCorrectClusters:101,attemptsToBest:140});
  const payload=buildPl300FullRankOnlineAttempt({
    playerId:'p1',studentName:'A',examVersion:'0.22.1',
    metrics:{completedOccurrences:400,totalOccurrences:509,completionPercentage:78.6,masteredClusters:210,objectiveAttemptedClusters:220,firstPassCorrectClusters:180,attemptsToBest:250,activeSolveSeconds:3600}
  });
  assert.equal(payload.exam_id,pl300FullRankActivityId());
  assert.equal(payload.score,210);
  assert.equal(payload.unanswered,109);
  assert.equal(payload.total_questions,509);
  assert.equal(payload.percentage,78.6);
  assert.equal(payload.time_taken_seconds,3600);
  assert.deepEqual(parsePl300FullRankMeta(payload.feedback_mode),{objectiveAttemptedClusters:220,firstPassCorrectClusters:180,attemptsToBest:250});
});

test('full ranked leaderboard orders completion before mastery, first pass, attempts, and active time',()=>{
  const row=(player,{completed,mastery,firstPass,attempts,time,objective=265})=>({
    player_id:player,student_name:player,score:mastery,unanswered:509-completed,total_questions:509,
    percentage:Math.round((completed/509)*1000)/10,time_taken_seconds:time,
    feedback_mode:encodePl300FullRankMeta({objectiveAttemptedClusters:objective,firstPassCorrectClusters:firstPass,attemptsToBest:attempts}),
    submitted_at:'2026-09-05T10:00:00Z'
  });
  const rows=[
    row('accuracy',{completed:508,mastery:265,firstPass:265,attempts:265,time:1000}),
    row('complete',{completed:509,mastery:200,firstPass:190,attempts:300,time:3000}),
    row('mastery',{completed:509,mastery:210,firstPass:180,attempts:320,time:2500}),
    row('firstpass',{completed:509,mastery:210,firstPass:190,attempts:350,time:2400}),
    row('attempts',{completed:509,mastery:210,firstPass:190,attempts:300,time:2600}),
    row('time',{completed:509,mastery:210,firstPass:190,attempts:300,time:2000})
  ];
  const board=buildPl300FullRankLeaderboard(rows,{totalOccurrences:509,validatedConceptCount:265});
  assert.deepEqual(board.map(x=>x.player_id),['time','attempts','firstpass','mastery','complete','accuracy']);
  assert.equal(board[0].rank,1);
  assert.equal(board.at(-1).completedOccurrences,508);
});

test('full ranked leaderboard presentation renders completion and validated mastery without self-grade language',async()=>{
  const {buildPl300FullRankLeaderboardPresentation}=await import('../assets/js/pl300-full-ranked-learning.js');
  assert.equal(typeof buildPl300FullRankLeaderboardPresentation,'function');
  const view=buildPl300FullRankLeaderboardPresentation({
    board:[{rank:1,player_id:'p1',student_name:'A',completedOccurrences:509,completionPercentage:100,masteredClusters:250,validatedAccuracy:95,firstPassPercentage:90,attemptsToBest:265,activeSolveSeconds:3600}],
    currentPlayerId:'p1',studentName:'A',avatarHtmlByPlayer:{p1:'<span>A</span>'}
  });
  assert.match(view.listHtml,/509\/509/);
  assert.match(view.listHtml,/250\/265/);
  assert.doesNotMatch(view.listHtml,/self-grade/i);
  assert.match(view.personalHtml,/Rank/);
});

test('full ranked landing presentation exposes the 509 source bank and separate validated metrics',async()=>{
  const {buildPl300FullRankedLandingMarkup}=await import('../assets/js/pl300-full-ranked-learning.js');
  assert.equal(typeof buildPl300FullRankedLandingMarkup,'function');
  const html=buildPl300FullRankedLandingMarkup({domainCount:4,sessionCount:10});
  assert.match(html,/Full Ranked Bank — 509 Questions/);
  assert.match(html,/369[^<]*Source 01|<strong>369<\/strong> Source 01/);
  assert.match(html,/140[^<]*Source 02|<strong>140<\/strong> Source 02/);
  assert.match(html,/id="pl300FullRankCompletion"/);
  assert.match(html,/id="pl300FullRankAccuracy"/);
});
