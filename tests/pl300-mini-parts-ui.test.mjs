import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPl300FullRankedReviewMarkup} from '../assets/js/pl300-full-ranked-learning.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(root,'assets/js/app.js'),'utf8');
const controller=fs.readFileSync(path.join(root,'assets/js/pl300-learning-controller.js'),'utf8');

// V0.22.4 replaces the legacy in-question selector with pre-entry part cards and an explicit back-to-parts action.
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

test('app builds mini parts once for the 509 bank while lazy controller owns selected-part filtering and navigation',()=>{
  assert.match(app,/voucherSourceReviewParts:\[\]/);
  assert.match(app,/voucherSourceReviewPartId:"all"/);
  assert.match(app,/buildPl300MiniParts\(\{index:state\.voucherFullRankedIndex,architecture:state\.voucherContentArchitecture/);
  assert.match(controller,/filterPl300QuestionsByPart/);
  assert.match(controller,/partId:state\.voucherSourceReviewPartId/);
  assert.match(controller,/parts:state\.voucherSourceReviewParts/);
  assert.match(app,/data-pl300-part-select/);
  assert.match(app,/data-pl300-parts-back/);
  assert.match(app,/selectVoucherSourceReviewPart/);
  assert.doesNotMatch(app,/\$\("sourceReviewPart"\)\?\.addEventListener\("change"/);
});
