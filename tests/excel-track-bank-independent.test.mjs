import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const BANK='question-banks/data-analysis/excel/da-excel-track-bank-v1.json';
const PRACTICE=[1,2,3].map(w=>`exams/data-analysis/excel/production/data-analysis-excel-week0${w}-practice-v1.json`);
const norm=s=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));

function eligibleConcepts(){
  const curriculum=readJson('data/curriculum/excel.json');
  return new Map(curriculum.topics.filter(t=>t.assessment?.weekExamEligible===true).map(t=>[t.id,t]));
}
function practiceByConcept(){
  const out=new Map();
  for(const rel of PRACTICE){
    for(const q of readJson(rel).questions){
      assert.ok(q.conceptKey,`Practice question ${q.id} missing conceptKey`);
      assert.equal(out.has(q.conceptKey),false,`duplicate Practice concept ${q.conceptKey}`);
      out.set(q.conceptKey,q);
    }
  }
  return out;
}

test('approved Excel assessment boundary is exactly 228 concepts and matches Practice V1',()=>{
  const eligible=eligibleConcepts();
  const practice=practiceByConcept();
  assert.equal(eligible.size,228);
  assert.equal(practice.size,228);
  assert.deepEqual([...practice.keys()].sort(),[...eligible.keys()].sort());
});

test('independent Excel Track Exam bank artifact exists',()=>{
  assert.equal(fs.existsSync(path.join(ROOT,BANK)),true,`${BANK} must be built independently from Study/curriculum`);
});

test('independent bank covers the 228 concepts without copying Practice item identity or wording',()=>{
  const payload=readJson(BANK);
  const eligible=eligibleConcepts();
  const practice=practiceByConcept();
  assert.equal(payload.schemaVersion,'2.0');
  assert.equal(payload.bank.id,'da-excel-track-bank-v1');
  assert.equal(payload.questions.length,228);
  const ids=new Set(); const concepts=new Set();
  for(const [index,q] of payload.questions.entries()){
    assert.match(q.id,/^da-excel-track-q\d{3}$/);
    assert.equal(ids.has(q.id),false,`duplicate bank id ${q.id}`); ids.add(q.id);
    assert.ok(eligible.has(q.conceptKey),`ineligible concept ${q.conceptKey}`);
    assert.equal(concepts.has(q.conceptKey),false,`duplicate concept ${q.conceptKey}`); concepts.add(q.conceptKey);
    assert.equal(q.sourceType,'course');
    assert.equal(q.trackId,'excel');
    assert.equal(q.trackExamEligible,true);
    assert.equal(q.finalEligible,false);
    assert.ok(Number.isInteger(q.weekNumber) && q.weekNumber>=1 && q.weekNumber<=3);
    assert.ok(q.groupId && q.groupNumber && q.groupTitle && q.sectionId && q.sectionTitle);
    assert.notEqual(q.groupId,'excel-g14-automation-bridge');
    assert.ok(['Easy','Medium','Hard'].includes(q.difficulty));
    assert.ok(['direct','scenario','tracing','troubleshooting'].includes(q.questionFamily));
    assert.ok(Array.isArray(q.options) && q.options.length===4);
    assert.ok(['A','B','C','D'].includes(q.correctAnswer));
    const optionIds=q.options.map(o=>o.id); assert.deepEqual(optionIds,['A','B','C','D']);
    const correct=q.options.find(o=>o.id===q.correctAnswer)?.text;
    assert.ok(correct,`missing correct option text for ${q.id}`);
    assert.ok(!norm(q.question).includes(norm(correct)),`answer leaked in stem for ${q.id}: ${correct}`);
    const p=practice.get(q.conceptKey); assert.ok(p);
    assert.notEqual(q.id,p.id,`Practice id reused for ${q.conceptKey}`);
    assert.notEqual(norm(q.question),norm(p.question),`Practice stem copied for ${q.conceptKey}`);
    const examOpts=q.options.map(o=>norm(o.text)).sort();
    const practiceOpts=p.options.map(o=>norm(o.text)).sort();
    assert.notDeepEqual(examOpts,practiceOpts,`Practice option set copied for ${q.conceptKey}`);
    assert.ok(q.explanation?.ar?.trim(),`missing Arabic explanation ${q.id}`);
    assert.ok(q.deepExplanation?.summary?.trim(),`missing deep summary ${q.id}`);
    for(const id of ['A','B','C','D']) assert.ok(q.deepExplanation?.options?.[id]?.trim(),`missing ${id} rationale ${q.id}`);
  }
  assert.deepEqual([...concepts].sort(),[...eligible.keys()].sort());
});

