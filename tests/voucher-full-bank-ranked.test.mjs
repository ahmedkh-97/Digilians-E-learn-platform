import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildVoucherExamPayload,selectVoucherQuestions} from '../assets/js/voucher-bank-engine.js';
import {validateVoucherExamConfig} from '../assets/js/voucher-registry.js';
import {voucherRankingActivityId,isVoucherRankEligibleAttempt} from '../assets/js/voucher-ranking.js';
import {voucherSelectionStatusText} from '../assets/js/exam-feedback.js';
const persistenceModule=fs.readFileSync(new URL('../assets/js/exam-persistence.js',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const render=app.match(/function renderVoucherExam\(\)[\s\S]*?\n}\n\nasync function voucherRankedExamSpecs/)?.[0]||'';

const config={
  schemaVersion:1,
  id:'microsoft-pl-300',
  trackId:'data-analysis',
  title:'Microsoft PL-300 Exam',
  passingScore:70,
  masterBankFile:'voucher/tracks/data-analysis/microsoft-pl-300/master-bank.json',
  sources:[],
  realExam:{questionCount:60,durationMinutes:120,rankEligible:true},
  fullBankExam:{questionCount:180,durationMinutes:360,rankEligible:true}
};
const questions=Array.from({length:180},(_,i)=>({id:`q${i+1}`,question:`Q${i+1}`,options:[{id:'a',text:'A'},{id:'b',text:'B'}],correctAnswer:'a'}));

test('legacy Full Bank config remains valid for historical payload and resume compatibility',()=>{
  assert.deepEqual(validateVoucherExamConfig(config),[]);
  assert.match(validateVoucherExamConfig({...config,fullBankExam:{questionCount:0,durationMinutes:360,rankEligible:true}}).join('; '),/Full Bank Exam questionCount/);
  assert.match(validateVoucherExamConfig({...config,fullBankExam:{questionCount:180,durationMinutes:0,rankEligible:true}}).join('; '),/Full Bank Exam durationMinutes/);
});

test('legacy Full Bank activity ID remains isolated so historical rows keep their original scope',()=>{
  assert.equal(voucherRankingActivityId('data-analysis','microsoft-pl-300'),'voucher::data-analysis::microsoft-pl-300::real');
  assert.equal(voucherRankingActivityId('data-analysis','microsoft-pl-300','full-bank'),'voucher::data-analysis::microsoft-pl-300::full-bank');
  assert.equal(isVoucherRankEligibleAttempt({sizeMode:'full-ranked',rankEligible:true,rankingMode:'full-bank'}),true);
});

test('legacy Full Bank payload builder remains parseable for saved historical attempts',()=>{
  const payload=buildVoucherExamPayload({
    examConfig:config,
    questions,
    runtime:{mockKind:'random',sizeMode:'full-ranked',timed:true,feedbackMode:'exam',fullBankRanked:true,attemptKey:'x'}
  });
  assert.equal(payload.questions.length,180);
  assert.equal(payload.exam.settings.timer.durationMinutes,360);
  assert.deepEqual(payload.exam.settings.feedbackModes,['exam']);
  assert.equal(payload.exam.generatedFromVoucher.rankingMode,'full-bank');
  assert.equal(payload.exam.generatedFromVoucher.fullBankRanked,true);
});

test('new PL-300 primary page does not expose legacy 60Q or Full Bank ranked launch buttons',()=>{
  assert.match(render,/Microsoft PL-300 — Ranked Learning/);
  assert.match(render,/id="voucherArchitecturePanel"/);
  assert.doesNotMatch(render,/id="voucherStartFullRankedBtn"/);
  assert.doesNotMatch(render,/id="voucherFullBankRankingBtn"/);
  assert.doesNotMatch(render,/id="voucherStartRealBtn"/);
});

test('legacy Full Bank resume and result routing remain available for already-saved attempts',()=>{
  assert.match(app,/saved\.sizeMode===["']full-ranked["'].*Full Bank Ranked Exam/s);
  assert.match(persistenceModule,/fullBankRanked:Boolean\(voucherContext\.fullBankRanked\)/);
  assert.match(app,/fullBankRanked:Boolean\(descriptor\.fullBankRanked\)/);
  assert.match(app,/voucherCtx\.fullBankRanked[\s\S]*openVoucherFullBankRanking/);
});

test('released PL-300 master bank still covers every currently validated question exactly once',()=>{
  const releasedConfig=JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/config.json',import.meta.url),'utf8'));
  const bank=JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/master-bank.json',import.meta.url),'utf8'));
  const eligible=bank.questions.filter(q=>q?.status!=='conflict'&&q?.productionReady!==false);
  assert.equal(releasedConfig.masterBankQuestionCount,265);
  assert.equal(eligible.length,265);
  const selected=selectVoucherQuestions({questions:bank.questions,count:releasedConfig.masterBankQuestionCount,seenIds:[],blueprint:releasedConfig.blueprint,rng:()=>0.42});
  assert.equal(selected.length,265);
  assert.equal(new Set(selected.map(q=>q.id)).size,265);
});

test('legacy Exam Mode multi-select guidance still says saved instead of asking for hidden confirmation',()=>{
  const question={id:'multi',correctAnswers:['a','b'],options:[{id:'a'},{id:'b'},{id:'c'}]};
  assert.equal(voucherSelectionStatusText({question,selected:['a','b'],feedbackMode:'exam',confirmed:false}),'2 of 2 selected · Saved');
  assert.match(app,/voucherSelectionStatusText\(\{question:q,selected,feedbackMode:state\.feedbackMode/);
});
