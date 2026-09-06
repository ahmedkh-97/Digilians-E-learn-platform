import test from 'node:test';
import assert from 'node:assert/strict';
import * as fullRank from '../assets/js/pl300-full-ranked-learning.js';

const fn=name=>{assert.equal(typeof fullRank[name],'function',`${name} must be exported`);return fullRank[name];};

const single={id:'single',reviewMode:'scored-text',options:[{id:'A',text:'a'},{id:'B',text:'b'}],correctAnswer:'A'};
const multi={id:'multi',reviewMode:'scored-text',options:[{id:'A',text:'a'},{id:'B',text:'b'},{id:'C',text:'c'}],correctAnswers:['A','B']};
const dropdowns={id:'drop',reviewMode:'native-structured',nativeResponse:{interaction:'fields',fields:[{id:'f1',expected:['A'],choices:['A','B']}]}};
const yesNo={id:'yn',reviewMode:'native-structured',nativeResponse:{interaction:'yes-no',fields:[{id:'f1',expected:['Yes'],choices:['Yes','No']}]}};
const ordering={id:'order',reviewMode:'native-structured',sourceType:'drag-drop',nativeResponse:{interaction:'ordered-fields',fields:[{id:'f1',expected:['A'],choices:['A','B']},{id:'f2',expected:['B'],choices:['A','B']}]}};
const textEntry={id:'text',reviewMode:'native-structured',sourceType:'hotspot',nativeResponse:{interaction:'fields',fields:[{id:'f1',expected:['typed value']}]}};
const checkpoint={id:'cp',reviewMode:'source-reveal'};

test('interaction labels describe the rendered learner control instead of source/internal types',()=>{
  const label=fn('pl300InteractionLabel');
  assert.equal(label(single),'SINGLE CHOICE · RANKED');
  assert.equal(label(multi),'MULTI SELECT · SELECT 2');
  assert.equal(label(dropdowns),'DROPDOWNS · RANKED');
  assert.equal(label(yesNo),'YES / NO · RANKED');
  assert.equal(label(ordering),'ORDERING · RANKED');
  assert.equal(label(textEntry),'TEXT ENTRY · RANKED');
  assert.equal(label(checkpoint),'STUDY CHECKPOINT');
});

test('question progress separates position from studied completion and uses one studied percentage',()=>{
  const model=fn('buildPl300QuestionProgressModel')({index:0,length:14,studied:4,total:14});
  assert.deepEqual(model,{questionLabel:'Question 1 of 14',studiedLabel:'Studied 4 of 14',percentage:29});
});

const index={records:[
  {questionId:'q1',mode:'objective',equivalenceClusterId:'c1',ranking:{accuracyWeight:1}},
  {questionId:'q2',mode:'objective',equivalenceClusterId:'c2',ranking:{accuracyWeight:1}},
  {questionId:'q3',mode:'checkpoint',ranking:{accuracyWeight:0}},
  {questionId:'q4',mode:'objective',equivalenceClusterId:'c2',ranking:{accuracyWeight:1}}
]};
const part={id:'p1',domainTitle:'Prepare the Data',sectionTitle:'Power Query',partNumber:1,count:4,questionIds:['q1','q2','q3','q4'],label:'Prepare the Data → Power Query · Part 1 · 4 Questions'};

test('part card model gives the correct next study action and checkpoint-safe first-pass accuracy',()=>{
  const build=fn('buildPl300PartCardModel');
  const empty=build({part,index,records:{}});
  assert.equal(empty.actionLabel,'Start Part');
  assert.equal(empty.firstPassAccuracyLabel,'—');
  assert.equal(empty.studied,0);

  const partial=build({part,index,records:{q1:{mode:'auto',firstPassCorrect:true,everCorrect:true},q3:{mode:'checkpoint',reviewStatus:'reviewed'}}});
  assert.equal(partial.actionLabel,'Continue Part');
  assert.equal(partial.firstPassAccuracyLabel,'100%');
  assert.equal(partial.studied,2);
  assert.equal(partial.mistakes,0);
  assert.equal(partial.mastered,1);

  const weak=build({part,index,records:{
    q1:{mode:'auto',firstPassCorrect:true,everCorrect:true},
    q2:{mode:'auto',firstPassCorrect:false,everCorrect:false},
    q3:{mode:'checkpoint',reviewStatus:'reviewed'},
    q4:{mode:'auto',firstPassCorrect:false,everCorrect:true}
  }});
  assert.equal(weak.actionLabel,'Review Mistakes');
  assert.equal(weak.firstPassAccuracyLabel,'33.3%');
  assert.equal(weak.mistakes,1);
  assert.equal(weak.mastered,2,'q2/q4 share c2 so mastery stays duplicate-safe');

  const mastered=build({part,index,records:{
    q1:{mode:'auto',firstPassCorrect:true,everCorrect:true},
    q2:{mode:'auto',firstPassCorrect:false,everCorrect:true},
    q3:{mode:'checkpoint',reviewStatus:'reviewed'},
    q4:{mode:'auto',firstPassCorrect:true,everCorrect:true}
  }});
  assert.equal(mastered.actionLabel,'Part Mastered ✓');
  assert.equal(mastered.mistakes,0);
});

test('part catalog renders studied, first-pass accuracy, mistakes and mastered without concatenated metadata',()=>{
  const view=fullRank.buildPl300PartViewState({parts:[part],activePartId:'all',records:{q1:{mode:'auto',firstPassCorrect:true,everCorrect:true}},index,totalAll:509,completedAll:1,activeFilter:'all'});
  assert.match(view.partCatalogHtml,/Studied 1\/4/);
  assert.match(view.partCatalogHtml,/First-pass accuracy 100%/);
  assert.match(view.partCatalogHtml,/Mistakes 0/);
  assert.match(view.partCatalogHtml,/Mastered 1/);
  assert.match(view.partCatalogHtml,/Part 1 · 4 Questions/);
  assert.doesNotMatch(view.partCatalogHtml,/Questions1\s*\/\s*4/);
});

test('active question markup derives interaction label, shows one progress bar, and never leaks obsolete TEXT/NON-RANKED labels',()=>{
  const html=fullRank.buildPl300FullRankedReviewMarkup({
    source01Count:369,source02Count:140,objectiveCount:317,checkpointCount:192,totalAll:509,
    metrics:{completedOccurrences:4,totalOccurrences:509,completionPercentage:1,validatedAccuracy:50,masteredClusters:2,validatedConceptCount:265,firstPassPercentage:50},
    questionsLength:14,currentIndex:0,filterLabel:'Prepare the Data → Power Query · Part 1',objective:true,
    question:dropdowns,typeLabel:'TEXT / RANKED OBJECTIVE',sourceLabel:'Source 01',questionNumber:'54',pageLabel:'Page 65',recordStatus:'NOT STUDIED',
    questionHtml:'QUESTION',activePartLabel:'Prepare the Data → Power Query · Part 1 · 14 Questions',partCompleted:4,partTotal:14
  });
  assert.match(html,/DROPDOWNS · RANKED/);
  assert.doesNotMatch(html,/TEXT \/ RANKED OBJECTIVE/);
  assert.doesNotMatch(html,/NON-RANKED/);
  assert.match(html,/Question 1 of 14/);
  assert.match(html,/Studied 4 of 14/);
  assert.equal((html.match(/class="source-review-progress"/g)||[]).length,1);
  assert.equal((html.match(/pl300-study-part-progress/g)||[]).length,0);
});
