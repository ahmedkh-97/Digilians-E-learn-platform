import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

async function loadFlow(){
  const file=path.join(ROOT,'assets/js/learning-flow.js');
  assert.equal(fs.existsSync(file),true,'learning flow helper must exist');
  return import(`${pathToFileURL(file).href}?t=${Date.now()}`);
}

const excelTrack={id:'excel',title:'Excel',trackExamId:'data-analysis-excel-track-v1'};
const excelWeek={id:'excel-week-01',examId:null,practiceExamId:'data-analysis-excel-week01-practice-v1'};
const excelExam={id:'data-analysis-excel-track-v1',title:'Excel — Full Track Exam',questionCount:50,ranked:true};

test('Excel module exam card resolves to the ready full-track exam instead of a locked week exam', async()=>{
  const {resolveLearningFlowExam}=await loadFlow();
  const result=resolveLearningFlowExam({module:excelWeek,track:excelTrack,registry:[excelExam]});
  assert.equal(result.examId,'data-analysis-excel-track-v1');
  assert.equal(result.scope,'track');
  assert.equal(result.item,excelExam);
});

test('Excel full-track card copy is explicit about scope, duration and ranking', async()=>{
  const {buildLearningFlowExamCard}=await loadFlow();
  const card=buildLearningFlowExamCard({scope:'track',item:excelExam,bestResult:null,savedProgress:null});
  assert.equal(card.pill,'FULL TRACK EXAM');
  assert.equal(card.title,'Test your Excel readiness');
  assert.match(card.description,/50 Questions/i);
  assert.match(card.description,/60 Minutes/i);
  assert.match(card.description,/Ranked/i);
  assert.match(card.description,/all 3 Excel weeks/i);
  assert.equal(card.status,'Not attempted');
  assert.equal(card.buttonLabel,'Start Full Track Exam');
  assert.equal(card.resume,false);
});

test('Excel full-track card shows in-progress state and resume action for its saved attempt', async()=>{
  const {buildLearningFlowExamCard}=await loadFlow();
  const card=buildLearningFlowExamCard({
    scope:'track',item:excelExam,bestResult:{percentage:82},
    savedProgress:{examId:'data-analysis-excel-track-v1'}
  });
  assert.equal(card.status,'In progress');
  assert.equal(card.buttonLabel,'Resume Full Track Exam');
  assert.equal(card.resume,true);
});

test('non-Excel tracks keep module exam behavior', async()=>{
  const {resolveLearningFlowExam}=await loadFlow();
  const sqlModule={id:'sql-session-01',examId:'sql-session-01-exam'};
  const sqlTrack={id:'sql',trackExamId:'sql-full-track'};
  const moduleExam={id:'sql-session-01-exam',title:'SQL Session 1 Exam'};
  const result=resolveLearningFlowExam({module:sqlModule,track:sqlTrack,registry:[moduleExam]});
  assert.equal(result.examId,'sql-session-01-exam');
  assert.equal(result.scope,'module');
});

test('Excel selected-module hint explains week Study/Practice versus full-track Exam scope',()=>{
  const app=fs.readFileSync(path.join(ROOT,'assets/js/app.js'),'utf8');
  assert.match(app,/Study \+ Practice cover this Excel week/i);
  assert.match(app,/Full Track Exam covers all 3 Excel weeks/i);
});

test('Excel does not render a duplicate standalone track-exam row when the flow card owns the full-track CTA', async()=>{
  const {shouldRenderStandaloneTrackExamRow}=await loadFlow();
  assert.equal(shouldRenderStandaloneTrackExamRow(excelTrack),false);
  assert.equal(shouldRenderStandaloneTrackExamRow({id:'sql',trackExamId:'sql-full-track'}),true);
});
