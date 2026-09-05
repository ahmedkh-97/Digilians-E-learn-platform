import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const storageSource=fs.readFileSync(new URL('../assets/js/storage.js',import.meta.url),'utf8');
const appSource=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sqlPath=new URL('../supabase/VOUCHER-PROFILES-V0.20.24.sql',import.meta.url);

test('Primary Track has explicit local storage helpers without clearing learner state',()=>{
  assert.match(storageSource,/digilians\.primaryTrack/);
  assert.match(storageSource,/export function getPrimaryTrack/);
  assert.match(storageSource,/export function setPrimaryTrack/);
  assert.doesNotMatch(storageSource,/setPrimaryTrack[\s\S]{0,500}clearStudentName/);
});

test('existing learners receive a one-time Primary Track chooser and can change later',()=>{
  assert.match(html,/id="primaryTrackModal"/);
  assert.match(html,/id="changePrimaryTrackBtn"/);
  assert.match(appSource,/ensurePrimaryTrack/);
  assert.match(appSource,/changePrimaryTrackBtn/);
});

test('Voucher online profile is isolated from ranking_profiles',()=>{
  const sql=fs.readFileSync(sqlPath,'utf8');
  assert.match(sql,/create table if not exists public\.voucher_profiles/i);
  assert.doesNotMatch(sql,/alter table public\.ranking_profiles/i);
});
