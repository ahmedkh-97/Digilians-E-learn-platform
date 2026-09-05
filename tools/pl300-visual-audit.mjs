import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rel=p=>path.join(ROOT,p);
const readJson=p=>JSON.parse(fs.readFileSync(rel(p),'utf8'));
const failures=[];
const fail=message=>failures.push(message);

const config=readJson('voucher/tracks/data-analysis/microsoft-pl-300/config.json');
const master=readJson('voucher/tracks/data-analysis/microsoft-pl-300/master-bank.json');
const draft=readJson('voucher/tracks/data-analysis/microsoft-pl-300/draft-master-bank.json');
const manifest=readJson('voucher/tracks/data-analysis/microsoft-pl-300/visual-assets-manifest.json');
const review=readJson('voucher/tracks/data-analysis/microsoft-pl-300/visual-review.json');
const production=Array.isArray(master.questions)?master.questions:[];
const draftQuestions=Array.isArray(draft.questions)?draft.questions:[];
const manifestItems=Array.isArray(manifest.items)?manifest.items:[];
const manifestById=new Map(manifestItems.map(item=>[String(item.questionId||''),item]));
const reviewItems=Array.isArray(review.items)?review.items:[];
const reviewById=new Map(reviewItems.map(item=>[String(item.questionId||''),item]));
const productionVisual=production.filter(q=>q?.visualRequired===true);
const nativeStructuredVisual=production.filter(q=>String(q?.responseType||'').toLowerCase()==='structured'&&Boolean(q?.nativeResponse)&&Boolean(q?.visualAsset));
const draftVisual=draftQuestions.filter(q=>q?.visualRequired===true);

const expectedReleased=Number(config.masterBankQuestionCount)||0;
if(production.length!==expectedReleased)fail(`expected ${expectedReleased} released questions, found ${production.length}`);
if(productionVisual.length<40)fail(`expected at least 40 production visual questions, found ${productionVisual.length}`);

for(const q of production){
  const id=String(q?.id||'unknown');
  const nativeStructured=String(q?.responseType||'').toLowerCase()==='structured'&&Boolean(q?.nativeResponse);
  const nativeSourceVisual=nativeStructured&&Boolean(q?.visualAsset);
  if(q?.visualAsset&&!q?.visualRequired&&!nativeSourceVisual)fail(`${id}: visualAsset exists without visualRequired=true`);
  if(nativeSourceVisual){
    const assets=[...new Set([...(Array.isArray(q.visualAssets)?q.visualAssets:[]),q.visualAsset].map(String).filter(Boolean))];
    if(!q.visualAlt)fail(`${id}: native structured visual missing visualAlt`);
    if(q?.nativeRankedReview?.reviewStatus!=='approved')fail(`${id}: native structured visual is not backed by an approved native ranked review`);
    if(!Array.isArray(q?.sourceRefs)||!q.sourceRefs.some(ref=>Number(ref?.pageStart)>0))fail(`${id}: native structured visual missing source page provenance`);
    for(const asset of assets){
      if(!/^voucher\/tracks\/data-analysis\/microsoft-pl-300\/assets\/source-review\//.test(asset))fail(`${id}: native structured visual must use source-review provenance: ${asset}`);
      const file=rel(asset);
      if(!fs.existsSync(file))fail(`${id}: missing native structured visual file ${asset}`);
      else if(fs.statSync(file).size<=1000)fail(`${id}: native structured visual file too small ${asset}`);
    }
    continue;
  }
  if(!q?.visualRequired)continue;
  if(!q.visualAsset){fail(`${id}: visualRequired missing visualAsset`);continue;}
  if(!q.visualAlt)fail(`${id}: visualRequired missing visualAlt`);
  if(!/^voucher\/tracks\/data-analysis\/microsoft-pl-300\/assets\//.test(String(q.visualAsset)))fail(`${id}: invalid visualAsset path ${q.visualAsset}`);
  const file=rel(q.visualAsset);
  if(!fs.existsSync(file))fail(`${id}: missing visual file ${q.visualAsset}`);
  else if(fs.statSync(file).size<=1000)fail(`${id}: visual file too small ${q.visualAsset}`);
  const item=manifestById.get(id);
  if(!item)fail(`${id}: missing visual manifest provenance`);
  else{
    if(String(item.visualAsset||'')!==String(q.visualAsset))fail(`${id}: manifest visual path mismatch`);
    if(!['question-region-before-answer','reconstructed-from-reviewed-source-data'].includes(item?.visualProvenance?.cropPolicy))fail(`${id}: unsafe/unknown crop policy`);
    if(!Array.isArray(item?.visualProvenance?.sourcePages)||!item.visualProvenance.sourcePages.length)fail(`${id}: missing source page provenance`);
  }
  const disposition=reviewById.get(id);
  if(!disposition)fail(`${id}: missing manual visual review disposition`);
  else{
    if(disposition.reviewStatus!=='approved')fail(`${id}: unresolved manual visual review (${disposition.reviewStatus||'missing'})`);
    if(!['source-crop','reconstructed'].includes(disposition.assetType))fail(`${id}: invalid manual visual asset type`);
  }
}

const exhibitCue=/(?:exhibit|shown in the following|following (?:image|figure)|answer area|drag[- ]and[- ]drop|hot ?(?:area|spot)|screenshot)/i;
for(const q of production){
  if(exhibitCue.test(String(q?.question||''))&&!q?.visualAsset)fail(`${q.id}: exhibit-dependent wording without visualAsset`);
}

const uniquePaths=new Set(productionVisual.map(q=>String(q.visualAsset||'')));
if(uniquePaths.size!==productionVisual.length)fail('duplicate visualAsset path assigned to multiple released questions');
if(reviewItems.length!==productionVisual.length)fail(`manual review count ${reviewItems.length} does not match production visual count ${productionVisual.length}`);

if(failures.length){
  console.error('PL-300 VISUAL AUDIT FAILED');
  failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}

console.log('PL-300 VISUAL AUDIT PASS');
console.log(`Released questions: ${production.length}`);
console.log(`Released visual-backed questions: ${productionVisual.length}`);
console.log(`Native structured visual-backed questions: ${nativeStructuredVisual.length}`);
console.log(`Draft visual-backed questions: ${draftVisual.length}`);
console.log(`Manifest items: ${manifestItems.length}`);
console.log(`Manual review items: ${reviewItems.length}`);
console.log('Exhibit-dependent released questions missing visuals: 0');
