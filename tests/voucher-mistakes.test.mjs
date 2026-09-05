import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {recordMistakeOutcome,getMistakes,questionFromMistake,patchMistakeContext} from '../assets/js/mistakes.js';

function memoryStorage(){
  const map=new Map();
  return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>map.delete(k)};
}

const question={
  id:'voucher-q1',
  question:'Which option is correct?',
  options:[{id:'opt-a',text:'Alpha'},{id:'opt-b',text:'Beta'}],
  correctAnswer:'opt-a',
  topic:'Fundamentals',
  trackId:'marketing',
  track:'Marketing',
  deepExplanation:{summary:'Alpha is correct.',options:{'opt-a':'Correct reason','opt-b':'Wrong reason'}}
};
const context={
  sourceType:'voucher',
  course:'Voucher',
  trackId:'marketing',
  track:'Marketing',
  examId:'marketing-cert-a',
  examTitle:'Marketing Certificate A',
  voucherSourceId:'pdf-v1'
};

test('Voucher wrong answers are stored as Voucher mistakes with exam/source provenance',()=>{
  const storage=memoryStorage();
  const item=recordMistakeOutcome({ownerId:'p1',studentName:'Ahmed',question,selected:'opt-b',context,storage});
  assert.ok(item);
  assert.equal(item.context.sourceType,'voucher');
  assert.equal(item.context.trackId,'marketing');
  assert.equal(item.context.examId,'marketing-cert-a');
  assert.equal(item.context.voucherSourceId,'pdf-v1');
  assert.equal(item.question.sourceType,'voucher');
  const retry=questionFromMistake(item);
  assert.equal(retry.mistakeContext.sourceType,'voucher');
  assert.equal(retry.mistakeContext.examId,'marketing-cert-a');
});

test('Voucher unanswered questions never enter My Mistakes',()=>{
  const storage=memoryStorage();
  const item=recordMistakeOutcome({ownerId:'p1',studentName:'Ahmed',question,selected:null,context,storage});
  assert.equal(item,null);
  assert.equal(getMistakes('p1',{includeMastered:true,storage}).length,0);
});

test('My Mistakes UI exposes Voucher source and exam filter',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  assert.match(html,/<option value="voucher">Voucher<\/option>/);
  assert.match(html,/id="mistakesExamFilter"/);
  assert.match(app,/filters\.exam/);
  assert.match(app,/sourceType==="voucher"/);
});


test('existing Voucher mistakes can be safely backfilled with canonical PL-300 Domain and Section context',()=>{
  const storage=memoryStorage();
  const item=recordMistakeOutcome({ownerId:'p1',studentName:'Ahmed',question,selected:'opt-b',context,storage});
  assert.equal(item.context.domainId,undefined);
  const patched=patchMistakeContext('p1',item.key,{
    domainId:'prepare-data',domainTitle:'Prepare the Data',
    sectionId:'pl300-s01-data-sources',sectionTitle:'Data Sources & Connectivity'
  },{storage});
  assert.equal(patched.context.domainId,'prepare-data');
  assert.equal(patched.context.domainTitle,'Prepare the Data');
  assert.equal(patched.context.sectionId,'pl300-s01-data-sources');
  assert.equal(patched.context.sectionTitle,'Data Sources & Connectivity');
  assert.equal(questionFromMistake(patched).mistakeContext.sectionTitle,'Data Sources & Connectivity');
});

test('My Mistakes UI exposes Voucher Domain and Section filters and filtering hooks',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  assert.match(html,/id="mistakesDomainFilter"/);
  assert.match(html,/id="mistakesSectionFilter"/);
  assert.match(app,/filters\.domain/);
  assert.match(app,/filters\.section/);
  assert.match(app,/domainTitle/);
  assert.match(app,/sectionTitle/);
});
