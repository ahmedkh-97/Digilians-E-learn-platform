from pathlib import Path
import re

ROOT=Path(__file__).resolve().parents[1]
app_path=ROOT/'assets/js/app.js'
text=app_path.read_text(encoding='utf-8')

old_loader="""let voucherSourcePracticeNative=null;
let pl300FullRankedLearning=null;
let pl300LearningLoop=null;

async function ensurePl300LearningLoop(){
  pl300LearningLoop??=await import(`./pl300-learning-loop.js?v=${BUILD_VERSION}`);
  return pl300LearningLoop;
}
"""
new_loader="""let voucherSourcePracticeNative=null;
let pl300FullRankedLearning=null;
let pl300LearningLoop=null;
let pl300LearningController=null;

async function ensurePl300LearningLoop(){
  pl300LearningLoop??=await import(`./pl300-learning-loop.js?v=${BUILD_VERSION}`);
  return pl300LearningLoop;
}
async function ensurePl300LearningController(){
  if(pl300LearningController)return pl300LearningController;
  const module=await import(`./pl300-learning-controller.js?v=${BUILD_VERSION}`);
  pl300LearningController=module.createPl300LearningController({
    state,
    getRecords:()=>getVoucherSourcePracticeState(mistakeOwnerId(),state.voucherExamConfig?.id||'microsoft-pl-300').records||{},
    saveLearningState:next=>saveVoucherSourceLearningState(mistakeOwnerId(),state.voucherExamConfig?.id||'microsoft-pl-300',next),
    learningLoop:pl300LearningLoop,
    fullRankedLearning:pl300FullRankedLearning,
    filteredQuestions:voucherSourceReviewFilteredQuestions,
    resetTimer:voucherSourceResetSolveTimer,
    renderReview:renderVoucherSourceReview,
    scrollTop:()=>window.scrollTo({top:0,behavior:'smooth'})
  });
  return pl300LearningController;
}
"""
if old_loader not in text:
    raise SystemExit('learning loader anchor missing')
text=text.replace(old_loader,new_loader,1)

old_open="""    await ensurePl300FullRankedLearning();
    await ensurePl300LearningLoop();
    await loadVoucherFullRankedIndex(config);
"""
new_open="""    await ensurePl300FullRankedLearning();
    await ensurePl300LearningLoop();
    await ensurePl300LearningController();
    await loadVoucherFullRankedIndex(config);
"""
if old_open not in text:
    raise SystemExit('source review open anchor missing')
text=text.replace(old_open,new_open,1)

pattern=re.compile(r"function voucherActiveSourcePart\(\)\{.*?function selectVoucherSourceReviewPart\(partId='all'\)\{.*?\n\}\n",re.S)
replacement="""function voucherActiveSourcePart(){return pl300LearningController?.activePart()||null}
function persistVoucherSourceLearningState(nextState){return pl300LearningController?.persist(nextState)}
function updateVoucherLearningAfterScoredSave(args){return pl300LearningController?.updateAfterScoredSave(args)}
function navigateVoucherSourceQuestion(nextIndex,options){return pl300LearningController?.navigate(nextIndex,options)}
function voucherPartReviewContext(part){return pl300LearningController?.partReviewContext(part)||{records:{},review:{},nextPart:null}}
function renderVoucherEndOfPartReview(body,part){return pl300LearningController?.renderEndOfPartReview(body,part)}
function selectVoucherSourceReviewPart(partId='all'){return pl300LearningController?.selectPart(partId)}
"""
text,count=pattern.subn(replacement,text,count=1)
if count!=1:
    raise SystemExit(f'expected one controller block, replaced {count}')
app_path.write_text(text,encoding='utf-8')

# Update the controller contract: orchestration stays in app, retry mechanics live in the lazy controller.
test_path=ROOT/'tests/v0226-pl300-learning-controller.test.mjs'
test=test_path.read_text(encoding='utf-8')
if "controllerSource=fs.readFileSync" not in test:
    test=test.replace(
        "const guardSource=fs.readFileSync(new URL('../assets/js/pl300-source-practice-selection-guard.js',import.meta.url),'utf8');",
        "const guardSource=fs.readFileSync(new URL('../assets/js/pl300-source-practice-selection-guard.js',import.meta.url),'utf8');\nconst controllerSource=fs.readFileSync(new URL('../assets/js/pl300-learning-controller.js',import.meta.url),'utf8');"
    )
test=test.replace("  assert.match(appSource,/enqueuePl300DelayedRetry/);\n  assert.match(appSource,/advancePl300RetryQueue/);\n  assert.match(appSource,/resolvePl300PendingRetry/);\n  assert.match(appSource,/function\\s+navigateVoucherSourceQuestion\\s*\\(/);",
                  "  assert.match(appSource,/import\\(`\\.\\/pl300-learning-controller\\.js\\?v=\\$\\{BUILD_VERSION\\}`\\)/);\n  assert.match(controllerSource,/enqueuePl300DelayedRetry/);\n  assert.match(controllerSource,/advancePl300RetryQueue/);\n  assert.match(controllerSource,/resolvePl300PendingRetry/);\n  assert.match(controllerSource,/function\\s+navigate\\s*\\(/);\n  assert.match(appSource,/function\\s+navigateVoucherSourceQuestion\\s*\\(/);")
test_path.write_text(test,encoding='utf-8')

release_test=ROOT/'tests/v0226-pl300-release-identity.test.mjs'
release=release_test.read_text(encoding='utf-8')
needle="  assert.match(app,/import\\(`\\.\\/pl300-learning-loop\\.js\\?v=\\$\\{BUILD_VERSION\\}`\\)/);\n"
addition=needle+"  assert.match(app,/import\\(`\\.\\/pl300-learning-controller\\.js\\?v=\\$\\{BUILD_VERSION\\}`\\)/);\n"
if addition not in release:
    if needle not in release: raise SystemExit('release identity lazy-loop anchor missing')
    release=release.replace(needle,addition,1)
release_test.write_text(release,encoding='utf-8')

# This file is temporary scaffolding and must not survive the green patch commit.
Path(__file__).unlink()
print('PL-300 Smart Retry controller moved behind the lazy PL-300 boundary.')
