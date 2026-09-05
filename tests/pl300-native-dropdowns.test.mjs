import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as native from '../assets/js/voucher-source-practice-native.js';
import * as structured from '../assets/js/exam-structured.js';

const src1=JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/source-01-review-bank.json',import.meta.url),'utf8'));
const master=JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/master-bank.json',import.meta.url),'utf8'));

const q5=src1.questions.find(q=>String(q.questionNumber)==='5');
const q6=src1.questions.find(q=>String(q.questionNumber)==='6');

test('source-backed native fields can expose explicit choice lists',()=>{
  assert.equal(typeof structured.structuredFieldChoices,'function');
  assert.deepEqual(q5.nativeResponse.fields[0].choices,[
    'Append Queries','Append Queries as New','Merge Queries','Merge Queries as New'
  ]);
  assert.deepEqual(q5.nativeResponse.fields[1].choices,[
    'Delete the queries','Disable including the query in report refresh','Disable loading the query to the data model','Duplicate the queries'
  ]);
  assert.deepEqual(q6.nativeResponse.fields[0].choices,[
    'Full outer','Inner','Left anti','Left outer','Right anti','Right outer'
  ]);
});

test('Full Ranked native renderer uses select dropdowns when source choices exist',()=>{
  const html=native.renderNativePractice(q5,null,{},{});
  assert.match(html,/<select[^>]+data-source-native-field="box-1"/i);
  assert.match(html,/>Append Queries as New<\/option>/i);
  assert.doesNotMatch(html,/data-source-native-field="box-1"[^>]*type="text"/i);
});

test('master ranked bank carries the same source-backed choices for structured exam mode',()=>{
  const mq5=master.questions.find(q=>q.id==='pl300-native-s01-q005');
  assert.deepEqual(mq5.nativeResponse.fields[0].choices,q5.nativeResponse.fields[0].choices);
  assert.deepEqual(mq5.nativeResponse.fields[1].choices,q5.nativeResponse.fields[1].choices);
});

const appSource=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
test('ranked exam structured renderer switches source-backed choice fields to select controls',()=>{
  assert.match(appSource,/structuredFieldChoices/);
  assert.match(appSource,/document\.createElement\(['"]select['"]\)/);
  assert.match(appSource,/data-ranked-structured-field/);
});
