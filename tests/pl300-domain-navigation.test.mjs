import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {questionsForVoucherDomain} from '../assets/js/voucher-content-architecture.js';
import {buildVoucherDomainNavigatorModel} from '../assets/js/voucher-domain-navigation.js';

const root=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const architecture=JSON.parse(fs.readFileSync(new URL('content-architecture.json',root),'utf8'));
const master=JSON.parse(fs.readFileSync(new URL('master-bank.json',root),'utf8'));
const domainQuestions=questionsForVoucherDomain({architecture,questions:master.questions,domainId:'prepare-data'});

const statusFor=(q,index)=>index===0?'answered':index===1?'marked':'unanswered';

test('domain navigator groups questions under the three Prepare Data sessions and preserves stable global indexes',()=>{
  const model=buildVoucherDomainNavigatorModel({architecture,questions:domainQuestions,currentIndex:1,statusForQuestion:statusFor,filter:'all'});
  assert.equal(model.sections.length,3);
  assert.deepEqual(model.sections.map(x=>x.title),['Data Sources & Connectivity','Power Query & Data Cleaning','Parameters, Refresh & Gateways']);
  assert.deepEqual(model.sections.map(x=>x.total),[26,40,9]);
  assert.equal(model.totalQuestions,75);
  assert.equal(model.currentSection.id,architecture.questionSessionMap[domainQuestions[1].id]);
  assert.equal(model.sections[0].questions[0].globalIndex,0);
  assert.equal(model.sections[0].questions[1].globalIndex,1);
  assert.equal(model.sections[0].questions[1].status,'marked');
});

test('domain navigator reports answered counts and supports Unanswered and Marked filters without changing global indexes',()=>{
  const unanswered=buildVoucherDomainNavigatorModel({architecture,questions:domainQuestions,currentIndex:0,statusForQuestion:statusFor,filter:'unanswered'});
  assert.equal(unanswered.answeredCount,1);
  assert.equal(unanswered.markedCount,1);
  assert.equal(unanswered.remainingCount,74);
  assert.ok(unanswered.sections.flatMap(s=>s.questions).every(q=>q.answered===false));
  assert.ok(unanswered.sections.flatMap(s=>s.questions).some(q=>q.globalIndex>2));

  const marked=buildVoucherDomainNavigatorModel({architecture,questions:domainQuestions,currentIndex:0,statusForQuestion:statusFor,filter:'marked'});
  assert.deepEqual(marked.sections.flatMap(s=>s.questions).map(q=>q.globalIndex),[1]);
});


test('domain navigator Answered filter shows only answered questions and preserves stable global indexes',()=>{
  const answered=buildVoucherDomainNavigatorModel({architecture,questions:domainQuestions,currentIndex:2,statusForQuestion:statusFor,filter:'answered'});
  assert.equal(answered.filter,'answered');
  assert.deepEqual(answered.sections.flatMap(s=>s.questions).map(q=>q.globalIndex),[0]);
  assert.ok(answered.sections.flatMap(s=>s.questions).every(q=>q.answered===true));
});

test('domain navigator preserves instant-feedback correctness as visual status while keeping Marked independent',()=>{
  const statusForVisual=(q,index)=>index===0
    ?{status:'correct',answered:true,marked:true}
    :index===1
      ?{status:'wrong',answered:true,marked:false}
      :{status:'unanswered',answered:false,marked:false};
  const model=buildVoucherDomainNavigatorModel({architecture,questions:domainQuestions,currentIndex:0,statusForQuestion:statusForVisual,filter:'all'});
  const first=model.sections.flatMap(s=>s.questions).find(q=>q.globalIndex===0);
  const second=model.sections.flatMap(s=>s.questions).find(q=>q.globalIndex===1);
  assert.equal(first.visualStatus,'correct');
  assert.equal(first.marked,true);
  assert.equal(second.visualStatus,'wrong');
});
