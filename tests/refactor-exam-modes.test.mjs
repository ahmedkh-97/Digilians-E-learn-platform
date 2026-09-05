import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {EXAM_MODE_IDS,resolveExamMode} from '../assets/js/exam-modes.js';
import {resolveExamMode as resolveFromFacade} from '../assets/js/exam-engine.js';

function voucherExam(overrides={}){
  return {settings:{feedbackModes:['instant','exam']},generatedFromVoucher:{runtimeMode:'practice',rankEligible:false,...overrides}};
}

test('voucher ranked learning resolves to one explicit mode profile',()=>{
  const profile=resolveExamMode({
    exam:voucherExam({runtimeMode:'ranked-learning',rankedLearning:true,rankEligible:true,rankingMode:'real'}),
    feedbackMode:'instant',rankedActivity:true
  });
  assert.equal(profile.id,EXAM_MODE_IDS.VOUCHER_RANKED_LEARNING);
  assert.equal(profile.family,'voucher');
  assert.equal(profile.feedbackMode,'instant');
  assert.equal(profile.rankedActivity,true);
  assert.equal(profile.voucherRankedLearning,true);
  assert.equal(profile.resultMode,'ranked-learning');
  assert.equal(profile.analyticsStartEvent,'practice_start');
  assert.equal(profile.analyticsCompleteEvent,'practice_complete');
});

test('voucher full bank ranked resolves to exam feedback and separate result mode',()=>{
  const profile=resolveExamMode({
    exam:voucherExam({runtimeMode:'full-bank-ranked',fullBankRanked:true,rankEligible:true,rankingMode:'full-bank'}),
    feedbackMode:'exam',rankedActivity:true
  });
  assert.equal(profile.id,EXAM_MODE_IDS.VOUCHER_FULL_BANK_RANKED);
  assert.equal(profile.feedbackMode,'exam');
  assert.equal(profile.rankedActivity,true);
  assert.equal(profile.voucherRankedLearning,false);
  assert.equal(profile.resultMode,'full-bank-ranked');
  assert.equal(profile.analyticsStartEvent,'exam_start');
});

test('voucher improvement and custom practice remain non-ranked profiles',()=>{
  const improvement=resolveExamMode({exam:voucherExam({runtimeMode:'improvement',improvementSession:true}),feedbackMode:'instant',rankedActivity:false});
  assert.equal(improvement.id,EXAM_MODE_IDS.VOUCHER_IMPROVEMENT);
  assert.equal(improvement.rankedActivity,false);
  assert.equal(improvement.resultMode,'improvement');

  const practice=resolveExamMode({exam:voucherExam(),feedbackMode:'exam',rankedActivity:false});
  assert.equal(practice.id,EXAM_MODE_IDS.VOUCHER_PRACTICE);
  assert.equal(practice.feedbackMode,'exam');
  assert.equal(practice.rankedActivity,false);
  assert.equal(practice.resultMode,'practice');
});

test('my mistakes always resolves as instant non-ranked recovery practice',()=>{
  const profile=resolveExamMode({exam:{generatedFromMistakes:{kind:'mistake-recovery',ranked:false}},feedbackMode:'instant',rankedActivity:false});
  assert.equal(profile.id,EXAM_MODE_IDS.MISTAKES_PRACTICE);
  assert.equal(profile.family,'mistakes');
  assert.equal(profile.feedbackMode,'instant');
  assert.equal(profile.rankedActivity,false);
  assert.equal(profile.analyticsStartEvent,'mistakes_practice_start');
  assert.equal(profile.analyticsCompleteEvent,'mistakes_practice_complete');
});

test('official qbank keeps ranking independent from feedback style',()=>{
  const exam={generatedFromOfficialQbank:{kind:'track-random',ranked:true}};
  const learning=resolveExamMode({exam,feedbackMode:'instant',rankedActivity:true});
  const simulation=resolveExamMode({exam,feedbackMode:'exam',rankedActivity:true});
  assert.equal(learning.id,EXAM_MODE_IDS.OFFICIAL_PRACTICE);
  assert.equal(simulation.id,EXAM_MODE_IDS.OFFICIAL_EXAM);
  assert.equal(learning.rankedActivity,true);
  assert.equal(simulation.rankedActivity,true);
  assert.equal(learning.official,true);
});

test('course mode preserves existing ranked activity while selecting feedback profile',()=>{
  const practice=resolveExamMode({exam:{category:'Track Exam'},feedbackMode:'instant',rankedActivity:true});
  const exam=resolveExamMode({exam:{category:'Track Exam'},feedbackMode:'exam',rankedActivity:true});
  assert.equal(practice.id,EXAM_MODE_IDS.COURSE_PRACTICE);
  assert.equal(exam.id,EXAM_MODE_IDS.COURSE_EXAM);
  assert.equal(practice.rankedActivity,true);
  assert.equal(exam.rankedActivity,true);
});

test('exam engine facade exposes mode resolution and app stores the active mode profile',()=>{
  assert.equal(typeof resolveFromFacade,'function');
  assert.equal(resolveFromFacade({exam:{generatedFromMistakes:{ranked:false}},feedbackMode:'instant',rankedActivity:false}).id,EXAM_MODE_IDS.MISTAKES_PRACTICE);
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  assert.match(app,/resolveExamMode/);
  assert.match(app,/state\.examMode\s*=\s*resolveExamMode/);
  assert.doesNotMatch(app,/isVoucherRankedLearningExam\(state\.currentExam\?\.exam\)/);
});


test('local QA and Windows launcher require the exam mode registry',()=>{
  const quick=fs.readFileSync(new URL('../tools/quick-local-check.mjs',import.meta.url),'utf8');
  const pre=fs.readFileSync(new URL('../tools/pre-deploy-check.mjs',import.meta.url),'utf8');
  const windows=fs.readFileSync(new URL('../tools/windows-basic-check.ps1',import.meta.url),'utf8');
  assert.match(quick,/assets\/js\/exam-modes\.js/);
  assert.match(pre,/assets\/js\/exam-modes\.js/);
  assert.match(windows,/assets\\js\\exam-modes\.js/);
});
