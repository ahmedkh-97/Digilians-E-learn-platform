import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildVoucherSectionAnalytics} from '../assets/js/voucher-section-analytics.js';

const root=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const architecture=JSON.parse(fs.readFileSync(new URL('content-architecture.json',root),'utf8'));

test('section analytics preserves canonical session order and identifies strongest and weakest section',()=>{
  const attempt={subjectBreakdown:{
    'Data Sources & Connectivity':{correct:18,wrong:4,unanswered:0,total:22},
    'Power Query & Data Cleaning':{correct:16,wrong:11,unanswered:0,total:27},
    'Parameters, Refresh & Gateways':{correct:7,wrong:2,unanswered:0,total:9}
  }};
  const model=buildVoucherSectionAnalytics({architecture,domainId:'prepare-data',attempt});
  assert.equal(model.hasAttempt,true);
  assert.deepEqual(model.rows.map(x=>x.id),[
    'pl300-s01-data-sources','pl300-s02-power-query','pl300-s03-refresh-gateways'
  ]);
  assert.deepEqual(model.rows.map(x=>x.percentage),[82,59,78]);
  assert.equal(model.strongest.id,'pl300-s01-data-sources');
  assert.equal(model.weakest.id,'pl300-s02-power-query');
  assert.equal(model.rows[1].status,'needs-review');
});

test('section analytics returns canonical empty rows before the first official Domain attempt',()=>{
  const model=buildVoucherSectionAnalytics({architecture,domainId:'model-data',attempt:null});
  assert.equal(model.hasAttempt,false);
  assert.equal(model.rows.length,3);
  assert.ok(model.rows.every(row=>row.percentage===null));
  assert.ok(model.rows.every(row=>row.status==='not-attempted'));
  assert.equal(model.strongest,null);
  assert.equal(model.weakest,null);
});

test('PL-300 Domain UI renders persistent Section Analytics and result copy switches to section language',()=>{
  const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../assets/css/style.css',import.meta.url),'utf8');
  assert.match(app,/buildVoucherSectionAnalytics/);
  assert.match(app,/SECTION ANALYTICS/);
  assert.match(app,/Performance by PL-300 section/);
  assert.match(css,/voucher-section-analytics/);
});
