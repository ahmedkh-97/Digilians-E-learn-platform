import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveModuleExamId,moduleAssessmentState} from '../assets/js/module-assessment.js';

test('Practice uses practiceExamId when present while Exam uses examId',()=>{
  const module={practiceExamId:'excel-practice',examId:null,assessmentStatus:'practice-ready-exam-locked'};
  assert.equal(resolveModuleExamId(module,'instant'),'excel-practice');
  assert.equal(resolveModuleExamId(module,null),null);
  assert.deepEqual(moduleAssessmentState(module),{practiceReady:true,examReady:false});
});

test('legacy modules without practiceExamId keep using examId for instant Practice',()=>{
  const module={examId:'legacy-exam',assessmentStatus:'ready'};
  assert.equal(resolveModuleExamId(module,'instant'),'legacy-exam');
  assert.equal(resolveModuleExamId(module,'exam'),'legacy-exam');
  assert.deepEqual(moduleAssessmentState(module),{practiceReady:true,examReady:true});
});

test('building modules stay locked even if an id is present',()=>{
  const module={practiceExamId:'p',examId:'e',assessmentStatus:'building-after-study-qa'};
  assert.deepEqual(moduleAssessmentState(module),{practiceReady:false,examReady:false});
});

test('non-ranked Practice attempts are not eligible for online ranking sync',async()=>{
  const mod=await import('../assets/js/module-assessment.js');
  assert.equal(typeof mod.shouldSyncAttemptOnline,'function');
  assert.equal(mod.shouldSyncAttemptOnline(false),false);
  assert.equal(mod.shouldSyncAttemptOnline(true),true);
});
