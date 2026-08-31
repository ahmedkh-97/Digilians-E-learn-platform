import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const readJson=async path=>JSON.parse(await readFile(new URL(`../${path}`,import.meta.url),'utf8'));
const curriculum=await readJson('data/curriculum/excel.json');
const learning=await readJson('data/learning.json');
const registry=await readJson('data/exams.json');
const excel=learning.courses[3].tracks[0];
const eligible=curriculum.topics.filter(t=>t.assessment?.practiceEligible===true);
const eligibleByWeek=new Map([1,2,3].map(w=>[w,eligible.filter(t=>t.week===w)]));
const expectedCounts={1:53,2:89,3:86};
const examPaths={
  1:'exams/data-analysis/excel/production/data-analysis-excel-week01-practice-v1.json',
  2:'exams/data-analysis/excel/production/data-analysis-excel-week02-practice-v1.json',
  3:'exams/data-analysis/excel/production/data-analysis-excel-week03-practice-v1.json'
};
const examIds={
  1:'data-analysis-excel-week01-practice-v1',
  2:'data-analysis-excel-week02-practice-v1',
  3:'data-analysis-excel-week03-practice-v1'
};

const isArabic=s=>/[\u0600-\u06FF]/.test(String(s||''));
const badText=/\b(?:TODO|TBD|placeholder|lorem ipsum)\b/i;

for(const [week,count] of Object.entries(expectedCounts)){
  test(`Excel Week ${week} eligibility contract is ${count}`,()=>{
    assert.equal(eligibleByWeek.get(Number(week)).length,count);
  });
}

test('Excel Practice V1 has exactly one question per eligible concept and no ineligible mappings',async()=>{
  const all=[];
  for(const week of [1,2,3]){
    const payload=await readJson(examPaths[week]);
    assert.equal(payload.questions.length,expectedCounts[week]);
    all.push(...payload.questions);
  }
  assert.equal(all.length,228);
  const conceptKeys=all.map(q=>q.conceptKey);
  assert.equal(new Set(conceptKeys).size,228,'Practice concept mappings must be unique');
  assert.deepEqual(new Set(conceptKeys),new Set(eligible.map(t=>t.id)));
});

test('every Excel Practice question meets schema, source, and explanation quality rules',async()=>{
  const allowedTypes=new Set(['direct-knowledge','scenario-application','calculation-tracing','best-decision','troubleshooting']);
  const allowedDiff=new Set(['Easy','Medium','Hard']);
  const seenQuestions=new Set();
  for(const week of [1,2,3]){
    const payload=await readJson(examPaths[week]);
    assert.equal(payload.schemaVersion,'1.0');
    assert.deepEqual(payload.exam.settings.feedbackModes,['instant']);
    assert.equal(payload.exam.settings.timer.enabled,false);
    assert.equal(payload.exam.settings.allowRetake,true);
    for(const q of payload.questions){
      assert.equal(q.options.length,4,`${q.id}: four options required`);
      assert.deepEqual(q.options.map(o=>o.id),['A','B','C','D']);
      assert.equal(new Set(q.options.map(o=>o.text.trim().toLowerCase())).size,4,`${q.id}: option texts must be unique`);
      assert.ok(q.options.some(o=>o.id===q.correctAnswer),`${q.id}: valid correctAnswer required`);
      assert.ok(isArabic(q.explanation?.ar),`${q.id}: Arabic explanation required`);
      assert.ok(isArabic(q.deepExplanation?.summary),`${q.id}: Arabic deep summary required`);
      for(const id of ['A','B','C','D'])assert.ok(isArabic(q.deepExplanation?.options?.[id]),`${q.id}: Arabic reason for ${id} required`);
      assert.equal(q.sourceType,'course');
      assert.equal(q.trackExamEligible,false);
      assert.equal(q.finalEligible,false);
      assert.ok(q.source?.file && q.source?.reference,`${q.id}: source trace required`);
      assert.ok(q.topic && q.topicId && q.conceptKey,`${q.id}: topic mapping required`);
      assert.ok(allowedTypes.has(q.questionType),`${q.id}: invalid questionType`);
      assert.ok(allowedDiff.has(q.difficulty),`${q.id}: invalid difficulty`);
      assert.ok(!badText.test(JSON.stringify(q)),`${q.id}: placeholder text found`);
      assert.ok(!seenQuestions.has(q.question.trim().toLowerCase()),`${q.id}: duplicate question stem`);
      seenQuestions.add(q.question.trim().toLowerCase());
    }
  }
});

test('Excel modules resolve non-ranked Practice while module Exam remains locked',()=>{
  for(const week of [1,2,3]){
    const module=excel.modules.find(m=>m.id===`excel-week-0${week}`);
    assert.equal(module.practiceExamId,examIds[week]);
    assert.equal(module.examId,null);
    assert.equal(module.assessmentStatus,'practice-ready-exam-locked');
    const item=registry.exams.find(x=>x.id===examIds[week]);
    assert.ok(item,`Week ${week} Practice registry item missing`);
    assert.equal(item.file,examPaths[week]);
    assert.equal(item.questionCount,expectedCounts[week]);
    assert.equal(item.ranked,false);
    assert.equal(item.category,'Practice');
  }
});

