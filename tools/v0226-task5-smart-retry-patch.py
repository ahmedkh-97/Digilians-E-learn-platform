from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]

def replace_once(path, old, new):
    p=ROOT/path
    text=p.read_text(encoding='utf-8')
    if new in text:
        return False
    if old not in text:
        raise SystemExit(f'Missing anchor in {path}: {old[:120]!r}')
    p.write_text(text.replace(old,new,1),encoding='utf-8')
    return True

# 1) Learning-loop model: weak parts cannot bypass review.
p=ROOT/'assets/js/pl300-learning-loop.js'
text=p.read_text(encoding='utf-8')
text=text.replace("    secondaryAction:metrics.needReview?'Continue to next part':null\n", "    secondaryAction:null\n")
p.write_text(text,encoding='utf-8')

# 2) Full-ranked presentation helpers and actions.
p=ROOT/'assets/js/pl300-full-ranked-learning.js'
text=p.read_text(encoding='utf-8')
if 'export function pl300SourceNextActionLabel' not in text:
    anchor="export function buildSourcePracticeOptionsMarkup({question,record,selected=[],locked=false,retrying=false,renderRichText=value=>htmlEscape(value)}={}){"
    insert="export function pl300SourceNextActionLabel(record){\n  return record?'Next →':'Skip for now →';\n}\n\n"
    if anchor not in text: raise SystemExit('full-ranked options anchor missing')
    text=text.replace(anchor,insert+anchor,1)

old="""  const actions=locked
    ?'<div class=\"source-practice-actions\"><button type=\"button\" class=\"secondary-btn\" id=\"sourcePracticeRetryBtn\">Retry Question</button><small>Saved answer is locked. Retry creates a new attempt.</small></div>'
    :`<div class=\"source-practice-actions\"><button type=\"button\" class=\"primary-btn\" id=\"sourcePracticeCheckBtn\" ${selected.length?'':'disabled'}>Check answer</button><small>${multi?`Select ${correctIds.length} answers.`:'Select one answer.'} First-pass scoring is preserved.</small></div>`;
"""
new="""  const actions=locked
    ?record?.correct===false
      ?'<div class=\"source-practice-actions source-practice-recovery-actions\"><button type=\"button\" class=\"primary-btn\" id=\"sourcePracticeRetryLaterBtn\">Review & retry later</button><button type=\"button\" class=\"secondary-btn\" id=\"sourcePracticeRetryBtn\">Retry now</button><small>First-pass score stays fixed. Retry can recover mastery without rewriting history.</small></div>'
      :'<div class=\"source-practice-actions\"><small>Answer saved. Continue when ready.</small></div>'
    :`<div class=\"source-practice-actions\"><button type=\"button\" class=\"primary-btn\" id=\"sourcePracticeCheckBtn\" ${selected.length?'':'disabled'}>Check answer</button><small>${multi?`Select ${correctIds.length} answers.`:'Select one answer.'} First-pass scoring is preserved.</small></div>`;
"""
if old in text: text=text.replace(old,new,1)
elif 'sourcePracticeRetryLaterBtn' not in text: raise SystemExit('full-ranked locked action anchor missing')

