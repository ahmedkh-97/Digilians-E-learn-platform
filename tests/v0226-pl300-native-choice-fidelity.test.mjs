import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  renderNativePractice,
  nativeInteractionKind,
  nativeMatches
} from '../assets/js/voucher-source-practice-native.js';
import {
  structuredFieldChoices,
  normalizeStructuredValue,
  structuredInteractionKind
} from '../assets/js/exam-structured.js';

const ROOT=new URL('../',import.meta.url);
const readJson=path=>JSON.parse(fs.readFileSync(new URL(path,ROOT),'utf8'));
const src1=readJson('voucher/tracks/data-analysis/microsoft-pl-300/source-01-review-bank.json');
const src2=readJson('voucher/tracks/data-analysis/microsoft-pl-300/source-02-review-bank.json');
const all=[...src1.questions,...src2.questions];
const master=readJson('voucher/tracks/data-analysis/microsoft-pl-300/master-bank.json');
const sourceByRef=new Map(all.map(q=>[`${q.sourceId}:${q.questionNumber}`,q]));
const byId=id=>all.find(q=>q.id===id);

function sourceExpectedAnswers(question){
  return Object.fromEntries((question.nativeResponse?.fields||[]).map(field=>[field.id,String(field.expected?.[0]??'')]));
}

test('Q54 preserves both source dropdown pools and renders no free text',()=>{
  const q=byId('pl300-source-01-q054');
  assert.ok(q);
  assert.deepEqual(structuredFieldChoices(q.nativeResponse.fields[0]),['Dataflows','JSON','OData','Web']);
  assert.deepEqual(structuredFieldChoices(q.nativeResponse.fields[1]),['Anonymous','Basic','Organizational account','Web API']);
  const html=renderNativePractice(q,null,{},{});
  assert.equal((html.match(/<select\b/g)||[]).length,2);
  assert.doesNotMatch(html,/Type your answer/);
});

test('all current PL-300 native source interactions avoid accidental text fallback',()=>{
  const native=all.filter(q=>q.reviewMode==='native-structured'&&(q.nativeResponse?.fields||[]).length);
  const offenders=[];
  for(const q of native){
    const html=renderNativePractice(q,null,{},{});
    if(/placeholder="Type your answer"/.test(html))offenders.push(q.id);
  }
  assert.deepEqual(offenders,[]);
});

test('every explicit source-backed choice field contains its expected scored value',()=>{
  const offenders=[];
  for(const q of all.filter(q=>q.reviewMode==='native-structured')){
    for(const field of q.nativeResponse?.fields||[]){
      const choices=structuredFieldChoices(field);
      if(!choices.length)continue;
      const normalizedChoices=new Set(choices.map(normalizeStructuredValue));
      for(const expected of field.expected||[]){
        if(!normalizedChoices.has(normalizeStructuredValue(expected)))offenders.push(`${q.id}:${field.id}:${expected}`);
      }
    }
  }
  assert.deepEqual(offenders,[]);
});

test('the five source-01 case-study interactions use their original native types',()=>{
  assert.equal(byId('pl300-source-01-q344').sourceType,'hotspot');
  assert.equal(byId('pl300-source-01-q346').sourceType,'hotspot');
  assert.equal(byId('pl300-source-01-q347').sourceType,'drag-drop');
  assert.equal(nativeInteractionKind(byId('pl300-source-01-q347')),'ordered-fields');
  assert.equal(byId('pl300-source-01-q366').sourceType,'hotspot');
  assert.equal(byId('pl300-source-01-q367').sourceType,'hotspot');
});

test('correct source selections still score as correct after native choice conversion',()=>{
  const ids=['pl300-source-01-q054','pl300-source-01-q347','pl300-source-02-q001','pl300-source-02-q396'];
  for(const id of ids){
    const q=byId(id);
    assert.equal(nativeMatches(q,sourceExpectedAnswers(q)),true,id);
  }
});

test('approved master structured interactions never fall back to text and stay source-native',()=>{
  const offenders=[];
  const mismatches=[];
  for(const q of master.questions){
    if(q.nativeResponse?.fields?.length&&structuredInteractionKind(q)==='text-fields')offenders.push(q.id);
    const ref=(q.sourceRefs||[]).find(r=>sourceByRef.has(`${r.sourceId}:${r.questionNumber}`));
    if(!ref||!q.nativeResponse)continue;
    const source=sourceByRef.get(`${ref.sourceId}:${ref.questionNumber}`);
    if(source?.nativeResponse&&JSON.stringify(q.nativeResponse)!==JSON.stringify(source.nativeResponse))mismatches.push(`${q.id} != ${source.id}`);
  }
  assert.deepEqual(offenders,[]);
  assert.deepEqual(mismatches,[]);
});
