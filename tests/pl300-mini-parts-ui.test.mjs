import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPl300FullRankedReviewMarkup} from '../assets/js/pl300-full-ranked-learning.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(root,'assets/js/app.js'),'utf8');

test('Full Ranked review UI exposes active Study Part context and selected-part progress',()=>{
  const html=buildPl300FullRankedReviewMarkup({
    questionsLength:18,currentIndex:2,filterLabel:'Prepare the Data → Power Query · Part 1',
    activePartLabel:'Prepare the Data → Power Query & Data Cleaning · Part 1',
    partCompleted:7,partTotal:18
  });
  assert.match(html,/class="pl300-study-part-context"/);
  assert.match(html,/data-pl300-parts-back/);
  assert.match(html,/Prepare the Data → Power Query &amp; Data Cleaning · Part 1/);
  assert.match(html,/7\s*\/\s*18 studied/);
  assert.doesNotMatch(html,/id="sourceReviewPart"/);
});

test('app builds mini parts once for the 509 bank, filters by the selected part, and wires part-card navigation',()=>{
  assert.match(app,/voucherSourceReviewParts:\[\]/);
  assert.match(app,/voucherSourceReviewPartId:"all"/);
  assert.match(app,/buildPl300MiniParts\(\{index:state\.voucherFullRankedIndex,architecture:state\.voucherContentArchitecture/);
  assert.match(app,/filterPl300QuestionsByPart\(\{questions,partId:state\.voucherSourceReviewPartId,parts:state\.voucherSourceReviewParts\}\)/);
  assert.match(app,/data-pl300-part-select/);
  assert.match(app,/data-pl300-parts-back/);
  assert.match(app,/selectVoucherSourceReviewPart/);
  assert.doesNotMatch(app,/\$\("sourceReviewPart"\)\?\.addEventListener\("change"/);
});