# Add End-of-Part markup before main review builder.
if 'export function buildPl300EndOfPartReviewMarkup' not in text:
    anchor='export function buildPl300FullRankedReviewMarkup({'
    block="""export function buildPl300EndOfPartReviewMarkup({part={},review={},nextPart=null}={}){
  const studied=Math.max(0,Number(review?.studied)||0);
  const total=Math.max(0,Number(review?.total)||0);
  const firstPass=Math.max(0,Number(review?.firstPassCorrect)||0);
  const recovered=Math.max(0,Number(review?.recovered)||0);
  const needReview=Math.max(0,Number(review?.needReview)||0);
  const weakIds=Array.isArray(review?.weakQuestionIds)?review.weakQuestionIds:[];
  const title=[part?.domainTitle,part?.sectionTitle,part?.partNumber?`Part ${part.partNumber}`:''].filter(Boolean).join(' · ')||'Current Part';
  const action=needReview
    ?`<button type=\"button\" class=\"primary-btn large-btn\" data-pl300-review-weak>Review ${needReview} weak question${needReview===1?'':'s'} →</button>`
    :nextPart
      ?`<button type=\"button\" class=\"primary-btn large-btn\" data-pl300-continue-next-part=\"${htmlEscape(nextPart.id||'')}\">Continue to next part →</button>`
      :'<button type=\"button\" class=\"primary-btn large-btn\" data-pl300-continue-next-part=\"all\">Back to all parts →</button>';
  return `<section class=\"pl300-end-part-review\" data-pl300-end-part-review><span class=\"eyebrow\">END-OF-PART REVIEW</span><h2>End-of-Part Review</h2><p>${htmlEscape(title)}</p><div class=\"pl300-end-part-metrics\"><div>Studied <strong>${studied} / ${total}</strong></div><div>First-pass correct <strong>${firstPass}</strong></div><div>Recovered <strong>${recovered}</strong></div><div>Need review <strong>${needReview}</strong></div></div>${needReview?`<p class=\"pl300-end-part-note\">${weakIds.length} question${weakIds.length===1?'':'s'} still need recovery. Review them before moving on.</p>`:'<p class=\"pl300-end-part-note\">Part mastered. Your first-pass history remains unchanged.</p>'}<div class=\"pl300-end-part-actions\">${action}<button type=\"button\" class=\"secondary-btn\" data-pl300-parts-back>All parts</button></div></section>`;
}

"""
    if anchor not in text: raise SystemExit('full-ranked review builder anchor missing')
    text=text.replace(anchor,block+anchor,1)

# Allow app to control Next/Skip label.
needle="  partOptionsHtml='<option value=\"all\">All 509 Questions</option>',partCatalogHtml='',showPartCatalog=false,"
if needle in text and 'nextActionLabel=' not in text[text.find('export function buildPl300FullRankedReviewMarkup'):text.find('export function buildPl300FullRankedLandingMarkup')]:
    text=text.replace(needle,needle+"\n  nextActionLabel='Next →',",1)
text=text.replace('>${index>=length-1?\'disabled\':\'\'}>Next →</button></nav>`;', ">${index>=length-1?'disabled':''}>${htmlEscape(nextActionLabel)}</button></nav>`;")
p.write_text(text,encoding='utf-8')

# 3) Native structured retry actions.
p=ROOT/'assets/js/voucher-source-practice-native.js'
text=p.read_text(encoding='utf-8')
old="const actions=locked?`<div class=\"source-practice-actions\"><button type=\"button\" class=\"secondary-btn\" id=\"sourcePracticeNativeRetryBtn\">Retry Question</button><small>Saved answer is locked. Retry starts a new attempt.</small></div>`:"
new="const actions=locked?(record?.correct===false?`<div class=\"source-practice-actions source-practice-recovery-actions\"><button type=\"button\" class=\"primary-btn\" id=\"sourcePracticeRetryLaterBtn\">Review & retry later</button><button type=\"button\" class=\"secondary-btn\" id=\"sourcePracticeNativeRetryBtn\">Retry now</button><small>First-pass score stays fixed. Retry can recover mastery without rewriting history.</small></div>`:`<div class=\"source-practice-actions\"><small>Answer saved. Continue when ready.</small></div>`):"
if old in text: text=text.replace(old,new,1)
elif 'source-practice-recovery-actions' not in text: raise SystemExit('native actions anchor missing')
p.write_text(text,encoding='utf-8')

# 4) Selection guard must re-apply after all new controller actions.
p=ROOT/'assets/js/pl300-source-practice-selection-guard.js'
text=p.read_text(encoding='utf-8')
old="const postRenderClickSelector='#sourceReviewNext,#sourceReviewPrev,#sourceReviewJumpBtn,#sourcePracticeRetryBtn,[data-source-review-filter],[data-pl300-part-select],[data-pl300-parts-back]';"
new="const postRenderClickSelector='#sourceReviewNext,#sourceReviewPrev,#sourceReviewJumpBtn,#sourcePracticeRetryBtn,#sourcePracticeNativeRetryBtn,#sourcePracticeRetryLaterBtn,[data-source-review-filter],[data-pl300-part-select],[data-pl300-parts-back],[data-pl300-review-weak],[data-pl300-continue-next-part]';"
if old in text: text=text.replace(old,new,1)
elif new not in text: raise SystemExit('selection guard selector anchor missing')
p.write_text(text,encoding='utf-8')

