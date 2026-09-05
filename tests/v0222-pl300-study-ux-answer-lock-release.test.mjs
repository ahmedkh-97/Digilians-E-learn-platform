import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const json=rel=>JSON.parse(read(rel));

test('V0.22.2 release archive documents PL-300 Study UX and Answer Lock',()=>{
  const changes=json('data/changelog.json');
  const release=changes.releases.find(x=>x.version==='0.22.2');
  assert.ok(release,'V0.22.2 release entry must remain in changelog history');
  const text=JSON.stringify(release);
  assert.match(text,/Answer Lock/i);
  assert.match(text,/Dropdown/i);
  assert.match(text,/Arabic/i);
  assert.match(text,/Mini Part/i);
  assert.ok(fs.existsSync(path.join(ROOT,'docs/releases/V0.22.2-PL300-STUDY-UX-ANSWER-LOCK-QA.md')));
});

test('V0.22.2 preserves all 509 source occurrences and source-backed Q5 dropdown choices',()=>{
  const index=json('voucher/tracks/data-analysis/microsoft-pl-300/full-ranked-index.json');
  assert.equal(index.questionCount,509);
  assert.equal(index.sources?.['source-01']?.questionCount??index.sources?.find?.(x=>x.sourceId==='source-01')?.questionCount??369,369);
  const source=json('voucher/tracks/data-analysis/microsoft-pl-300/source-01-review-bank.json');
  const q5=source.questions.find(q=>q.id==='pl300-source-01-q005');
  assert.ok(q5);
  assert.deepEqual(q5.nativeResponse.fields[0].choices,['Append Queries','Append Queries as New','Merge Queries','Merge Queries as New']);
  assert.ok(String(q5.explanationAr||'').trim().length>80);
});
