import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const bank=JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/draft-master-bank.json',import.meta.url),'utf8'));
const bySource=(src,num)=>bank.questions.find(q=>q.canonicalSourceRef?.sourceId===src&&String(q.canonicalSourceRef?.questionNumber)===String(num));

test('known PL-300 questions map to the current official skill domain',()=>{
  assert.equal(bySource('source-01','76')?.topicId,'manage-secure','RLS is Manage and secure');
  assert.equal(bySource('source-01','220')?.topicId,'visualize-analyze','visual configuration is Visualize and analyze');
  assert.equal(bySource('source-01','239')?.topicId,'visualize-analyze','personalize visuals is Visualize and analyze');
  assert.equal(bySource('source-01','354')?.topicId,'model-data','DAX calculated column is Model the data');
  assert.equal(bySource('source-01','22')?.topicId,'prepare-data','building a dimension by transforming query data is Prepare the data');
  assert.equal(bySource('source-01','72')?.topicId,'prepare-data','sampling a large SQL table during ingestion is Prepare the data');
  assert.equal(bySource('source-01','84')?.topicId,'prepare-data','a report-level filter does not satisfy a data-ingestion sampling goal');
  assert.equal(bySource('source-01','85')?.topicId,'model-data','role-playing date relationships belong to Model the data');
  assert.equal(bySource('source-01','94')?.topicId,'prepare-data','splitting a source column in Power Query is Prepare the data even when the output feeds a chart');
  assert.equal(bySource('source-02','307')?.topicId,'manage-secure','RLS authorization belongs to Manage and secure Power BI');
});

test('each domain has enough clean draft supply for the fixed 60-question official-weight quota',()=>{
  const clean=bank.questions.filter(q=>!q.reviewFlags && !/^Introductory Info Case Study/i.test(q.question));
  const count=id=>clean.filter(q=>q.topicId===id).length;
  assert.ok(count('prepare-data')>=17);
  assert.ok(count('model-data')>=17);
  assert.ok(count('visualize-analyze')>=16);
  assert.ok(count('manage-secure')>=10);
});
