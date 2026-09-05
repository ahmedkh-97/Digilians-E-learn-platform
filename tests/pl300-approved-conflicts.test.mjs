import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));

test('approved PL-300 conflict corrections are recorded with original answer text provenance',()=>{
  const corrections=read('corrections.json');
  const required=['C-001','C-002','C-003','C-004','C-005','C-007','C-008','C-010','C-011','C-013','C-014','C-015','C-016','C-017'];
  for(const id of required){
    const row=corrections.corrections.find(x=>x.id===id);
    assert.ok(row,`missing ${id}`);
    assert.match(row.status,/APPROVED/);
  }
  const bank=read('draft-master-bank.json');
  for(const q of bank.questions){
    for(const ref of q.sourceRefs||[]){
      assert.ok(Array.isArray(ref.sourceAnswerTexts),`${q.id} ${ref.sourceId}#${ref.questionNumber} missing sourceAnswerTexts`);
    }
  }
});

test('standalone approved Source 02 answer-key conflicts use the approved scoring',()=>{
  const bank=read('draft-master-bank.json');
  const byRef=num=>bank.questions.find(q=>(q.sourceRefs||[]).some(r=>r.sourceId==='source-02'&&String(r.questionNumber)===String(num)));
  const alert=byRef('42');
  assert.ok(alert);
  assert.equal(alert.options.find(o=>o.id===alert.correctAnswer)?.text,'Pin a card visual to a dashboard and set an alert on the tile.');
  assert.equal(alert.answerReview?.correctionId,'C-013');
  const excel=byRef('102');
  assert.ok(excel);
  assert.equal(excel.options.find(o=>o.id===excel.correctAnswer)?.text,'For the report, change the Export data setting to None');
  assert.equal(excel.answerReview?.correctionId,'C-014');
  const rls=byRef('307');
  assert.ok(rls);
  assert.equal(rls.correctAnswer,'A');
  assert.equal(rls.answerReview?.correctionId,'C-015');
});

test('retired malformed or obsolete variants remain traceable but never become canonical scoring sources',()=>{
  const bank=read('draft-master-bank.json');
  const q123=bank.questions.find(q=>(q.sourceRefs||[]).some(r=>r.sourceId==='source-02'&&r.questionNumber==='123'));
  assert.ok(q123);
  assert.equal(q123.canonicalSourceRef.sourceId,'source-01');
  const r123=q123.sourceRefs.find(r=>r.sourceId==='source-02'&&r.questionNumber==='123');
  assert.equal(r123.deliveryEligibility,'excluded');
  const q410=bank.questions.find(q=>(q.sourceRefs||[]).some(r=>r.sourceId==='source-02'&&r.questionNumber==='410'));
  assert.ok(q410);
  assert.equal(q410.canonicalSourceRef.sourceId,'source-01');
  const r410=q410.sourceRefs.find(r=>r.sourceId==='source-02'&&r.questionNumber==='410');
  assert.equal(r410.deliveryEligibility,'excluded');
});


test('owner-approved Source 01 Q184 dimension correction scores role-playing dimension while preserving source key provenance',()=>{
  const corrections=read('corrections.json');
  const correction=corrections.corrections.find(x=>x.id==='C-016');
  assert.ok(correction,'missing C-016');
  assert.equal(correction.sourceId,'source-01');
  assert.equal(correction.questionNumber,'184');
  assert.deepEqual(correction.sourceAnswerIds,['A']);
  assert.deepEqual(correction.approvedAnswerTexts,['role-playing dimension']);

  for(const bankName of ['draft-master-bank.json','master-bank.json']){
    const bank=read(bankName);
    const q=bank.questions.find(x=>(x.sourceRefs||[]).some(r=>r.sourceId==='source-01'&&String(r.questionNumber)==='184'));
    assert.ok(q,`${bankName} missing Source 01 Q184`);
    assert.equal(q.options.find(o=>o.id===q.correctAnswer)?.text,'role-playing dimension');
    assert.equal(q.correctAnswer,'C');
    assert.equal(q.answerReview?.correctionId,'C-016');
    const ref=q.sourceRefs.find(r=>r.sourceId==='source-01'&&String(r.questionNumber)==='184');
    assert.deepEqual(ref.sourceAnswerIds,['A']);
    assert.deepEqual(ref.sourceAnswerTexts,['Type 2 slowly changing dimension (SCD)']);
  }
});
