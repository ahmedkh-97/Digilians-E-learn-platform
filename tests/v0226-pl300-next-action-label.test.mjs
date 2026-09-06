import test from 'node:test';
import assert from 'node:assert/strict';
import * as fullRank from '../assets/js/pl300-full-ranked-learning.js';

test('full ranked renderer uses the supplied next action label',()=>{
  assert.equal(fullRank.pl300SourceNextActionLabel(null),'Skip for now →');
  assert.equal(fullRank.pl300SourceNextActionLabel({mode:'auto'}),'Next →');

  const html=fullRank.buildPl300FullRankedReviewMarkup({
    questionsLength:2,
    currentIndex:0,
    question:{id:'q1',reviewMode:'scored-text',options:[{id:'A',text:'A'}],correctAnswer:'A'},
    sourceLabel:'Source 01',
    questionNumber:'1',
    questionHtml:'Question',
    nextActionLabel:'Skip for now →'
  });

  assert.match(html,/id="sourceReviewNext"[^>]*>Skip for now →<\/button>/);
});
