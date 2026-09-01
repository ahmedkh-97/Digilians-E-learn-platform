import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildOfficialFinal} from '../assets/js/official-qbank.js';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(root,rel),'utf8'));
const readText=rel=>fs.readFileSync(path.join(root,rel),'utf8');

function sampleQuestion(id='q1'){
  return {
    id,
    originalOrder:1,
    finalEligible:true,
    fingerprint:id,
    question:'Sample?',
    options:[{id:'A',text:'A'},{id:'B',text:'B'}],
    correctAnswer:'A',
    topic:'General'
  };
}

test('Official Final generator uses feedbackModes declared by its blueprint',async()=>{
  const registry={levels:[{levelId:'junior-data-analysis',tracks:[{trackId:'excel',files:['mock/excel.json']}]}]};
  const blueprint={
    id:'test-final',title:'Test Final',levelId:'junior-data-analysis',questionCount:1,timerMinutes:120,
    passingScore:60,feedbackModes:['instant','exam'],distribution:[{trackId:'excel',label:'Excel',count:1}]
  };
  const payload=await buildOfficialFinal({
    registry,blueprint,
    loadJson:async file=>({questions:file==='mock/excel.json'?[sampleQuestion()]:[]})
  });
  assert.deepEqual(payload.exam.settings.feedbackModes,['instant','exam']);
});

test('Every active Official Final blueprint offers Instant Feedback and Exam Mode',()=>{
  const payload=readJson('data/official-final-blueprints.json');
  assert.ok(payload.blueprints.length>=2);
  for(const bp of payload.blueprints){
    assert.deepEqual(bp.feedbackModes,['instant','exam'],`${bp.id} must offer both feedback modes`);
  }
});

test('Official Final setup does not force Exam Mode before the learner chooses',()=>{
  const source=readText('assets/js/app.js');
  const fn=source.match(/async function prepareOfficialFinalExam\(\)\{[\s\S]*?\n\}/)?.[0]||'';
  assert.ok(fn.includes('configureExamSetup(payload,item)'), 'Final should open setup without a forced feedback mode');
  assert.ok(!fn.includes("configureExamSetup(payload,item,'exam')"), 'Final must not force Exam Mode');
});
