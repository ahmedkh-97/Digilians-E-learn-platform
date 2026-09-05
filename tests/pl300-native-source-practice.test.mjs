import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const pl300=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,pl300),'utf8'));
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const nativeUi=fs.existsSync(new URL('../assets/js/voucher-source-practice-native.js',import.meta.url))?fs.readFileSync(new URL('../assets/js/voucher-source-practice-native.js',import.meta.url),'utf8'):'';
const storage=fs.readFileSync(new URL('../assets/js/voucher-storage.js',import.meta.url),'utf8');
const version=fs.readFileSync(new URL('../VERSION.txt',import.meta.url),'utf8').trim();

function allSourceQuestions(){
  return ['source-01-review-bank.json','source-02-review-bank.json'].flatMap(name=>read(name).questions||[]);
}

test('PL-300 source practice promotes evidence-backed visuals while fail-closed source reveals remain checkpoint candidates',()=>{
  const manifest=read('source-manifest.json');
  const questions=allSourceQuestions();
  const native=questions.filter(q=>q.reviewMode==='native-structured');
  const reveal=questions.filter(q=>q.reviewMode==='source-reveal');
  const text=questions.filter(q=>q.reviewMode==='scored-text');

  assert.ok(native.length>0,'expected at least one evidence-backed native structured item');
  assert.equal(native.length,manifest.fullSourceReview?.nativeStructuredVisualBlocks);
  assert.equal(reveal.length,(manifest.fullSourceReview?.selfGradedVisualBlocks||0)+(manifest.fullSourceReview?.selfGradedMalformedTextBlocks||0));
  assert.equal(manifest.fullSourceReview?.selfGradedSourceBlocks,0,'Full Ranked Learning must not award competitive correctness by self-grade');
  assert.equal(text.length,manifest.fullSourceReview?.autoScoredTextBlocks);
  assert.equal(text.length+native.length+reveal.length,509);

  for(const q of native){
    assert.ok(['hotspot','drag-drop','fill-blank','mcq'].includes(q.sourceType));
    assert.equal(q.sourceFidelity?.adaptedScoring,true);
    assert.equal(q.nativeResponse?.scoring,'normalized-text');
    assert.ok(Array.isArray(q.nativeResponse?.fields)&&q.nativeResponse.fields.length>=1,`${q.id} missing native fields`);
    for(const field of q.nativeResponse.fields){
      assert.ok(String(field.id||'').trim());
      assert.ok(String(field.label||'').trim());
      assert.ok(Array.isArray(field.expected)&&field.expected.some(v=>String(v||'').trim()),`${q.id}/${field.id} missing expected values`);
    }
  }
});

test('native source records stay practice-scoped while only explicit reviewed copies enter the ranked master bank',()=>{
  const master=read('master-bank.json');
  const review=read('native-ranked-review.json');
  const approved=new Set(review.decisions.filter(d=>d.status==='approved').map(d=>d.sourceKey));
  assert.equal(master.questionCount,master.questions.length);
  assert.equal(master.questionCount,265);
  assert.equal(master.questions.filter(q=>q.responseType==='structured').length,64);
  for(const q of allSourceQuestions().filter(q=>q.reviewMode==='native-structured')){
    assert.notEqual(q.rankingImpact,'ranked');
  }
  const promotedKeys=new Set(master.questions.filter(q=>q.responseType==='structured').map(q=>q.nativeRankedReview?.sourceKey));
  assert.deepEqual(promotedKeys,approved);
});

test('voucher storage and source-practice UI support native structured answers',()=>{
  assert.match(storage,/\['auto','self','native','checkpoint'\]/);
  assert.match(storage,/Native-scored source practice requires structured answers/);
  assert.match(storage,/Ranked study checkpoint requires a reviewStatus/);
  assert.ok(app.includes(`import("./voucher-source-practice-native.js?v=${version}")`));
  assert.match(nativeUi,/data-source-native-field/);
  assert.match(nativeUi,/sourcePracticeNativeCheckBtn/);
  assert.match(nativeUi,/NATIVE \/ AUTO-SCORED/);
});