# 5) App controller wiring.
p=ROOT/'assets/js/app.js'
text=p.read_text(encoding='utf-8')

# Import persisted learning state APIs.
old='  getVoucherSourcePracticeState,saveVoucherSourcePracticeResult,\n'
new='  getVoucherSourcePracticeState,saveVoucherSourcePracticeResult,getVoucherSourceLearningState,saveVoucherSourceLearningState,\n'
if old in text: text=text.replace(old,new,1)
elif 'getVoucherSourceLearningState' not in text: raise SystemExit('app voucher import anchor missing')

# Release constant used by lazy controller import (Task 6 will propagate it everywhere).
if 'const BUILD_VERSION=' not in text:
    anchor='const state={\n'
    if anchor not in text: raise SystemExit('app state anchor missing')
    text=text.replace(anchor,"const BUILD_VERSION='0.22.6';\n\n"+anchor,1)

# State fields.
old='  voucherSourcePracticeRetrying:new Set(),\n  voucherFullRankedIndex:null,\n'
new='  voucherSourcePracticeRetrying:new Set(),\n  voucherSourceLearningState:{version:1,parts:{}},\n  voucherSourceReviewWeakIds:null,\n  voucherSourcePartReviewMode:null,\n  voucherFullRankedIndex:null,\n'
if old in text: text=text.replace(old,new,1)
elif 'voucherSourceLearningState' not in text: raise SystemExit('app state fields anchor missing')

# Lazy module loader.
old='let voucherSourcePracticeNative=null;\nlet pl300FullRankedLearning=null;\n\nasync function ensurePl300FullRankedLearning(){\n'
new='let voucherSourcePracticeNative=null;\nlet pl300FullRankedLearning=null;\nlet pl300LearningLoop=null;\n\nasync function ensurePl300LearningLoop(){\n  pl300LearningLoop??=await import(`./pl300-learning-loop.js?v=${BUILD_VERSION}`);\n  return pl300LearningLoop;\n}\n\nasync function ensurePl300FullRankedLearning(){\n'
if old in text: text=text.replace(old,new,1)
elif 'async function ensurePl300LearningLoop' not in text: raise SystemExit('app loader anchor missing')

# Ensure loader + persisted state on entry.
old='    await ensurePl300FullRankedLearning();\n    await loadVoucherFullRankedIndex(config);\n    voucherSourcePracticeNative??=await import("./voucher-source-practice-native.js?v=0.22.5");\n'
new='    await ensurePl300FullRankedLearning();\n    await ensurePl300LearningLoop();\n    await loadVoucherFullRankedIndex(config);\n    state.voucherSourceLearningState=getVoucherSourceLearningState(mistakeOwnerId(),config.id);\n    voucherSourcePracticeNative??=await import("./voucher-source-practice-native.js?v=0.22.5");\n'
if old in text: text=text.replace(old,new,1)
elif 'state.voucherSourceLearningState=getVoucherSourceLearningState' not in text: raise SystemExit('app open learning anchor missing')

old='    state.voucherSourcePracticeRetrying=new Set();\n    state.voucherSourceRevealOpened=new Set();\n'
new='    state.voucherSourcePracticeRetrying=new Set();\n    state.voucherSourceReviewWeakIds=null;\n    state.voucherSourcePartReviewMode=null;\n    state.voucherSourceRevealOpened=new Set();\n'
if old in text: text=text.replace(old,new,1)

