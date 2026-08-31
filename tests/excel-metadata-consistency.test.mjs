import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=(rel)=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));

function excelTrack(){
  const learning=readJson('data/learning.json');
  return learning.courses.flatMap(c=>c.tracks||[]).find(t=>t.id==='excel');
}

test('Excel track production metadata reflects approved Study, Practice and Full Track Exam',()=>{
  const excel=excelTrack();
  assert.ok(excel,'Excel track must exist');
  assert.deepEqual(excel.productionStats,{
    sessions:3,
    topics:294,
    questionBanks:4,
    questions:456,
    status:'FINAL READY',
    studySections:96,
    sourceFiles:29,
    sourceSlides:610,
    practiceQuestions:228,
    trackExamBankQuestions:228,
    trackExamFormQuestions:50,
    weekExamsReady:false
  });
  assert.equal(excel.trackExamId,'data-analysis-excel-track-v1');
  for(const module of excel.modules){
    assert.equal(module.assessmentStatus,'practice-ready-exam-locked');
    assert.ok(module.practiceExamId,'Week Practice must remain linked');
    assert.equal(module.examId,null,'Week Exam must remain intentionally locked');
    assert.equal(module.study?.deepLearningStatus?.assessmentGate,'practice-ready-week-exam-locked');
  }
});

test('Excel curriculum completion metadata reflects all three audited weeks without unlocking week exams',()=>{
  const curriculum=readJson('data/curriculum/excel.json');
  assert.equal(curriculum.curriculumStatus,'complete');
  assert.equal(curriculum.intakeStatus,'all-weeks-audited-track-production-complete');
  assert.deepEqual(curriculum.completion,{
    expectedWeeks:3,
    auditedWeeks:3,
    studyProducedWeeks:3,
    practiceReadyWeeks:3,
    assessmentReadyWeeks:0,
    topicCount:294,
    sourceCount:29,
    confirmedByUser:true,
    trackExamReady:true,
    trackExamId:'data-analysis-excel-track-v1',
    practiceQuestionCount:228,
    trackExamBankQuestionCount:228,
    trackExamFormQuestionCount:50
  });
});

test('Excel intake and week status distinguish ready Full Track Exam from intentionally locked Week Exams',()=>{
  const manifest=readJson('data/excel-intake/source-manifest.json');
  const weekStatus=readJson('data/excel-intake/week-status.json');
  assert.equal(manifest.status,'all-3-weeks-audited-track-production-complete');
  assert.match(manifest.scopeNote,/Full Track Exam production is complete/i);
  assert.doesNotMatch(manifest.scopeNote,/pending|awaiting|gated/i);
  assert.deepEqual(weekStatus.trackExam,{
    ready:true,
    examId:'data-analysis-excel-track-v1',
    bankQuestions:228,
    formQuestions:50,
    minutes:60,
    passingScore:60,
    ranked:true
  });
  for(const week of weekStatus.weeks){
    assert.equal(week.studyReady,true);
    assert.equal(week.practiceReady,true);
    assert.equal(week.studyProduction?.status,'approved-production');
    assert.equal(week.practiceProduction?.status,'approved-production');
    assert.equal(week.examReady,false);
    assert.equal(week.assessmentReady,false);
    assert.ok(week.notes.some(n=>/Week Exam remains intentionally locked/i.test(n)));
  }
});

test('Excel syllabus metadata reports track production complete and preserves week-exam boundary',()=>{
  const syllabus=readJson('data/syllabus-maps/excel.json');
  assert.equal(syllabus.status,'track-production-complete');
  assert.equal(syllabus.week2Study?.status,'approved-production');
  assert.deepEqual(syllabus.trackAssessment,{
    practiceReady:true,
    practiceQuestionCount:228,
    fullTrackExamReady:true,
    fullTrackExamId:'data-analysis-excel-track-v1',
    fullTrackExamBankQuestions:228,
    fullTrackExamFormQuestions:50,
    ranked:true,
    weekExamsReady:false
  });
});
