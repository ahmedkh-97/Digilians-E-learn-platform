
import test from "node:test";
import assert from "node:assert/strict";
import {buildExamContextModel, buildNavigatorGroups, normalizeContextText} from "../assets/js/exam-context.js";

test("Official section exposes level, track and current topic",()=>{
  const progress={
    currentIndex:0,
    generatedExam:{
      exam:{
        title:"Excel — Functions & Formulas",
        module:"Excel",
        category:"Official Section",
        generatedFromOfficialQbank:{
          levelId:"junior-data-analysis",
          trackId:"excel",
          kind:"section"
        }
      },
      questions:[{id:"q1",track:"Excel",trackId:"excel",topic:"Conditional Aggregation"}]
    }
  };
  const model=buildExamContextModel({progress,visibleTopic:"Conditional Aggregation"});
  assert.deepEqual(model.activitySegments,["Official QBank","Junior","Excel","Functions & Formulas"]);
  assert.deepEqual(model.questionSegments,["Official QBank","Junior","Excel","Conditional Aggregation"]);
  assert.equal(model.navigatorTitle,"Excel · Official QBank");
});

test("Professional Official random exam keeps level and current question topic",()=>{
  const progress={
    currentIndex:1,
    generatedExam:{
      exam:{
        title:"Power BI - Official Ministry QBank Exam",
        module:"Power BI",
        category:"Official Exam",
        generatedFromOfficialQbank:{
          levelId:"professional-data-analysis",
          trackId:"power-bi",
          kind:"track-random"
        }
      },
      questions:[
        {id:"q1",track:"Power BI",topic:"Power Query"},
        {id:"q2",track:"Power BI",topic:"DAX"}
      ]
    }
  };
  const model=buildExamContextModel({progress,visibleTopic:"DAX"});
  assert.deepEqual(model.activitySegments,["Official QBank","Professional","Power BI","Random Exam"]);
  assert.deepEqual(model.questionSegments,["Official QBank","Professional","Power BI","DAX"]);
});

test("My Mistakes shows mixed activity but exact source for the current question",()=>{
  const progress={
    currentIndex:1,
    generatedExam:{
      exam:{
        title:"My Mistakes Practice — 2 Questions",
        course:"My Mistakes",
        category:"My Mistakes",
        generatedFromMistakes:{kind:"mistake-recovery"}
      },
      questions:[
        {id:"q1",track:"Excel",topic:"Conditional Aggregation",mistakeContext:{track:"Excel",sourceType:"official-qbank"}},
        {id:"q2",track:"SQL",topic:"Joins",mistakeContext:{track:"SQL",sourceType:"course",module:"Session 4"}}
      ]
    }
  };
  const model=buildExamContextModel({progress,visibleTopic:"Joins"});
  assert.deepEqual(model.activitySegments,["My Mistakes","Excel + SQL","2 Questions"]);
  assert.deepEqual(model.questionSegments,["My Mistakes","Course","SQL","Joins"]);
  assert.equal(model.navigatorTitle,"SQL · My Mistakes");
});

test("My Mistakes single-track activity names that track",()=>{
  const progress={
    currentIndex:0,
    generatedExam:{
      exam:{course:"My Mistakes",generatedFromMistakes:{kind:"mistake-recovery"}},
      questions:[
        {track:"Excel",topic:"Power Pivot & DAX",mistakeContext:{track:"Excel"}},
        {track:"Excel",topic:"Lookup Functions",mistakeContext:{track:"Excel"}}
      ]
    }
  };
  const model=buildExamContextModel({progress,visibleTopic:"Power Pivot & DAX"});
  assert.deepEqual(model.activitySegments,["My Mistakes","Excel","2 Questions"]);
  assert.deepEqual(model.questionSegments,["My Mistakes","Excel","Power Pivot & DAX"]);
});

test("Generic course exam falls back to setup breadcrumb and visible topic",()=>{
  const model=buildExamContextModel({
    progress:null,
    setupTitle:"SQL Session 4 Exam",
    setupBreadcrumb:"Data Analysis / SQL / Session Exam",
    setupCategory:"Session Exam",
    visibleTopic:"Joins"
  });
  assert.deepEqual(model.activitySegments,["Data Analysis","SQL","Session Exam"]);
  assert.deepEqual(model.questionSegments,["Data Analysis","SQL","Joins"]);
});

test("normalization makes rendered question matching stable",()=>{
  assert.equal(normalizeContextText("  Power   Pivot & DAX\n"),"power pivot & dax");
});


test("navigator groups all questions by track regardless of topic",()=>{
  const groups=buildNavigatorGroups([
    {index:0,track:"Excel",topic:"Conditional Aggregation"},
    {index:1,track:"Excel",topic:"Power Pivot & DAX"},
    {index:2,track:"Tableau",topic:"Parameters, Sets, Groups & Hierarchies"},
    {index:3,track:"Excel",topic:"Power Query"},
    {index:4,track:"Tableau",topic:"Filters"}
  ]);
  assert.deepEqual(groups.map(g=>({label:g.label,indexes:g.indexes})),[
    {label:"Excel",indexes:[0,1,3]},
    {label:"Tableau",indexes:[2,4]}
  ]);
});

test("navigator creates one group when every question belongs to one track",()=>{
  const groups=buildNavigatorGroups([
    {index:0,track:"SQL",topic:"Joins"},
    {index:1,track:"SQL",topic:"Subqueries"},
    {index:2,track:"SQL",topic:"Joins"}
  ]);
  assert.equal(groups.length,1);
  assert.equal(groups[0].label,"SQL");
  assert.deepEqual(groups[0].indexes,[0,1,2]);
});

test("navigator grouping has readable fallback for missing track metadata",()=>{
  const groups=buildNavigatorGroups([
    {index:0,track:"",topic:"General"},
    {index:1,track:"",topic:"Another Topic"}
  ]);
  assert.equal(groups.length,1);
  assert.equal(groups[0].label,"Questions");
  assert.deepEqual(groups[0].indexes,[0,1]);
});
