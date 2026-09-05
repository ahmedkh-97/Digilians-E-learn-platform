import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('Voucher is first-class navigation plus Home entry',()=>{
  assert.match(html,/data-route="voucherView"[^>]*>Voucher</);
  assert.match(html,/id="voucherHomeCard"/);
});

test('Voucher has Hub, Track, and Exam views',()=>{
  for(const id of ['voucherView','voucherTrackView','voucherExamView'])assert.match(html,new RegExp(`id="${id}"`));
});

test('Voucher UI is registry driven and supports Coming Soon',()=>{
  assert.match(app,/renderVoucherHub/);
  assert.match(app,/voucherTrackRegistries/);
  assert.match(app,/Coming Soon/);
});

test('Voucher question visual assets have an enlargement control contract',()=>{
  assert.match(html,/id="voucherVisualModal"/);
  assert.match(app,/openVoucherVisual/);
});
