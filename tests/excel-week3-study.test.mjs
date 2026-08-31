import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const load=async p=>JSON.parse(await readFile(new URL(`../${p}`,import.meta.url),"utf8"));
const learning=await load("data/learning.json");
const curriculum=await load("data/curriculum/excel.json");
const syllabus=await load("data/syllabus-maps/excel.json");
const excel=learning.courses[3].tracks[0];
const w3=excel.modules.find(x=>x.id==="excel-week-03");
test("Excel Week 3 production counts are locked",()=>{
 assert.equal(excel.modules.length,3); assert.equal(excel.studyGroups.length,24);
 assert.equal(w3.study.learningGroups.length,8); assert.equal(w3.study.sections.length,34);
 assert.equal(w3.sourceBatch.conceptClusters,143); assert.equal(w3.sourceBatch.productionConcepts,123); assert.equal(w3.sourceBatch.reuseOnlyClusters,20);
 assert.deepEqual(excel.productionStats,{sessions:3,topics:294,questionBanks:4,questions:456,status:"FINAL READY",studySections:96,sourceFiles:29,sourceSlides:610,practiceQuestions:228,trackExamBankQuestions:228,trackExamFormQuestions:50,weekExamsReady:false});
});
test("all Week 3 lessons meet Deep Learning V3.2 structural minimum",()=>{
 for(const s of w3.study.sections){assert.ok(s.sourceTrace); assert.ok(s.beginnerLearningV3?.simpleExplanationAr); assert.ok(s.deepLearningV2?.opening?.goalAr); assert.ok(s.deepLearningV2?.tryIt?.promptAr); assert.equal(s.deepLearningV2?.quickCheck?.options?.length,4); assert.ok(s.deepLearningV2?.nextConnection?.textAr);}
});
test("123 Week 3 concepts are unique and classification is 86/30/7",()=>{
 const t=syllabus.topics.filter(x=>x.week===3); assert.equal(t.length,123); assert.equal(new Set(t.map(x=>x.id)).size,123);
 assert.equal(t.filter(x=>x.assessmentEligible).length,86); assert.equal(t.filter(x=>x.role==="supporting").length,30); assert.equal(t.filter(x=>x.role==="bridge").length,7);
 assert.equal(curriculum.topics.filter(x=>x.week===3).length,123);
});
test("QA boundary labels remain visible in Week 3 content",()=>{
 const raw=JSON.stringify(w3); for(const marker of ["ENVIRONMENT","SOURCE INCONSISTENCY","PRESENTATION / METRIC-LABEL ISSUE","TIME-SENSITIVE SOURCE SNAPSHOT","PRACTICAL SOURCE GAP","OVERLAP"]){assert.ok(raw.includes(marker),marker);}
});
