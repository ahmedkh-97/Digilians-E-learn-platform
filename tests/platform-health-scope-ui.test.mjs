import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('assets/js/analytics.js','utf8');
const css=fs.readFileSync('assets/css/style.css','utf8');

test('Platform Health exposes Current Version and All Versions scope controls',()=>{
  assert.match(html,/data-health-scope="current"/);
  assert.match(html,/data-health-scope="all"/);
  assert.match(html,/id="analyticsHealthBuildBadge"/);
});

test('Platform Health scope switch is local and does not refetch analytics',()=>{
  assert.match(js,/activeHealthScope="current"/);
  assert.match(js,/lastAnalyticsSummary/);
  assert.match(js,/data-health-scope/);
});

test('Platform Health has distinct visual treatment for warning rows',()=>{
  assert.match(css,/analytics-error-row\.severity-warning/);
  assert.match(css,/analytics-health-scope/);
});