# Filter weak-question review scope.
old="""  const partQuestions=pl300FullRankedLearning?.filterPl300QuestionsByPart
    ?pl300FullRankedLearning.filterPl300QuestionsByPart({questions,partId:state.voucherSourceReviewPartId,parts:state.voucherSourceReviewParts})
    :questions;
  if(state.voucherSourceReviewFilter===\"source-01\"||state.voucherSourceReviewFilter===\"source-02\")return partQuestions.filter(q=>String(q.sourceId)===state.voucherSourceReviewFilter);
"""
new="""  let partQuestions=pl300FullRankedLearning?.filterPl300QuestionsByPart
    ?pl300FullRankedLearning.filterPl300QuestionsByPart({questions,partId:state.voucherSourceReviewPartId,parts:state.voucherSourceReviewParts})
    :questions;
  if(state.voucherSourceReviewWeakIds instanceof Set)partQuestions=partQuestions.filter(q=>state.voucherSourceReviewWeakIds.has(String(q.id)));
  if(state.voucherSourceReviewFilter===\"source-01\"||state.voucherSourceReviewFilter===\"source-02\")return partQuestions.filter(q=>String(q.sourceId)===state.voucherSourceReviewFilter);
"""
if old in text: text=text.replace(old,new,1)
elif 'voucherSourceReviewWeakIds instanceof Set' not in text: raise SystemExit('app filtered questions anchor missing')

# Insert controller helpers before selectVoucherSourceReviewPart.
anchor="\nfunction selectVoucherSourceReviewPart(partId='all'){\n"
if 'function navigateVoucherSourceQuestion' not in text:
    helpers="""
function voucherActiveSourcePart(){
  if(state.voucherSourceReviewPartId==='all')return null;
  return state.voucherSourceReviewParts.find(part=>String(part.id)===String(state.voucherSourceReviewPartId))||null;
}
function persistVoucherSourceLearningState(nextState=state.voucherSourceLearningState){
  state.voucherSourceLearningState=nextState||{version:1,parts:{}};
  saveVoucherSourceLearningState(mistakeOwnerId(),state.voucherExamConfig?.id||'microsoft-pl-300',state.voucherSourceLearningState);
  return state.voucherSourceLearningState;
}
function voucherPartRemainingFirstPass(part,records){
  return (part?.questionIds||[]).filter(id=>!records?.[id]).length;
}
function updateVoucherLearningAfterScoredSave({question,correct,wasRetrying=false,hadRecord=false}={}){
  const part=voucherActiveSourcePart();
  if(!part||!question?.id||!pl300LearningLoop)return;
  const examId=state.voucherExamConfig?.id||'microsoft-pl-300';
  const records=getVoucherSourcePracticeState(mistakeOwnerId(),examId).records||{};
  let learning=state.voucherSourceLearningState||getVoucherSourceLearningState(mistakeOwnerId(),examId);
  if(wasRetrying||hadRecord){
    learning=pl300LearningLoop.resolvePl300PendingRetry({state:learning,partId:part.id,questionId:question.id,correct});
  }else if(correct===false){
    learning=pl300LearningLoop.enqueuePl300DelayedRetry({state:learning,partId:part.id,questionId:question.id,remainingFirstPassCount:voucherPartRemainingFirstPass(part,records)});
  }
  persistVoucherSourceLearningState(learning);
  if(correct===true&&state.voucherSourceReviewWeakIds instanceof Set){
    state.voucherSourceReviewWeakIds.delete(String(question.id));
    if(!state.voucherSourceReviewWeakIds.size){
      state.voucherSourceReviewWeakIds=null;
      state.voucherSourcePartReviewMode='complete';
    }
  }
}
function navigateVoucherSourceQuestion(nextIndex,{countTransition=true}={}){
  const questions=voucherSourceReviewFilteredQuestions();
  if(!questions.length)return;
  const currentIndex=Math.max(0,Math.min(state.voucherSourceReviewIndex,questions.length-1));
  const bounded=Math.max(0,Math.min(Number(nextIndex)||0,questions.length-1));
  const from=questions[currentIndex],requested=questions[bounded];
  let targetIndex=bounded;
  const part=voucherActiveSourcePart();
  if(countTransition&&part&&pl300LearningLoop&&!(state.voucherSourceReviewWeakIds instanceof Set)&&from?.id&&requested?.id&&String(from.id)!==String(requested.id)){
    const advanced=pl300LearningLoop.advancePl300RetryQueue({state:state.voucherSourceLearningState,partId:part.id,fromQuestionId:from.id,toQuestionId:requested.id});
    persistVoucherSourceLearningState(advanced.state);
    if(advanced.maturedQuestionId){
      const retryIndex=questions.findIndex(question=>String(question.id)===String(advanced.maturedQuestionId));
      if(retryIndex>=0){
        targetIndex=retryIndex;
        state.voucherSourcePracticeRetrying.add(String(advanced.maturedQuestionId));
      }
    }
  }
  voucherSourceResetSolveTimer();
  state.voucherSourceReviewIndex=targetIndex;
  state.voucherSourcePartReviewMode=null;
  renderVoucherSourceReview();
  window.scrollTo({top:0,behavior:'smooth'});
}
function voucherPartReviewContext(part){
  const examId=state.voucherExamConfig?.id||'microsoft-pl-300';
  const records=getVoucherSourcePracticeState(mistakeOwnerId(),examId).records||{};
  const review=pl300LearningLoop.buildPl300PartReviewModel({part,index:state.voucherFullRankedIndex,records});
  const partIndex=state.voucherSourceReviewParts.findIndex(item=>String(item.id)===String(part?.id));
  const nextPart=partIndex>=0?state.voucherSourceReviewParts[partIndex+1]||null:null;
  return {records,review,nextPart};
}
function renderVoucherEndOfPartReview(body,part){
  const {review,nextPart}=voucherPartReviewContext(part);
  body.innerHTML=pl300FullRankedLearning.buildPl300EndOfPartReviewMarkup({part,review,nextPart:nextPart?{id:nextPart.id,label:nextPart.label||nextPart.title||nextPart.id}:null});
  body.querySelector('[data-pl300-review-weak]')?.addEventListener('click',()=>{
    state.voucherSourceReviewWeakIds=new Set(review.weakQuestionIds.map(String));
    state.voucherSourcePartReviewMode=null;
    state.voucherSourceReviewIndex=0;
    renderVoucherSourceReview();
    window.scrollTo({top:0,behavior:'smooth'});
  });
  body.querySelector('[data-pl300-continue-next-part]')?.addEventListener('click',event=>{
    const target=String(event.currentTarget?.dataset?.pl300ContinueNextPart||'all');
    selectVoucherSourceReviewPart(target||'all');
  });
  body.querySelector('[data-pl300-parts-back]')?.addEventListener('click',()=>selectVoucherSourceReviewPart('all'));
}
"""
    if anchor not in text: raise SystemExit('app part select anchor missing')
    text=text.replace(anchor,'\n'+helpers+anchor,1)

