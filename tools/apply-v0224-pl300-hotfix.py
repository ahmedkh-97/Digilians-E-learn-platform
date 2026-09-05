from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_between(text: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    return text[:start] + replacement + text[end:]


# 1) PL-300 part view model and markup.
path = ROOT / "assets/js/pl300-full-ranked-learning.js"
text = path.read_text(encoding="utf-8")

new_part_view = r'''export function buildPl300PartViewState({parts=[],activePartId='all',records={},totalAll=509,completedAll=0,activeFilter='all'}={}){
  const list=Array.isArray(parts)?parts:[];
  const activePart=list.find(part=>String(part?.id||'')===String(activePartId||'all'))||null;
  const partTotal=activePart?.count||Math.max(0,num(totalAll,509));
  const partCompleted=activePart
    ?activePart.questionIds.filter(id=>Boolean(records?.[id])).length
    :Math.max(0,Math.min(partTotal,num(completedAll)));
  const activePartLabel=activePart?.label||'All 509 Questions';
  const partOptionsHtml=buildPl300PartOptionsMarkup({parts:list,activePartId});
  const partCatalogHtml=list.map(part=>{
    const total=Math.max(0,num(part?.count));
    const completed=(part?.questionIds||[]).filter(id=>Boolean(records?.[id])).length;
    const percent=total?Math.round((completed/total)*100):0;
    const complete=total>0&&completed>=total;
    const action=completed>0&&!complete?'Continue Part':'Start Part';
    return `<article class="official-section-card pl300-study-part-card" data-pl300-part-card="${htmlEscape(part?.id||'')}"><div class="official-section-head"><div><span class="eyebrow">${htmlEscape(part?.domainTitle||'PL-300')}</span><h3>${htmlEscape(part?.sectionTitle||'Study Part')}</h3><p>Part ${num(part?.partNumber,1)} · ${total} Questions</p></div><span class="pool-chip ${complete?'ready':'building'}">${completed}/${total}</span></div><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div><button type="button" class="primary-btn wide" data-pl300-part-select="${htmlEscape(part?.id||'')}">${action} →</button></article>`;
  }).join('');
  const typeFilterLabel=activeFilter==='source-01'?'Source 01':activeFilter==='source-02'?'Source 02':activeFilter==='objective'?'Validated Objective':activeFilter==='checkpoint'?'Study Checkpoints':'All Types';
  const filterLabel=activePart
    ?`${activePart.domainTitle} → ${activePart.sectionTitle} · Part ${activePart.partNumber}${activeFilter!=='all'?` · ${typeFilterLabel}`:''}`
    :(activeFilter==='all'?'All 509':typeFilterLabel);
  return {activePart,partTotal,partCompleted,activePartLabel,partOptionsHtml,partCatalogHtml,showPartCatalog:!activePart,filterLabel};
}'''
text = replace_between(
    text,
    "export function buildPl300PartViewState(",
    "\n\nexport function enrichPl300SourceQuestionsWithArabic",
    new_part_view,
)

new_review = r'''export function buildPl300FullRankedReviewMarkup({
  sourceTitle='Full Ranked Bank — 509 Questions',source01Count=0,source02Count=0,objectiveCount=0,checkpointCount=0,
  metrics={},activeFilter='all',totalAll=509,questionsLength=0,currentIndex=0,filterLabel='All 509',objective=false,
  typeLabel='',sourceLabel='',questionNumber='',occurrence=1,pageLabel='',domainId='',recordStatus='NOT STUDIED',
  questionHtml='',visualHtml='',optionsHtml='',nativeHtml='',revealOpen=false,answerHtml='',
  partOptionsHtml='<option value="all">All 509 Questions</option>',partCatalogHtml='',showPartCatalog=false,
  activePartLabel='All 509 Questions',partCompleted=0,partTotal=509
}={}){
  const filterButton=(id,label,count)=>`<button type="button" data-source-review-filter="${id}" class="${activeFilter===id?'active':''}">${label} <b>${count}</b></button>`;
  const index=Math.max(0,num(currentIndex));
  const length=Math.max(0,num(questionsLength));
  const progress=length?((index+1)/length)*100:0;
  const copy=num(occurrence,1)>1?` · Copy ${num(occurrence,1)}`:'';
  const domain=domainId?` · ${htmlEscape(domainId)}`:' · Unclassified Source Review';
  const studyPartTotal=Math.max(0,num(partTotal,509));
  const studyPartCompleted=Math.max(0,Math.min(studyPartTotal,num(partCompleted)));
  const studyPartProgress=studyPartTotal?(studyPartCompleted/studyPartTotal)*100:0;
  const shell=`
    <section class="source-review-hero full-ranked-source-hero">
      <div><span class="eyebrow">FULL RANKED LEARNING · 509/509</span><h2>${htmlEscape(sourceTitle)}</h2><p>Every source occurrence counts toward Completion. Only validated concepts affect competitive accuracy; checkpoints keep uncertain source items studyable without fake scoring.</p></div>
      <div class="source-review-stats"><span><strong>${num(source01Count)}</strong>Source 01</span><span><strong>${num(source02Count)}</strong>Source 02</span><span><strong>${num(objectiveCount)}</strong>Objective occurrences</span><span><strong>${num(checkpointCount)}</strong>Study checkpoints</span></div>
    </section>
    <section class="source-practice-summary full-ranked-summary"><span>Completion <strong>${num(metrics.completedOccurrences)} / ${num(metrics.totalOccurrences,509)}</strong> · ${num(metrics.completionPercentage)}%</span><span>Validated Accuracy <strong>${num(metrics.validatedAccuracy)}%</strong></span><span>Mastered <strong>${num(metrics.masteredClusters)} / ${num(metrics.validatedConceptCount,265)}</strong></span><span>First Pass <strong>${num(metrics.firstPassPercentage)}%</strong></span><small>Study Checkpoint completion never counts as Correct. Duplicate source copies are required for coverage but collapse to one validated concept for mastery.</small></section>`;
  if(showPartCatalog){
    return `${shell}<section class="pl300-study-part-catalog" aria-label="PL-300 study parts"><div class="pl300-study-part-catalog-head"><span class="eyebrow">STUDY IN SMALL PARTS</span><h3>Choose a study part</h3><p>Pick a focused Domain → Section mini part before entering questions. Every part contributes to the same 509/509 ranked completion.</p></div><div class="official-section-grid pl300-study-part-grid">${partCatalogHtml||''}</div></section>`;
  }
  return `${shell}
    <section class="pl300-study-part-context" aria-label="Active PL-300 study part">
      <button type="button" class="secondary-btn" data-pl300-parts-back>← Back to parts</button>
      <div><span class="eyebrow">ACTIVE STUDY PART</span><strong>${htmlEscape(activePartLabel)}</strong><small>${studyPartCompleted} / ${studyPartTotal} studied</small></div>
      <div class="pl300-study-part-progress"><div><i style="width:${studyPartProgress}%"></i></div></div>
    </section>
    <section class="source-review-toolbar">
      <div class="source-review-filters" role="group" aria-label="Full ranked learning filter">
        ${filterButton('all','All',totalAll)}
        ${filterButton('source-01','Source 01',source01Count)}
        ${filterButton('source-02','Source 02',source02Count)}
        ${filterButton('objective','Objective',objectiveCount)}
        ${filterButton('checkpoint','Checkpoints',checkpointCount)}
      </div>
      <div class="source-review-jump"><label for="sourceReviewJump">Jump</label><input id="sourceReviewJump" type="number" min="1" max="${length}" value="${index+1}"><button type="button" class="secondary-btn" id="sourceReviewJumpBtn">Go</button></div>
    </section>
    <section class="source-review-progress"><span>${htmlEscape(filterLabel)}</span><strong>${index+1} / ${length}</strong><div><i style="width:${progress}%"></i></div></section>
    <article class="source-review-card ${objective?'is-ranked-objective':'is-ranked-checkpoint'}">
      <div class="source-review-card-head"><div><span class="source-review-type">${htmlEscape(typeLabel)}</span><h3>${htmlEscape(sourceLabel)} · Question ${htmlEscape(questionNumber)}${copy}</h3><small>${htmlEscape(pageLabel)}${domain}</small></div><span class="source-review-status">${htmlEscape(recordStatus)}</span></div>
      <div class="source-review-question">${questionHtml}</div>
      ${visualHtml?`<div class="source-review-visual-stack">${visualHtml}</div>`:''}
      ${optionsHtml||''}
      ${nativeHtml||''}
      <details class="source-review-reveal" id="sourceReviewReveal" ${revealOpen?'open':''}><summary>Reveal source answer & explanation</summary><div class="source-review-reveal-body">${answerHtml||''}</div></details>
    </article>
    <nav class="source-review-nav" aria-label="Source question navigation"><button type="button" class="secondary-btn" id="sourceReviewPrev" ${index<=0?'disabled':''}>← Previous</button><span>Question ${index+1} of ${length} · Full Bank 509</span><button type="button" class="primary-btn" id="sourceReviewNext" ${index>=length-1?'disabled':''}>Next →</button></nav>`;
}'''
text = replace_between(
    text,
    "export function buildPl300FullRankedReviewMarkup({",
    "\n\nexport function buildPl300FullRankedLandingMarkup",
    new_review,
)
path.write_text(text, encoding="utf-8")


# 2) App wiring: pre-entry part cards and back action use existing source-review state.
path = ROOT / "assets/js/app.js"
text = path.read_text(encoding="utf-8")
render_marker = "\nfunction renderVoucherSourceReview(){"
if "function selectVoucherSourceReviewPart(" not in text:
    helper = r'''
function selectVoucherSourceReviewPart(partId='all'){
  voucherSourceResetSolveTimer();
  const requested=String(partId||'all');
  state.voucherSourceReviewPartId=requested==='all'||state.voucherSourceReviewParts.some(part=>String(part.id)===requested)?requested:'all';
  state.voucherSourceReviewIndex=0;
  renderVoucherSourceReview();
  window.scrollTo({top:0,behavior:'smooth'});
}
'''
    if render_marker not in text:
        raise SystemExit("renderVoucherSourceReview marker not found")
    text = text.replace(render_marker, "\n" + helper + "function renderVoucherSourceReview(){", 1)

old_timer = "if(!practiceRecord)voucherSourceStartSolveTimer(q);"
if old_timer not in text:
    raise SystemExit("PL-300 solve timer marker not found")
text = text.replace(old_timer, 'if(!practiceRecord&&state.voucherSourceReviewPartId!=="all")voucherSourceStartSolveTimer(q);', 1)

old_state = "const {partTotal,partCompleted,activePartLabel,partOptionsHtml,filterLabel}=pl300FullRankedLearning.buildPl300PartViewState({parts:state.voucherSourceReviewParts,activePartId:state.voucherSourceReviewPartId,records:practiceState.records||{},totalAll,completedAll:metrics.completedOccurrences,activeFilter:state.voucherSourceReviewFilter});"
new_state = "const {partTotal,partCompleted,activePartLabel,partOptionsHtml,partCatalogHtml,showPartCatalog,filterLabel}=pl300FullRankedLearning.buildPl300PartViewState({parts:state.voucherSourceReviewParts,activePartId:state.voucherSourceReviewPartId,records:practiceState.records||{},totalAll,completedAll:metrics.completedOccurrences,activeFilter:state.voucherSourceReviewFilter});"
if old_state not in text:
    raise SystemExit("PL-300 part state destructure marker not found")
text = text.replace(old_state, new_state, 1)

old_args = "    partOptionsHtml,activePartLabel,partCompleted,partTotal,\n"
new_args = "    partOptionsHtml,partCatalogHtml,showPartCatalog,activePartLabel,partCompleted,partTotal,\n"
if old_args not in text:
    raise SystemExit("PL-300 review markup args marker not found")
text = text.replace(old_args, new_args, 1)

picker_start_marker = '  $("sourceReviewPart")?.addEventListener("change",event=>{'
filter_start_marker = "  body.querySelectorAll('[data-source-review-filter]')"
if picker_start_marker not in text:
    raise SystemExit("Old PL-300 part picker wiring marker not found")
picker_start = text.index(picker_start_marker)
filter_start = text.index(filter_start_marker, picker_start)
new_wiring = """  body.querySelectorAll('[data-pl300-part-select]').forEach(button=>button.addEventListener('click',()=>selectVoucherSourceReviewPart(button.dataset.pl300PartSelect)));
  body.querySelector('[data-pl300-parts-back]')?.addEventListener('click',()=>selectVoucherSourceReviewPart('all'));
  if(showPartCatalog){voucherSourceResetSolveTimer();return;}
"""
text = text[:picker_start] + new_wiring + text[filter_start:]
path.write_text(text, encoding="utf-8")


# 3) Q1 gets only its source-backed storage-mode choices.
path = ROOT / "voucher/tracks/data-analysis/microsoft-pl-300/source-01-review-bank.json"
text = path.read_text(encoding="utf-8")
q1_start = text.index('"id": "pl300-source-01-q001"')
q2_start = text.index('"id": "pl300-source-01-q002"', q1_start)
q1 = text[q1_start:q2_start]
choices = '"choices": [\n              "Import",\n              "DirectQuery",\n              "Dual"\n            ],\n            '
for box in range(1, 5):
    old = f'"label": "Box {box}",\n            "expected": ['
    new = f'"label": "Box {box}",\n            {choices}"expected": ['
    if old not in q1:
        raise SystemExit(f"Q1 Box {box} field marker not found")
    q1 = q1.replace(old, new, 1)
text = text[:q1_start] + q1 + text[q2_start:]
path.write_text(text, encoding="utf-8")

print("V0.22.4 PL-300 hotfix applied to 3 production files.")
