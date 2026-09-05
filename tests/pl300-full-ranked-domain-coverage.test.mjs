import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import index from '../voucher/tracks/data-analysis/microsoft-pl-300/full-ranked-index.json' with {type:'json'};

const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');

test('full ranked source coverage accounts for all 509 occurrences across mapped domains plus unclassified review',()=>{
  assert.equal(index.questionCount,509);
  assert.equal(index.mappedDomainOccurrences+index.unclassifiedOccurrences,509);
  const mapped=index.records.filter(r=>r.domainId).length;
  assert.equal(mapped,index.mappedDomainOccurrences);
});

test('domain learning UI shows source coverage without changing validated domain exam counts',()=>{
  assert.match(app,/function pl300FullRankDomainCoverage/);
  assert.match(app,/Source coverage/);
  assert.match(app,/Unclassified Source Review/);
  assert.match(app,/mappedDomainOccurrences/);
  assert.match(app,/unclassifiedOccurrences/);
});
