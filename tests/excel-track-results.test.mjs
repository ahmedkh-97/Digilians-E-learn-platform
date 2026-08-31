import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const MODULE=path.join(ROOT,'assets/js/excel-track-results.js');

async function loadModule(){
  assert.ok(fs.existsSync(MODULE),'Excel track results helper must exist');
  return import(`${pathToFileURL(MODULE).href}?t=${Date.now()}`);
}

const QUESTIONS=[
  {id:'q1',weekNumber:1,groupId:'g1',groupNumber:'01',groupTitle:'Visual Rules',correctAnswer:'A'},
  {id:'q2',weekNumber:1,groupId:'g1',groupNumber:'01',groupTitle:'Visual Rules',correctAnswer:'B'},
  {id:'q3',weekNumber:2,groupId:'g9',groupNumber:'09',groupTitle:'Advanced Data',correctAnswer:'C'},
  {id:'q4',weekNumber:3,groupId:'g22',groupNumber:'22',groupTitle:'Macros',correctAnswer:'D'}
];
const ANSWERS={q1:'A',q2:'C',q3:'C'};

test('Excel track result breakdown calculates week and group performance',async()=>{
  const {buildExcelTrackBreakdown}=await loadModule();
  const result=buildExcelTrackBreakdown(QUESTIONS,ANSWERS);
  assert.deepEqual(result.weeks.map(x=>[x.weekNumber,x.total,x.correct,x.wrong,x.unanswered,x.percentage]),[
    [1,2,1,1,0,50],[2,1,1,0,0,100],[3,1,0,0,1,0]
  ]);
  assert.deepEqual(result.groups.map(x=>[x.groupId,x.total,x.correct,x.wrong,x.unanswered,x.percentage]),[
    ['g1',2,1,1,0,50],['g9',1,1,0,0,100],['g22',1,0,0,1,0]
  ]);
});

test('Excel breakdown is only attached to the Excel Full Track Exam',async()=>{
  const {buildExcelTrackResultMetadata}=await loadModule();
  assert.equal(buildExcelTrackResultMetadata({id:'other-exam'},QUESTIONS,ANSWERS),null);
  const data=buildExcelTrackResultMetadata({id:'data-analysis-excel-track-v1'},QUESTIONS,ANSWERS);
  assert.equal(data.weeks.length,3);
  assert.equal(data.groups.length,3);
});

test('result UI and finish flow persist and render Excel week/group breakdowns',()=>{
  const app=fs.readFileSync(path.join(ROOT,'assets/js/app.js'),'utf8');
  const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  assert.match(app,/buildExcelTrackResultMetadata/);
  assert.match(app,/excelBreakdown/);
  assert.match(app,/renderExcelTrackBreakdown/);
  assert.match(html,/id="resultExcelWeekBreakdown"/);
  assert.match(html,/id="resultExcelGroupBreakdown"/);
});

test('validated 50Q Excel form produces complete 12/20/18 and 23-group analytics',async()=>{
  const {buildExcelTrackResultMetadata}=await loadModule();
  const sample=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/excel-production/excel-track-exam-001.json'),'utf8'));
  const answers=Object.fromEntries(sample.questions.map(q=>[q.id,q.correctAnswer]));
  const data=buildExcelTrackResultMetadata({id:'data-analysis-excel-track-v1'},sample.questions,answers);
  assert.equal(data.weeks.reduce((sum,x)=>sum+x.total,0),50);
  assert.deepEqual(Object.fromEntries(data.weeks.map(x=>[String(x.weekNumber),x.total])),{'1':12,'2':20,'3':18});
  assert.equal(data.groups.length,23);
  assert.equal(data.groups.reduce((sum,x)=>sum+x.total,0),50);
  assert.ok(data.weeks.every(x=>x.percentage===100));
  assert.ok(data.groups.every(x=>x.percentage===100));
});
