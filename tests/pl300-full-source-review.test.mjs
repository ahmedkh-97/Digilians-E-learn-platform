import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const config=JSON.parse(fs.readFileSync(new URL('config.json',base),'utf8'));
const manifest=JSON.parse(fs.readFileSync(new URL('source-manifest.json',base),'utf8'));

function readJson(path){return JSON.parse(fs.readFileSync(new URL(path,new URL('../',import.meta.url)),'utf8'))}

test('PL-300 full source review exposes both PDFs and all 509 actual question blocks',()=>{
  assert.equal(config.sourceReviewStatus,'released');
  assert.deepEqual(config.sources,[],'ranked source mocks remain withheld');
  assert.equal(config.sourceReviewSources?.length,2);
  assert.equal(manifest.audit?.rawQuestionBlocks,509);
  assert.equal(manifest.fullSourceReview?.releasedCount,509);
  const counts={};
  for(const source of config.sourceReviewSources){
    assert.ok(source.reviewBankFile,'source review bank file required');
    const bank=readJson(source.reviewBankFile);
    counts[source.sourceId]=bank.questions.length;
    assert.equal(bank.sourceId,source.sourceId);
    assert.equal(bank.questionCount,bank.questions.length);
  }
  assert.equal(counts['source-01'],369);
  assert.equal(counts['source-02'],140);
});

test('every source-review entry is traceable and reviewable without inventing a scored answer',()=>{
  for(const source of config.sourceReviewSources){
    const bank=readJson(source.reviewBankFile);
    for(const q of bank.questions){
      assert.ok(q.id);
      assert.equal(q.sourceId,source.sourceId);
      assert.ok(String(q.questionNumber||'').length);
      assert.ok(Number(q.pageStart)>0);
      assert.ok(Number(q.pageEnd)>=Number(q.pageStart));
      assert.ok(String(q.questionText||'').trim().length>20 || (q.questionVisuals||[]).length,'question text or source visual required');
      assert.ok(['scored-text','native-structured','source-reveal'].includes(q.reviewMode));
      if(q.reviewMode==='scored-text'){
        assert.ok(Array.isArray(q.options)&&q.options.length>=2);
        assert.ok((Array.isArray(q.correctAnswers)&&q.correctAnswers.length)||q.correctAnswer);
      }else if(q.reviewMode==='native-structured'){
        assert.ok(Array.isArray(q.nativeResponse?.fields)&&q.nativeResponse.fields.length>=1,'native structured item needs answer fields');
        assert.equal(q.rankingImpact,'none');
      }else{
        assert.ok((q.questionVisuals||[]).length || String(q.sourceExplanation||'').trim().length>0,'source-reveal needs visual or explanation evidence');
      }
    }
  }
});
