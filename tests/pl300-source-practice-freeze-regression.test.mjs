import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const guard=fs.readFileSync(new URL('../assets/js/pl300-source-practice-selection-guard.js',import.meta.url),'utf8');

test('selection guard never observes rendered DOM mutations',()=>{
  assert.doesNotMatch(guard,/\bMutationObserver\b/);
  assert.doesNotMatch(guard,/\bnew\s+Observer\b/);
  assert.doesNotMatch(guard,/\.observe\(root,/);
});

test('selection guard reapplies only after explicit source-practice rerender actions',()=>{
  assert.match(guard,/#sourceReviewNext/);
  assert.match(guard,/#sourceReviewPrev/);
  assert.match(guard,/#sourcePracticeRetryBtn/);
  assert.match(guard,/#sourceReviewJumpBtn/);
  assert.match(guard,/\[data-source-review-filter\]/);
  assert.match(guard,/queueMicrotask\(\(\)=>\{/);
});
