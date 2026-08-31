import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));

const bankRegistry = read('data/question-banks.json');
const examRegistry = read('data/exams.json');
const blueprintRegistry = read('data/exam-blueprints.json');
const coverageRegistry = read('data/coverage-blueprints.json');
const learning = read('data/learning.json');
const bankFile = read('question-banks/data-analysis/excel/da-excel-track-bank-v1.json');
const coverage = read('data/coverage-blueprints/excel-track.json');

const BANK_ID = 'da-excel-track-bank-v1';
const EXAM_ID = 'data-analysis-excel-track-v1';

function excelTrack(){
  const course = learning.courses.find((x)=>x.id==='data-analysis');
  return course?.tracks?.find((x)=>x.id==='excel');
}

test('Excel independent track bank is active for track exam only', () => {
  const bank = bankRegistry.banks.find((x)=>x.id===BANK_ID);
  assert.ok(bank, 'Excel track bank registry entry missing');
  assert.equal(bank.file, 'question-banks/data-analysis/excel/da-excel-track-bank-v1.json');
  assert.equal(bank.status, 'active');
  assert.equal(bank.trackExamEligible, true);
  assert.equal(bank.finalEligible, false);
  assert.equal(bank.questionCount, 228);
  assert.deepEqual(bank.counts.byDifficulty, bankFile.bank.counts.byDifficulty);
  assert.deepEqual(bank.counts.byQuestionType, bankFile.bank.counts.byQuestionType);
  assert.equal(bankRegistry.banks.some((x)=>x.id==='da-excel-pool' && x.status==='planned'), false,
    'stale planned Excel pool must not coexist with the active bank');
});

test('Excel Full Track Exam is ranked and points at its dynamic blueprint', () => {
  const exam = examRegistry.exams.find((x)=>x.id===EXAM_ID);
  assert.ok(exam, 'Excel Full Track Exam registry entry missing');
  assert.equal(exam.track, 'Excel');
  assert.equal(exam.category, 'Track Exam');
  assert.equal(exam.questionCount, 50);
  assert.equal(exam.generator, 'question-bank');
  assert.equal(exam.blueprintId, EXAM_ID);
  assert.equal(exam.active, true);
  assert.equal(exam.ranked, true);
});

test('Excel runtime blueprint preserves the approved Option A profile', () => {
  const bp = blueprintRegistry.blueprints.find((x)=>x.id===EXAM_ID);
  assert.ok(bp, 'Excel runtime blueprint missing');
  assert.equal(bp.kind, 'track');
  assert.equal(bp.trackId, 'excel');
  assert.equal(bp.questionCount, 50);
  assert.equal(bp.timerMinutes, 60);
  assert.equal(bp.passingScore, 60);
  assert.deepEqual(bp.feedbackModes, ['exam']);
  assert.deepEqual(bp.sourceTarget, {course:1});
  assert.deepEqual(bp.tracks[0].selectionProfile.weekQuotas, {'1':12,'2':20,'3':18});
  assert.deepEqual(bp.tracks[0].selectionProfile.difficultyTarget, {Easy:13,Medium:25,Hard:12});
  assert.deepEqual(bp.tracks[0].selectionProfile.groupQuotas, coverage.selectionProfile.groupQuotas);
  assert.deepEqual(bp.tracks[0].selectionProfile.questionFamilyTarget, coverage.selectionProfile.questionFamilyTarget);
  assert.deepEqual(bp.tracks[0].selectionProfile.signatureQuotas, coverage.selectionProfile.signatureQuotas);
  assert.equal(bp.selection.shuffleQuestions, true);
  assert.equal(bp.selection.shuffleOptions, true);
  assert.equal(bp.selection.avoidAdjacentTopicRepeats, true);
  assert.equal(bp.selection.bestEffortBalancedAnswerPositions, true);
});

test('Excel track exposes only the full-track exam while week exam gates stay locked', () => {
  const track = excelTrack();
  assert.ok(track, 'Excel learning track missing');
  assert.equal(track.trackExamId, EXAM_ID);
  assert.equal(track.trackExamTitle, 'Excel — Full Track Exam');
  for (const module of track.modules) {
    assert.ok(module.practiceExamId, `${module.id} practice must remain linked`);
    assert.equal(module.examId, null, `${module.id} week exam must remain locked`);
    assert.equal(module.assessmentStatus, 'practice-ready-exam-locked');
  }
});

test('Excel track coverage registry points to the validated track coverage file', () => {
  const entry = coverageRegistry.blueprints.find((x)=>x.id==='excel-track-coverage-v1');
  assert.ok(entry, 'Excel track coverage registry entry missing');
  assert.equal(entry.trackId, 'excel');
  assert.equal(entry.examKind, 'track');
  assert.equal(entry.file, 'data/coverage-blueprints/excel-track.json');
  assert.equal(entry.status, 'final');
});

test('local QA gates distinguish locked week exams from the ready Excel Full Track Exam', () => {
  const predeploy=fs.readFileSync(new URL('../tools/pre-deploy-check.mjs',import.meta.url),'utf8');
  const intake=fs.readFileSync(new URL('../tools/excel-intake-check.mjs',import.meta.url),'utf8');
  assert.match(predeploy,/data-analysis-excel-track-v1/);
  assert.match(intake,/data-analysis-excel-track-v1/);
  assert.doesNotMatch(intake,/Excel Exam remains gated|Excel Exam remains blocked/);
});
