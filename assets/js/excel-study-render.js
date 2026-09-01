import {formatStudyMixedText,normalizeStudyText} from "./study-format.js";
import {renderTechnicalCodeBlock} from "./technical-content.js?v=0.20.23";
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function roleLabel(s){return s.role==="statistics-prerequisite"?"PREREQUISITE • STATISTICS":"EXCEL CORE";}
function renderFormulas(items=[]){if(!items.length)return "";return `<section class="excel-study-block excel-formula-lab"><div class="excel-block-head"><span>FORMULA LAB</span><strong>نفهم الصيغة ونستخدمها صح</strong></div><div class="excel-formula-grid">${items.map(x=>`<article><h4>${esc(x.title)}</h4>${String(x.formula||"").startsWith("=")?renderTechnicalCodeBlock(x.formula,"excel"):`<pre class="excel-stat-formula" dir="ltr">${esc(x.formula)}</pre>`}<p dir="rtl">${formatStudyMixedText(x.explanationAr||"")}</p></article>`).join("")}</div></section>`;}
function renderSteps(items=[]){if(!items.length)return "";return `<section class="excel-study-block"><div class="excel-block-head"><span>WORKFLOW</span><strong>نمشي خطوة بخطوة</strong></div><div class="excel-step-list" dir="ltr">${items.map((x,i)=>`<div><span>${String(i+1).padStart(2,"0")}</span><p>${esc(x)}</p></div>`).join("")}</div></section>`;}
function renderTechnicalLabs(items=[]){
  if(!items.length)return "";
  return `<section class="excel-study-block excel-technical-labs">
    <div class="excel-block-head"><span>TECHNICAL LAB</span><strong>اقرأ الـsyntax في سياقه</strong></div>
    <div class="excel-technical-lab-grid">${items.map(x=>`<article>
      <div class="excel-technical-lab-head"><span>${esc(x.label||x.language||"CODE")}</span><h4>${esc(x.title||"")}</h4></div>
      ${renderTechnicalCodeBlock(x.code||"",x.language||"generic")}
      <p dir="rtl">${formatStudyMixedText(x.explanationAr||"")}</p>
    </article>`).join("")}</div>
    <small class="excel-visual-label">SOURCE-SUPPORTED TECHNICAL CONTENT — no invented syntax</small>
  </section>`;
}
function chips(items=[]){return `<div class="excel-visual-chips" dir="ltr">${items.map(x=>`<span>${esc(x)}</span>`).join("")}</div>`;}
function visual(v){if(!v)return "";const head=`<div class="excel-block-head"><span>VISUAL MODEL</span><strong>${esc(v.title||"")}</strong></div>`;
 if(v.kind==="conditional-grid"){const avg=(v.values||[]).reduce((a,b)=>a+b,0)/(v.values?.length||1);return `<section class="excel-study-block excel-visual-card">${head}<div class="excel-sheet-grid">${(v.values||[]).map((x,i)=>`<div class="${x<avg?"match":""}"><small>A${i+1}</small><strong>${x}</strong></div>`).join("")}</div><small class="excel-visual-label">PLATFORM VISUAL CLARIFICATION — ${esc(v.rule||"")}</small></section>`;}
 if(v.kind==="formula-anatomy"){return `<section class="excel-study-block excel-visual-card">${head}<div class="excel-formula-anatomy" dir="ltr">${(v.parts||[]).map((x,i)=>`<span data-part="${i}">${esc(x)}</span>`).join("")}</div><small class="excel-visual-label">PLATFORM VISUAL CLARIFICATION</small></section>`;}
 if(v.kind==="split-cells"){return `<section class="excel-study-block excel-visual-card">${head}<div class="excel-split-flow" dir="ltr"><b>${esc(v.input)}</b><span>→</span>${(v.outputs||[]).map(x=>`<b>${esc(x)}</b>`).join("")}</div><small class="excel-visual-label">PLATFORM VISUAL CLARIFICATION</small></section>`;}
 if(v.kind==="dispersion"){return `<section class="excel-study-block excel-visual-card">${head}<div class="excel-dispersion">${(v.rows||[]).map(row=>`<div>${row.map(x=>`<i style="--x:${x}"></i>`).join("")}</div>`).join("")}</div><small class="excel-visual-label">PLATFORM VISUAL CLARIFICATION</small></section>`;}
 if(v.kind==="boxplot"){return `<section class="excel-study-block excel-visual-card">${head}<div class="excel-boxplot" dir="ltr">${(v.items||[]).map(x=>`<span>${esc(x)}</span>`).join("")}</div><small class="excel-visual-label">PLATFORM VISUAL CLARIFICATION</small></section>`;}
 if(v.kind==="source-conflict"){return `<section class="excel-study-block excel-source-conflict">${head}<div><article><span>SOURCE A</span><p>${esc(v.left)}</p></article><article><span>SOURCE B</span><p>${esc(v.right)}</p></article></div></section>`;}
 if(v.kind==="spill-grid"){return `<section class="excel-study-block excel-visual-card">${head}<div class="excel-spill-grid" dir="ltr">${(v.cells||[]).map((x,i)=>`<div class="${i===0?"origin":"spill"}"><small>${esc(x)}</small><strong>${i===0?"FORMULA":"RESULT"}</strong></div>`).join("")}</div><small class="excel-visual-label">PLATFORM VISUAL CLARIFICATION</small></section>`;}
 if(v.kind==="consolidation"){return `<section class="excel-study-block excel-visual-card">${head}<div class="excel-consolidation" dir="ltr">${(v.sources||[]).map(x=>`<b>${esc(x)}</b>`).join("")}<span>→</span><strong>${esc(v.target)}</strong></div><small class="excel-visual-label">PLATFORM VISUAL CLARIFICATION</small></section>`;}
 if(v.kind==="sparkline-subtotal"){const pts=(v.spark||[]).map((x,i)=>`${i*18},${44-x*3}`).join(" ");return `<section class="excel-study-block excel-visual-card">${head}<div class="excel-sparkline-wrap"><svg viewBox="0 0 100 50" aria-label="Sparkline clarification"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>${chips((v.outline||[]).map(x=>`Outline ${x}`))}</div><small class="excel-visual-label">PLATFORM VISUAL CLARIFICATION</small></section>`;}
 const items=v.items||[];const groups=v.groups||[];return `<section class="excel-study-block excel-visual-card">${head}${items.length?chips(items):""}${groups.length?`<div class="excel-visual-groups" dir="ltr">${groups.map(g=>`<article><strong>${esc(g[0])}</strong>${g.slice(1).map(x=>`<span>${esc(x)}</span>`).join("")}</article>`).join("")}</div>`:""}<small class="excel-visual-label">PLATFORM VISUAL CLARIFICATION — based on the course concept</small></section>`;}
