import test from 'node:test';
import assert from 'node:assert/strict';

class MemoryStorage {
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
  clear(){this.map.clear();}
}

globalThis.localStorage=new MemoryStorage();

const mistakes=await import('../assets/js/mistakes.js');
const storage=await import('../assets/js/storage.js');

function seedOfficialState(){
  localStorage.setItem('digilians.officialQbank',JSON.stringify({
    tracks:{
      'junior-data-analysis::source-r1::excel':{
        lastIndex:12,
        reviewed:['EX-1','EX-2'],
        bookmarks:['EX-2'],
        mistakes:['EX-1','EX-3'],
        answers:{'EX-1':'B','EX-2':'A'}
      },
      'professional-data-analysis::source-r1::sql':{
        lastIndex:4,
        reviewed:['SQL-1'],
        bookmarks:['SQL-1'],
        mistakes:['SQL-2'],
        answers:{'SQL-1':'C'}
      }
    }
  }));
}

test('reset clears only the current owner mistake history',()=>{
  const store={schemaVersion:1,owners:{
    ownerA:{studentName:'Ahmed',items:{a:{key:'a'}},updatedAt:'old'},
    ownerB:{studentName:'Other',items:{b:{key:'b'}},updatedAt:'old'}
  }};
  localStorage.setItem('digilians.mistakes',JSON.stringify(store));

  const cleared=mistakes.clearMistakesForOwner('ownerA');
  assert.equal(cleared,1);
  assert.deepEqual(mistakes.getMistakes('ownerA',{includeMastered:true}),[]);
  assert.equal(mistakes.getMistakes('ownerB',{includeMastered:true}).length,1);
});

test('official reset removes only mistake flags and preserves study state',()=>{
  seedOfficialState();
  localStorage.setItem('digilians.results',JSON.stringify([{examId:'keep-me',percentage:90}]));
  const beforeResults=localStorage.getItem('digilians.results');

  const cleared=storage.clearOfficialMistakeFlags();
  assert.equal(cleared,3);

  const state=storage.getOfficialQbankState();
  const excel=state.tracks['junior-data-analysis::source-r1::excel'];
  const sql=state.tracks['professional-data-analysis::source-r1::sql'];
  assert.deepEqual(excel.mistakes,[]);
  assert.deepEqual(sql.mistakes,[]);
  assert.equal(excel.lastIndex,12);
  assert.deepEqual(excel.reviewed,['EX-1','EX-2']);
  assert.deepEqual(excel.bookmarks,['EX-2']);
  assert.deepEqual(excel.answers,{'EX-1':'B','EX-2':'A'});
  assert.equal(sql.lastIndex,4);
  assert.deepEqual(sql.reviewed,['SQL-1']);
  assert.deepEqual(sql.bookmarks,['SQL-1']);
  assert.deepEqual(sql.answers,{'SQL-1':'C'});
  assert.equal(localStorage.getItem('digilians.results'),beforeResults);
});