test('bank source trace stays within the approved Excel 29-file source manifest',()=>{
  const payload=readJson(BANK);
  const manifest=readJson('data/excel-intake/source-manifest.json');
  const files=new Set(manifest.sources.map(s=>s.file));
  assert.equal(files.size,29);
  for(const q of payload.questions){
    assert.ok(q.source?.file && files.has(q.source.file),`unknown source file ${q.id}: ${q.source?.file}`);
    assert.ok(q.source?.reference,`missing source reference ${q.id}`);
  }
});

test('bank is learner-facing: no meta-source wording, placeholders, or weak/truncated stems',()=>{
  const payload=readJson(BANK);
  const banned=[/which source term/i,/source trace/i,/according to the source/i,/\[concept:/i,/\bundefined\b/i,/todo/i,/placeholder/i,/with emphasis on/i,/best matches this focus/i,/a workbook task focuses on/i];
  for(const q of payload.questions){
    const stem=q.question.trim();
    assert.ok(stem.length>=35,`short stem ${q.id}: ${stem}`);
    assert.ok(/[?]$/.test(stem),`stem must end with ? ${q.id}: ${stem}`);
    for(const re of banned) assert.doesNotMatch(stem,re,`${q.id} contains banned meta wording`);
    const texts=q.options.map(o=>o.text.trim());
    assert.equal(new Set(texts.map(norm)).size,4,`duplicate options ${q.id}`);
    assert.ok(texts.every(t=>t.length>=2),`weak empty option ${q.id}`);
    assert.doesNotMatch(stem,/[\u0600-\u06ff]/,`${q.id} stem must stay English`);
    for(const text of texts) assert.doesNotMatch(text,/[\u0600-\u06ff]/,`${q.id} option must stay English`);
  }
});

test('independent bank has healthy family/difficulty depth for dynamic exam forms',()=>{
  const qs=readJson(BANK).questions;
  const countBy=key=>qs.reduce((m,q)=>(m[q[key]]=(m[q[key]]||0)+1,m),{});
  const fam=countBy('questionFamily');
  const diff=countBy('difficulty');
  assert.ok((fam.direct||0)>=40,`direct depth too low: ${fam.direct||0}`);
  assert.ok((fam.scenario||0)>=40,`scenario depth too low: ${fam.scenario||0}`);
  assert.ok((fam.tracing||0)>=20 && (fam.tracing||0)<=70,`tracing depth should be selective, got ${fam.tracing||0}`);
  assert.ok((fam.troubleshooting||0)>=5,`troubleshooting depth too low: ${fam.troubleshooting||0}`);
  assert.ok((diff.Easy||0)>=30,`Easy depth too low: ${diff.Easy||0}`);
  assert.ok((diff.Medium||0)>=70,`Medium depth too low: ${diff.Medium||0}`);
  assert.ok((diff.Hard||0)>=25,`Hard depth too low: ${diff.Hard||0}`);
});

test('independent bank avoids duplicate stems and keeps answer positions balanced',()=>{
  const qs=readJson(BANK).questions;
  const stems=qs.map(q=>norm(q.question));
  assert.equal(new Set(stems).size,qs.length,'Every concept needs an independent learner-facing stem');
  const pos={A:0,B:0,C:0,D:0};
  for(const q of qs) pos[q.correctAnswer]++;
  assert.deepEqual(pos,{A:57,B:57,C:57,D:57});
});

test('known semantic families use concept-aligned evidence rather than sibling-topic clues',()=>{
  const byConcept=new Map(readJson(BANK).questions.map(q=>[q.conceptKey,q]));
  const vlookup=byConcept.get('vlookup');
  assert.ok(vlookup);
  assert.match(norm(vlookup.question+' '+vlookup.options.find(o=>o.id===vlookup.correctAnswer).text),/vlookup/);
  const indexMatch=byConcept.get('index-match');
  assert.ok(indexMatch);
  assert.match(norm(indexMatch.question+' '+indexMatch.options.find(o=>o.id===indexMatch.correctAnswer).text),/index.*match|match.*index/);
  const dateCore=byConcept.get('date-functions-core');
  assert.ok(dateCore);
  assert.doesNotMatch(norm(dateCore.question),/networkdays|workday/,'DATE/TODAY core must not be cued by the working-day sibling family');
  const workingDays=byConcept.get('working-day-functions');
  assert.ok(workingDays);
  assert.match(norm(workingDays.question+' '+workingDays.options.find(o=>o.id===workingDays.correctAnswer).text),/networkdays|workday|working day/);
});

test('the two audited multi-source concepts preserve both mappings explicitly',()=>{
  const byConcept=new Map(readJson(BANK).questions.map(q=>[q.conceptKey,q]));
  for(const ck of ['autosum-assessment-family','w2-relational-tables-excel']){
    const q=byConcept.get(ck); assert.ok(q);
    assert.ok(Array.isArray(q.source.secondarySources) && q.source.secondarySources.length>=1,`${ck} must preserve secondary curriculum mapping`);
    assert.ok(q.source.mappingNote,`${ck} must document source mapping policy`);
  }
});

test('label-based distractors stay in the nearest semantic neighborhood',()=>{
  const payload=readJson(BANK);
  const eligible=eligibleConcepts();
  const learning=readJson('data/learning.json');
  const course=learning.courses.find(c=>c.id==='data-analysis');
  const track=course.tracks.find(t=>t.id==='excel');
  const metaByConcept=new Map();
  for(const module of track.modules){
    const groupBySection=new Map();
    for(const group of module.study.learningGroups){
      for(const sid of group.sectionIds) groupBySection.set(sid,group);
    }
    for(const section of module.study.sections){
      const group=groupBySection.get(section.id);
      for(const ck of section.conceptIds||[]){
        if(eligible.has(ck)) metaByConcept.set(ck,{section,group});
      }
    }
  }
  const titleToConcepts=new Map();
  for(const [ck,t] of eligible){
    const key=norm(t.title);
    if(!titleToConcepts.has(key)) titleToConcepts.set(key,[]);
    titleToConcepts.get(key).push(ck);
  }
  for(const q of payload.questions.filter(q=>['direct','scenario','troubleshooting'].includes(q.questionFamily))){
    const meta=metaByConcept.get(q.conceptKey); assert.ok(meta,`missing Study meta ${q.conceptKey}`);
    const distractors=q.options.filter(o=>o.id!==q.correctAnswer);
    const mapped=distractors.map(o=>(titleToConcepts.get(norm(o.text))||[]).map(ck=>({ck,meta:metaByConcept.get(ck)}))).flat();
    const sameSection=mapped.filter(x=>x.meta?.section.id===meta.section.id).length;
    const sameGroup=mapped.filter(x=>x.meta?.group.id===meta.group.id).length;
    const sectionOthers=[...eligible.keys()].filter(ck=>ck!==q.conceptKey && metaByConcept.get(ck)?.section.id===meta.section.id).length;
    const groupOthers=[...eligible.keys()].filter(ck=>ck!==q.conceptKey && metaByConcept.get(ck)?.group.id===meta.group.id).length;
    const expectedSection=Math.min(3,sectionOthers);
    const expectedGroup=Math.min(3,groupOthers);
    assert.ok(sameSection>=expectedSection,`${q.conceptKey} should use ${expectedSection} same-section distractors, got ${sameSection}`);
    assert.ok(sameGroup>=expectedGroup,`${q.conceptKey} should use ${expectedGroup} same-group distractors, got ${sameGroup}`);
  }
});

test('high-risk Week 3 identification items use course-local distractors and source-grounded clues',()=>{
  const byConcept=new Map(readJson(BANK).questions.map(q=>[q.conceptKey,q]));
  const checks={
    'w3-bland-altman-c04': /bias|agreement|uloa|lloa|difference|mean/,
    'w3-ogive-c01': /ogive|class limit|cumulative|zero start|scatter/,
    'w3-ai-landscape-c02': /ai tools|data preparation|analysis ai|visualization ai|automation ai|tool landscape/,
    'w3-shortcuts-workbook-c03': /ctrl\+n|ctrl\+o|ctrl\+s|ctrl\+tab|alt\+a|alt\+w|alt\+m|workbook|ribbon|navigation/,
  };
  for(const [ck,re] of Object.entries(checks)){
    const q=byConcept.get(ck); assert.ok(q,`missing ${ck}`);
    const distractorText=q.options.filter(o=>o.id!==q.correctAnswer).map(o=>o.text).join(' | ');
    assert.match(norm(q.question+' '+distractorText),re,`${ck} should stay inside its taught semantic family`);
  }
  const filtering=byConcept.get('w3-model-dashboard-c03'); assert.ok(filtering);
  assert.match(norm(filtering.question),/slicer|timeline|filter|dashboard|model/);
  assert.doesNotMatch(norm(filtering.question),/with emphasis on interactive filtering/,'stem should describe the behavior, not echo the answer label');
});

test('tracing distractors prefer formulas and steps from the same taught workflow',()=>{
  const payload=readJson(BANK);
  const learning=readJson('data/learning.json');
  const course=learning.courses.find(c=>c.id==='data-analysis');
  const track=course.tracks.find(t=>t.id==='excel');
  const sectionEvidence=new Map();
  const groupEvidence=new Map();
  for(const module of track.modules){
    const groupBySection=new Map();
    for(const group of module.study.learningGroups){
      if(!groupEvidence.has(group.id)) groupEvidence.set(group.id,{formulas:new Set(),steps:new Set()});
      for(const sid of group.sectionIds) groupBySection.set(sid,group);
    }
    for(const section of module.study.sections){
      const formulas=new Set((section.lessonV2?.formulas||[]).map(f=>norm(f.formula)).filter(Boolean));
      const steps=new Set((section.lessonV2?.steps||[]).map(norm).filter(Boolean));
      sectionEvidence.set(section.id,{formulas,steps});
      const group=groupBySection.get(section.id); assert.ok(group);
      const ge=groupEvidence.get(group.id);
      for(const x of formulas) ge.formulas.add(x);
      for(const x of steps) ge.steps.add(x);
    }
  }
  for(const q of payload.questions.filter(q=>q.questionFamily==='tracing')){
    const correctRaw=String(q.options.find(o=>o.id===q.correctAnswer)?.text||'');
    const correct=norm(correctRaw);
    const distractors=q.options.filter(o=>o.id!==q.correctAnswer).map(o=>norm(o.text));
    const se=sectionEvidence.get(q.sectionId); const ge=groupEvidence.get(q.groupId);
    assert.ok(se && ge,`missing tracing evidence ${q.conceptKey}`);
    const isFormula=/^\s*=/.test(correctRaw)||/:=/.test(correctRaw);
    const sectionPool=[...(isFormula?se.formulas:se.steps)].filter(x=>x!==correct);
    const groupPool=[...(isFormula?ge.formulas:ge.steps)].filter(x=>x!==correct);
    const sameSection=distractors.filter(x=>sectionPool.includes(x)).length;
    const sameGroup=distractors.filter(x=>groupPool.includes(x)).length;
    const sectionNeed=isFormula?Math.min(2,sectionPool.length):Math.min(3,sectionPool.length);
    const groupNeed=isFormula?Math.min(2,groupPool.length):Math.min(3,groupPool.length);
    assert.ok(sameSection>=sectionNeed,`${q.conceptKey} tracing should prefer same-section evidence; got ${sameSection}/${sectionNeed}`);
    assert.ok(sameGroup>=groupNeed,`${q.conceptKey} tracing should prefer same-group evidence; got ${sameGroup}/${groupNeed}`);
  }
});