function notes(items=[]){return items.map(n=>`<aside class="excel-source-note"><strong>${esc(n.label||"NOTE")}</strong><p dir="rtl">${formatStudyMixedText(n.textAr||"")}</p></aside>`).join("");}

function renderBeginnerConcepts(items=[]){
  if(!items.length)return "";
  return `<section class="excel-study-block excel-beginner-concepts">
    <div class="excel-block-head"><span>CONCEPTS MADE SIMPLE</span><strong>نفهم المصطلحات واحدة واحدة</strong></div>
    <div class="excel-beginner-concept-grid">${items.map(x=>`<article>
      <strong dir="ltr">${esc(x.term||"")}</strong>
      <p dir="rtl">${formatStudyMixedText(x.explanationAr||"")}</p>
    </article>`).join("")}</div>
  </section>`;
}

function renderBeginnerIntro(s){
  const b=s?.beginnerLearningV3;
  if(!b)return "";
  return `<section class="excel-beginner-v3-intro">
    <article class="excel-study-block excel-beginner-main" dir="rtl">
      <div class="excel-block-head" dir="ltr"><span>UNDERSTAND THE IDEA</span><strong>نفهمها من الصفر</strong></div>
      <p>${formatStudyMixedText(b.simpleExplanationAr||"")}</p>
    </article>
    <article class="excel-study-block excel-beginner-why" dir="rtl">
      <div class="excel-block-head" dir="ltr"><span>WHY DO I NEED THIS?</span><strong>هتستخدمها ليه؟</strong></div>
      <p>${formatStudyMixedText(b.whyItMattersAr||"")}</p>
    </article>
    ${renderBeginnerConcepts(b.concepts||[])}
    ${b.miniExample?`<section class="excel-study-block excel-beginner-example">
      <div class="excel-block-head"><span>SIMPLE EXAMPLE</span><strong>${esc(b.miniExample.title||"مثال بسيط")}</strong></div>
      <p dir="rtl">${formatStudyMixedText(b.miniExample.textAr||"")}</p>
      <small class="excel-visual-label">PLATFORM CLARIFICATION — مثال تعليمي لتبسيط مفهوم موجود في المادة</small>
    </section>`:""}
  </section>`;
}

