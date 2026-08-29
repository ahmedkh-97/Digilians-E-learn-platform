
import {formatStudyMixedText,normalizeStudyText} from "./study-format.js";
import {renderTechnicalCodeBlock,renderTechnicalQuestion,renderTechnicalOption} from "./technical-content.js";

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function miniTable(table,title=""){
  if(!table?.headers?.length)return "";
  return `<div class="sql-mini-table-card" dir="ltr">
    ${title?`<span class="sql-mini-title">${escapeHtml(title)}</span>`:""}
    <div class="sql-mini-table-wrap">
      <table class="sql-mini-table">
        <thead><tr>${table.headers.map(h=>`<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
        <tbody>${(table.rows||[]).map(row=>`<tr>${row.map(cell=>`<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
      </table>
    </div>
  </div>`;
}

function visualHeader(v){
  return `<div class="sql-visual-head">
    <div>
      <span class="sql-visual-label">${escapeHtml(v.label||"PLATFORM VISUAL CLARIFICATION")}</span>
      <h4>${escapeHtml(v.title||"Visual Model")}</h4>
    </div>
  </div>`;
}

function note(v){
  return v?.noteAr?`<p class="sql-visual-note" dir="rtl">${formatStudyMixedText(v.noteAr)}</p>`:"";
}

function renderVisual(v){
  if(!v)return "";
  const head=visualHeader(v);

  if(v.kind==="concept-flow"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-flow-row" dir="ltr">
        ${(v.steps||[]).map((x,i)=>`<div class="sql-flow-step"><span>${String(i+1).padStart(2,"0")}</span><strong>${escapeHtml(x)}</strong></div>${i<(v.steps||[]).length-1?`<b class="sql-flow-arrow">→</b>`:""}`).join("")}
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="concept-map"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-concept-map">${(v.items||[]).map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>
      ${note(v)}
    </section>`;
  }

  if(v.kind==="comparison"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-compare-grid" dir="ltr">
        ${[v.left,v.right].map(side=>`<div><strong>${escapeHtml(side.title)}</strong><ul>${(side.items||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`).join("")}
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="er"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-er-grid" dir="ltr">
        <div class="sql-entity-card"><strong>${escapeHtml(v.entities?.[0]?.name||"ENTITY")}</strong>${(v.entities?.[0]?.attrs||[]).map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>
        <div class="sql-relationship-diamond"><span>${escapeHtml(v.relationship||"RELATION")}</span></div>
        <div class="sql-entity-card"><strong>${escapeHtml(v.entities?.[1]?.name||"ENTITY")}</strong>${(v.entities?.[1]?.attrs||[]).map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="mapping"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-mapping-row" dir="ltr">
        <div class="sql-map-node">${escapeHtml(v.left)}</div>
        <b>↔</b>
        <div class="sql-map-node">${escapeHtml(v.right)}</div>
        <b>→</b>
        <div class="sql-map-relation"><strong>${escapeHtml(v.relation)}</strong>${(v.keys||[]).map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="normalization"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-transform-grid">
        <div>${miniTable(v.before,"BEFORE")}</div>
        <div class="sql-transform-arrow">→</div>
        <div class="sql-normalized-stack">${(v.after||[]).map(t=>miniTable(t,t.title)).join("")}</div>
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="star"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-star-model" dir="ltr">
        ${(v.dimensions||[]).map((d,i)=>`<span class="sql-star-dim d${i+1}">${escapeHtml(d)}</span>`).join("")}
        <strong class="sql-star-fact">${escapeHtml(v.fact)}</strong>
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="constraints"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-constraint-chips">${(v.rules||[]).map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>
      <div class="sql-validity-grid" dir="ltr">
        <div class="valid"><strong>VALID ROW</strong>${(v.valid||[]).map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>
        <div class="invalid"><strong>REJECTED EXAMPLES</strong>${(v.invalid||[]).map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="command-families"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-command-grid" dir="ltr">${(v.groups||[]).map(g=>`<div><strong>${escapeHtml(g.name)}</strong>${g.items.map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>`).join("")}</div>
      ${v.code?`<div class="sql-code-demo">${renderTechnicalCodeBlock(v.code,"sql")}</div>`:""}
      ${note(v)}
    </section>`;
  }

  if(v.kind==="table-transform" || v.kind==="aggregate"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-before-after">
        ${miniTable(v.before,"BEFORE")}
        <div class="sql-query-middle">${v.code?renderTechnicalCodeBlock(v.code,"sql"):""}</div>
        ${miniTable(v.after,"RESULT")}
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="query-cards"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-query-card-grid">${(v.codes||[]).map(code=>renderTechnicalCodeBlock(code,"sql")).join("")}</div>
      ${note(v)}
    </section>`;
  }

  if(v.kind==="join"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-join-sources">
        ${miniTable(v.left,v.left?.title||"LEFT")}
        <div class="sql-join-condition"><span>JOIN CONDITION</span><code>${escapeHtml(v.condition||"")}</code></div>
        ${miniTable(v.right,v.right?.title||"RIGHT")}
      </div>
      <div class="sql-join-result">${miniTable(v.result,"INNER JOIN RESULT")}</div>
      ${note(v)}
    </section>`;
  }

  if(v.kind==="nested"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-nested-query" dir="ltr">
        <div class="outer"><span>OUTER QUERY</span>${renderTechnicalCodeBlock(v.outer||"","sql")}</div>
        <div class="inner"><span>INNER QUERY</span>${renderTechnicalCodeBlock(v.inner||"","sql")}</div>
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="set"){
    const boxes=(items,label)=>`<div class="sql-set-box"><strong>${label}</strong>${items.map(x=>`<span>${escapeHtml(x)}</span>`).join("")}</div>`;
    return `<section class="sql-visual-card">${head}
      <div class="sql-set-flow" dir="ltr">${boxes(v.left||[],"SELECT A")}<b>UNION</b>${boxes(v.right||[],"SELECT B")}<b>→</b>${boxes(v.result||[],"RESULT")}</div>
      ${note(v)}
    </section>`;
  }

  if(v.kind==="window"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-before-after">
        ${miniTable(v.before,"ROWS")}
        <div class="sql-query-middle">${renderTechnicalCodeBlock(v.code||"","sql")}</div>
        ${miniTable(v.after,"ROWS + WINDOW VALUE")}
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="cte"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-cte-grid">
        ${renderTechnicalCodeBlock(v.code||"","sql")}
        <div class="sql-flow-column">${(v.steps||[]).map((x,i)=>`<div><span>${i+1}</span><strong>${escapeHtml(x)}</strong></div>`).join("")}</div>
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="pivot"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-transform-grid">
        ${miniTable(v.before,"ROW DATA")}
        <div class="sql-transform-arrow">PIVOT →</div>
        ${miniTable(v.after,"CROSS-TAB")}
      </div>${note(v)}
    </section>`;
  }

  if(v.kind==="error-flow"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-error-flow" dir="ltr">${(v.steps||[]).map((x,i)=>`<div class="${/CATCH|ROLLBACK/i.test(x)?"error":/COMMIT/i.test(x)?"success":""}"><span>${i+1}</span><strong>${escapeHtml(x)}</strong></div>`).join("")}</div>
      ${note(v)}
    </section>`;
  }

  if(v.kind==="view-flow" || v.kind==="procedure-flow"){
    return `<section class="sql-visual-card">${head}
      <div class="sql-flow-row compact" dir="ltr">${(v.steps||[]).map((x,i)=>`<div class="sql-flow-step"><span>${String(i+1).padStart(2,"0")}</span><strong>${escapeHtml(x)}</strong></div>${i<(v.steps||[]).length-1?`<b class="sql-flow-arrow">→</b>`:""}`).join("")}</div>
      ${v.code?`<div class="sql-code-demo">${renderTechnicalCodeBlock(v.code,"sql")}</div>`:""}
      ${note(v)}
    </section>`;
  }

  return `<section class="sql-visual-card">${head}${note(v)}</section>`;
}

function renderQuickCheck(quick){
  if(!quick?.options?.length)return "";
  return `<section class="sql-quick-check" data-sql-quick-check="${escapeHtml(quick.questionId||"")}">
    <div class="sql-v2-block-head">
      <span>QUICK CHECK</span>
      <strong>اختبر فهمك قبل ما تكمل</strong>
    </div>
    <div class="sql-quick-question">${renderTechnicalQuestion(normalizeStudyText(quick.question),{trackId:"sql",topic:"SQL Study Quick Check",options:quick.options})}</div>
    <div class="sql-quick-options">
      ${quick.options.map(o=>`<button type="button" data-sql-quick-option="${escapeHtml(o.id)}">
        <b>${escapeHtml(o.id)}</b><span>${renderTechnicalOption(normalizeStudyText(o.text),{trackId:"sql"})}</span>
      </button>`).join("")}
    </div>
    <div class="sql-quick-feedback hidden" dir="rtl"></div>
    <div class="sql-quick-footer">
      <small dir="ltr">Source: ${escapeHtml(normalizeStudyText(quick.sourceTrace||""))}</small>
      <button type="button" class="sql-quick-reset hidden">Reset Quick Check</button>
    </div>
  </section>`;
}

export function renderSqlStudySectionHtml(section,index){
  const lesson=section.lessonV2||{};
  const keyTerms=(section.keyTerms||[]).length
    ?`<section class="sql-v2-block sql-keyterms" dir="ltr">
      <div class="sql-v2-block-head"><span>KEY TERMS</span><strong>المصطلحات الأساسية</strong></div>
      <div class="study-term-list">${section.keyTerms.map(term=>`<span class="study-term-chip"><bdi dir="ltr">${escapeHtml(normalizeStudyText(term))}</bdi></span>`).join("")}</div>
    </section>`:"";

  const takeaways=(section.takeaways||[]).length
    ?`<section class="sql-v2-block sql-takeaways" dir="rtl">
      <div class="sql-v2-block-head" dir="ltr"><span>KEY TAKEAWAYS</span><strong>خلاصة المذاكرة</strong></div>
      <ul>${section.takeaways.map(x=>`<li><span>✓</span><p>${formatStudyMixedText(x)}</p></li>`).join("")}</ul>
    </section>`:"";

  return `
    <header class="study-section-head" dir="ltr">
      <span class="eyebrow">SECTION ${String(index+1).padStart(2,"0")}</span>
      <h3>${escapeHtml(section.title)}</h3>
      <span class="sql-v2-badge">SQL STUDY V2</span>
    </header>

    <div class="sql-v2-stack">
      <section class="sql-v2-intro-grid">
        <div class="sql-v2-block" dir="rtl">
          <div class="sql-v2-block-head" dir="ltr"><span>WHAT IS IT?</span><strong>يعني إيه؟</strong></div>
          <p>${formatStudyMixedText(lesson.whatIsItAr||section.studySummary||"")}</p>
        </div>
        <div class="sql-v2-block" dir="rtl">
          <div class="sql-v2-block-head" dir="ltr"><span>WHY DOES IT MATTER?</span><strong>ليه مهم؟</strong></div>
          <p>${formatStudyMixedText(lesson.whyItMattersAr||"")}</p>
          <small class="sql-platform-label">${escapeHtml(lesson.whyLabel||"")}</small>
        </div>
      </section>

      ${renderVisual(lesson.visual)}
      ${keyTerms}
      ${takeaways}
      ${renderQuickCheck(lesson.quickCheck)}

      <section class="sql-v2-block sql-source-trace" dir="ltr">
        <div class="sql-v2-block-head"><span>SOURCE TRACE</span><strong>Course material</strong></div>
        <p>${escapeHtml(normalizeStudyText(lesson.sourceTrace||section.sourceTrace||""))}</p>
      </section>
    </div>`;
}
