import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildNavigatorGroups} from '../assets/js/exam-context.js';

test('navigator creates one group per track and preserves first-track appearance order',()=>{
  const groups=buildNavigatorGroups([
    {index:0,track:'Excel',topic:'Power Pivot & DAX'},
    {index:1,track:'SQL',topic:'Joins'},
    {index:2,track:'Excel',topic:'Power Query'},
    {index:3,track:'Python',topic:'Pandas'},
    {index:4,track:'SQL',topic:'Subqueries'},
    {index:5,track:'Excel',topic:'Functions'}
  ]);
  assert.deepEqual(groups.map(g=>({label:g.label,indexes:g.indexes})),[
    {label:'Excel',indexes:[0,2,5]},
    {label:'SQL',indexes:[1,4]},
    {label:'Python',indexes:[3]}
  ]);
});

test('navigator does not split one track by topic or repeated appearances',()=>{
  const groups=buildNavigatorGroups([
    {index:0,track:'Tableau',topic:'Filters'},
    {index:1,track:'Tableau',topic:'Parameters'},
    {index:2,track:'Tableau',topic:'Filters'}
  ]);
  assert.equal(groups.length,1);
  assert.equal(groups[0].label,'Tableau');
  assert.deepEqual(groups[0].indexes,[0,1,2]);
});

test('question buttons carry stable original indexes so regrouping cannot corrupt statuses',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  assert.match(app,/btn\.dataset\.navIndex\s*=\s*String\(index\)/);
  assert.match(app,/Number\(btn\.dataset\.navIndex\)/);
});
