import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../assets/css/pl300.css',import.meta.url),'utf8');
for(const selector of ['.voucher-ranked-learning-overview','.voucher-ranked-learning-stats','.ranked-learning-setup','.voucher-ranked-session-choice','.voucher-more-practice']){
  test(`ranked learning styles define ${selector}`,()=>assert.match(css,new RegExp(selector.replaceAll('.','\\.'))));
}
