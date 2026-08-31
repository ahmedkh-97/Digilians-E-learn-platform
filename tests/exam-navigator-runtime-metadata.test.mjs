import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const app=readFileSync(new URL("../assets/js/app.js",import.meta.url),"utf8");
const context=readFileSync(new URL("../assets/js/exam-context.js",import.meta.url),"utf8");

test("every runtime navigator button exposes track and topic metadata for grouping",()=>{
  assert.match(app,/btn\.dataset\.navTrack\s*=/);
  assert.match(app,/btn\.dataset\.navTopic\s*=/);
});

test("section-aware navigator can fall back to runtime button metadata",()=>{
  assert.match(context,/dataset\.navTrack/);
  assert.match(context,/dataset\.navTopic/);
});
