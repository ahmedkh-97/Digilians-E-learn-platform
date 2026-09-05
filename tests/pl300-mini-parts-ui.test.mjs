import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPl300FullRankedReviewMarkup} from '../assets/js/pl300-full-ranked-learning.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(root,'assets/js/app.js'),'utf8');

test('Full Ranked review UI exposes a primary Study Part selector and selected-part progress',()=>{
  const html=buildPl300FullRankedReviewMarkup({
    questionsLength:18,currentIndex:2,filterLabel:'Prepare the Data → Power Query · Part 1',
    partOptionsHtml:'<option value="all">All 509 Questions</option><option value="prepare-data::pl300-s02-power-query::part-1" selected>Prepare the Data → Power Query &amp; Data Cleaning · Part 1 · 18 Questions</option>',
    activePartLabel:'Prepare the Data → Power Query & Data Cleaning · Part 1',
    partCompleted:7,partTotal:18
  });
  assert.match(html,/class="pl300-study-part-picker"/);
  assert.match(html,/id="sourceReviewPart"/);
  assert.match(html,/Prepare the Data → Power Query &amp; Data Cleaning · Part 1 · 18 Questions/);
  assert.match(html,/Part Progress/);
  assert.match(html,/7\s*\/\s*18/);
});

test('app builds mini parts once for the 509 bank, filters by the selected part, and wires selector changes',()=>{
  assert.match(app,/voucherSourceReviewParts:\[\]/);
  assert.match(app,/voucherSourceReviewPartId:"all"/);
  assert.match(app,/buildPl300MiniParts\(\{index:state\.voucherFullRankedIndex,architecture:state\.voucherContentArchitecture/);
  assert.match(app,/filterPl300QuestionsByPart\(\{questions,partId:state\.voucherSourceReviewPartId,parts:state\.voucherSourceReviewParts\}\)/);
  assert.match(app,/\$\("sourceReviewPart"\)\?\.addEventListener\("change"/);
});
