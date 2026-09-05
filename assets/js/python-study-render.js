import {normalizeStudyText,formatStudyMixedText} from "./study-format.js";
import {renderTechnicalQuestion,renderTechnicalOption} from "./technical-content.js?v=0.22.2";

function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));
}

function renderStudySnapshot(value){
  const raw=normalizeStudyText(value||"").trim();
  if(!raw)return "";

  const lines=raw.split(/\r?\n/).filter(Boolean);
  const isPipeTable=lines.length>=2 && lines.every(line=>line.includes("|"));
  if(isPipeTable){
    const rows=lines.map(line=>line.split("|").map(cell=>cell.trim()));
    return `<div class="python-snapshot-table-wrap"><table class="python-snapshot-table">
      <tbody>${rows.map((row,rowIndex)=>`<tr>${row.map(cell=>`${rowIndex===0?`<th>${formatStudyMixedText(cell)}</th>`:`<td>${formatStudyMixedText(cell)}</td>`}`).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
  }

  const looksArray=/^\s*\[/.test(raw);
  if(looksArray){
    return `<pre class="python-snapshot-array"><code>${escapeHtml(raw)}</code></pre>`;
  }

  return `<pre><code>${escapeHtml(raw)}</code></pre>`;
}

export function chartSvg(type){
  const commonStart=`<svg class="learning-chart-svg" viewBox="0 0 720 360" role="img" aria-label="${escapeHtml(type)} chart example">
    <rect class="chart-bg" x="0" y="0" width="720" height="360" rx="18"></rect>`;
  const axes=`<line class="chart-axis" x1="78" y1="300" x2="660" y2="300"></line>
    <line class="chart-axis" x1="78" y1="55" x2="78" y2="300"></line>
    <text class="chart-axis-text chart-anatomy-label" x="610" y="336">X-Axis</text>
    <text class="chart-axis-text chart-anatomy-label" x="20" y="72">Y-Axis</text>
    <text class="chart-title-text chart-anatomy-label" x="360" y="28">Chart Title</text>`;

  if(type==="line"){
    return `${commonStart}${axes}
      <polyline class="chart-line" points="105,250 200,225 300,205 400,145 500,165 615,92"></polyline>
      ${[[105,250],[200,225],[300,205],[400,145],[500,165],[615,92]].map(([x,y])=>`<circle class="chart-point" cx="${x}" cy="${y}" r="7"></circle>`).join("")}
      <text class="chart-callout chart-anatomy-label" x="505" y="75">Data Point</text>
      <line class="chart-anatomy-guide chart-anatomy-label" x1="550" y1="80" x2="615" y2="92"></line>
    </svg>`;
  }

  if(type==="bar"){
    const bars=[[125,190,70,110],[245,145,70,155],[365,90,70,210],[485,165,70,135]];
    return `${commonStart}${axes}
      ${bars.map(([x,y,w,h],i)=>`<rect class="chart-bar chart-series-${i%3}" x="${x}" y="${y}" width="${w}" height="${h}" rx="7"></rect>`).join("")}
      <text class="chart-axis-text" x="140" y="326">A</text><text class="chart-axis-text" x="260" y="326">B</text>
      <text class="chart-axis-text" x="380" y="326">C</text><text class="chart-axis-text" x="500" y="326">D</text>
      <text class="chart-callout chart-anatomy-label" x="455" y="82">Bar / Category Value</text>
    </svg>`;
  }

  if(type==="scatter" || type==="regression"){
    const pts=[[125,255],[170,235],[225,245],[275,205],[330,190],[375,170],[430,150],[485,165],[540,115],[600,105]];
    return `${commonStart}${axes}
      ${pts.map(([x,y])=>`<circle class="chart-point scatter" cx="${x}" cy="${y}" r="7"></circle>`).join("")}
      ${type==="regression"?`<line class="chart-regression-line" x1="115" y1="266" x2="620" y2="92"></line>
      <text class="chart-callout chart-anatomy-label" x="435" y="105">Regression Trend</text>`:""}
      <text class="chart-callout chart-anatomy-label" x="135" y="210">Observation</text>
    </svg>`;
  }

  if(type==="histogram"){
    const bars=[[105,235,90,65],[195,180,90,120],[285,105,90,195],[375,135,90,165],[465,220,90,80]];
    return `${commonStart}${axes}
      ${bars.map(([x,y,w,h],i)=>`<rect class="chart-bar histogram chart-series-${i%3}" x="${x}" y="${y}" width="${w}" height="${h}"></rect>`).join("")}
      <text class="chart-callout chart-anatomy-label" x="290" y="82">Frequency</text>
      <text class="chart-callout chart-anatomy-label" x="490" y="325">Numerical Bins</text>
    </svg>`;
  }

  if(type==="boxplot"){
    return `${commonStart}${axes}
      <line class="box-whisker" x1="145" y1="180" x2="565" y2="180"></line>
      <line class="box-whisker" x1="145" y1="155" x2="145" y2="205"></line>
      <line class="box-whisker" x1="565" y1="155" x2="565" y2="205"></line>
      <rect class="box-main" x="245" y="125" width="220" height="110" rx="8"></rect>
      <line class="box-median" x1="355" y1="125" x2="355" y2="235"></line>
      <circle class="box-outlier" cx="625" cy="180" r="8"></circle>
      <text class="chart-callout chart-anatomy-label" x="245" y="108">Q1</text>
      <text class="chart-callout chart-anatomy-label" x="335" y="108">Median</text>
      <text class="chart-callout chart-anatomy-label" x="445" y="108">Q3</text>
      <text class="chart-callout chart-anatomy-label" x="580" y="155">Potential Outlier</text>
    </svg>`;
  }

  if(type==="waffle"){
    let cells="";
    for(let i=0;i<50;i++){
      const col=i%10,row=Math.floor(i/10);
      const cls=i<27?"waffle-a":i<42?"waffle-b":"waffle-c";
      cells+=`<rect class="waffle-cell ${cls}" x="${125+col*45}" y="${80+row*45}" width="34" height="34" rx="6"></rect>`;
    }
    return `${commonStart}${cells}
      <text class="chart-callout chart-anatomy-label" x="120" y="325">Each square = part of the whole</text>
    </svg>`;
  }

  if(type==="wordcloud"){
    return `${commonStart}
      <g class="wordcloud">
        <text x="265" y="165" class="word-xl">DATA</text>
        <text x="115" y="105" class="word-lg">Python</text>
        <text x="430" y="95" class="word-md">Analysis</text>
        <text x="110" y="235" class="word-md">Pandas</text>
        <text x="470" y="230" class="word-lg">Visual</text>
        <text x="285" y="275" class="word-sm">Insight</text>
        <text x="545" y="165" class="word-sm">Trend</text>
      </g>
      <text class="chart-callout chart-anatomy-label" x="225" y="325">Larger word = stronger visual prominence</text>
    </svg>`;
  }

  if(type==="map-markers"){
    return `${commonStart}
      <path class="map-land" d="M110,100 C170,55 255,75 285,125 C340,105 390,125 410,170 C455,145 540,160 590,210 C535,245 450,270 365,250 C300,292 215,278 170,235 C120,220 85,165 110,100Z"></path>
      ${[[205,150],[335,195],[470,200],[530,235]].map(([x,y])=>`<g class="map-marker"><circle cx="${x}" cy="${y}" r="15"></circle><circle cx="${x}" cy="${y}" r="5"></circle></g>`).join("")}
      <text class="chart-callout chart-anatomy-label" x="175" y="120">Marker = coordinate + information</text>
    </svg>`;
  }

  if(type==="choropleth"){
    return `${commonStart}
      <path class="map-region intensity-1" d="M120 100 L250 80 L280 155 L160 180 Z"></path>
      <path class="map-region intensity-2" d="M250 80 L405 105 L390 185 L280 155 Z"></path>
      <path class="map-region intensity-3" d="M405 105 L575 145 L540 220 L390 185 Z"></path>
      <path class="map-region intensity-2" d="M160 180 L280 155 L390 185 L335 270 L195 250 Z"></path>
      <path class="map-region intensity-4" d="M390 185 L540 220 L470 285 L335 270 Z"></path>
      <text class="chart-callout chart-anatomy-label" x="130" y="325">Color intensity = regional metric</text>
    </svg>`;
  }

  if(type==="subplots"){
    return `${commonStart}
      <rect class="subplot-panel" x="55" y="65" width="285" height="240" rx="12"></rect>
      <rect class="subplot-panel" x="380" y="65" width="285" height="240" rx="12"></rect>
      <line class="mini-axis" x1="90" y1="265" x2="305" y2="265"></line>
      <line class="mini-axis" x1="90" y1="105" x2="90" y2="265"></line>
      <polyline class="chart-line" points="110,235 155,210 200,220 245,165 290,130"></polyline>
      <circle class="chart-point" cx="110" cy="235" r="5"></circle><circle class="chart-point" cx="155" cy="210" r="5"></circle>
      <circle class="chart-point" cx="200" cy="220" r="5"></circle><circle class="chart-point" cx="245" cy="165" r="5"></circle><circle class="chart-point" cx="290" cy="130" r="5"></circle>
      <line class="mini-axis" x1="415" y1="265" x2="630" y2="265"></line>
      <line class="mini-axis" x1="415" y1="105" x2="415" y2="265"></line>
      <rect class="chart-bar" x="445" y="205" width="38" height="60" rx="5"></rect>
      <rect class="chart-bar chart-series-1" x="505" y="155" width="38" height="110" rx="5"></rect>
      <rect class="chart-bar chart-series-2" x="565" y="120" width="38" height="145" rx="5"></rect>
      <text class="chart-callout chart-anatomy-label" x="120" y="90">Plot 1</text>
      <text class="chart-callout chart-anatomy-label" x="445" y="90">Plot 2</text>
    </svg>`;
  }

  return `${commonStart}${axes}</svg>`;
}

export const chartDecisionOptions={
  trend:{label:"Trend over time",chart:"Line Chart",type:"line",why:"Ordered time periods are the main structure of the question."},
  categories:{label:"Compare categories",chart:"Bar Chart",type:"bar",why:"Bar length makes category-to-category comparison direct."},
  relationship:{label:"Relationship between 2 numbers",chart:"Scatter Plot",type:"scatter",why:"Each point represents a pair of numerical values."},
  distribution:{label:"Numerical distribution",chart:"Histogram",type:"histogram",why:"Bins show how observations are distributed across numeric ranges."},
  outliers:{label:"Spread + potential outliers",chart:"Box Plot",type:"boxplot",why:"Median, quartiles, whiskers and distant points summarize spread."},
  geography:{label:"Metric by region",chart:"Choropleth",type:"choropleth",why:"Region color intensity encodes the metric geographically."}
};

function renderChartDecisionLab(){
  return `<div class="python-chart-decision-lab">
    <div class="python-v2-block-head" dir="ltr">
      <span>CHART DECISION LAB</span>
      <strong>ابدأ بالسؤال، مش باسم الرسم</strong>
    </div>
    <p class="chart-decision-intro" dir="rtl">اختار نوع السؤال التحليلي، والمنصة هتوضح الرسم الأنسب وليه.</p>
    <div class="chart-decision-options">
      ${Object.entries(chartDecisionOptions).map(([key,opt],idx)=>`<button type="button" data-chart-choice="${key}" class="${idx===0?"active":""}">${escapeHtml(opt.label)}</button>`).join("")}
    </div>
    <div class="chart-decision-result" data-chart-decision-result>
      <div>
        <span>RECOMMENDED</span>
        <strong>${chartDecisionOptions.trend.chart}</strong>
        <p>${chartDecisionOptions.trend.why}</p>
      </div>
      <div class="chart-decision-preview">${chartSvg(chartDecisionOptions.trend.type)}</div>
    </div>
  </div>`;
}

function renderChartVisual(visual){
  if(!visual)return "";
  return `<section class="python-chart-lab" data-chart-lab>
    <div class="python-chart-lab-head">
      <div>
        <span class="python-visual-label">PLATFORM VISUAL CLARIFICATION</span>
        <h4>${escapeHtml(visual.title||"Chart Preview")}</h4>
      </div>
      <span class="python-chart-type">${escapeHtml(visual.type||"chart")}</span>
    </div>

    <div class="python-chart-question">
      <span>BUSINESS QUESTION</span>
      <strong>${escapeHtml(visual.businessQuestion||"")}</strong>
    </div>

    <div class="python-chart-predict">
      <span>PREDICT THE VISUAL</span>
      <code>${escapeHtml(visual.code||"")}</code>
      <p dir="rtl">اقرأ السؤال والكود الأول، وتوقع شكل الـOutput قبل ما تظهر الرسم.</p>
    </div>

    <div class="python-chart-actions">
      <button type="button" class="primary-btn python-show-chart">Show Chart</button>
      <button type="button" class="secondary-btn python-show-anatomy" disabled>Show Anatomy</button>
    </div>

    <div class="python-chart-stage chart-preview-hidden">
      ${chartSvg(visual.type)}
    </div>

    <div class="python-chart-reading">
      <div><span>USE IT FOR</span><p>${escapeHtml(visual.useFor||"")}</p></div>
      <div><span>DO NOT USE IT WHEN</span><p>${escapeHtml(visual.avoidWhen||"")}</p></div>
      <div class="insight" dir="rtl"><span>HOW TO READ / INSIGHT</span><p>${formatStudyMixedText(visual.insightAr||"")}</p></div>
    </div>
  </section>`;
}
export function renderPythonLessonV2(lesson,sectionId){
  if(!lesson)return "";
  const model=lesson.mentalModel||{};
  const comparison=lesson.comparison;
  const flow=lesson.dataFlow;
  const quick=lesson.quickCheck;
  const depth=lesson.depth||"standard";

  const comparisonHtml=comparison?.headers?.length
    ?`<div class="python-v2-block python-comparison-block" dir="ltr">
        <div class="python-v2-block-head">
          <span>COMPARE</span>
          <strong>شوف الفرق بدل ما تحفظه</strong>
        </div>
        <div class="python-comparison-wrap">
          <table>
            <thead><tr>${comparison.headers.map(h=>`<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
            <tbody>${comparison.rows.map(row=>`<tr>${row.map(cell=>`<td>${formatStudyMixedText(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody>
          </table>
        </div>
      </div>`
    :"";

  const flowHtml=flow
    ?`<div class="python-v2-block python-dataflow-block">
        <div class="python-v2-block-head" dir="ltr">
          <span>BEFORE → OPERATION → AFTER</span>
          <strong>شوف البيانات وهي بتتغير</strong>
        </div>
        <div class="python-dataflow-grid" dir="ltr">
          <div><span>BEFORE</span>${renderStudySnapshot(flow.before||"")}</div>
          <div class="operation"><span>OPERATION</span>${renderStudySnapshot(flow.operation||"")}</div>
          <div><span>AFTER</span>${renderStudySnapshot(flow.after||"")}</div>
        </div>
        <p class="python-dataflow-meaning" dir="rtl">${formatStudyMixedText(flow.meaningAr||"")}</p>
      </div>`
    :"";

  const quickHtml=quick?.options?.length
    ?`<div class="python-v2-block python-quick-check" data-quick-check="${escapeHtml(sectionId)}">
        <div class="python-v2-block-head" dir="ltr">
          <span>QUICK CHECK</span>
          <strong>اختبر فهمك قبل ما تكمل</strong>
        </div>
        <div class="python-quick-question" dir="ltr">${renderTechnicalQuestion(normalizeStudyText(quick.question),{trackId:"python",topic:"Python Study Quick Check"})}</div>
        <div class="python-quick-options">
          ${quick.options.map(o=>`<button type="button" data-quick-option="${escapeHtml(o.id)}">
            <b>${escapeHtml(o.id)}</b><span>${renderTechnicalOption(normalizeStudyText(o.text),{trackId:"python"})}</span>
          </button>`).join("")}
        </div>
        <div class="python-quick-feedback hidden" dir="rtl"></div>
        <div class="python-quick-footer">
          <div class="python-quick-source" dir="ltr">Source: ${escapeHtml(normalizeStudyText(quick.sourceTrace||""))}</div>
          <button type="button" class="python-quick-reset hidden">Reset Quick Check</button>
        </div>
      </div>`
    :"";

  const intro=depth==="compact"
    ?`<section class="python-v2-intro-grid compact">
        <div class="python-v2-block">
          <div class="python-v2-block-head" dir="ltr"><span>WHAT IS IT?</span><strong>يعني إيه؟</strong></div>
          <p dir="rtl">${formatStudyMixedText(lesson.whatIsItAr||"")}</p>
        </div>
      </section>`
    :`<section class="python-v2-intro-grid">
        <div class="python-v2-block">
          <div class="python-v2-block-head" dir="ltr"><span>WHAT IS IT?</span><strong>يعني إيه؟</strong></div>
          <p dir="rtl">${formatStudyMixedText(lesson.whatIsItAr||"")}</p>
        </div>
        <div class="python-v2-block">
          <div class="python-v2-block-head" dir="ltr"><span>WHY DO WE NEED IT?</span><strong>ليه مهم؟</strong></div>
          <p dir="rtl">${formatStudyMixedText(lesson.whyItMattersAr||"")}</p>
        </div>
      </section>`;

  const mental=depth==="compact"?"":`
      <div class="python-v2-block python-mental-model ${escapeHtml(model.type||"concept")}">
        <div class="python-v2-block-head" dir="ltr"><span>MENTAL MODEL</span><strong>كوّن صورة ذهنية</strong></div>
        <h4 dir="rtl">${formatStudyMixedText(model.title||"")}</h4>
        <p dir="rtl">${formatStudyMixedText(model.body||"")}</p>
      </div>`;

  const walkthrough=depth==="deep" && (lesson.conceptWalkthroughAr||[]).length
    ?`<div class="python-v2-block python-concept-walkthrough">
        <div class="python-v2-block-head" dir="ltr"><span>STEP-BY-STEP</span><strong>افهم الفكرة بالترتيب</strong></div>
        <ol dir="rtl">${lesson.conceptWalkthroughAr.map(x=>`<li>${formatStudyMixedText(x)}</li>`).join("")}</ol>
      </div>`
    :"";

  return `
    <div class="python-v2-stack python-depth-${escapeHtml(depth)}">
      ${intro}
      ${mental}
      ${walkthrough}
      ${comparisonHtml}
      ${flowHtml}
      ${lesson.chartDecisionLab?renderChartDecisionLab():""}
      ${renderChartVisual(lesson.chartVisual)}
      ${depth!=="compact"?`<div class="python-v2-block python-try-this">
        <div class="python-v2-block-head" dir="ltr"><span>TRY CHANGING THIS</span><strong>جرّب بنفسك</strong></div>
        <p dir="rtl">${formatStudyMixedText(lesson.tryThisAr||"")}</p>
      </div>`:""}
      ${quickHtml}
    </div>`;
}

