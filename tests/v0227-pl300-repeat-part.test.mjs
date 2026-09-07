import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createPl300LearningController} from '../assets/js/pl300-learning-controller.js';
import * as fullRank from '../assets/js/pl300-full-ranked-learning.js';
import {saveVoucherSourcePracticeResult,getVoucherSourcePracticeState} from '../assets/js/voucher-storage.js';

function memoryStorage(){
  const values=new Map();
  return {getItem:key=>values.has(key)?values.get(key):null,setItem:(key,value)=>values.set(key,String(value))};
}

test('mastered End-of-Part Review always offers Review & solve again',()=>{
  const html=fullRank.buildPl300EndOfPartReviewMarkup({part:{id:'part-1',domainTitle:'Prepare the Data',sectionTitle:'Data Sources & Connectivity',partNumber:1},review:{studied:14,total:14,firstPassCorrect:8,recovered:6,needReview:0,weakQuestionIds:[]},nextPart:{id:'part-2',label:'Part 2'}});
  assert.match(html,/data-pl300-repeat-part[^>]*>Review & solve again/i);
  assert.match(html,/data-pl300-continue-next-part/i);
});

test('repeatPart reopens every question fresh without deleting saved history',()=>{
  const records={q1:{mode:'auto',selected:['A'],correct:true,firstPassCorrect:true,everCorrect:true,attemptCount:1},q2:{mode:'auto',selected:['B'],correct:true,firstPassCorrect:false,everCorrect:true,attemptCount:2},q3:{mode:'checkpoint',reviewStatus:'reviewed'}};
  const state={voucherSourceReviewBank:{questions:[{id:'q1'},{id:'q2'},{id:'q3'}]},voucherSourceReviewPartId:'part-1',voucherSourceReviewParts:[{id:'part-1',questionIds:['q1','q2','q3']}],voucherSourceReviewWeakIds:null,voucherSourceReviewFilter:'all',voucherSourceReviewIndex:2,voucherSourcePartReviewMode:'complete',voucherSourcePracticeRetrying:new Set(),voucherSourcePracticeSelections:{q1:['A'],q2:['B']},voucherSourcePracticeNativeInputs:{q2:{answer:'old'}},voucherFullRankedIndex:{records:[]},voucherFullRankedIndexByQuestion:new Map(),voucherSourceLearningState:{version:1,parts:{}}};
  let renders=0,scrolls=0;
  const controller=createPl300LearningController({state,getRecords:()=>records,saveLearningState:()=>{},learningLoop:{},fullRankedLearning:{filterPl300QuestionsByPart:({questions})=>questions},renderReview:()=>{renders+=1;},scrollTop:()=>{scrolls+=1;},loadJson:async()=>({}),renderRichText:String});
  controller.repeatPart();
  assert.deepEqual([...state.voucherSourcePracticeRetrying].sort(),['q1','q2','q3']);
  assert.deepEqual(state.voucherSourcePracticeSelections,{});
  assert.deepEqual(state.voucherSourcePracticeNativeInputs,{});
  assert.equal(state.voucherSourceReviewIndex,0);
  assert.equal(state.voucherSourcePartReviewMode,null);
  assert.deepEqual([...state.voucherSourceReviewWeakIds].sort(),['q1','q2','q3']);
  assert.equal(renders,1);assert.equal(scrolls,1);
  assert.equal(records.q1.firstPassCorrect,true);assert.equal(records.q2.firstPassCorrect,false);assert.equal(records.q2.attemptCount,2);
});

test('repeat attempts preserve immutable first pass history in storage',()=>{
  const storage=memoryStorage();
  saveVoucherSourcePracticeResult('owner','q1',{examId:'microsoft-pl-300',sourceId:'s1',mode:'auto',selected:['B'],correct:false},{storage});
  saveVoucherSourcePracticeResult('owner','q1',{examId:'microsoft-pl-300',sourceId:'s1',mode:'auto',selected:['A'],correct:true},{storage});
  const record=getVoucherSourcePracticeState('owner','microsoft-pl-300',{storage}).records.q1;
  assert.equal(record.firstPassCorrect,false);assert.equal(record.everCorrect,true);assert.equal(record.attemptCount,2);
});

test('app permits a saved checkpoint to be completed again while repeat mode is active',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  const start=app.indexOf('$("sourcePracticeCheckpointBtn")?.addEventListener("click",()=>{');
  assert.ok(start>=0,'checkpoint click handler must exist');
  const snippet=app.slice(start,start+900);
  assert.match(snippet,/practiceRecord\s*&&\s*!retrying/);
  assert.match(snippet,/voucherSourcePracticeRetrying\?\.delete/);
});
