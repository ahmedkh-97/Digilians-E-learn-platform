from pathlib import Path

APP = Path('assets/js/app.js')
src = APP.read_text(encoding='utf-8')


def skip_quoted(text, i):
    quote = text[i]
    i += 1
    while i < len(text):
        ch = text[i]
        if ch == '\\':
            i += 2
            continue
        if ch == quote:
            return i + 1
        i += 1
    raise RuntimeError('unterminated string')


def matching_delimiter(text, start, opener, closer):
    depth = 0
    i = start
    while i < len(text):
        ch = text[i]
        if ch in "'\"`":
            i = skip_quoted(text, i)
            continue
        if ch == '/' and i + 1 < len(text) and text[i + 1] == '/':
            end = text.find('\n', i + 2)
            i = len(text) if end < 0 else end + 1
            continue
        if ch == '/' and i + 1 < len(text) and text[i + 1] == '*':
            end = text.find('*/', i + 2)
            if end < 0:
                raise RuntimeError('unterminated block comment')
            i = end + 2
            continue
        if ch == opener:
            depth += 1
        elif ch == closer:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    raise RuntimeError(f'unmatched {opener}{closer}')


def replace_function(text, name, replacement):
    marker = f'function {name}'
    start = text.find(marker)
    if start < 0:
        if replacement in text:
            return text
        raise RuntimeError(f'missing function {name}')
    paren = text.find('(', start + len(marker))
    if paren < 0:
        raise RuntimeError(f'missing parameter list for {name}')
    paren_end = matching_delimiter(text, paren, '(', ')')
    body = text.find('{', paren_end + 1)
    if body < 0:
        raise RuntimeError(f'missing body for {name}')
    body_end = matching_delimiter(text, body, '{', '}')
    return text[:start] + replacement + text[body_end + 1:]


anchor = "let voucherSourcePracticeNative=null;\nlet pl300FullRankedLearning=null;\nlet pl300LearningLoop=null;\n"
replacement_anchor = """let voucherSourcePracticeNative=null;
let pl300FullRankedLearning=null;
let pl300LearningLoop=null;
let pl300LearningControllerModule=null;
let pl300LearningController=null;

async function ensurePl300LearningController(){
  if(pl300LearningController)return pl300LearningController;
  pl300LearningControllerModule??=await import(`./pl300-learning-controller.js?v=${BUILD_VERSION}`);
  await ensurePl300LearningLoop();
  await ensurePl300FullRankedLearning();
  pl300LearningController=pl300LearningControllerModule.createPl300LearningController({
    state,
    getRecords:()=>getVoucherSourcePracticeState(mistakeOwnerId(),state.voucherExamConfig?.id||'microsoft-pl-300').records||{},
    saveLearningState:learning=>saveVoucherSourceLearningState(mistakeOwnerId(),state.voucherExamConfig?.id||'microsoft-pl-300',learning),
    learningLoop:pl300LearningLoop,
    fullRankedLearning:pl300FullRankedLearning,
    renderReview:()=>renderVoucherSourceReview(),
    scrollTop:()=>window.scrollTo({top:0,behavior:'smooth'})
  });
  return pl300LearningController;
}
"""
if 'let pl300LearningControllerModule=null;' not in src:
    if anchor not in src:
        raise RuntimeError('missing PL-300 lazy-module anchor')
    src = src.replace(anchor, replacement_anchor, 1)

load_anchor = "    await ensurePl300FullRankedLearning();\n    await ensurePl300LearningLoop();\n    await loadVoucherFullRankedIndex(config);"
load_replacement = "    await ensurePl300FullRankedLearning();\n    await ensurePl300LearningLoop();\n    await ensurePl300LearningController();\n    await loadVoucherFullRankedIndex(config);"
if 'await ensurePl300LearningController();' not in src:
    if load_anchor not in src:
        raise RuntimeError('missing PL-300 open-flow anchor')
    src = src.replace(load_anchor, load_replacement, 1)

replacements = {
    'voucherSourceReviewFilteredQuestions': "function voucherSourceReviewFilteredQuestions(){return pl300LearningController?.filteredQuestions()||[];}",
    'voucherSourceStartSolveTimer': "function voucherSourceStartSolveTimer(question,options={}){return pl300LearningController?.startSolveTimer(question,options);}",
    'voucherSourceConsumeSolveSeconds': "function voucherSourceConsumeSolveSeconds(question){return pl300LearningController?.consumeSolveSeconds(question)||0;}",
    'voucherSourceResetSolveTimer': "function voucherSourceResetSolveTimer(){return pl300LearningController?.resetSolveTimer();}",
    'voucherActiveSourcePart': "function voucherActiveSourcePart(){return pl300LearningController?.activePart()||null;}",
    'persistVoucherSourceLearningState': "function persistVoucherSourceLearningState(nextState=state.voucherSourceLearningState){return pl300LearningController?.persist(nextState)||state.voucherSourceLearningState;}",
    'updateVoucherLearningAfterScoredSave': "function updateVoucherLearningAfterScoredSave(args={}){return pl300LearningController?.updateAfterScoredSave(args);}",
    'navigateVoucherSourceQuestion': "function navigateVoucherSourceQuestion(nextIndex,options={}){return pl300LearningController?.navigate(nextIndex,options);}",
    'voucherPartReviewContext': "function voucherPartReviewContext(part){return pl300LearningController?.partReviewContext(part)||{records:{},review:{},nextPart:null};}",
    'renderVoucherEndOfPartReview': "function renderVoucherEndOfPartReview(body,part){return pl300LearningController?.renderEndOfPartReview(body,part);}",
    'selectVoucherSourceReviewPart': "function selectVoucherSourceReviewPart(partId='all'){return pl300LearningController?.selectPart(partId);}",
}
for name, replacement in replacements.items():
    src = replace_function(src, name, replacement)

APP.write_text(src, encoding='utf-8')
Path(__file__).unlink(missing_ok=True)
print('Applied final PL-300 lazy-controller extraction and removed patch scaffold.')
