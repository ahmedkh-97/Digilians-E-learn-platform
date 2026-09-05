import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../voucher/tracks/data-analysis/microsoft-pl-300/',import.meta.url);
const master=JSON.parse(fs.readFileSync(new URL('master-bank.json',root),'utf8'));
const config=JSON.parse(fs.readFileSync(new URL('config.json',root),'utf8'));
const architecture=JSON.parse(fs.readFileSync(new URL('content-architecture.json',root),'utf8'));

const expectedDomains=[
  ['prepare-data','Prepare the Data'],
  ['model-data','Model the Data'],
  ['visualize-analyze','Visualize & Analyze the Data'],
  ['manage-secure','Manage & Secure Power BI']
];
const expectedSessions=[
  ['pl300-s01-data-sources','prepare-data','Data Sources & Connectivity'],
  ['pl300-s02-power-query','prepare-data','Power Query & Data Cleaning'],
  ['pl300-s03-refresh-gateways','prepare-data','Parameters, Refresh & Gateways'],
  ['pl300-s04-star-schema','model-data','Star Schema & Relationships'],
  ['pl300-s05-dax','model-data','DAX & Time Intelligence'],
  ['pl300-s06-model-optimization','model-data','Storage Modes & Model Optimization'],
  ['pl300-s07-visuals','visualize-analyze','Visuals, Formatting & Interactions'],
  ['pl300-s08-analytics','visualize-analyze','Analytics, Forecasting, Q&A & Advanced Visuals'],
  ['pl300-s09-workspaces','manage-secure','Workspaces, Apps, Sharing & Permissions'],
  ['pl300-s10-security','manage-secure','RLS, Security, Sensitivity & Deployment']
];

test('PL-300 content architecture exposes the approved four domains and ten sessions',()=>{
  assert.equal(architecture.schemaVersion,1);
  assert.equal(architecture.examId,'microsoft-pl-300');
  assert.deepEqual(architecture.domains.map(x=>[x.id,x.title]),expectedDomains);
  assert.deepEqual(architecture.sessions.map(x=>[x.id,x.domainId,x.title]),expectedSessions);
  assert.deepEqual(architecture.sessions.map(x=>x.order),[1,2,3,4,5,6,7,8,9,10]);
});

test('all 265 ranked IDs map exactly once to one non-empty session',()=>{
  const masterIds=master.questions.map(q=>q.id);
  const map=architecture.questionSessionMap;
  assert.equal(Object.keys(map).length,265);
  assert.deepEqual(new Set(Object.keys(map)),new Set(masterIds));

  const sessionIds=new Set(expectedSessions.map(x=>x[0]));
  const counts=new Map([...sessionIds].map(id=>[id,0]));
  for(const [questionId,sessionId] of Object.entries(map)){
    assert.ok(masterIds.includes(questionId),`unknown canonical ID ${questionId}`);
    assert.ok(sessionIds.has(sessionId),`${questionId} maps to unknown session ${sessionId}`);
    counts.set(sessionId,counts.get(sessionId)+1);
  }
  for(const [sessionId,count] of counts)assert.ok(count>0,`${sessionId} must not be empty`);
  assert.equal([...counts.values()].reduce((sum,n)=>sum+n,0),265);
});

test('PL-300 config points to the architecture registry with native-ranked expansion metadata',()=>{
  assert.equal(config.contentArchitectureFile,'voucher/tracks/data-analysis/microsoft-pl-300/content-architecture.json');
  assert.equal(config.masterBankQuestionCount,265);
  assert.equal(config.realExam.questionCount,60);
  assert.equal(config.realExam.durationMinutes,120);
  assert.equal(config.fullBankExam.questionCount,265);
  assert.equal(config.fullBankExam.durationMinutes,530);
});
