import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const registry={levels:[
  {levelId:'junior-data-analysis',title:'Junior Data Analysis',tracks:[
    {trackId:'excel',track:'Excel',sourceRevision:'r1',sections:[
      {sectionId:'e1',sectionNumber:1,title:'Foundations',questionCount:10},
      {sectionId:'e2',sectionNumber:2,title:'Formulas',questionCount:20}
    ]},
    {trackId:'sql',track:'SQL',sourceRevision:'r2',sections:[
      {sectionId:'s1',sectionNumber:1,title:'Queries',questionCount:15}
    ]}
  ]},
  {levelId:'professional-data-analysis',title:'Professional Data Analysis',tracks:[
    {trackId:'power-bi',track:'Power BI',sourceRevision:'r3',sections:[
      {sectionId:'p1',sectionNumber:1,title:'Model',questionCount:25}
    ]}
  ]}
]};
const sectionExamId=(levelId,trackId,sectionNumber,revision)=>`${levelId}::${trackId}::${sectionNumber}::${revision}`;

test('ranking modes preserve the current six supported ranking center modes',async()=>{
  const mod=await import(`../assets/js/ranking-scopes.js?t=${Date.now()}-${Math.random()}`);
  assert.deepEqual([...mod.RANKING_MODES],['junior-overall','professional-overall','track','exam','voucher-track','voucher-exam']);
  assert.equal(mod.isRankingMode('track'),true);
  assert.equal(mod.isRankingMode('unknown'),false);
  assert.equal(mod.isVoucherRankingMode('voucher-track'),true);
  assert.equal(mod.isVoucherRankingMode('voucher-exam'),true);
  assert.equal(mod.isVoucherRankingMode('exam'),false);
});

test('ranking scope builds junior overall totals from fixed sections',async()=>{
  const {buildRankingScope}=await import(`../assets/js/ranking-scopes.js?t=${Date.now()}-${Math.random()}`);
  const scope=buildRankingScope({mode:'junior-overall',trackLevelId:'professional-data-analysis',trackId:'sql',officialRegistry:registry,sectionExamId});
  assert.equal(scope.levelId,'junior-data-analysis');
  assert.equal(scope.name,'Junior Data Analysis');
  assert.equal(scope.maxScore,45);
  assert.equal(scope.sectionCount,3);
  assert.deepEqual(scope.sections.map(x=>x.examId),[
    'junior-data-analysis::excel::1::r1','junior-data-analysis::excel::2::r1','junior-data-analysis::sql::1::r2'
  ]);
});

test('ranking scope builds track totals and exam/voucher modes stay outside aggregate scopes',async()=>{
  const {buildRankingScope}=await import(`../assets/js/ranking-scopes.js?t=${Date.now()}-${Math.random()}`);
  const track=buildRankingScope({mode:'track',trackLevelId:'junior-data-analysis',trackId:'sql',officialRegistry:registry,sectionExamId});
  assert.equal(track.name,'Junior Data Analysis • SQL');
  assert.equal(track.maxScore,15);
  assert.equal(track.sectionCount,1);
  assert.equal(track.track.trackId,'sql');
  assert.equal(buildRankingScope({mode:'exam',officialRegistry:registry,sectionExamId}),null);
  assert.equal(buildRankingScope({mode:'voucher-track',officialRegistry:registry,sectionExamId}),null);
  assert.equal(buildRankingScope({mode:'voucher-exam',officialRegistry:registry,sectionExamId}),null);
});

test('app delegates aggregate ranking scope computation to ranking-scopes.js',()=>{
  const app=fs.readFileSync('assets/js/app.js','utf8');
  assert.match(app,/from\s+["']\.\/ranking-scopes\.js\?v=/);
  assert.doesNotMatch(app,/function\s+fixedSectionCatalog\s*\(/);
  assert.doesNotMatch(app,/function\s+rankingScopeForMode\s*\(/);
});