function renderDeepBeginnerCore(s){
  const b=s?.beginnerLearningV3;
  if(!b)return "";
  return `<section class="excel-deep-beginner-core">
    <article class="excel-study-block excel-beginner-main" dir="rtl">
      <div class="excel-block-head" dir="ltr"><span>UNDERSTAND FROM ZERO</span><strong>نفهم الفكرة ببساطة</strong></div>
      <p>${formatStudyMixedText(b.simpleExplanationAr||"")}</p>
    </article>
    ${renderBeginnerConcepts(b.concepts||[])}
    ${b.miniExample?`<section class="excel-study-block excel-beginner-example">
      <div class="excel-block-head"><span>SIMPLE EXAMPLE</span><strong>${esc(b.miniExample.title||"مثال بسيط")}</strong></div>
      <p dir="rtl">${formatStudyMixedText(b.miniExample.textAr||"")}</p>
      <small class="excel-visual-label">PLATFORM CLARIFICATION — مثال تعليمي لتبسيط مفهوم موجود في المادة</small>
    </section>`:""}
  </section>`;
}

export function renderExcelStudySectionHtml(s,index){const l=s.lessonV2||{};const prereq=s.role==="statistics-prerequisite";return `<header class="study-section-head excel-section-head" dir="ltr"><div><span class="eyebrow">SECTION ${String(index+1).padStart(2,"0")}</span><h3>${esc(s.title)}</h3></div><span class="excel-role-badge ${prereq?"prereq":"core"}">${roleLabel(s)}</span></header><div class="excel-study-stack">${s.beginnerLearningV3?renderBeginnerIntro(s):`<section class="excel-intro-grid"><article class="excel-study-block" dir="rtl"><div class="excel-block-head" dir="ltr"><span>WHAT IS IT?</span><strong>يعني إيه؟</strong></div><p>${formatStudyMixedText(l.whatIsItAr||s.summaryAr||"")}</p></article><article class="excel-study-block" dir="rtl"><div class="excel-block-head" dir="ltr"><span>WHY DOES IT MATTER?</span><strong>ليه مهم؟</strong></div><p>${formatStudyMixedText(l.whyItMattersAr||"")}</p>${l.whyLabel?`<small class="excel-visual-label">${esc(l.whyLabel)}</small>`:""}</article></section>`}${visual(l.visual)}${(s.keyTerms||[]).length?`<section class="excel-study-block"><div class="excel-block-head"><span>KEY TERMS</span><strong>المصطلحات الأساسية</strong></div>${chips(s.keyTerms)}</section>`:""}${(s.takeaways||[]).length?`<section class="excel-study-block excel-takeaways" dir="rtl"><div class="excel-block-head" dir="ltr"><span>KEY TAKEAWAYS</span><strong>خلاصة المذاكرة</strong></div><ul>${s.takeaways.map(x=>`<li><span>✓</span><p>${formatStudyMixedText(x)}</p></li>`).join("")}</ul></section>`:""}${renderFormulas(l.formulas)}${renderSteps(l.steps)}${notes(l.notes||[])}${l.correction?`<aside class="excel-source-note correction"><strong>${esc(l.correction.label||"PRESENTATION CORRECTION")}</strong><p dir="rtl">${formatStudyMixedText(l.correction.textAr||"")}</p></aside>`:""}<section class="excel-study-block excel-source-trace" dir="ltr"><div class="excel-block-head"><span>SOURCE TRACE</span><strong>Course material</strong></div><p>${esc(normalizeStudyText(l.sourceTrace||s.sourceTrace||""))}</p></section></div>`;}


