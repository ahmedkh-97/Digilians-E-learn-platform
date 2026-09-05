import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const draft=JSON.parse(fs.readFileSync(new URL('draft-master-bank.json',root),'utf8'));
const master=JSON.parse(fs.readFileSync(new URL('master-bank.json',root),'utf8'));
const config=JSON.parse(fs.readFileSync(new URL('config.json',root),'utf8'));
const manifest=JSON.parse(fs.readFileSync(new URL('source-manifest.json',root),'utf8'));

const promotionKeys=new Set([
  'source-01:34','source-01:309','source-01:311','source-01:318','source-01:137',
  'source-01:151','source-01:267','source-01:168','source-01:208','source-01:255',
  'source-01:258','source-01:277','source-01:279','source-01:288','source-01:180',
  'source-01:261','source-01:286','source-02:88','source-02:135','source-02:342'
]);
const conflictKeys=new Set([
  'source-01:327','source-01:289','source-01:335','source-01:53',
  'source-02:18','source-02:184','source-02:187','source-02:204','source-02:260','source-02:370','source-02:173'
]);
const legacyNeedles=[/\bQ&A\b/i,/Power View/i];

function key(q){
  const ref=q.canonicalSourceRef||q.sourceRefs?.[0];
  return `${ref?.sourceId}:${ref?.questionNumber}`;
}

test('PL-300 text review retains 201 approved text questions while native ranking expands the master bank',()=>{
  assert.equal(draft.questions.length,271);
  assert.equal(draft.questions.filter(q=>q.productionReady===true).length,201);
  assert.equal(master.questions.filter(q=>q.responseType!=='structured').length,201);
  assert.equal(master.questions.filter(q=>q.responseType==='structured').length,64);
  assert.equal(master.questions.length,265);
  assert.equal(master.questionCount,265);
  assert.equal(config.masterBankQuestionCount,265);
  assert.equal(config.fullBankExam.questionCount,265);
  assert.equal(config.fullBankExam.durationMinutes,530);
  assert.equal(manifest.audit.productionReadyTextQuestions,201);
  assert.equal(manifest.audit.nativeRankedQuestions,64);
  assert.equal(manifest.audit.productionReadyQuestions,265);
  assert.equal(manifest.audit.finalReviewedWithheldQuestions,70);
});

test('all 20 conservative wave-3 candidates are production approved with reviewed Arabic explanations',()=>{
  const byKey=new Map(draft.questions.map(q=>[key(q),q]));
  for(const sourceKey of promotionKeys){
    const q=byKey.get(sourceKey);
    assert.ok(q,`missing ${sourceKey}`);
    assert.equal(q.productionReady,true,`${sourceKey} must be production ready`);
    assert.equal(q.status,'approved');
    assert.equal(q.explanationStatus,'reviewed-ar');
    assert.equal(q.verification?.status,'approved-for-production');
    assert.match(q.verification?.explanationTemplate||'',/^wave3-/);
    assert.ok((q.deepExplanation?.summary||'').length>=180,`${sourceKey} summary too short`);
    for(const opt of q.options||[]){
      assert.ok((q.deepExplanation?.options?.[opt.id]||'').length>=45,`${sourceKey} option ${opt.id} reason too short`);
    }
  }
});

test('the other 70 questions have a final fail-closed disposition instead of an unresolved review state',()=>{
  const withheld=draft.questions.filter(q=>q.productionReady!==true);
  assert.equal(withheld.length,70);
  for(const q of withheld){
    assert.match(q.finalReviewDisposition||'',/^(duplicate-suppressed|variant-suppressed|withheld-)/,`${key(q)} missing final disposition`);
    assert.ok((q.finalReviewReason||'').length>=30,`${key(q)} missing final review reason`);
  }
});

test('known answer-key conflicts remain withheld and source scoring is not silently changed',()=>{
  const byKey=new Map(draft.questions.map(q=>[key(q),q]));
  for(const sourceKey of conflictKeys){
    const q=byKey.get(sourceKey);
    assert.ok(q,`missing conflict ${sourceKey}`);
    assert.notEqual(q.productionReady,true,`${sourceKey} must remain withheld`);
    assert.equal(q.finalReviewDisposition,'withheld-conflict-owner-approval');
    const ref=q.canonicalSourceRef||q.sourceRefs?.[0];
    const fullRef=(q.sourceRefs||[]).find(r=>r.sourceId===ref.sourceId&&String(r.questionNumber)===String(ref.questionNumber))||q.sourceRefs?.[0];
    const canonical=(q.correctAnswers?.length?q.correctAnswers:[q.correctAnswer]).filter(Boolean).map(String).sort();
    const source=(fullRef?.sourceAnswerIds||[]).map(String).sort();
    assert.deepEqual(canonical,source,`${sourceKey} canonical scoring must still match source key`);
  }
});

test('legacy Q&A and Power View questions stay out of production',()=>{
  for(const q of draft.questions){
    if(legacyNeedles.some(re=>re.test(q.question||''))){
      assert.notEqual(q.productionReady,true,`${key(q)} legacy item leaked into production`);
    }
  }
});
