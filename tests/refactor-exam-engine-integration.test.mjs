import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  createExamSession,
  selectSingleAnswerState,
  toggleMultiSelectAnswerState,
  confirmMultiSelectAnswerState,
  confirmVoucherRankedAnswerState,
  normalizeNavigatorFilter,
  toggleMarkedQuestionState,
  moveQuestionIndex,
  setQuestionIndex,
  examTimerPolicyLabel,
  buildExamProgressSnapshot,
  getActiveExamProgress,
  effectiveSavedRemainingSeconds,
  voucherSavedAttemptMatches,
  feedbackStateForQuestion,
  voucherSelectionStatusText,
  isMultiSelectQuestion,
  buildSubjectBreakdown,
  buildStandardResultRecord,
  buildOnlineAttemptPayload,
  resultHeadline
} from '../assets/js/exam-engine.js';

const normalExam={settings:{timer:{enabled:true,durationMinutes:30}}};

test('exam engine facade creates fresh and restored sessions through one contract',()=>{
  const fresh=createExamSession({exam:normalExam,feedbackMode:'instant',rankedActivity:false,nowEpoch:1_000_000});
  assert.deepEqual(fresh.answers,{});
  assert.equal(fresh.remainingSeconds,1800);
  assert.equal(fresh.timerPolicy,'paused');

  const restored=createExamSession({
    exam:normalExam,questions:[{id:'q1'},{id:'q2'}],feedbackMode:'instant',rankedActivity:false,nowEpoch:1_100_000,
    restored:{answers:{q1:'a'},currentIndex:99,feedbackMode:'exam',elapsedSeconds:20,remainingSeconds:1700,timerPolicy:'paused',savedAtEpoch:1_000_000}
  });
  assert.deepEqual(restored.answers,{q1:'a'});
  assert.equal(restored.currentIndex,1);
  assert.equal(restored.feedbackMode,'exam');
  assert.equal(restored.remainingSeconds,1700);
});

test('exam engine facade exposes the established exam core contracts',()=>{
  for(const fn of [
    selectSingleAnswerState,toggleMultiSelectAnswerState,confirmMultiSelectAnswerState,confirmVoucherRankedAnswerState,
    normalizeNavigatorFilter,toggleMarkedQuestionState,moveQuestionIndex,setQuestionIndex,examTimerPolicyLabel,
    buildExamProgressSnapshot,getActiveExamProgress,effectiveSavedRemainingSeconds,voucherSavedAttemptMatches,
    feedbackStateForQuestion,voucherSelectionStatusText,isMultiSelectQuestion,
    buildSubjectBreakdown,buildStandardResultRecord,buildOnlineAttemptPayload,resultHeadline
  ]) assert.equal(typeof fn,'function');
});

test('app integrates through exam-engine facade instead of importing extracted core modules directly',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  assert.match(app,/from "\.\/exam-engine\.js\?v=/);
  for(const moduleName of ['exam-answers','exam-navigation','exam-timer','exam-session','exam-persistence','exam-feedback','exam-results']){
    assert.doesNotMatch(app,new RegExp(`from ["']\\./${moduleName}\\.js\\?v=`));
  }
});

test('local QA treats exam-engine facade as a required runtime dependency',()=>{
  const quick=fs.readFileSync(new URL('../tools/quick-local-check.mjs',import.meta.url),'utf8');
  const pre=fs.readFileSync(new URL('../tools/pre-deploy-check.mjs',import.meta.url),'utf8');
  const windows=fs.readFileSync(new URL('../tools/windows-basic-check.ps1',import.meta.url),'utf8');
  assert.match(quick,/assets\/js\/exam-engine\.js/);
  assert.match(pre,/assets\/js\/exam-engine\.js/);
  assert.match(windows,/assets\\js\\exam-engine\.js/);
});
