import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,root),'utf8'));
const bySourceRef=(bank,sourceId,number)=>bank.questions.find(q=>(q.sourceRefs||[]).some(r=>r.sourceId===sourceId&&String(r.questionNumber)===String(number)));

test('approved scatter conflict is promoted as the 201st ranked question with preserved source provenance',()=>{
  const corrections=read('corrections.json');
  const c=corrections.corrections.find(x=>x.id==='C-017');
  assert.ok(c,'missing C-017');
  assert.equal(c.status,'APPROVED');
  assert.deepEqual(c.approvedAnswerTexts,['Enable high-density sampling on the scatter plot.']);
  assert.deepEqual(c.sourceAnswerIds,['B']);
  assert.deepEqual(c.sourceAnswerTexts,['Add a trend line to the scatter plot']);

  const draft=read('draft-master-bank.json');
  const master=read('master-bank.json');
  const q=bySourceRef(draft,'source-01','231');
  assert.ok(q,'Source 01 Q231 missing from canonical draft');
  assert.equal(q.productionReady,true);
  assert.equal(q.status,'approved');
  assert.equal(q.topicId,'visualize-analyze');
  assert.equal(q.options.find(o=>o.id===q.correctAnswer)?.text,'Enable high-density sampling on the scatter plot.');
  assert.equal(q.answerReview?.correctionId,'C-017');
  assert.ok((q.sourceRefs||[]).some(r=>r.sourceId==='source-02'&&String(r.questionNumber)==='19'));
  assert.ok(master.questions.some(x=>x.id===q.id),'promoted scatter question missing from ranked master bank');
  assert.equal(master.questions.length,265);
});

test('the malformed tooltip variants remain available only as fail-closed source reveal practice',()=>{
  for(const [file,number] of [['source-01-review-bank.json','249'],['source-02-review-bank.json','242']]){
    const bank=read(file);
    const q=bank.questions.find(x=>String(x.questionNumber)===number);
    assert.ok(q,`${file} Q${number} missing`);
    assert.equal(q.reviewMode,'source-reveal');
    assert.equal(q.productionReady,false);
    assert.equal(q.rankingImpact,'none');
    assert.equal(q.exclusionReason,'malformed-conflicting-source-variants');
  }
  const master=read('master-bank.json');
  assert.equal(bySourceRef(master,'source-01','249'),undefined);
  assert.equal(bySourceRef(master,'source-02','242'),undefined);
});

test('release metadata reflects 265 ranked questions while all 509 source blocks remain practiceable',()=>{
  const config=read('config.json');
  const manifest=read('source-manifest.json');
  const audit=read('source-dedup-audit.json');
  assert.equal(config.masterBankQuestionCount,265);
  assert.equal(config.fullBankExam.questionCount,265);
  assert.equal(config.fullBankExam.durationMinutes,530);
  assert.match(config.subtitle,/265 ranked/);
  assert.equal(config.releaseNotes.autoScoredSourceBlocks,321);
  assert.equal(config.releaseNotes.nativeScoredSourceBlocks,78);
  assert.equal(config.releaseNotes.fullSourceRankedLearning,true);
  assert.equal(config.releaseNotes.rankedCompletionQuestionBlocks,509);
  assert.equal(config.releaseNotes.validatedAccuracyConcepts,265);
  assert.equal(config.releaseNotes.checkpointPolicy,'completion-only-no-self-awarded-accuracy');
  assert.equal(manifest.fullSourceReview.selfGradedSourceBlocks,0);
  assert.equal(manifest.audit.draftCanonicalTextQuestions,271);
  assert.equal(manifest.audit.productionReadyTextQuestions,201);
  assert.equal(manifest.audit.nativeRankedQuestions,64);
  assert.equal(manifest.audit.productionReadyQuestions,265);
  assert.equal(manifest.audit.remainingDraftQuestions,70);
  assert.equal(audit.rankPromotion.currentRankedQuestions,265);
  assert.equal(audit.rankPromotion.blockedNewTextConflictClusters,0);
  assert.equal(audit.rankPromotion.safeNewTextCandidates,0);
  assert.match(audit.rankPromotion.note,/No unlinked rankable text blocks remain/);
});
