import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BACKUP_KEYS,
  collectBackupData,
  summarizeBackupData,
  mergeBackupIntoStorageData,
  validateBackupDocument,
  createBackupDocument
} from '../assets/js/backup-restore.js';

class MemoryStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed));}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

const voucherA={schemaVersion:1,owners:{p1:{attempts:[{id:'a1',examId:'cert-a',correct:80}],seenByExam:{'cert-a':['q1','q2']},updatedAt:'2026-09-01T10:00:00Z'}}};
const voucherB={schemaVersion:1,owners:{p1:{attempts:[{id:'a2',examId:'cert-a',correct:90}],seenByExam:{'cert-a':['q2','q3']},updatedAt:'2026-09-02T10:00:00Z'}}};

test('Voucher progress and Primary Track are included in backups',()=>{
  assert.ok(BACKUP_KEYS.includes('digilians.primaryTrack'));
  assert.ok(BACKUP_KEYS.includes('digilians.voucher'));
  const storage=new MemoryStorage({'digilians.primaryTrack':'marketing','digilians.voucher':JSON.stringify(voucherA)});
  const data=collectBackupData(storage);
  assert.equal(data['digilians.primaryTrack'],'marketing');
  assert.equal(JSON.parse(data['digilians.voucher']).owners.p1.attempts.length,1);
  const summary=summarizeBackupData(data);
  assert.equal(summary.voucherAttempts,1);
  assert.equal(summary.primaryTrack,'marketing');
});

test('merge restore combines Voucher attempts and seen coverage without duplicates',()=>{
  const merged=mergeBackupIntoStorageData(
    {'digilians.voucher':JSON.stringify(voucherA),'digilians.primaryTrack':'data-analysis'},
    {'digilians.voucher':JSON.stringify(voucherB),'digilians.primaryTrack':'marketing'}
  );
  const voucher=JSON.parse(merged['digilians.voucher']);
  assert.deepEqual(voucher.owners.p1.attempts.map(x=>x.id).sort(),['a1','a2']);
  assert.deepEqual(new Set(voucher.owners.p1.seenByExam['cert-a']),new Set(['q1','q2','q3']));
  assert.equal(merged['digilians.primaryTrack'],'marketing');
});

test('backup validation rejects invalid Primary Track values',async()=>{
  const storage=new MemoryStorage({'digilians.primaryTrack':'not-a-track','digilians.voucher':JSON.stringify(voucherA)});
  const doc=await createBackupDocument(storage,{platformVersion:'0.20.24',exportedAt:'2026-09-02T10:00:00Z'});
  await assert.rejects(()=>validateBackupDocument(doc),/primary track/i);
});