# Upgrade part selection to resume intelligently.
old="""function selectVoucherSourceReviewPart(partId='all'){
  voucherSourceResetSolveTimer();
  const requested=String(partId||'all');
  state.voucherSourceReviewPartId=requested==='all'||state.voucherSourceReviewParts.some(part=>String(part.id)===requested)?requested:'all';
  state.voucherSourceReviewIndex=0;
  renderVoucherSourceReview();
  window.scrollTo({top:0,behavior:'smooth'});
}
"""
new="""function selectVoucherSourceReviewPart(partId='all'){
  voucherSourceResetSolveTimer();
  const requested=String(partId||'all');
  state.voucherSourceReviewPartId=requested==='all'||state.voucherSourceReviewParts.some(part=>String(part.id)===requested)?requested:'all';
  state.voucherSourceReviewWeakIds=null;
  state.voucherSourcePartReviewMode=null;
  state.voucherSourceReviewFilter='all';
  state.voucherSourceReviewIndex=0;
  const part=voucherActiveSourcePart();
  if(part&&pl300LearningLoop){
    const records=getVoucherSourcePracticeState(mistakeOwnerId(),state.voucherExamConfig?.id||'microsoft-pl-300').records||{};
    const resume=pl300LearningLoop.resolvePl300PartResume({part,index:state.voucherFullRankedIndex,records});
    if(resume.mode==='question'){
      const questions=voucherSourceReviewFilteredQuestions();
      const index=questions.findIndex(question=>String(question.id)===String(resume.questionId));
      state.voucherSourceReviewIndex=index>=0?index:0;
    }else state.voucherSourcePartReviewMode=resume.mode;
  }
  renderVoucherSourceReview();
  window.scrollTo({top:0,behavior:'smooth'});
}
"""
if old in text: text=text.replace(old,new,1)
elif 'const resume=pl300LearningLoop.resolvePl300PartResume' not in text: raise SystemExit('app select part replacement missing')

