import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const analyticsPath=path.join(process.cwd(),'assets/js/analytics.js');
async function loadAnalytics(){return import(`${pathToFileURL(analyticsPath).href}?t=${Date.now()}-${Math.random()}`);}

test('client error classification distinguishes startup criticals, runtime errors, warnings, and benign noise',async()=>{
  const analytics=await loadAnalytics();
  assert.equal(analytics.classifyClientError('fatal_startup_error','boom',{phase:'startup'}),'critical');
  assert.equal(analytics.classifyClientError('TypeError','boom',{phase:'runtime'}),'error');
  assert.equal(analytics.classifyClientError('resource_error','Failed to load img',{phase:'runtime'}),'warning');
  assert.equal(analytics.classifyClientError('javascript_error','ResizeObserver loop completed with undelivered notifications.',{phase:'runtime'}),'benign');
});

test('health aggregation exposes severity counts, current-version errors, and last error timestamp',async()=>{
  const {aggregateAnalytics}=await loadAnalytics();
  const events=[
    {visitor_id:'v1',session_id:'s1',event_type:'session_start',platform_version:'0.20.9',created_at:'2026-08-31T10:00:00Z',metadata:{}},
    {visitor_id:'v1',session_id:'s1',event_type:'app_error',platform_version:'0.20.9',created_at:'2026-08-31T10:01:00Z',metadata:{kind:'TypeError',message:'old runtime',phase:'runtime'}},
    {visitor_id:'v2',session_id:'s2',event_type:'session_start',platform_version:'0.20.10',created_at:'2026-08-31T11:00:00Z',metadata:{}},
    {visitor_id:'v2',session_id:'s2',event_type:'app_error',platform_version:'0.20.10',created_at:'2026-08-31T11:01:00Z',metadata:{kind:'resource_error',message:'asset missing',phase:'runtime',severity:'warning'}},
    {visitor_id:'v3',session_id:'s3',event_type:'session_start',platform_version:'0.20.10',created_at:'2026-08-31T12:00:00Z',metadata:{}},
    {visitor_id:'v3',session_id:'s3',event_type:'app_error',platform_version:'0.20.10',created_at:'2026-08-31T12:02:00Z',metadata:{kind:'fatal_startup_error',message:'startup failed',phase:'startup',severity:'critical'}}
  ];
  const summary=aggregateAnalytics(events,{currentVersion:'0.20.10'});
  assert.equal(summary.health.errors,3);
  assert.equal(summary.health.severityCounts.critical,1);
  assert.equal(summary.health.severityCounts.error,1);
  assert.equal(summary.health.severityCounts.warning,1);
  assert.equal(summary.health.currentVersionErrors,2);
  assert.equal(summary.health.currentVersionAffectedSessions,2);
  assert.equal(summary.health.lastErrorAt,'2026-08-31T12:02:00Z');
});

test('historical app_error events without severity remain classifiable',async()=>{
  const {aggregateAnalytics}=await loadAnalytics();
  const summary=aggregateAnalytics([
    {session_id:'s1',event_type:'session_start',platform_version:'0.20.10',created_at:'2026-08-31T10:00:00Z',metadata:{}},
    {session_id:'s1',event_type:'app_error',platform_version:'0.20.10',created_at:'2026-08-31T10:01:00Z',metadata:{kind:'resource_error',message:'missing image',phase:'runtime'}}
  ],{currentVersion:'0.20.10'});
  assert.equal(summary.health.severityCounts.warning,1);
});
