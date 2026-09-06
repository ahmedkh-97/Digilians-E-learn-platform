from pathlib import Path
import json

ROOT=Path('.')
def read(path): return (ROOT/path).read_text()
def write(path,text):
    p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text)
def replace(path,old,new,count=None):
    s=read(path)
    if old not in s: raise SystemExit(f'missing replacement target in {path}: {old[:100]!r}')
    s=s.replace(old,new) if count is None else s.replace(old,new,count)
    write(path,s)

for name in ['VERSION.txt','index.html','assets/js/app.js','assets/js/analytics.js','assets/js/storage.js','assets/js/update-manager.js','assets/js/voucher-source-practice-native.js']:
    s=read(name).replace('0.22.6','0.22.7').replace('V0.22.6','V0.22.7')
    write(name,s)
replace('assets/js/update-manager.js','PL-300 Learning UX & Smart Review','PL-300 Repeat Part Review Hotfix')
replace('assets/css/pl300.css','V0.22.6 structured source reference + Answer Area','V0.22.7 repeat-part review + structured Answer Area')

replace('assets/js/pl300-full-ranked-learning.js',
'''      :'<button type="button" class="primary-btn large-btn" data-pl300-continue-next-part="all">Back to all parts →</button>';\n  return `<section class="pl300-end-part-review" data-pl300-end-part-review><span class="eyebrow">END-OF-PART REVIEW</span><h2>End-of-Part Review</h2><p>${htmlEscape(title)}</p><div class="pl300-end-part-metrics"><div>Studied <strong>${studied} / ${total}</strong></div><div>First-pass correct <strong>${firstPass}</strong></div><div>Recovered <strong>${recovered}</strong></div><div>Need review <strong>${needReview}</strong></div></div>${needReview?`<p class="pl300-end-part-note">${weakIds.length} question${weakIds.length===1?'':'s'} still need recovery. Review them before moving on.</p>`:'<p class="pl300-end-part-note">Part mastered. Your first-pass history remains unchanged.</p>'}<div class="pl300-end-part-actions">${action}<button type="button" class="secondary-btn" data-pl300-parts-back>All parts</button></div></section>`;''',
'''      :'<button type="button" class="primary-btn large-btn" data-pl300-continue-next-part="all">Back to all parts →</button>';\n  const repeat='<button type="button" class="secondary-btn" data-pl300-repeat-part>Review & solve again ↻</button>';\n  return `<section class="pl300-end-part-review" data-pl300-end-part-review><span class="eyebrow">END-OF-PART REVIEW</span><h2>End-of-Part Review</h2><p>${htmlEscape(title)}</p><div class="pl300-end-part-metrics"><div>Studied <strong>${studied} / ${total}</strong></div><div>First-pass correct <strong>${firstPass}</strong></div><div>Recovered <strong>${recovered}</strong></div><div>Need review <strong>${needReview}</strong></div></div>${needReview?`<p class="pl300-end-part-note">${weakIds.length} question${weakIds.length===1?'':'s'} still need recovery. Review them before moving on.</p>`:'<p class="pl300-end-part-note">Part mastered. Your first-pass history remains unchanged.</p>'}<div class="pl300-end-part-actions">${action}${repeat}<button type="button" class="secondary-btn" data-pl300-parts-back>All parts</button></div></section>`;''')

replace('assets/js/pl300-learning-controller.js','}={}){\n  function filteredQuestions(){','}={}){\n  let repeatPartId=null;\n  function filteredQuestions(){',1)
replace('assets/js/pl300-learning-controller.js','if(correct===true&&state.voucherSourceReviewWeakIds instanceof Set){','if(correct===true&&state.voucherSourceReviewWeakIds instanceof Set&&!repeatPartId){',1)
replace('assets/js/pl300-learning-controller.js',
'''  function selectPart(partId='all'){\n    resetSolveTimer();\n    const requested=String(partId||'all');''',
'''  function clearRepeatPart(){\n    const repeatId=String(repeatPartId||'');\n    if(!repeatId)return;\n    const repeatPart=state.voucherSourceReviewParts.find(part=>String(part?.id||'')===repeatId);\n    for(const id of repeatPart?.questionIds||[])state.voucherSourcePracticeRetrying?.delete?.(String(id));\n    repeatPartId=null;\n  }\n\n  function repeatPart(){\n    const part=activePart();\n    if(!part)return;\n    clearRepeatPart();\n    repeatPartId=String(part.id);\n    state.voucherSourceReviewWeakIds=new Set((part.questionIds||[]).map(String));\n    state.voucherSourcePartReviewMode=null;\n    state.voucherSourceReviewFilter='all';\n    state.voucherSourceReviewIndex=0;\n    state.voucherSourcePracticeRetrying??=new Set();\n    state.voucherSourcePracticeSelections??={};\n    state.voucherSourcePracticeNativeInputs??={};\n    state.voucherSourceRevealOpened??=new Set();\n    for(const id of part.questionIds||[]){\n      const key=String(id);\n      state.voucherSourcePracticeRetrying.add(key);\n      delete state.voucherSourcePracticeSelections[key];\n      delete state.voucherSourcePracticeNativeInputs[key];\n      state.voucherSourceRevealOpened.delete(key);\n    }\n    resetSolveTimer();\n    renderReview();\n    scrollTop();\n  }\n\n  function selectPart(partId='all'){\n    resetSolveTimer();\n    clearRepeatPart();\n    const requested=String(partId||'all');''',1)
replace('assets/js/pl300-learning-controller.js',
'''    body.querySelector('[data-pl300-continue-next-part]')?.addEventListener('click',event=>selectPart(String(event.currentTarget?.dataset?.pl300ContinueNextPart||'all')));\n    body.querySelector('[data-pl300-parts-back]')?.addEventListener('click',()=>selectPart('all'));''',
'''    body.querySelector('[data-pl300-continue-next-part]')?.addEventListener('click',event=>selectPart(String(event.currentTarget?.dataset?.pl300ContinueNextPart||'all')));\n    body.querySelector('[data-pl300-repeat-part]')?.addEventListener('click',()=>repeatPart());\n    body.querySelector('[data-pl300-parts-back]')?.addEventListener('click',()=>selectPart('all'));''',1)
replace('assets/js/pl300-learning-controller.js','''    startSolveTimer,consumeSolveSeconds,resetSolveTimer,activePart,persist,updateAfterScoredSave,navigate,partReviewContext,selectPart,renderEndOfPartReview''','''    startSolveTimer,consumeSolveSeconds,resetSolveTimer,activePart,persist,updateAfterScoredSave,navigate,partReviewContext,clearRepeatPart,repeatPart,selectPart,renderEndOfPartReview''',1)