test('Practice text is English-only and every source file belongs to the 29-file Excel manifest',async()=>{
  const manifest=await readJson('data/excel-intake/source-manifest.json');
  const sourceFiles=new Set(manifest.sources.map(s=>s.file));
  for(const week of [1,2,3]){
    const payload=await readJson(examPaths[week]);
    for(const q of payload.questions){
      assert.ok(!isArabic(q.question),`${q.id}: question must be English`);
      for(const o of q.options)assert.ok(!isArabic(o.text),`${q.id}/${o.id}: option must be English`);
      assert.ok(sourceFiles.has(q.source.file),`${q.id}: source file not in Excel manifest: ${q.source.file}`);
    }
  }
});

test('known low-similarity concepts use concept-specific source evidence rather than weak generic term matches',async()=>{
  const byConcept=new Map();
  for(const week of [1,2,3]){
    const payload=await readJson(examPaths[week]);
    for(const q of payload.questions)byConcept.set(q.conceptKey,q);
  }
  const answerText=id=>{
    const q=byConcept.get(id); assert.ok(q,`missing ${id}`);
    return q.options.find(o=>o.id===q.correctAnswer)?.text||'';
  };
  assert.match(answerText('w2-sort-spot-outliers'),/Sort|Smallest to Largest/i);
  assert.match(answerText('w3-pivot-manage-output-c01'),/Group Dates/i);
  assert.match(answerText('w3-powerpivot-enable-load-c03'),/Get Data/i);
  assert.match(byConcept.get('w3-powerpivot-enable-load-c04').question,/caveat|availability|environment|version/i);
  assert.match(answerText('w3-relationships-c04'),/Ambiguous Path|Circular Dependency/i);
  assert.match(answerText('w3-dax-sumx-related-c03'),/RELATED|fTransactions|Units|Discount/i);
  assert.match(answerText('w3-model-dashboard-c04'),/DAX/i);
  assert.match(byConcept.get('w3-power-view-setup-c04').question,/caveat|environment|version/i);
  assert.match(answerText('w3-forest-plot-c01'),/Study Name|Effect Size|Position|CI/i);
  assert.match(answerText('w3-correlation-scatter-c04'),/correlation theory|Statistics/i);
  assert.match(answerText('w3-filled-map-c04'),/Bing|online/i);
  assert.match(answerText('w3-ai-landscape-c03'),/Formula generation/i);
  assert.match(answerText('w3-shortcuts-workbook-c02'),/Alt\+A|Alt\+W|Alt\+M/i);
  assert.match(answerText('w3-shortcuts-workbook-c03'),/Ctrl\+Tab/i);
});



