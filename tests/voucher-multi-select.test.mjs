import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateExamPayload,calculateResult,isAnswerCorrect,isAnswered,correctAnswerIds} from '../assets/js/exam.js';
import {validateVoucherQuestion} from '../assets/js/voucher-bank-engine.js';

const q={
  id:'voucher-pl300-multi-001',question:'Which two actions should you perform?',
  options:[{id:'A',text:'A'},{id:'B',text:'B'},{id:'C',text:'C'},{id:'D',text:'D'}],
  correctAnswers:['A','D'],voucherSource:{sourceId:'pl300-source-01'}
};

test('generic exam validator accepts a multi-select answer set',()=>{
  const payload={exam:{id:'x',title:'x'},questions:[q]};
  assert.deepEqual(validateExamPayload(payload),[]);
  assert.deepEqual(correctAnswerIds(q),['A','D']);
});

test('multi-select scoring is order independent and requires the exact set',()=>{
  assert.equal(isAnswerCorrect(q,['D','A']),true);
  assert.equal(isAnswerCorrect(q,['A']),false);
  assert.equal(isAnswerCorrect(q,['A','B','D']),false);
  assert.equal(isAnswered([]),false);
  assert.equal(isAnswered(['A']),true);
  const ok=calculateResult([q],{[q.id]:['D','A']});
  assert.equal(ok.correct,1);
  const wrong=calculateResult([q],{[q.id]:['A','B']});
  assert.equal(wrong.wrong,1);
});

test('Voucher question validator accepts correctAnswers and rejects unresolved IDs',()=>{
  assert.deepEqual(validateVoucherQuestion(q),[]);
  assert.ok(validateVoucherQuestion({...q,correctAnswers:['A','Z']}).some(x=>x.includes('correctAnswers')));
});

test('exam UI has a Voucher multi-select confirm flow and persists confirmations',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(html,/id="multiSelectConfirmBtn"/);
  assert.match(app,/confirmedMultiAnswers/);
  assert.match(app,/toggleMultiSelectAnswer/);
  assert.match(app,/confirmMultiSelectAnswer/);
  assert.match(app,/isAnswerCorrect\(/);
});
