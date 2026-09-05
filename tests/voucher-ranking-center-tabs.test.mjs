import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8');

test('Ranking Center exposes Voucher Exam and Voucher Track Overall as first-class tabs',()=>{
  assert.match(html,/data-ranking-mode="voucher-exam"[^>]*>Voucher Exam Ranking</);
  assert.match(html,/data-ranking-mode="voucher-track"[^>]*>Voucher Track Overall</);
});

test('Voucher ranking modes have visible track and exam controls inside Ranking Center',()=>{
  assert.match(html,/id="rankingVoucherToolbar"/);
  assert.match(html,/id="rankingVoucherTrackSelect"/);
  assert.match(html,/id="rankingVoucherExamSelect"/);
  assert.match(app,/populateVoucherRankingControls/);
});

test('Ranking Center renders Voucher empty states before any Voucher exam is released',()=>{
  assert.match(app,/No Voucher exams have been released yet/);
  assert.match(app,/No rank-eligible Real Exam is available in this track yet/);
  assert.match(app,/state\.rankingMode==="voucher-exam"/);
  assert.match(app,/state\.rankingMode==="voucher-track"/);
});


test('Voucher ranking tabs are visually distinguished inside the Ranking Center',()=>{
  assert.match(css,/\.ranking-mode-tab\.voucher-ranking-tab:not\(\.active\)/);
  assert.match(css,/\.voucher-ranking-toolbar/);
});