function renderDeepTable(table){
  if(!table?.rows?.length)return "";
  return `<div class="excel-deep-table-wrap">
    <table class="excel-deep-table" dir="ltr">
      ${table.columns?.length?`<thead><tr>${table.columns.map(x=>`<th>${esc(x)}</th>`).join("")}</tr></thead>`:""}
      <tbody>${table.rows.map(row=>`<tr>${row.map(cell=>`<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function renderFormulaAnatomy(items=[]){
  if(!items.length)return "";
  return `<div class="excel-anatomy-list" dir="ltr">${items.map(x=>`
    <div class="excel-anatomy-row">
      <code>${esc(x.token)}</code>
      <span>→</span>
      <p dir="rtl">${formatStudyMixedText(x.meaningAr||"")}</p>
    </div>`).join("")}</div>`;
}

function renderTrace(items=[]){
  if(!items.length)return "";
  return `<ol class="excel-execution-trace" dir="ltr">${items.map((x,i)=>`
    <li><span>${String(i+1).padStart(2,"0")}</span><code>${esc(x)}</code></li>`).join("")}</ol>`;
}

function renderDeepWorkedExamples(items=[]){
  if(!items.length)return "";
  return `<section class="excel-study-block excel-deep-examples">
    <div class="excel-block-head"><span>WORKED EXAMPLES</span><strong>نشوف Excel بيحسبها إزاي</strong></div>
    <div class="excel-deep-example-list">
      ${items.map((x,i)=>`<article class="excel-worked-example">
        <header>
          <span>EXAMPLE ${String(i+1).padStart(2,"0")}</span>
          <h4>${esc(x.title||"Worked Example")}</h4>
        </header>
        ${x.questionAr?`<p class="excel-example-question" dir="rtl">${formatStudyMixedText(x.questionAr)}</p>`:""}
        ${x.formula?`<div class="excel-example-formula">${renderTechnicalCodeBlock(x.formula,"excel")}</div>`:""}
        ${renderFormulaAnatomy(x.anatomy||[])}
        ${(x.trace||[]).length?`<div class="excel-trace-box"><strong>EXECUTION TRACE</strong>${renderTrace(x.trace)}</div>`:""}
        ${x.result?`<div class="excel-result-strip"><span>EXPECTED RESULT</span><strong dir="ltr">${esc(x.result)}</strong></div>`:""}
        ${x.whyAr?`<p class="excel-example-why" dir="rtl">${formatStudyMixedText(x.whyAr)}</p>`:""}
      </article>`).join("")}
    </div>
    <small class="excel-visual-label">PLATFORM CLARIFICATION — execution traces are pedagogical walkthroughs based on source formulas/concepts</small>
  </section>`;
}

function renderDeepScenarios(items=[]){
  if(!items.length)return "";
  return `<section class="excel-study-block excel-scenario-section">
    <div class="excel-block-head"><span>QUESTION → CALCULATION</span><strong>حدد نوع السؤال الأول</strong></div>
    <div class="excel-scenario-grid">${items.map(x=>`<article>
      <h4>${esc(x.title)}</h4>
      <p dir="rtl">${formatStudyMixedText(x.questionAr||"")}</p>
      ${renderTechnicalCodeBlock(x.formula||"","excel")}
      ${renderTrace(x.trace||[])}
      <div class="excel-result-strip"><span>RESULT</span><strong dir="ltr">${esc(x.result||"")}</strong></div>
    </article>`).join("")}</div>
    <small class="excel-visual-label">PLATFORM CLARIFICATION — examples reconstructed only to explain formulas already present in the course source</small>
  </section>`;
}

function renderComparisonTable(data,label="COMPARE"){
  if(!data?.rows?.length)return "";
  return `<section class="excel-study-block excel-compare-block">
    <div class="excel-block-head"><span>${esc(label)}</span><strong>${esc(data.title||"")}</strong></div>
    <div class="excel-compare-table-wrap"><table class="excel-compare-table" dir="ltr">
      <tbody>${data.rows.map(row=>`<tr>${row.map((cell,i)=>`<${i===0?"th":"td"}>${esc(cell)}</${i===0?"th":"td"}>`).join("")}</tr>`).join("")}</tbody>
    </table></div>
    <small class="excel-visual-label">PLATFORM CLARIFICATION — comparison/decision structure synthesized only from source-supported items</small>
  </section>`;
}

function renderMistakes(items=[]){
  if(!items.length)return "";
  return `<section class="excel-study-block excel-common-mistakes">
    <div class="excel-block-head"><span>COMMON MISTAKES</span><strong>أخطاء متوقعة</strong></div>
    <ul dir="rtl">${items.map(x=>`<li><span>!</span><p>${formatStudyMixedText(x)}</p></li>`).join("")}</ul>
  </section>`;
}

function renderTryIt(item){
  if(!item)return "";
  return `<section class="excel-study-block excel-try-it">
    <div class="excel-block-head"><span>TRY IT YOURSELF</span><strong>جرّب قبل ما تفتح الحل</strong></div>
    <p dir="rtl">${formatStudyMixedText(item.promptAr||"")}</p>
    <details>
      <summary>Show Answer</summary>
      <div class="excel-try-answer">
        <strong dir="ltr">${esc(item.answer||"")}</strong>
        <p dir="rtl">${formatStudyMixedText(item.explanationAr||"")}</p>
      </div>
    </details>
    <small class="excel-visual-label">PLATFORM CLARIFICATION — practice built only from source-supported concepts</small>
  </section>`;
}

function renderQuickCheck(item,sectionId){
  if(!item?.options?.length)return "";
  return `<section class="excel-study-block excel-deep-qc" data-excel-deep-qc="${esc(sectionId)}" data-answer-index="${Number(item.answerIndex)}">
    <div class="excel-block-head"><span>QUICK CHECK</span><strong>اتأكد إن الفكرة وصلت</strong></div>
    <p class="excel-qc-question" dir="ltr">${esc(item.question||"")}</p>
    <div class="excel-qc-options" dir="ltr">${item.options.map((x,i)=>`
      <button type="button" data-excel-qc-option="${i}"><span>${String.fromCharCode(65+i)}</span><b>${esc(x)}</b></button>`).join("")}</div>
    <div class="excel-qc-feedback" hidden></div>
  </section>`;
}

export function renderExcelGroupOverview(groups=[],sections=[]){
  const byId=new Map(sections.map(s=>[s.id,s]));
  return `<section class="excel-groups-overview">
    <div class="excel-groups-overview-head">
      <span class="eyebrow">LEARNING MAP</span>
      <h3>Understand the relationships — not just the order</h3>
      <p dir="rtl">قسمنا محتوى الأسبوع لمجموعات مترابطة. كل Group بيجاوب سؤال واضح: الجزء ده كله علاقته ببعضه إيه؟</p>
    </div>
    <div class="excel-group-map-grid">
      ${groups.map(g=>{
        const count=(g.sectionIds||[]).filter(id=>byId.has(id)).length;
        return `<article class="excel-group-map-card ${g.status==="deep-learning-full"?"prototype":""}" data-excel-group="${esc(g.id)}">
          <span class="excel-group-number">${esc(g.number)}</span>
          <div><h4>${esc(g.title)}</h4><p>${esc(g.subtitle||"")}</p></div>
          <small>${count} lesson${count===1?"":"s"}${g.status==="deep-learning-full"?" • DEEP LEARNING":""}</small>
        </article>`;
      }).join("")}
    </div>
  </section>`;
}

export function renderExcelGroupHeader(group,sections=[]){
  if(!group)return "";
  const names=(group.sectionIds||[]).map(id=>sections.find(s=>s.id===id)?.title).filter(Boolean);
  return `<section class="excel-group-divider ${group.status==="deep-learning-full"?"prototype":""}" data-excel-group-header="${esc(group.id)}">
    <div class="excel-group-divider-copy">
      <span class="excel-group-kicker">GROUP ${esc(group.number)}${group.status==="deep-learning-full"?" • DEEP LEARNING":""}</span>
      <h3>${esc(group.title)}</h3>
      <p>${esc(group.subtitle||"")}</p>
    </div>
    <div class="excel-group-relationship">
      <span>HOW IT FITS TOGETHER</span>
      <p>${esc(group.relationship||"")}</p>
    </div>
    <div class="excel-group-flow" dir="ltr">${names.map((x,i)=>`<span>${esc(x)}</span>${i<names.length-1?'<b>→</b>':""}`).join("")}</div>
    <small class="excel-visual-label">PLATFORM LEARNING MAP — grouping is based on relationships found across the audited source concepts</small>
  </section>`;
}

function renderExcelDeepSectionHtml(s,index){
  const d=s.deepLearningV2;
  const l=s.lessonV2||{};
  const prereq=s.role==="statistics-prerequisite";
  return `<header class="study-section-head excel-section-head excel-deep-head" dir="ltr">
    <div>
      <span class="eyebrow">SECTION ${String(index+1).padStart(2,"0")} • DEEP LEARNING</span>
      <h3>${esc(s.title)}</h3>
    </div>
    <span class="excel-role-badge ${prereq?"prereq":"core"}">${roleLabel(s)}</span>
  </header>
  <div class="excel-study-stack excel-deep-stack">
    <section class="excel-deep-opening">
      <article>
        <span>LEARNING GOAL</span>
        <p dir="rtl">${formatStudyMixedText(d.opening?.goalAr||"")}</p>
      </article>
      <article>
        <span>HOW THIS CONNECTS</span>
        <p dir="rtl">${formatStudyMixedText(d.opening?.connectionAr||"")}</p>
      </article>
    </section>

    ${d.useBeginnerCore!==false?renderDeepBeginnerCore(s):""}

    ${d.problem?`<section class="excel-study-block excel-problem-card">
      <div class="excel-block-head"><span>WHY DO I NEED THIS?</span><strong>${esc(d.problem.title||"")}</strong></div>
      <p dir="rtl">${formatStudyMixedText(d.problem.textAr||"")}</p>
    </section>`:""}

    ${d.useSourceVisual!==false?visual(l.visual):""}

    ${d.sheetBefore?`<section class="excel-study-block excel-sheet-example">
      <div class="excel-block-head"><span>SEE IT IN EXCEL</span><strong>${esc(d.sheetBefore.title||"Sheet")}</strong></div>
      ${renderDeepTable(d.sheetBefore)}
      <p dir="rtl">${formatStudyMixedText(d.sheetBefore.captionAr||"")}</p>
      <small class="excel-visual-label">PLATFORM CLARIFICATION — practice dataset created only to explain the source-supported formula behavior</small>
    </section>`:""}

    ${renderDeepScenarios(d.scenarioCards||[])}
    ${renderDeepWorkedExamples(d.workedExamples||[])}
    ${renderComparisonTable(d.comparison,"COMPARE")}
    ${renderComparisonTable(d.decisionTable,"DECISION TABLE")}
    ${d.useSourceFormulaCards!==false?renderFormulas(l.formulas||[]):""}
    ${d.useSourceSteps!==false?renderSteps(l.steps||[]):""}
    ${renderTechnicalLabs(d.technicalLabs||[])}
    ${renderMistakes(d.commonMistakes||[])}
    ${renderTryIt(d.tryIt)}
    ${renderQuickCheck(d.quickCheck,s.id)}

    ${d.nextConnection?`<section class="excel-study-block excel-next-connection">
      <div class="excel-block-head"><span>NEXT CONNECTION</span><strong>هنستخدم ده فين بعد كده؟</strong></div>
      <p dir="rtl">${formatStudyMixedText(d.nextConnection.textAr||"")}</p>
    </section>`:""}

    ${notes(l.notes||[])}
    ${l.correction?`<aside class="excel-source-note correction"><strong>${esc(l.correction.label||"PRESENTATION CORRECTION")}</strong><p dir="rtl">${formatStudyMixedText(l.correction.textAr||"")}</p></aside>`:""}

    <section class="excel-study-block excel-source-trace" dir="ltr">
      <div class="excel-block-head"><span>SOURCE TRACE</span><strong>Course material</strong></div>
      <p>${esc(normalizeStudyText(l.sourceTrace||s.sourceTrace||""))}</p>
    </section>
  </div>`;
}

const renderExcelStudySectionHtmlV1=renderExcelStudySectionHtml;
export function renderExcelStudySectionHtmlV2(s,index){
  if(s?.deepLearningV2?.version?.startsWith("2."))return renderExcelDeepSectionHtml(s,index);
  return renderExcelStudySectionHtmlV1(s,index);
}
