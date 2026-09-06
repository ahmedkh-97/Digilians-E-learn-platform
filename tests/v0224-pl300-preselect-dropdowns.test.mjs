import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  structuredInteractionKind,
  structuredFieldChoices
} from '../assets/js/exam-structured.js';
import {renderNativePractice} from '../assets/js/voucher-source-practice-native.js';
import {
  buildPl300MiniParts,
  buildPl300PartViewState,
  buildPl300FullRankedReviewMarkup
} from '../assets/js/pl300-full-ranked-learning.js';

const ROOT=new URL('../',import.meta.url);
const readJson=path=>JSON.parse(fs.readFileSync(new URL(path,ROOT),'utf8'));
const readText=path=>fs.readFileSync(new URL(path,ROOT),'utf8');
const src1=readJson('voucher/tracks/data-analysis/microsoft-pl-300/source-01-review-bank.json');
const src2=readJson('voucher/tracks/data-analysis/microsoft-pl-300/source-02-review-bank.json');
const index=readJson('voucher/tracks/data-analysis/microsoft-pl-300/full-ranked-index.json');
const architecture=readJson('voucher/tracks/data-analysis/microsoft-pl-300/content-architecture.json');
const all=[...src1.questions,...src2.questions];

test('PL-300 Q1 uses source-backed storage-mode dropdowns instead of free text',()=>{
  const q=src1.questions.find(item=>item.id==='pl300-source-01-q001');
  assert.ok(q,'expected source-01 question 1');
  assert.equal(q.reviewMode,'native-structured');
  assert.equal(structuredInteractionKind({...q,responseType:'structured'}),'choice-fields');
  for(const field of q.nativeResponse.fields){
    assert.deepEqual(structuredFieldChoices(field),['Import','DirectQuery','Dual']);
  }
  const html=renderNativePractice(q,null,{},{});
  assert.equal((html.match(/<select\b/g)||[]).length,4);
  assert.match(html,/>Import<\/option>/);
  assert.match(html,/>DirectQuery<\/option>/);
  assert.match(html,/>Dual<\/option>/);
  assert.doesNotMatch(html,/placeholder="Type your answer"/);
});

test('all PL-300 mini parts remain complete, bounded and cover all 509 source occurrences',()=>{
  const parts=buildPl300MiniParts({index,architecture,targetSize:18,maxSize:20});
  assert.ok(parts.length>1);
  assert.ok(parts.every(part=>part.count>=1&&part.count<=20));
  const ids=parts.flatMap(part=>part.questionIds);
  assert.equal(ids.length,509);
  assert.equal(new Set(ids).size,509);
});

test('all-parts state renders a QBank-style pre-entry catalog instead of a question screen',()=>{
  const parts=buildPl300MiniParts({index,architecture,targetSize:18,maxSize:20});
  const view=buildPl300PartViewState({parts,activePartId:'all',records:{},totalAll:509,completedAll:0,activeFilter:'all'});
  assert.equal(view.showPartCatalog,true);
  assert.match(view.partCatalogHtml,/data-pl300-part-select=/);
  assert.match(view.partCatalogHtml,/official-section-card/);
  assert.match(view.partCatalogHtml,/Start Part/);

  const html=buildPl300FullRankedReviewMarkup({
    metrics:{totalOccurrences:509,completedOccurrences:0,validatedAccuracy:0,masteredClusters:0,validatedConceptCount:265,firstPassPercentage:0},
    totalAll:509,source01Count:369,source02Count:140,objectiveCount:317,checkpointCount:192,
    partOptionsHtml:view.partOptionsHtml,partCatalogHtml:view.partCatalogHtml,showPartCatalog:view.showPartCatalog,
    activePartLabel:view.activePartLabel,partCompleted:view.partCompleted,partTotal:view.partTotal,
    questionsLength:509,currentIndex:0,questionHtml:'SHOULD_NOT_RENDER'
  });
  assert.match(html,/Choose a study part/);
  assert.match(html,/data-pl300-part-select=/);
  assert.doesNotMatch(html,/SHOULD_NOT_RENDER/);
  assert.doesNotMatch(html,/source-review-question-card/);
});

test('active mini part shows context and back-to-parts action without the old in-question picker',()=>{
  const parts=buildPl300MiniParts({index,architecture,targetSize:18,maxSize:20});
  const active=parts[0];
  const view=buildPl300PartViewState({parts,activePartId:active.id,records:{},totalAll:509,completedAll:0,activeFilter:'all'});
  assert.equal(view.showPartCatalog,false);
  const html=buildPl300FullRankedReviewMarkup({
    metrics:{totalOccurrences:509,completedOccurrences:0,validatedAccuracy:0,masteredClusters:0,validatedConceptCount:265,firstPassPercentage:0},
    totalAll:509,source01Count:369,source02Count:140,objectiveCount:317,checkpointCount:192,
    partOptionsHtml:view.partOptionsHtml,partCatalogHtml:view.partCatalogHtml,showPartCatalog:view.showPartCatalog,
    activePartLabel:view.activePartLabel,partCompleted:view.partCompleted,partTotal:view.partTotal,
    questionsLength:active.count,currentIndex:0,filterLabel:active.label,questionHtml:'QUESTION_BODY',
    typeLabel:'TEXT / RANKED OBJECTIVE',sourceLabel:'Source 01',questionNumber:'2',pageLabel:'Page 5',recordStatus:'NOT STUDIED'
  });
  assert.match(html,/data-pl300-parts-back/);
  assert.match(html,new RegExp(active.domainTitle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(html,/QUESTION_BODY/);
  assert.doesNotMatch(html,/STUDY IN SMALL PARTS/);
});

test('app wires pre-entry part cards and back action to the existing ranked source-review state',()=>{
  const app=readText('assets/js/app.js');
  assert.match(app,/data-pl300-part-select/);
  assert.match(app,/data-pl300-parts-back/);
  assert.match(app,/selectVoucherSourceReviewPart/);
});

test('V0.22.4 keeps native controls fail-closed: only explicit source-backed choices become dropdowns',()=>{
  const native=all.filter(q=>q.reviewMode==='native-structured');
  for(const q of native){
    const html=renderNativePractice(q,null,{},{});
    const fields=q.nativeResponse?.fields||[];
    const explicitChoiceFields=fields.filter(field=>structuredFieldChoices(field).length>0).length;
    if(structuredInteractionKind({...q,responseType:'structured'})==='choice-fields'){
      assert.equal((html.match(/<select\b/g)||[]).length,explicitChoiceFields,q.id);
    }
  }
});
