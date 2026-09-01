import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

class MemoryStorage {
  constructor(){this.map=new Map();}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

globalThis.localStorage=new MemoryStorage();

const mistakes=await import('../assets/js/mistakes.js');

const q={
  id:'Q-1',
  question:'Example?',
  options:[{id:'A',text:'A'},{id:'B',text:'B'}],
  correctAnswer:'A',
  track:'Excel',
  topic:'Functions'
};

test('unanswered selections are never classified as mistakes',()=>{
  assert.equal(mistakes.shouldRecordMistakeOutcome(q,null),false);
  assert.equal(mistakes.shouldRecordMistakeOutcome(q,undefined),false);
  assert.equal(mistakes.shouldRecordMistakeOutcome(q,''),false);
  assert.equal(mistakes.shouldRecordMistakeOutcome(q,'A'),false);
  assert.equal(mistakes.shouldRecordMistakeOutcome(q,'B'),true);
});

test('legacy seed does not fabricate a wrong answer for unanswered Official QBank items',()=>{
  const seeded=mistakes.seedMistake({
    ownerId:'owner',studentName:'Ahmed',question:q,selected:null,
    context:{sourceType:'official-qbank',levelId:'junior-data-analysis',trackId:'excel'}
  });
  assert.equal(seeded,null);
  assert.equal(mistakes.getMistakes('owner',{includeMastered:true}).length,0);
});

test('Official exam submission uses answered-only mistake classification',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  assert.match(app,/shouldRecordMistakeOutcome\(q,selected\)/);
  assert.doesNotMatch(app,/if\(\(state\.answers\[q\.id\]\?\?null\)!==q\.correctAnswer\)/);
});