# End-of-part interstitial before normal question rendering.
old="""  const questions=voucherSourceReviewFilteredQuestions();
  if(!questions.length)state.voucherSourceReviewIndex=0;
  state.voucherSourceReviewIndex=Math.max(0,Math.min(state.voucherSourceReviewIndex,Math.max(0,questions.length-1)));
  const q=questions[state.voucherSourceReviewIndex]||null;
  const totalAll=bank.questions?.length||0;
"""
new="""  const activePart=voucherActiveSourcePart();
  if(activePart&&pl300LearningLoop&&!(state.voucherSourceReviewWeakIds instanceof Set)){
    const {review}=voucherPartReviewContext(activePart);
    if(state.voucherSourcePartReviewMode||review.completeFirstPass){
      state.voucherSourcePartReviewMode=review.needReview?'review':'complete';
      renderVoucherEndOfPartReview(body,activePart);
      voucherSourceResetSolveTimer();
      return;
    }
  }
  const questions=voucherSourceReviewFilteredQuestions();
  if(!questions.length){
    if(activePart){state.voucherSourceReviewWeakIds=null;state.voucherSourcePartReviewMode='complete';renderVoucherEndOfPartReview(body,activePart);return;}
    state.voucherSourceReviewIndex=0;
  }
  state.voucherSourceReviewIndex=Math.max(0,Math.min(state.voucherSourceReviewIndex,Math.max(0,questions.length-1)));
  const q=questions[state.voucherSourceReviewIndex]||null;
  const totalAll=bank.questions?.length||0;
"""
if old in text: text=text.replace(old,new,1)
elif 'renderVoucherEndOfPartReview(body,activePart)' not in text: raise SystemExit('app end part render anchor missing')

# Pass navigation label into markup.
old='    visualHtml,optionsHtml,nativeHtml,revealOpen,answerHtml:voucherSourceReviewAnswerHtml(q,practiceRecord)\n  });'
new='    visualHtml,optionsHtml,nativeHtml,revealOpen,answerHtml:voucherSourceReviewAnswerHtml(q,practiceRecord),nextActionLabel:pl300FullRankedLearning.pl300SourceNextActionLabel(practiceRecord)\n  });'
if old in text: text=text.replace(old,new,1)
elif 'nextActionLabel:pl300FullRankedLearning.pl300SourceNextActionLabel' not in text: raise SystemExit('app markup label anchor missing')

# Auto save learning update.
old="""    saveVoucherSourcePracticeResult(mistakeOwnerId(),q.id,{
      examId:state.voucherExamConfig?.id||\"microsoft-pl-300\",
      sourceId:q.sourceId||state.voucherSourceReviewSourceId||\"\",
      mode:\"auto\",selected,correct,activeSeconds
    });
    delete state.voucherSourcePracticeSelections[q.id];
"""
new="""    const hadRecord=Boolean(practiceRecord);
    saveVoucherSourcePracticeResult(mistakeOwnerId(),q.id,{
      examId:state.voucherExamConfig?.id||\"microsoft-pl-300\",
      sourceId:q.sourceId||state.voucherSourceReviewSourceId||\"\",
      mode:\"auto\",selected,correct,activeSeconds
    });
    updateVoucherLearningAfterScoredSave({question:q,correct,wasRetrying:retrying,hadRecord});
    delete state.voucherSourcePracticeSelections[q.id];
"""
if old in text: text=text.replace(old,new,1)
elif 'updateVoucherLearningAfterScoredSave({question:q,correct,wasRetrying:retrying,hadRecord})' not in text: raise SystemExit('app auto learning update anchor missing')