test('ambiguous concept families resolve to source-specific semantic answers',async()=>{
  const byConcept=new Map();
  for(const week of [1,2,3]){
    const payload=await readJson(examPaths[week]);
    for(const q of payload.questions)byConcept.set(q.conceptKey,q);
  }
  const qa=id=>{
    const q=byConcept.get(id); assert.ok(q,`missing ${id}`);
    return {q,answer:q.options.find(o=>o.id===q.correctAnswer)?.text||''};
  };
  assert.match(qa('autosum-assessment-family').q.question,/number.*numeric|numeric.*cells/i);
  assert.match(qa('autosum-assessment-family').answer,/^COUNT$/i);
  assert.match(qa('vlookup').q.question,/first column|table_array|right/i);
  assert.match(qa('vlookup').answer,/VLOOKUP/i);
  assert.match(qa('unique-function').q.question,/distinct|unique/i);
  assert.match(qa('unique-function').answer,/^UNIQUE$/i);
  assert.match(qa('sparklines').answer,/Line.*Column.*Win\/Loss/i);

  assert.match(qa('w2-if-or-outlier-flag').answer,/IF\s*\(\s*OR/i);
  assert.match(qa('w2-dashboard-storytelling').answer,/What.*Why.*What Next/i);
  assert.match(qa('w2-poor-good-chart-labels').answer,/labels.*colors.*values/i);
  assert.match(qa('w2-design-practice').q.question,/preferences.*over time|over time.*preferences/i);
  assert.match(qa('w2-design-practice').answer,/Line/i);
  assert.match(qa('w2-access-powerquery-workflow').q.question,/Navigator.*Power Query Editor|Power Query Editor.*Navigator/i);
  assert.match(qa('w2-access-powerquery-workflow').answer,/Transform Data/i);
  assert.match(qa('w2-goalseek-vs-solver').answer,/Solver.*multiple|multiple.*Solver/i);
  assert.match(qa('w2-chart-design-format-controls').answer,/Chart Filter/i);
  assert.match(qa('w2-chart-practice').answer,/Bar Chart/i);
  assert.match(qa('w2-m-purpose').answer,/ETL|get.*clean/i);
  assert.match(qa('w2-m-characteristics').answer,/Case-Sensitive/i);

  assert.match(qa('w3-relationships-c03').answer,/One-to-One.*Many-to-Many|Many-to-Many.*One-to-One/i);
  assert.match(qa('w3-model-dashboard-c03').answer,/Slicer.*Timeline|Timeline.*Slicer/i);
  assert.match(qa('w3-filled-map-c03').answer,/Map Area.*Map Projection.*Color Scale|Map Projection.*Color Scale/i);
  assert.match(qa('w3-personal-macro-run-c02').answer,/Developer.*Macros/i);
  assert.match(qa('w3-bland-altman-c04').answer,/Bias.*1\.96.*STDEV\.S/i);
  assert.match(qa('w3-ogive-c04').answer,/Axis Minimum.*Major Unit|Major Unit.*Axis Minimum/i);
  assert.match(qa('w3-survival-curve-c01').answer,/Events d_i.*At Risk n_i|At Risk n_i.*Events d_i/i);
  assert.match(qa('w3-macro-recording-c01').answer,/replay|repeat|repetitive/i);
  assert.match(qa('w3-macro-recording-c02').answer,/Start.*perform.*Stop.*run/i);
});



test('generic fallback stems are not truncated or context-poor',async()=>{
  for(const week of [1,2,3]){
    const payload=await readJson(examPaths[week]);
    for(const q of payload.questions){
      const m=q.question.match(/:\s*"([^"]+)"\?/);
      if(!m)continue;
      const words=m[1].match(/[A-Za-z0-9]+/g)||[];
      assert.ok(words.length>=3,`${q.id}: fallback context is too short: ${m[1]}`);
      assert.doesNotMatch(m[1],/^for\s+Q1\/Q3$/i,`${q.id}: truncated QUARTILE context`);
      assert.doesNotMatch(m[1],/^(with|and|or|for|vs|to|of|from|by|using|use)\b/i,`${q.id}: fallback starts with a dangling connector`);
      assert.doesNotMatch(m[1],/\b(with|and|or|for|vs|to|of|from|by|using|use)$/i,`${q.id}: fallback ends with a dangling connector`);
    }
  }
});

test('current release metadata keeps Excel Practice startup modules cache-busted consistently',async()=>{
  const version=(await readFile(new URL('../VERSION.txt',import.meta.url),'utf8')).split(/\r?\n/,1)[0].trim();
  const escaped=version.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const index=await readFile(new URL('../index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../assets/js/app.js',import.meta.url),'utf8');
  assert.match(index,new RegExp(`app\\.js\\?v=${escaped}`));
  assert.match(app,new RegExp(`module-assessment\\.js\\?v=${escaped}`));
  assert.match(app,new RegExp(`storage\\.js\\?v=${escaped}`));
});

test('Excel intake metadata marks Study and Practice approved, Full Track Exam ready, and Week Exams locked',async()=>{
  const weeks=await readJson('data/excel-intake/week-status.json');
  const curriculumState=await readJson('data/curriculum/excel.json');
  assert.equal(curriculumState.curriculumStatus,'complete');
  assert.equal(curriculumState.completion?.confirmedByUser,true);
  assert.equal(curriculumState.completion?.trackExamReady,true);
  assert.equal(weeks.trackExam?.ready,true);
  for(const w of weeks.weeks){
    assert.equal(w.studyReady,true,`Week ${w.week} Study should be approved`);
    assert.equal(w.practiceReady,true,`Week ${w.week} Practice should be ready`);
    assert.equal(w.examReady,false,`Week ${w.week} Exam must stay locked`);
    assert.equal(w.assessmentReady,false,`Week ${w.week} assessment gate stays false because Week Exams remain intentionally locked`);
    assert.equal(w.practiceProduction?.questionCount,expectedCounts[w.week]);
  }
});

test('Practice stems are learner-facing and correct-answer positions are balanced',async()=>{
  for(const week of [1,2,3]){
    const payload=await readJson(examPaths[week]);
    const answerCounts={A:0,B:0,C:0,D:0};
    for(const q of payload.questions){
      assert.doesNotMatch(q.question,/\bsource term\b/i,`${q.id}: learner-facing stem must not say source term`);
      answerCounts[q.correctAnswer]++;
    }
    const values=Object.values(answerCounts);
    assert.ok(Math.max(...values)-Math.min(...values)<=1,`Week ${week}: answer positions must be balanced, got ${JSON.stringify(answerCounts)}`);
  }
});

test('Practice stems do not reveal the correct option text',async()=>{
  const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  for(const week of [1,2,3]){
    const payload=await readJson(examPaths[week]);
    for(const q of payload.questions){
      const answer=q.options.find(o=>o.id===q.correctAnswer)?.text||'';
      const a=norm(answer);
      const stem=norm(q.question);
      if(a.length>=3)assert.ok(!stem.includes(a),`${q.id}: correct option is leaked in the stem: ${answer}`);
    }
  }
});
