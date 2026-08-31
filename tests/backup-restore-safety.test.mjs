import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=process.cwd();
const backupPath=path.join(root,'assets/js/backup-restore.js');
const safetyPath=path.join(root,'assets/js/storage-safety.js');

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}
class FailOnceStorage extends MemoryStorage{
  constructor(seed={},failKey){super(seed);this.failKey=failKey;this.failed=false;}
  setItem(key,value){
    if(key===this.failKey && !this.failed){this.failed=true;throw new Error('simulated quota failure');}
    super.setItem(key,value);
  }
}

async function loadBackup(){return import(`${pathToFileURL(backupPath).href}?t=${Date.now()}-${Math.random()}`);}
async function loadSafety(){return import(`${pathToFileURL(safetyPath).href}?t=${Date.now()}-${Math.random()}`);}

test('progress backups carry the learner storage schema marker',async()=>{
  const backup=await loadBackup();
  const {CURRENT_STORAGE_SCHEMA_VERSION,STORAGE_SCHEMA_KEY}=await loadSafety();
  const storage=new MemoryStorage({
    [STORAGE_SCHEMA_KEY]:String(CURRENT_STORAGE_SCHEMA_VERSION),
    'digilians.studentName':'Ahmed',
    'digilians.results':'[]'
  });
  const doc=await backup.createBackupDocument(storage,{platformVersion:'0.20.10',exportedAt:'2026-08-31T00:00:00.000Z'});
  assert.equal(doc.data[STORAGE_SCHEMA_KEY],String(CURRENT_STORAGE_SCHEMA_VERSION));
  const validated=await backup.validateBackupDocument(doc);
  assert.equal(validated.data[STORAGE_SCHEMA_KEY],String(CURRENT_STORAGE_SCHEMA_VERSION));
});

test('restore validation refuses learner data from a future storage schema',async()=>{
  const backup=await loadBackup();
  const {CURRENT_STORAGE_SCHEMA_VERSION,STORAGE_SCHEMA_KEY}=await loadSafety();
  const doc=await backup.createBackupDocument(new MemoryStorage({
    [STORAGE_SCHEMA_KEY]:String(CURRENT_STORAGE_SCHEMA_VERSION),
    'digilians.studentName':'Ahmed'
  }),{platformVersion:'0.20.10',exportedAt:'2026-08-31T00:00:00.000Z'});
  doc.data[STORAGE_SCHEMA_KEY]=String(CURRENT_STORAGE_SCHEMA_VERSION+1);
  await assert.rejects(()=>backup.validateBackupDocument(doc,{verifyChecksum:false}),/newer learner storage schema|storage schema/i);
});

test('restore rolls back all learner keys when a browser write fails mid-apply',async()=>{
  const backup=await loadBackup();
  const original={
    'digilians.studentName':'Original',
    'digilians.theme':'light',
    'digilians.results':'[{"clientAttemptId":"old","score":9}]'
  };
  const storage=new FailOnceStorage(original,'digilians.results');
  const incoming={
    'digilians.studentName':'Imported',
    'digilians.theme':'dark',
    'digilians.results':'[{"clientAttemptId":"new","score":10}]'
  };
  assert.throws(()=>backup.applyBackupData(storage,incoming,'replace'),/restore.*rolled back|could not be restored safely/i);
  assert.equal(storage.getItem('digilians.studentName'),original['digilians.studentName']);
  assert.equal(storage.getItem('digilians.theme'),original['digilians.theme']);
  assert.equal(storage.getItem('digilians.results'),original['digilians.results']);
});
