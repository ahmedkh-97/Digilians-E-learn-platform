import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {getBlueprintReadiness,buildExamFromBlueprint} from '../assets/js/bank-engine.js';

const ROOT=process.cwd();
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const bankPayload=readJson('question-banks/data-analysis/excel/da-excel-track-bank-v1.json');
const coverage=readJson('data/coverage-blueprints/excel-track.json');
const bankRegistry={schemaVersion:'1.0',banks:[{
  id:'da-excel-track-bank-v1',courseId:'data-analysis',trackId:'excel',track:'Excel',
  file:'question-banks/data-analysis/excel/da-excel-track-bank-v1.json',status:'active',
  trackExamEligible:true,finalEligible:false,questionCount:228,counts:bankPayload.bank.counts
}]};
const blueprint={
  id:'data-analysis-excel-track-v1',kind:'track',title:'Excel — Full Track Exam',description:'test',
  courseId:'data-analysis',course:'Data Analysis',trackId:'excel',track:'Excel',category:'Track Exam',difficulty:'Mixed',
  questionCount:50,timerMinutes:60,passingScore:60,feedbackModes:['exam'],
  difficultyTarget:{Easy:0.26,Medium:0.50,Hard:0.24},sourceTarget:{course:1},
  tracks:[{trackId:'excel',label:'Excel',count:50,selectionProfile:coverage.selectionProfile}],
  selection:{shuffleQuestions:true,shuffleOptions:true,avoidAdjacentTopicRepeats:true,bestEffortBalancedAnswerPositions:true},
  version:'1.0',active:true
};
const loadJson=async rel=>readJson(rel);
const count=(items,key)=>items.reduce((m,x)=>{const k=typeof key==='function'?key(x):x[key];m[k]=(m[k]||0)+1;return m;},{});

test('track-only Excel bank is ready for track exam but excluded from final readiness',()=>{
  const trackReady=getBlueprintReadiness(bankRegistry,blueprint);
  assert.equal(trackReady.ready,true);
  const finalBlueprint={...blueprint,id:'fake-final',kind:'final'};
  const finalReady=getBlueprintReadiness(bankRegistry,finalBlueprint);
  assert.equal(finalReady.ready,false);
});

test('generated Excel forms preserve Week/difficulty/family/group profile and balanced answer positions',async()=>{
  for(let i=0;i<40;i++){
    const exam=await buildExamFromBlueprint({blueprint,bankRegistry,loadJson});
    const qs=exam.questions;
    assert.equal(qs.length,50);
    assert.deepEqual(count(qs,'weekNumber'),{'1':12,'2':20,'3':18});
    assert.deepEqual(count(qs,'difficulty'),{Medium:25,Easy:13,Hard:12});
    assert.deepEqual(count(qs,'questionFamily'),{scenario:20,direct:13,tracing:10,troubleshooting:7});
    assert.deepEqual(count(qs,'groupId'),coverage.groupQuotas);
    assert.equal(new Set(qs.map(q=>q.conceptKey)).size,50);
    const positions=count(qs,'correctAnswer');
    const values=['A','B','C','D'].map(k=>positions[k]||0);
    assert.ok(Math.max(...values)-Math.min(...values)<=1,`unbalanced answer positions: ${JSON.stringify(positions)}`);
    for(const q of qs){
      assert.deepEqual(q.options.map(o=>o.id),['A','B','C','D']);
      assert.ok(['A','B','C','D'].includes(q.correctAnswer));
      const chosen=q.options.find(o=>o.id===q.correctAnswer);
      assert.ok(chosen?.text);
      assert.ok(q.deepExplanation?.options?.[q.correctAnswer]);
    }
  }
});
