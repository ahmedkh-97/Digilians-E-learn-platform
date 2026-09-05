import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('Voucher runtime has a dedicated generator branch',()=>{
  assert.match(app,/generator:\s*["']voucher["']/);
  assert.match(app,/generatedFromVoucher/);
});

test('Voucher resume stores compact reconstruction metadata rather than full generated bank',()=>{
  assert.match(app,/voucherResume/);
  assert.match(app,/questionIds/);
  assert.match(app,/optionOrderByQuestion/);
});

test('Voucher completion saves through Voucher storage rather than digilians.results',()=>{
  assert.match(app,/saveVoucherAttempt/);
  assert.match(app,/generatedFromVoucher[\s\S]{0,5000}saveVoucherAttempt/);
});

test('only explicit Real Exam Size Voucher attempts are marked ranked',()=>{
  assert.match(app,/realExamSize/);
  assert.match(app,/sizeMode\s*===\s*["']real["']/);
});

import {buildVoucherExamPayload} from '../assets/js/voucher-bank-engine.js';

test('Real Voucher payload explicitly marks Ranked Learning Challenge',()=>{
  const payload=buildVoucherExamPayload({
    examConfig:{trackId:'data-analysis',id:'microsoft-pl-300',title:'PL-300',passingScore:70,realExam:{questionCount:60,durationMinutes:120,rankEligible:true}},
    questions:[{id:'q1',question:'x',options:[{id:'a',text:'a'},{id:'b',text:'b'}],correctAnswer:'a'}],
    runtime:{attemptKey:'x',mockKind:'random',sizeMode:'real',timed:true,feedbackMode:'instant',rankedLearning:true}
  });
  assert.equal(payload.exam.generatedFromVoucher.rankedLearning,true);
  assert.deepEqual(payload.exam.settings.feedbackModes,['instant']);
  assert.equal(payload.exam.settings.timer.durationMinutes,120);
});
