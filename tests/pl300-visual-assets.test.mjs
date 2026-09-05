import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const bank=JSON.parse(fs.readFileSync(new URL('voucher/tracks/data-analysis/microsoft-pl-300/draft-master-bank.json',root),'utf8'));

test('PL-300 draft preserves a substantial set of safe source visuals for exhibit-dependent text questions',()=>{
  const visual=bank.questions.filter(q=>q.visualRequired&&q.visualAsset);
  assert.ok(visual.length>=40,`expected >=40 visual-backed text questions, got ${visual.length}`);
  for(const q of visual){
    assert.match(q.visualAsset,/^voucher\/tracks\/data-analysis\/microsoft-pl-300\/assets\//);
    const file=new URL(q.visualAsset,root);
    assert.ok(fs.existsSync(file),`missing ${q.visualAsset}`);
    assert.ok(fs.statSync(file).size>1000,`visual asset too small ${q.visualAsset}`);
    assert.ok(q.visualAlt);
  }
});

test('case-study mega blocks are not auto-cropped into misleading visual snippets',()=>{
  const caseStudies=bank.questions.filter(q=>/^Introductory Info Case Study/i.test(q.question));
  assert.ok(caseStudies.length>0);
  assert.ok(caseStudies.every(q=>!q.visualAsset));
});

test('released PL-300 production bank has manifest-backed visuals and no exhibit-dependent question without an asset',()=>{
  const master=JSON.parse(fs.readFileSync(new URL('voucher/tracks/data-analysis/microsoft-pl-300/master-bank.json',root),'utf8'));
  const manifest=JSON.parse(fs.readFileSync(new URL('voucher/tracks/data-analysis/microsoft-pl-300/visual-assets-manifest.json',root),'utf8'));
  const byId=new Map((manifest.items||[]).map(item=>[item.questionId,item]));
  const visual=master.questions.filter(q=>q.visualRequired);
  assert.equal(master.questions.length,265);
  assert.ok(visual.length>=40);
  for(const q of visual){
    assert.ok(q.visualAsset,`visualRequired question missing visualAsset: ${q.id}`);
    assert.ok(q.visualAlt,`visualRequired question missing visualAlt: ${q.id}`);
    const item=byId.get(q.id);
    assert.ok(item,`production visual missing manifest provenance: ${q.id}`);
    assert.equal(item.visualAsset,q.visualAsset);
    assert.ok(['question-region-before-answer','reconstructed-from-reviewed-source-data'].includes(item.visualProvenance?.cropPolicy),`unsupported visual provenance policy: ${q.id}`);
  }
  const exhibitCue=/(?:exhibit|shown in the following|following (?:image|figure)|answer area|drag[- ]and[- ]drop|hot ?(?:area|spot)|screenshot)/i;
  const suspicious=master.questions.filter(q=>exhibitCue.test(q.question||'')&&!q.visualAsset&&!(q.visualAssets||[]).length);
  assert.deepEqual(suspicious.map(q=>q.id),[]);
});

test('pre-deploy runs the dedicated PL-300 visual audit tool',()=>{
  const tool=new URL('tools/pl300-visual-audit.mjs',root);
  const predeploy=fs.readFileSync(new URL('tools/pre-deploy-check.mjs',root),'utf8');
  assert.ok(fs.existsSync(tool),'missing tools/pl300-visual-audit.mjs');
  assert.match(predeploy,/pl300-visual-audit\.mjs/);
});


test('every released PL-300 visual has a completed manual review disposition',()=>{
  const master=JSON.parse(fs.readFileSync(new URL('voucher/tracks/data-analysis/microsoft-pl-300/master-bank.json',root),'utf8'));
  const reviewPath=new URL('voucher/tracks/data-analysis/microsoft-pl-300/visual-review.json',root);
  assert.ok(fs.existsSync(reviewPath),'missing visual-review.json');
  const review=JSON.parse(fs.readFileSync(reviewPath,'utf8'));
  const byId=new Map((review.items||[]).map(item=>[item.questionId,item]));
  const visual=master.questions.filter(q=>q.visualRequired);
  assert.equal(review.items.length,visual.length,'manual review must cover every released visual');
  for(const q of visual){
    const item=byId.get(q.id);
    assert.ok(item,`missing manual visual review: ${q.id}`);
    assert.equal(item.reviewStatus,'approved',`unresolved visual review: ${q.id} (${item?.reviewStatus||'missing'})`);
    assert.ok(['source-crop','reconstructed'].includes(item.assetType),`unknown visual asset type: ${q.id}`);
  }
});