# Retry-later handler before Retry now.
anchor='  $("sourcePracticeRetryBtn")?.addEventListener("click",()=>{\n'
if '$("sourcePracticeRetryLaterBtn")?.addEventListener' not in text:
    block="""  $("sourcePracticeRetryLaterBtn")?.addEventListener("click",()=>{
    if(!practiceRecord||practiceRecord.correct!==false)return;
    if(state.voucherSourceReviewIndex<questions.length-1)navigateVoucherSourceQuestion(state.voucherSourceReviewIndex+1);
    else renderVoucherSourceReview();
  });
"""
    if anchor not in text: raise SystemExit('app retry handler anchor missing')
    text=text.replace(anchor,block+anchor,1)

# Native save learning update.
old="""    onSave:({answers,correct})=>{
      const activeSeconds=voucherSourceConsumeSolveSeconds(q);
      saveVoucherSourcePracticeResult(mistakeOwnerId(),q.id,{examId:state.voucherExamConfig?.id||\"microsoft-pl-300\",sourceId:q.sourceId||state.voucherSourceReviewSourceId||\"\",mode:\"native\",answers,correct,activeSeconds});
      delete state.voucherSourcePracticeNativeInputs[q.id];
"""
new="""    onSave:({answers,correct})=>{
      const activeSeconds=voucherSourceConsumeSolveSeconds(q);
      const hadRecord=Boolean(practiceRecord);
      const wasRetrying=state.voucherSourcePracticeRetrying?.has?.(String(q.id||\"\"));
      saveVoucherSourcePracticeResult(mistakeOwnerId(),q.id,{examId:state.voucherExamConfig?.id||\"microsoft-pl-300\",sourceId:q.sourceId||state.voucherSourceReviewSourceId||\"\",mode:\"native\",answers,correct,activeSeconds});
      updateVoucherLearningAfterScoredSave({question:q,correct,wasRetrying,hadRecord});
      delete state.voucherSourcePracticeNativeInputs[q.id];
"""
if old in text: text=text.replace(old,new,1)
elif 'const wasRetrying=state.voucherSourcePracticeRetrying?.has?.(String(q.id||""));' not in text: raise SystemExit('app native learning update anchor missing')

# Replace direct navigation with controller helper; jump does not count a normal transition.
old='  $("sourceReviewPrev")?.addEventListener("click",()=>{if(state.voucherSourceReviewIndex>0){voucherSourceResetSolveTimer();state.voucherSourceReviewIndex-=1;renderVoucherSourceReview();window.scrollTo({top:0,behavior:"smooth"})}});\n  $("sourceReviewNext")?.addEventListener("click",()=>{if(state.voucherSourceReviewIndex<questions.length-1){voucherSourceResetSolveTimer();state.voucherSourceReviewIndex+=1;renderVoucherSourceReview();window.scrollTo({top:0,behavior:"smooth"})}});\n'
new='  $("sourceReviewPrev")?.addEventListener("click",()=>{if(state.voucherSourceReviewIndex>0)navigateVoucherSourceQuestion(state.voucherSourceReviewIndex-1)});\n  $("sourceReviewNext")?.addEventListener("click",()=>{if(state.voucherSourceReviewIndex<questions.length-1)navigateVoucherSourceQuestion(state.voucherSourceReviewIndex+1)});\n'
if old in text: text=text.replace(old,new,1)
elif 'navigateVoucherSourceQuestion(state.voucherSourceReviewIndex+1)' not in text: raise SystemExit('app prev/next nav anchor missing')
old='    voucherSourceResetSolveTimer();\n    state.voucherSourceReviewIndex=requested-1;renderVoucherSourceReview();window.scrollTo({top:0,behavior:"smooth"});\n'
new='    navigateVoucherSourceQuestion(requested-1,{countTransition:false});\n'
if old in text: text=text.replace(old,new,1)

p.write_text(text,encoding='utf-8')

print('Task 5 Smart Retry + End-of-Part Review patch applied.')
