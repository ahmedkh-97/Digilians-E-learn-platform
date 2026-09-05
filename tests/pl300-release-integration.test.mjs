import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateVoucherExamConfig,validateVoucherTrackRegistry} from '../assets/js/voucher-registry.js';
import {selectVoucherQuestions,validateVoucherQuestion} from '../assets/js/voucher-bank-engine.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const deterministic=()=>0.314159;

test('Data Analysis registry publishes Microsoft PL-300 through a valid production config',()=>{
  const track=read('voucher/tracks/data-analysis/registry.json');
  assert.deepEqual(validateVoucherTrackRegistry(track,'data-analysis'),[]);
  const entry=track.exams.find(x=>x.id==='microsoft-pl-300');
  assert.ok(entry,'PL-300 must be visible in the Data Analysis Voucher track');
  const config=read(entry.configFile);
  assert.deepEqual(validateVoucherExamConfig(config),[]);
  assert.equal(config.realExam.questionCount,60);
  assert.equal(config.realExam.durationMinutes,120);
  assert.equal(config.realExam.rankEligible,true);
  assert.equal(config.passingScore,70);
  assert.equal(config.sourceMockStatus,'pending-visual-normalization');
  assert.deepEqual(config.sources,[],'unfinished visual-heavy Full Source mocks must not be falsely released');
});

test('PL-300 released master bank contains only reviewed production questions with valid visuals and answer IDs',()=>{
  const config=read('voucher/tracks/data-analysis/microsoft-pl-300/config.json');
  const bank=read(config.masterBankFile);
  assert.equal(bank.examId,'microsoft-pl-300');
  assert.equal(bank.questions.length,config.masterBankQuestionCount);
  assert.ok(bank.questions.length>=100);
  for(const q of bank.questions){
    assert.equal(q.productionReady,true);
    assert.equal(q.verification?.status,'approved-for-production');
    assert.deepEqual(validateVoucherQuestion(q),[]);
    if(q.visualAsset)assert.ok(fs.existsSync(path.join(ROOT,q.visualAsset)),`missing visual asset ${q.visualAsset}`);
  }
});


test('PL-300 source manifest distinguishes the released reviewed bank from remaining draft and withheld source mocks',()=>{
  const config=read('voucher/tracks/data-analysis/microsoft-pl-300/config.json');
  const manifest=read(config.sourceManifestFile);
  assert.match(manifest.releaseStatus,/^reviewed-bank-v\d+-released$/);
  assert.equal(manifest.audit.productionReadyQuestions,config.masterBankQuestionCount);
  assert.equal(manifest.audit.productionReadyTextQuestions,201);
  assert.equal(manifest.audit.remainingDraftQuestions,manifest.audit.draftCanonicalTextQuestions-manifest.audit.productionReadyTextQuestions);
  assert.equal(manifest.audit.productionReadyQuestions,config.masterBankQuestionCount);
  assert.equal(manifest.fullSourceMocks.status,'withheld-pending-visual-normalization');
  assert.equal(manifest.fullSourceMocks.releasedCount,0);
});

test('PL-300 supports 25, 50, 100 and exact 60-question Real Exam generation',()=>{
  const config=read('voucher/tracks/data-analysis/microsoft-pl-300/config.json');
  const bank=read(config.masterBankFile);
  for(const count of [25,50,100]){
    const selected=selectVoucherQuestions({questions:bank.questions,count,seenIds:[],blueprint:config.blueprint,rng:deterministic});
    assert.equal(selected.length,count);
    assert.equal(new Set(selected.map(q=>q.id)).size,count);
  }
  const real=selectVoucherQuestions({questions:bank.questions,count:60,seenIds:[],blueprint:config.blueprint,rng:deterministic});
  assert.equal(real.length,60);
  const counts=Object.fromEntries(['prepare-data','model-data','visualize-analyze','manage-secure'].map(id=>[id,real.filter(q=>q.topicId===id).length]));
  assert.deepEqual(counts,{'prepare-data':17,'model-data':17,'visualize-analyze':16,'manage-secure':10});
});