replace('assets/js/app.js','''  const revealOpen=practiceRecord?.mode==="auto"||practiceRecord?.mode==="native"||practiceRecord?.mode==="checkpoint"||practiceRecord?.mode==="self"||state.voucherSourceRevealOpened?.has?.(String(q.id));''','''  const revealOpen=!retrying&&!!practiceRecord||state.voucherSourceRevealOpened?.has?.(String(q.id));''',1)
replace('assets/js/app.js','answerHtml:voucherSourceReviewAnswerHtml(q,practiceRecord),nextActionLabel','answerHtml:voucherSourceReviewAnswerHtml(q,retrying?null:practiceRecord),nextActionLabel',1)
replace('assets/js/app.js','if(!reveal.open||q.reviewMode!=="source-reveal"||practiceRecord)return;','if(!reveal.open||q.reviewMode!=="source-reveal"||(practiceRecord&&!retrying))return;',1)
replace('assets/js/app.js','$("sourcePracticeCheckpointBtn")?.addEventListener("click",()=>{\n    if(practiceRecord)return;','$("sourcePracticeCheckpointBtn")?.addEventListener("click",()=>{\n    if(practiceRecord&&!retrying)return;',1)
replace('assets/js/app.js','''    delete state.voucherSourcePendingSeconds[q.id];\n    schedulePl300FullRankSync();''','''    delete state.voucherSourcePendingSeconds[q.id];\n    state.voucherSourcePracticeRetrying?.delete?.(String(q.id));\n    schedulePl300FullRankSync();''',1)
s=read('assets/js/app.js').replace('// Opening a higher-level modal/route from Profile closes the drawer first,\n// preventing modal-on-drawer stacking and keeping one clear active layer.\n','')
write('assets/js/app.js',s)

for name in ['tests/v0226-pl300-release-identity.test.mjs','tests/v0225-pl300-cache-bust.test.mjs']:
    s=read(name).replace('0.22.6','0.22.7').replace('V0.22.6','V0.22.7').replace(r'0\.22\.6',r'0\.22\.7')
    write(name,s)
replace('tests/v0226-pl300-release-identity.test.mjs',"assert.equal(changelog.releases?.[0]?.type,'learning');","assert.equal(changelog.releases?.[0]?.type,'fix');",1)
replace('tests/v0226-pl300-release-identity.test.mjs',"test('V0.22.7 changelog describes the bounded PL-300 learning UX release',()=>{\n  const release=changelog.releases?.[0]||{};\n  const text=[release.title,release.summary,...(release.highlights||[])].join(' ');\n  for(const phrase of ['source-backed','delayed retry','End-of-Part Review','part','Arabic']) assert.match(text,new RegExp(phrase,'i'));\n});","test('V0.22.7 changelog describes the repeat-part hotfix',()=>{\n  const release=changelog.releases?.[0]||{};\n  const text=[release.title,release.summary,...(release.highlights||[])].join(' ');\n  for(const phrase of ['Review & solve again','first-pass','checkpoint','450KB','509']) assert.match(text,new RegExp(phrase,'i'));\n});",1)

repeat_test=r'''import test from 'node:test';
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
'''
write('tests/v0227-pl300-repeat-part.test.mjs',repeat_test)

p=ROOT/'data/changelog.json';data=json.loads(p.read_text());data['latest']='0.22.7'
release={'version':'0.22.7','title':'PL-300 Repeat Part Review Hotfix','date':'2026-09-06','type':'fix','summary':'Restores a non-destructive repeat-study path from End-of-Part Review so learners can review and solve a completed PL-300 part again without rewriting first-pass history or source-backed ranking evidence.','highlights':['Adds Review & solve again ↻ to End-of-Part Review so a mastered part can be reopened instead of becoming a one-way completion screen.','Reopens every question in the selected part as a fresh retry view while preserving saved first-pass correctness, recovery history, attempt history, and mastery evidence.','Supports scored text, native Answer Area interactions, and source-review checkpoint questions during the repeated part without deleting the original record.','Keeps previously saved answers hidden while a repeated question is active so the learner can solve it again before reviewing the answer.','Ships behind a fresh V0.22.7 cache identity so existing GitHub Pages learners receive the hotfix instead of retaining cached V0.22.6 modules.','Keeps the fixed 450KB startup gzip budget unchanged and does not rewrite any of the 509 PL-300 source-bank questions.']}
data['releases']=[release]+[r for r in data.get('releases',[]) if r.get('version')!='0.22.7']
p.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
