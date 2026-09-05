import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,base),'utf8'));

test('PL-300 full-source dedup audit covers all 509 source blocks without deleting provenance',()=>{
  const audit=read('source-dedup-audit.json');
  assert.equal(audit.examId,'microsoft-pl-300');
  assert.equal(audit.rawSourceBlocks,509);
  assert.equal(audit.method,'normalized-question-text-v1');
  assert.ok(audit.normalizedUniqueQuestions<509);
  assert.ok(audit.duplicateClusters.length>0);
  const memberCount=audit.uniqueClusters.reduce((sum,cluster)=>sum+cluster.members.length,0);
  assert.equal(memberCount,509);
});

test('owner-approved conflict resolution leaves no unlinked rankable text blocks',()=>{
  const audit=read('source-dedup-audit.json');
  assert.equal(audit.rankPromotion.currentRankedQuestions,265);
  assert.equal(audit.rankPromotion.rankedTextQuestions,201);
  assert.equal(audit.rankPromotion.nativeRankedQuestions,64);
  assert.equal(audit.rankPromotion.unlinkedTextBlocks,0);
  assert.equal(audit.rankPromotion.safeNewTextCandidates,0);
  assert.equal(audit.rankPromotion.blockedNewTextConflictClusters,0);
  assert.match(audit.rankPromotion.note,/No unlinked rankable text blocks remain/);
});
