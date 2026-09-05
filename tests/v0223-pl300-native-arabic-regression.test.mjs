import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  structuredInteractionKind,
  structuredBinaryChoices,
  structuredChoicePool
} from '../assets/js/exam-structured.js';
import {
  nativeInteractionKind,
  renderNativePractice
} from '../assets/js/voucher-source-practice-native.js';
import {
  enrichPl300SourceQuestionsWithArabic,
  resolvePl300ArabicExplanation
} from '../assets/js/pl300-full-ranked-learning.js';

const ROOT=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const read=name=>JSON.parse(fs.readFileSync(new URL(name,ROOT),'utf8'));
const src1=read('source-01-review-bank.json');
const src2=read('source-02-review-bank.json');
const index=read('full-ranked-index.json');
const master=read('master-bank.json');
const all=[...src1.questions,...src2.questions];
const hasArabic=value=>/[\u0600-\u06ff]/.test(String(value||''));

function countsBy(key){
  return all.reduce((out,q)=>{
    const value=String(q?.[key]||'missing');
    out[value]=(out[value]||0)+1;
    return out;
  },{});
}

test('V0.22.3 exhaustive source audit preserves every PL-300 occurrence exactly once',()=>{
  assert.equal(src1.questionCount,369);
  assert.equal(src2.questionCount,140);
  assert.equal(all.length,509);
  assert.equal(new Set(all.map(q=>q.id)).size,509);
  assert.equal(index.records.length,509);
  assert.deepEqual(countsBy('reviewMode'),{
    'native-structured':78,
    'scored-text':321,
    'source-reveal':110
  });
  const visualOnly=all.filter(q=>!String(q.questionText||'').trim());
  assert.deepEqual(visualOnly.map(q=>q.id),['pl300-source-01-q164']);
  assert.ok(visualOnly.every(q=>Array.isArray(q.questionVisuals)&&q.questionVisuals.length>0));
  assert.ok(all.every(q=>String(q.questionText||'').trim()||(Array.isArray(q.questionVisuals)&&q.questionVisuals.length>0)),'every occurrence needs question text or preserved question visual evidence');
});

test('every scored item has a deterministic answer contract and every source reveal keeps evidence',()=>{
  const scored=all.filter(q=>q.reviewMode==='scored-text');
  const badScored=scored.filter(q=>
    !Array.isArray(q.options)||!q.options.length||
    !(String(q.correctAnswer||'').trim()||(Array.isArray(q.correctAnswers)&&q.correctAnswers.length))
  );
  assert.deepEqual(badScored.map(q=>q.id),[]);

  const revealed=all.filter(q=>q.reviewMode==='source-reveal');
  const badReveal=revealed.filter(q=>
    !String(q.sourceExplanation||'').trim()&&!(Array.isArray(q.answerVisuals)&&q.answerVisuals.length)
  );
  assert.deepEqual(badReveal.map(q=>q.id),[]);
});

test('all 78 structured items resolve to an explicit supported interaction kind',()=>{
  const native=all.filter(q=>q.reviewMode==='native-structured');
  assert.equal(native.length,78);
  const supported=new Set(['yes-no','choice-fields','ordered-fields','text-fields']);
  const bad=[];
  for(const q of native){
    const kind=nativeInteractionKind(q);
    if(!supported.has(kind))bad.push(`${q.id}:${kind}`);
    assert.equal(kind,structuredInteractionKind({...q,responseType:'structured'}));
    assert.ok((q.nativeResponse?.fields||[]).every(field=>Array.isArray(field.expected)&&field.expected.some(v=>String(v).trim())),q.id);
  }
  assert.deepEqual(bad,[]);
});

test('Yes/No answer areas get explicit binary controls without invented non-binary choices',()=>{
  const q={
    responseType:'structured',
    questionText:'For each statement, select Yes if the statement is true. Otherwise, select No.',
    nativeResponse:{interaction:'fields',fields:[
      {id:'a',label:'Statement 1',expected:['Yes']},
      {id:'b',label:'Statement 2',expected:['No']}
    ]}
  };
  assert.equal(structuredInteractionKind(q),'yes-no');
  assert.deepEqual(structuredBinaryChoices(q,q.nativeResponse.fields[0]),['Yes','No']);
});

test('ordered interactions use only source-backed choice pools',()=>{
  const q6=src1.questions.find(q=>q.id==='pl300-source-01-q006');
  const pool=structuredChoicePool({...q6,responseType:'structured'});
  assert.deepEqual(pool,['Full outer','Inner','Left anti','Left outer','Right anti','Right outer']);
  assert.equal(nativeInteractionKind(q6),'ordered-fields');
  const html=renderNativePractice(q6,null,{},{});
  assert.match(html,/data-native-interaction="ordered-fields"/);
  assert.match(html,/data-source-native-choice=/);
  assert.match(html,/draggable="true"/);
});

test('Arabic explanation resolves for all 509 source occurrences after ranked-concept enrichment',()=>{
  const enriched=enrichPl300SourceQuestionsWithArabic({questions:all,index,masterQuestions:master.questions});
  assert.equal(enriched.length,509);
  const missing=enriched.filter(q=>!hasArabic(resolvePl300ArabicExplanation({question:q}))).map(q=>q.id);
  assert.deepEqual(missing,[]);
});

test('source native renderer exposes dedicated Yes/No controls for audited binary source items',()=>{
  const sourceBinary=all.find(q=>q.reviewMode==='native-structured'&&nativeInteractionKind(q)==='yes-no');
  assert.ok(sourceBinary,'expected at least one preserved Yes/No source answer area');
  const html=renderNativePractice(sourceBinary,null,{},{});
  assert.match(html,/data-native-interaction="yes-no"/);
  assert.match(html,/data-source-native-binary=/);
});