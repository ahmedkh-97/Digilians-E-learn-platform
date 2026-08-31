import test from "node:test";
import assert from "node:assert/strict";
import {buildExamContextModel, normalizeContextText} from "../assets/js/exam-context.js";

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
  assert.deepEqual(model.questionSegments,["My Mistakes","SQL","Joins"]);
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
