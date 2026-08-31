import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const learning=JSON.parse(await readFile(new URL('../data/learning.json',import.meta.url),'utf8'));
const excel=learning.courses[3].tracks[0];
const w3=excel.modules.find(m=>m.id==='excel-week-03');
const lessons=w3.study.sections;

function allText(obj){
  if(typeof obj==='string') return obj;
  if(Array.isArray(obj)) return obj.map(allText).join('\n');
  if(obj&&typeof obj==='object') return Object.values(obj).map(allText).join('\n');
  return '';
}

test('Week 3 beginner concept cards teach the concept instead of generic source boilerplate',()=>{
  const bad=[];
  for(const lesson of lessons){
    for(const c of lesson.beginnerLearningV3?.concepts||[]){
      const exp=String(c.explanationAr||'').trim();
      if(!exp || /مصطلح أساسي داخل هذا workflow كما يقدمه المصدر/i.test(exp) || exp.length<20){
        bad.push(`${lesson.id}: ${c.term} => ${exp}`);
      }
    }
  }
  assert.deepEqual(bad,[]);
});

test('Week 3 common mistakes are lesson-specific rather than one repeated template',()=>{
  const lines=[];
  for(const lesson of lessons){
    const items=lesson.deepLearningV2?.commonMistakes||[];
    assert.ok(items.length>=2,`${lesson.id} needs at least two common mistakes`);
    for(const item of items) lines.push(String(item).trim().toLowerCase());
  }
  const counts=new Map();
  for(const line of lines) counts.set(line,(counts.get(line)||0)+1);
  const overused=[...counts].filter(([,n])=>n>=5);
  assert.deepEqual(overused,[]);
});

test('Week 3 contains no placeholders and keeps source caveats visible',()=>{
  const text=allText(w3);
  assert.doesNotMatch(text,/\b(TODO|TBD|lorem ipsum|placeholder)\b/i);
  for(const marker of ['ENVIRONMENT','SOURCE','OVERLAP']){
    assert.match(text,new RegExp(marker,'i'));
  }
});
