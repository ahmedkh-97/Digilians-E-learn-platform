import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.cwd();
const safetyPath=path.join(root,'assets/js/storage-safety.js');
const storagePath=path.join(root,'assets/js/storage.js');

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

class ThrowingStorage{
  getItem(){throw new Error('blocked read');}
  setItem(){throw new Error('quota blocked');}
  removeItem(){throw new Error('blocked remove');}
}

async function loadSafety(){
  return import(`${pathToFileURL(safetyPath).href}?t=${Date.now()}-${Math.random()}`);
}

async function loadStorage(){
  return import(`${pathToFileURL(storagePath).href}?t=${Date.now()}-${Math.random()}`);
}

test('storage schema migrates an unversioned install non-destructively to the current version',async()=>{
  const {CURRENT_STORAGE_SCHEMA_VERSION,ensureStorageSchema,STORAGE_SCHEMA_KEY}=await loadSafety();
  const storage=new MemoryStorage({'digilians.results':'[{"score":9}]'});
  const before=storage.getItem('digilians.results');
  const result=ensureStorageSchema(storage);
  assert.equal(result.ok,true);
  assert.equal(result.fromVersion,1);
  assert.equal(result.toVersion,CURRENT_STORAGE_SCHEMA_VERSION);
  assert.equal(storage.getItem(STORAGE_SCHEMA_KEY),String(CURRENT_STORAGE_SCHEMA_VERSION));
  assert.equal(storage.getItem('digilians.results'),before,'non-destructive migration must not rewrite learner results');
});

test('future storage schema is refused without mutating learner data',async()=>{
  const {CURRENT_STORAGE_SCHEMA_VERSION,ensureStorageSchema,STORAGE_SCHEMA_KEY}=await loadSafety();
  const future=CURRENT_STORAGE_SCHEMA_VERSION+1;
  const storage=new MemoryStorage({[STORAGE_SCHEMA_KEY]:String(future),'digilians.results':'[{"score":10}]'});
  const before=storage.getItem('digilians.results');
  const result=ensureStorageSchema(storage);
  assert.equal(result.ok,false);
  assert.equal(result.reason,'future-schema');
  assert.equal(storage.getItem(STORAGE_SCHEMA_KEY),String(future));
  assert.equal(storage.getItem('digilians.results'),before);
});

test('a destructive migration cannot run unless its safety snapshot succeeds first',async()=>{
  const {runStorageMigrations}=await loadSafety();
  const storage=new MemoryStorage({'digilians.keep':'original'});
  let applied=false;
  const result=runStorageMigrations(storage,{
    currentVersion:1,
    targetVersion:2,
    migrations:[{
      from:1,to:2,destructive:true,
      apply(){applied=true;storage.setItem('digilians.keep','changed');}
    }],
    createSafetySnapshot(){return false;}
  });
  assert.equal(result.ok,false);
  assert.equal(result.reason,'safety-snapshot-failed');
  assert.equal(applied,false);
  assert.equal(storage.getItem('digilians.keep'),'original');
});

test('storage facade stays usable when browser localStorage is unavailable',async()=>{
  globalThis.localStorage=new ThrowingStorage();
  const storage=await loadStorage();
  assert.doesNotThrow(()=>storage.getStudentName());
  assert.equal(storage.getStudentName(),'');
  assert.doesNotThrow(()=>storage.getTheme());
  assert.equal(storage.getTheme(),'light');
  assert.doesNotThrow(()=>storage.getResults());
  assert.deepEqual(storage.getResults(),[]);
  assert.doesNotThrow(()=>storage.saveResult({examId:'x'}));
  assert.equal(storage.saveResult({examId:'x'}),false,'failed persistence must be observable to callers');
});
