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
  assert.equal(summary.health.errors,2);
  assert.equal(summary.health.severityCounts.critical,1);
  assert.equal(summary.health.severityCounts.error,0);
  assert.equal(summary.health.severityCounts.warning,1);
  assert.equal(summary.health.currentVersionErrors,2);
  assert.equal(summary.health.currentVersionAffectedSessions,2);
  assert.equal(summary.health.lastErrorAt,'2026-08-31T12:02:00Z');
  assert.equal(summary.health.all.errors,3);
  assert.equal(summary.health.all.severityCounts.error,1);
});

test('historical app_error events without severity remain classifiable',async()=>{
  const {aggregateAnalytics}=await loadAnalytics();
  const summary=aggregateAnalytics([
    {session_id:'s1',event_type:'session_start',platform_version:'0.20.10',created_at:'2026-08-31T10:00:00Z',metadata:{}},
    {session_id:'s1',event_type:'app_error',platform_version:'0.20.10',created_at:'2026-08-31T10:01:00Z',metadata:{kind:'resource_error',message:'missing image',phase:'runtime'}}
  ],{currentVersion:'0.20.10'});
  assert.equal(summary.health.severityCounts.warning,1);
});

test('failed to fetch is classified as a network warning instead of a critical/error TypeError',async()=>{
  const analytics=await loadAnalytics();
  assert.equal(analytics.classifyClientError('TypeError','Failed to fetch',{phase:'runtime'}),'warning');
});

test('health defaults to current-version sessions and errors while preserving all-version history',async()=>{
  const {aggregateAnalytics}=await loadAnalytics();
  const events=[
    {visitor_id:'v-old',session_id:'s-old',event_type:'session_start',platform_version:'0.20.20',created_at:'2026-08-31T08:00:00Z',metadata:{}},
    {visitor_id:'v-old',session_id:'s-old',event_type:'app_error',platform_version:'0.20.20',created_at:'2026-08-31T08:01:00Z',metadata:{kind:'TypeError',message:'Failed to fetch',phase:'runtime'}},
    {visitor_id:'v-new',session_id:'s-new',event_type:'session_start',platform_version:'0.20.21',created_at:'2026-09-01T05:00:00Z',metadata:{}},
    {visitor_id:'v-new2',session_id:'s-new2',event_type:'page_view',platform_version:'0.20.21',created_at:'2026-09-01T05:02:00Z',metadata:{}}
  ];
  const summary=aggregateAnalytics(events,{currentVersion:'0.20.21'});
  assert.equal(summary.health.currentVersion,'0.20.21');
  assert.equal(summary.health.errors,0);
  assert.equal(summary.health.affectedSessions,0);
  assert.equal(summary.health.errorFreeRate,100);
  assert.equal(summary.health.recent.length,0);
  assert.equal(summary.health.all.errors,1);
  assert.equal(summary.health.all.affectedSessions,1);
  assert.equal(summary.health.all.recent.length,1);
  assert.equal(summary.health.all.recent[0].platform_version,'0.20.20');
});

test('current-version health rate uses only sessions that actually ran the current build',async()=>{
  const {aggregateAnalytics}=await loadAnalytics();
  const events=[
    {session_id:'old-ok',event_type:'session_start',platform_version:'0.20.20',created_at:'2026-08-31T08:00:00Z',metadata:{}},
    {session_id:'old-bad',event_type:'session_start',platform_version:'0.20.20',created_at:'2026-08-31T08:01:00Z',metadata:{}},
    {session_id:'old-bad',event_type:'app_error',platform_version:'0.20.20',created_at:'2026-08-31T08:02:00Z',metadata:{kind:'TypeError',message:'boom',phase:'runtime'}},
    {session_id:'new-ok',event_type:'session_start',platform_version:'0.20.21',created_at:'2026-09-01T05:00:00Z',metadata:{}},
    {session_id:'new-bad',event_type:'session_start',platform_version:'0.20.21',created_at:'2026-09-01T05:01:00Z',metadata:{}},
    {session_id:'new-bad',event_type:'app_error',platform_version:'0.20.21',created_at:'2026-09-01T05:02:00Z',metadata:{kind:'TypeError',message:'boom',phase:'runtime'}}
  ];
  const summary=aggregateAnalytics(events,{currentVersion:'0.20.21'});
  assert.equal(summary.health.errors,1);
  assert.equal(summary.health.affectedSessions,1);
  assert.equal(summary.health.errorFreeRate,50);
  assert.equal(summary.health.all.errorFreeRate,50);
});
