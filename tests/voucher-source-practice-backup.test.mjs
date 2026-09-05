import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeBackupIntoStorageData} from '../assets/js/backup-restore.js';

test('voucher backup merge preserves source practice records',()=>{
  const current={
    'digilians.voucher':JSON.stringify({schemaVersion:1,owners:{u1:{attempts:[],seenByExam:{},sourcePractice:{old:{examId:'microsoft-pl-300',correct:true}},updatedAt:'2026-09-01T00:00:00.000Z'}}})
  };
  const incoming={
    'digilians.voucher':JSON.stringify({schemaVersion:1,owners:{u1:{attempts:[],seenByExam:{},sourcePractice:{new:{examId:'microsoft-pl-300',selfGrade:'incorrect'},native:{examId:'microsoft-pl-300',mode:'native',answers:{'box-1':'Dual'},correct:true}},updatedAt:'2026-09-05T00:00:00.000Z'}}})
  };
  const merged=mergeBackupIntoStorageData(current,incoming);
  const voucher=JSON.parse(merged['digilians.voucher']);
  assert.equal(voucher.owners.u1.sourcePractice.old.correct,true);
  assert.equal(voucher.owners.u1.sourcePractice.new.selfGrade,'incorrect');
  assert.equal(voucher.owners.u1.sourcePractice.native.answers['box-1'],'Dual');
  assert.equal(voucher.owners.u1.sourcePractice.native.correct,true);
});
