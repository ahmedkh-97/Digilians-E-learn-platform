
const LANGUAGE_LABELS={
  python:"PYTHON",
  sql:"SQL",
  dax:"DAX",
  excel:"EXCEL",
  m:"POWER QUERY M",
  generic:"CODE"
};

const SQL_KEYWORDS=new Set([
  "SELECT","FROM","WHERE","JOIN","INNER","LEFT","RIGHT","FULL","OUTER","ON","GROUP","BY","ORDER","HAVING",
  "INSERT","INTO","VALUES","UPDATE","SET","DELETE","CREATE","ALTER","DROP","TABLE","VIEW","AS","DISTINCT",
  "CASE","WHEN","THEN","ELSE","END","AND","OR","NOT","NULL","IS","IN","EXISTS","BETWEEN","LIKE","TOP",
  "UNION","ALL","WITH","OVER","PARTITION","ASC","DESC","COUNT","SUM","AVG","MIN","MAX"
]);
const PYTHON_KEYWORDS=new Set([
  "and","as","assert","async","await","break","class","continue","def","del","elif","else","except","False",
  "finally","for","from","global","if","import","in","is","lambda","None","nonlocal","not","or","pass","raise",
  "return","True","try","while","with","yield"
]);
const DAX_KEYWORDS=new Set([
  "VAR","RETURN","IF","SWITCH","TRUE","FALSE","BLANK","CALCULATE","CALCULATETABLE","FILTER","ALL","ALLEXCEPT",
  "ALLSELECTED","VALUES","SELECTEDVALUE","SUM","SUMX","AVERAGE","AVERAGEX","COUNT","COUNTA","COUNTROWS",
  "DISTINCTCOUNT","MIN","MAX","DIVIDE","RELATED","RELATEDTABLE","DATEADD","TOTALYTD","SAMEPERIODLASTYEAR",
  "USERELATIONSHIP","KEEPFILTERS","REMOVEFILTERS"
]);
const M_KEYWORDS=new Set([
  "let","in","each","if","then","else","try","otherwise","as","is","meta","section","shared","type"
]);

function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,ch=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

const BIDI_DISPLAY_CONTROLS=/[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
export function sanitizeDisplayText(value){
  return String(value??"").replace(BIDI_DISPLAY_CONTROLS,"");
}

function normalizedContext(context={}){
  return {
    trackId:String(context.trackId||context.track||"").toLowerCase(),
    topic:String(context.topic||"").toLowerCase(),
    topicId:String(context.topicId||"").toLowerCase(),
    questionType:String(context.questionType||"").toLowerCase()
  };
}

function strongLanguageFromText(text=""){
  const t=String(text);
  if(/\b(?:SELECT\b[\s\S]{0,160}\bFROM\b|INSERT\s+INTO\b|UPDATE\s+\w+\s+SET\b|DELETE\s+FROM\b|CREATE\s+(?:TABLE|VIEW)\b|ALTER\s+TABLE\b|DROP\s+(?:TABLE|VIEW)\b)/i.test(t))return "sql";
  if(/\b(?:np\.|pd\.|plt\.|sns\.|numpy\.|pandas\.|DataFrame\s*\(|def\s+\w+\s*\(|for\s+\w+\s+in\s+|while\s+.+:|print\s*\(|range\s*\()/i.test(t))return "python";
  if(/\b(?:CALCULATE|CALCULATETABLE|SUMX|AVERAGEX|DISTINCTCOUNT|COUNTROWS|SELECTEDVALUE|RELATED|DIVIDE|SAMEPERIODLASTYEAR|TOTALYTD)\s*\(/i.test(t))return "dax";
  if(/\b(?:Table|List|Text|Record|Excel|Csv|Json|Web)\.[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(t) || /^\s*let\b[\s\S]*\bin\b/im.test(t))return "m";
  if(/(?:^|\s)=[A-Z][A-Z0-9._]*\s*\(/.test(t))return "excel";
  return null;
}

export function inferTechnicalLanguage(text="",context={}){
  const strong=strongLanguageFromText(text);
  if(strong)return strong;

  const c=normalizedContext(context);
  const combined=`${c.topic} ${c.topicId}`;
  if(c.trackId.includes("python"))return "python";
  if(c.trackId.includes("sql") || c.trackId.includes("database"))return "sql";

  if(c.trackId.includes("power-bi") || c.trackId.includes("power bi")){
    if(/\b(?:power query|query & m|power-query|(?:^|\s)m(?:\s|$))\b/.test(combined))return "m";
    if(/\bdax\b/.test(combined))return "dax";
  }

  if(c.trackId.includes("excel")){
    if(/\bdax\b|power pivot/.test(combined))return "dax";
    return "excel";
  }

  return "generic";
}

function stripOuterBackticks(text){
  const s=String(text??"").trim();
  const m=s.match(/^`([^`]+)`$/s);
  return m?m[1]:s;
}

function isExcelCell(identifier){
  return /^[A-Z]{1,3}\$?\d+$/i.test(identifier) || /^\$[A-Z]{1,3}\$?\d+$/i.test(identifier);
}

function tokenClass(identifier,language,nextChar){
  if(language==="python" && PYTHON_KEYWORDS.has(identifier))return "kw";
  if(language==="sql" && SQL_KEYWORDS.has(identifier.toUpperCase()))return "kw";
  if(language==="dax" && DAX_KEYWORDS.has(identifier.toUpperCase()))return nextChar==="("?"fn":"kw";
  if(language==="m" && M_KEYWORDS.has(identifier.toLowerCase()))return "kw";
  if(language==="excel" && isExcelCell(identifier))return "ref";
  if(nextChar==="(")return "fn";
  if(/^(?:np|pd|plt|sns|df)$/i.test(identifier))return "lib";
  return "id";
}

export function highlightCode(code,language="generic"){
  const src=sanitizeDisplayText(code);
  let out="";
  let i=0;

  while(i<src.length){
    const ch=src[i];
    const next=src[i+1]||"";

    // Comments
    if((language==="python" && ch==="#") || ((language==="sql"||language==="dax") && ch==="-" && next==="-")){
      const start=i;
      while(i<src.length && src[i]!=="\n")i++;
      out+=`<span class="tok-comment">${escapeHtml(src.slice(start,i))}</span>`;
      continue;
    }

    // Strings
    if(ch==="'" || ch==='"'){
      const quote=ch;
      let j=i+1;
      while(j<src.length){
        if(src[j]==="\\" && j+1<src.length){j+=2;continue;}
        if(src[j]===quote){
          if(language==="sql" && quote==="'" && src[j+1]==="'"){j+=2;continue;}
          j++;break;
        }
        j++;
      }
      out+=`<span class="tok-string">${escapeHtml(src.slice(i,j))}</span>`;
      i=j;continue;
    }

    // DAX / table references [Measure]
    if((language==="dax"||language==="excel") && ch==="["){
      const close=src.indexOf("]",i+1);
      if(close!==-1){
        out+=`<span class="tok-ref">${escapeHtml(src.slice(i,close+1))}</span>`;
        i=close+1;continue;
      }
    }

    // Numbers
    if(/[0-9]/.test(ch) && (i===0 || !/[A-Za-z_]/.test(src[i-1]))){
      const m=src.slice(i).match(/^(?:\d+(?:\.\d+)?|\.\d+)/);
      if(m){
        out+=`<span class="tok-number">${escapeHtml(m[0])}</span>`;
        i+=m[0].length;continue;
      }
    }

    // Identifiers / keywords / functions
    if(/[A-Za-z_]/.test(ch)){
      const m=src.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
      const ident=m[0];
      let j=i+ident.length;
      while(j<src.length && /\s/.test(src[j]))j++;
      const cls=tokenClass(ident,language,src[j]||"");
      out+=`<span class="tok-${cls}">${escapeHtml(ident)}</span>`;
      i+=ident.length;continue;
    }

    // Operators
    if(/[=+\-*\/<>!%&|]/.test(ch)){
      const m=src.slice(i).match(/^(?:>=|<=|==|!=|<>|\+=|-=|\*=|\/=|&&|\|\||=>|[=+\-*\/<>!%&|])/);
      out+=`<span class="tok-op">${escapeHtml(m[0])}</span>`;
      i+=m[0].length;continue;
    }

    out+=escapeHtml(ch);
    i++;
  }
  return out;
}

function looksLikeTableLines(lines){
  if(lines.length<2)return false;
  const delimiter=lines.every(x=>x.includes("|"))?"|":lines.every(x=>x.includes("\t"))?"\t":null;
  if(!delimiter)return false;
  const counts=lines.map(x=>x.split(delimiter).length);
  return Math.min(...counts)>=2 && Math.max(...counts)-Math.min(...counts)<=1;
}

function renderTable(lines){
  const delimiter=lines.every(x=>x.includes("|"))?"|":"\t";
  const rows=lines.map(line=>line.split(delimiter).map(x=>x.trim()).filter((x,idx,arr)=>!(x===""&&(idx===0||idx===arr.length-1))));
  return `<div class="technical-table-wrap" dir="ltr"><table class="technical-result-table"><tbody>${
    rows.map((row,ri)=>`<tr>${row.map(cell=>ri===0?`<th>${renderInlineTechnical(cell,"generic")}</th>`:`<td>${renderInlineTechnical(cell,"generic")}</td>`).join("")}</tr>`).join("")
  }</tbody></table></div>`;
}

function pythonAssignmentLine(line){
  const s=line.trim();
  if(!s)return false;
  // variable, attribute or subscript target with normal/augmented assignment.
  const target=String.raw`(?:[A-Za-z_]\w*(?:\.[A-Za-z_]\w*|\[[^\]\n]+\])*)(?:\s*,\s*[A-Za-z_]\w*(?:\.[A-Za-z_]\w*|\[[^\]\n]+\])*)*`;
  return new RegExp(`^(?:\\(?\\s*${target}\\s*\\)?)\\s*(?:=|\\+=|-=|\\*=|\\/=|\\/\\/=|%=|\\*\\*=)\\s*.+$`).test(s);
}
function pythonControlLine(line){
  const s=line.trim();
  return /^(?:async\s+def\b|def\b|class\b|for\b|async\s+for\b|while\b|if\b|elif\b|else\s*:|try\s*:|except\b|finally\s*:|with\b|async\s+with\b|match\b|case\b)/.test(s);
}
function pythonSimpleStatement(line){
  const s=line.trim();
  return /^(?:break|continue|pass|return(?:\s+.*)?|raise(?:\s+.*)?|assert\s+.+|yield(?:\s+.*)?|import\s+.+|from\s+\S+\s+import\s+.+|global\s+.+|nonlocal\s+.+)$/.test(s);
}
function pythonExpressionLine(line){
  const s=line.trim();
  if(!s)return false;
  if(/^lambda\b/.test(s))return true;
  if(/^(?:print|len|range|sorted|sum|min|max|list|tuple|set|dict|open|enumerate|zip|map|filter)\s*\(/.test(s))return true;
  if(/^(?:np|pd|plt|sns|numpy|pandas)\.[A-Za-z_]\w*/.test(s))return true;
  if(/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+\s*\(/.test(s))return true;
  if(/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*(?:\[[^\]\n]+\])+(?:\.[A-Za-z_]\w*(?:\([^)\n]*\))?)*$/.test(s))return true;
  if(/^[A-Za-z_]\w*\s*(?:==|!=|>=|<=|>|<)\s*.+$/.test(s))return true;
  return false;
}
function pythonLiteralContinuation(line){
  const s=line.trim();
  if(!s)return false;
  if(/^[\]\)\}][,;]?$/.test(s))return true;
  if(/^[\[\{\(].*[\]\}\)]?,?$/.test(s))return true;
  if(/^(?:"[^"]*"|'[^']*'|\d+(?:\.\d+)?|None|True|False)\s*,?$/.test(s))return true;
  if(/^\{[\s\S]*\}\s*,?$/.test(s))return true;
  return false;
}
function pythonCodeLine(line){
  const s=line.trim();
  if(!s)return false;
  return /^@/.test(s) ||
    pythonAssignmentLine(s) ||
    pythonControlLine(s) ||
    pythonSimpleStatement(s) ||
    pythonExpressionLine(s);
}
function sqlCodeLine(line){
  return /^\s*(?:SELECT|FROM|WHERE|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|ON|GROUP\s+BY|ORDER\s+BY|HAVING|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|WITH|UNION|AND|OR|CASE|WHEN|THEN|ELSE|END)\b/i.test(line);
}
function daxCodeLine(line){
  const s=line.trim();
  return /^(?:VAR\b|RETURN\b|[A-Za-z_][A-Za-z0-9 _-]*\s*=\s*$|[A-Za-z_][A-Za-z0-9 _-]*\s*=\s*(?:CALCULATE|CALCULATETABLE|SUMX?|AVERAGEX?|COUNTROWS|DISTINCTCOUNT|DIVIDE|FILTER|IF|SWITCH)\s*\(|(?:CALCULATE|CALCULATETABLE|SUMX?|AVERAGEX?|COUNTROWS|DISTINCTCOUNT|DIVIDE|FILTER|IF|SWITCH)\s*\(|[\[\]\(\),'"0-9._+\-*\/\s]+$)/i.test(s);
}
function mCodeLine(line){
  const s=line.trim();
  return /^(?:let\s*$|in\s*$|each\b|#"\w|[A-Za-z_][A-Za-z0-9_ ]*\s*=\s*(?:Table|List|Text|Record|Excel|Csv|Json|Web)\.|(?:Table|List|Text|Record|Excel|Csv|Json|Web)\.)/i.test(s);
}
function excelCodeLine(line){
  return /^\s*=[A-Z][A-Z0-9._]*\s*\(/i.test(line);
}
function genericCodeLine(line){
  const s=line.trim();
  return /^(?:[A-Za-z_]\w*\s*=\s*.+|[A-Za-z_]\w*\([^)]*\)\s*;?)$/.test(s);
}

function isCodeStart(line,language){
  if(language==="python")return pythonCodeLine(line);
  if(language==="sql")return sqlCodeLine(line);
  if(language==="dax")return daxCodeLine(line);
  if(language==="m")return mCodeLine(line);
  if(language==="excel")return excelCodeLine(line);
  return genericCodeLine(line);
}

function bracketBalance(text){
  let n=0;
  let quote=null;
  let escaped=false;
  for(const ch of String(text??"")){
    if(quote){
      if(escaped){escaped=false;continue}
      if(ch==="\\"){escaped=true;continue}
      if(ch===quote)quote=null;
      continue;
    }
    if(ch==="'" || ch==='"'){quote=ch;continue}
    if("([{".includes(ch))n++;
    else if(")]}".includes(ch))n--;
  }
  return n;
}

function looksLikeProseLine(line){
  const s=line.trim();
  if(!s)return false;
  if(/[؟?]$/.test(s))return true;
  if(/^(?:what|which|why|how|when|where|who|choose|select|identify|you\s|a\s|an\s|the\s|using\s|given\s|consider\s|suppose\s|assume\s)/i.test(s) &&
     /\s/.test(s) &&
     !pythonCodeLine(s) &&
     !sqlCodeLine(s) &&
     !daxCodeLine(s) &&
     !mCodeLine(s) &&
     !excelCodeLine(s))return true;
  return false;
}

function isCodeContinuation(line,language,balance,previousLine="",codeStarted=false){
  const s=line.trim();
  if(!s)return balance>0;
  if(language==="python"){
    if(balance>0)return true;
    if(pythonCodeLine(s))return true;
    if(codeStarted && pythonLiteralContinuation(s))return true;
    return false;
  }
  if(isCodeStart(line,language))return true;
  if(balance>0)return true;
  if(/^[\]\)\}][,;]?$/.test(s))return true;
  if(language==="sql" && /^(?:(?:[A-Za-z_][\w.]*\s*,\s*)+[A-Za-z_][\w.]*,?|[A-Za-z_][\w.]*\s*(?:,|AS\b)|[A-Za-z_][\w.]*\s*(?:=|>|<|>=|<=|<>).+|,)/i.test(s))return true;
  if(language==="dax" && /^(?:[A-Za-z_][\w.]*\s*,|\[[^\]]+\]\s*,?|[A-Za-z_]\w*\[[^\]]+\]\s*,?|[\)\],]+)$/.test(s))return true;
  if(language==="m" && (/^[A-Za-z_][A-Za-z0-9_]*\s*,?$/.test(s) || /^#".+"\s*,?$/.test(s)))return true;
  return false;
}

function mergeAdjacentSegments(segments){
  const out=[];
  for(const seg of segments){
    const prev=out[out.length-1];
    if(prev && prev.type===seg.type && prev.language===seg.language && (seg.type==="text" || seg.type==="code")){
      prev.text+=`\n${seg.text}`;
    }else{
      out.push({...seg});
    }
  }
  return out;
}

function splitFenced(text,context){
  const src=sanitizeDisplayText(text);
  const re=/```([A-Za-z0-9+#._-]*)\s*\n([\s\S]*?)```/g;
  let m,last=0,segments=[];
  while((m=re.exec(src))){
    if(m.index>last)segments.push(...splitLines(src.slice(last,m.index),context));
    const hint=m[1].toLowerCase();
    const lang=hint.includes("python")?"python":hint==="sql"?"sql":hint==="dax"?"dax":hint==="m"?"m":hint.includes("excel")?"excel":inferTechnicalLanguage(m[2],context);
    segments.push({type:"code",text:m[2].replace(/\n$/,""),language:lang});
    last=m.index+m[0].length;
  }
  if(last<src.length)segments.push(...splitLines(src.slice(last),context));
  return mergeAdjacentSegments(segments);
}

function splitPythonLines(src,context){
  const lines=src.split(/\r?\n/);
  const segments=[];
  let prose=[];
  let code=[];
  let balance=0;

  const flushProse=()=>{
    while(prose.length && !prose[0].trim())prose.shift();
    while(prose.length && !prose[prose.length-1].trim())prose.pop();
    if(prose.length){
      segments.push({type:"text",text:prose.join("\n"),language:"python"});
      prose=[];
    }
  };
  const flushCode=()=>{
    while(code.length && !code[0].trim())code.shift();
    while(code.length && !code[code.length-1].trim())code.pop();
    if(code.length){
      segments.push({type:"code",text:code.join("\n"),language:"python"});
      code=[];
      balance=0;
    }
  };

  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    const trimmed=line.trim();

    if(code.length){
      if(isCodeContinuation(line,"python",balance,code[code.length-1],true)){
        code.push(line);
        balance+=bracketBalance(line);
        continue;
      }

      if(!trimmed && balance<=0){
        // Keep one blank inside a running code block only when another code line follows.
        const next=lines.slice(i+1).find(x=>x.trim());
        if(next && pythonCodeLine(next)){
          code.push(line);
          continue;
        }
      }

      // A clear prose line closes the program block.
      if(looksLikeProseLine(line) || !pythonCodeLine(line)){
        flushCode();
      }
    }

    if(pythonCodeLine(line)){
      flushProse();
      code.push(line);
      balance=bracketBalance(line);
    }else{
      prose.push(line);
    }
  }

  flushCode();
  flushProse();
  return mergeAdjacentSegments(segments);
}

function splitLines(text,context){
  const src=sanitizeDisplayText(text);
  if(!src)return [];
  const language=inferTechnicalLanguage(src,context);
  const lines=src.split(/\r?\n/);

  if(looksLikeTableLines(lines))return [{type:"table",lines,text:src,language:"generic"}];

  if(language==="python"){
    return splitPythonLines(src,context);
  }

  const segments=[];
  let prose=[];
  let code=[];
  let balance=0;

  const flushProse=()=>{
    if(prose.length){
      segments.push({type:"text",text:prose.join("\n"),language});
      prose=[];
    }
  };
  const flushCode=()=>{
    if(code.length){
      segments.push({type:"code",text:code.join("\n"),language});
      code=[]; balance=0;
    }
  };

  for(let i=0;i<lines.length;i++){
    const line=lines[i];

    if(code.length){
      if(isCodeContinuation(line,language,balance,code[code.length-1],true)){
        code.push(line);
        balance+=bracketBalance(line);
        continue;
      }
      flushCode();
    }

    if(isCodeStart(line,language)){
      flushProse();
      code.push(line);
      balance=bracketBalance(line);
    }else{
      prose.push(line);
    }
  }

  flushCode();flushProse();
  return mergeAdjacentSegments(segments);
}

function splitInlineFormula(text,language){
  const s=String(text??"");

  // Excel: sentence followed by a formula.
  if(language==="excel"){
    const m=s.match(/^(.*?)(?=\s+=[A-Z][A-Z0-9._]*\s*\()(\s*)(=[A-Z][\s\S]*)$/i);
    if(m && m[1].trim()){
      return [
        {type:"text",text:m[1]+m[2],language},
        {type:"code",text:m[3],language}
      ];
    }
  }

  // SQL: preserve surrounding prose while making a complete query fragment inline.
  if(language==="sql"){
    const m=s.match(/^(.*?)(\bSELECT\b[\s\S]*?;)(\s*.*)$/i);
    if(m && m[2] && /\bFROM\b/i.test(m[2])){
      return [
        ...(m[1]?[{type:"text",text:m[1],language}]:[]),
        {type:"inline-code",text:m[2],language},
        ...(m[3]?[{type:"text",text:m[3],language}]:[])
      ];
    }
  }

  return [{type:"text",text:s,language}];
}

export function analyzeTechnicalContent(text,context={}){
  const source=String(text??"");
  const displaySource=sanitizeDisplayText(source);
  let segments=splitFenced(displaySource,context);

  if(segments.length===1 && segments[0].type==="text" && !displaySource.includes("\n")){
    segments=splitInlineFormula(displaySource,segments[0].language);
  }

  segments=mergeAdjacentSegments(segments);
  const hasCode=segments.some(s=>s.type==="code"||s.type==="inline-code"||s.type==="table");
  let language=(segments.find(s=>s.type==="code"||s.type==="inline-code")?.language)||inferTechnicalLanguage(displaySource,context);

  const options=Array.isArray(context?.options)?context.options:[];
  const technicalChoices=options.filter(option=>{
    const optionText=sanitizeDisplayText(option?.text??"");
    const optionLanguage=inferTechnicalLanguage(optionText,context);
    return looksLikeWholeCode(optionText,optionLanguage);
  });
  const hasTechnicalChoices=technicalChoices.length>=2;

  if(!hasCode && hasTechnicalChoices && options.length){
    const firstCodeOption=technicalChoices[0]?.text||"";
    language=inferTechnicalLanguage(firstCodeOption,context);
  }

  return {
    source,
    displaySource,
    segments,
    hasCode,
    hasTechnicalChoices,
    technicalChoiceCount:technicalChoices.length,
    language,
    taskLabel:(hasCode||hasTechnicalChoices)?technicalTaskLabel(displaySource,context,language,{hasCode,hasTechnicalChoices}):""
  };
}

function technicalTaskLabel(text,context,language,state={}){
  const t=sanitizeDisplayText(text).toLowerCase();

  if(!state.hasCode && state.hasTechnicalChoices){
    if(language==="sql")return "CHOOSE THE CORRECT QUERY";
    if(language==="dax" || language==="excel")return "CHOOSE THE CORRECT FORMULA";
    if(language==="m")return "CHOOSE THE CORRECT QUERY";
    if(language==="python")return "CHOOSE THE CORRECT CODE";
    return "CHOOSE THE CORRECT TECHNICAL ANSWER";
  }

  if(language==="sql")return /\b(?:result|return|output|returns)\b/.test(t)?"READ THE QUERY → CHOOSE THE RESULT":"READ THE QUERY → CHOOSE THE ANSWER";
  if(language==="dax")return /\b(?:result|return|value|output|returns)\b/.test(t)?"READ THE MEASURE → CHOOSE THE RESULT":"READ THE MEASURE → CHOOSE THE ANSWER";
  if(language==="excel")return /\b(?:result|return|value|output|returns)\b/.test(t)?"READ THE FORMULA → CHOOSE THE RESULT":"READ THE FORMULA → CHOOSE THE ANSWER";
  if(language==="m")return /\b(?:result|return|output|returns)\b/.test(t)?"READ THE QUERY → CHOOSE THE RESULT":"READ THE QUERY → CHOOSE THE ANSWER";
  if(language==="python"){
    if(/(?:predict|what).{0,40}(?:output|print)|\boutput\b/.test(t))return "READ THE CODE → PREDICT THE OUTPUT";
    if(/\b(?:return|returns|result|value|stored)\b/.test(t))return "READ THE CODE → CHOOSE THE RESULT";
    return "READ THE CODE → CHOOSE THE ANSWER";
  }
  return "READ THE CODE → CHOOSE THE ANSWER";
}

function renderCodeBlock(code,language){
  const lines=String(code??"").split("\n");
  const multiline=lines.length>1;
  return `<div class="technical-code-block" dir="ltr" data-language="${escapeHtml(language)}">
    <div class="technical-code-head">
      <span class="technical-language-badge">${escapeHtml(LANGUAGE_LABELS[language]||LANGUAGE_LABELS.generic)}</span>
      <span class="technical-code-hint">${multiline?`${lines.length} LINES`:"CODE"}</span>
    </div>
    <pre class="technical-code-pre"><code>${
      lines.map((line,index)=>`<span class="technical-code-line">${multiline?`<span class="technical-line-number">${index+1}</span>`:""}<span class="technical-code-source">${highlightCode(line,language)}</span></span>`).join("")
    }</code></pre>
  </div>`;
}

export function renderTechnicalCodeBlock(code,language="generic"){
  return renderCodeBlock(sanitizeDisplayText(code),language);
}

function renderInlineTechnical(text,language){
  const src=sanitizeDisplayText(text);
  let out="",last=0;
  const tick=/`([^`\n]+)`/g;
  let m;
  while((m=tick.exec(src))){
    out+=escapeHtml(src.slice(last,m.index));
    const inlineLanguage=LANGUAGE_LABELS[language]?language:inferTechnicalLanguage(m[1],{});
    out+=`<code class="technical-inline-code" dir="ltr">${highlightCode(m[1],inlineLanguage)}</code>`;
    last=m.index+m[0].length;
  }
  out+=escapeHtml(src.slice(last));
  return out;
}

function renderTextSegment(text,language,isLast=false,only=false){
  const cls=`technical-prose${isLast?" technical-final-prompt":""}${only?" technical-prose-only":""}`;
  return `<div class="${cls}">${renderInlineTechnical(text,language)}</div>`;
}

export function renderTechnicalQuestion(text,context={}){
  const info=analyzeTechnicalContent(text,context);
  const segs=info.segments;
  const meaningful=segs.filter(s=>String(s.text??"").trim() || s.type==="table");
  let textSeen=0;
  const textCount=meaningful.filter(s=>s.type==="text").length;

  const body=meaningful.map((seg)=>{
    if(seg.type==="code")return renderCodeBlock(seg.text,seg.language||info.language);
    if(seg.type==="inline-code")return `<code class="technical-inline-code technical-inline-query" dir="ltr">${highlightCode(seg.text,seg.language||info.language)}</code>`;
    if(seg.type==="table")return renderTable(seg.lines||[]);
    textSeen++;
    return renderTextSegment(seg.text,seg.language||info.language,textSeen===textCount && info.hasCode,textCount===1&&!info.hasCode);
  }).join("");

  return `<div class="technical-question-shell ${info.hasCode?"has-technical-code":"plain-question"} ${info.hasTechnicalChoices?"has-technical-choices":""}" data-language="${escapeHtml(info.language)}">
    ${info.taskLabel?`<div class="technical-task-label" dir="ltr">${escapeHtml(info.taskLabel)}</div>`:""}
    ${body}
  </div>`;
}

function looksLikeWholeCode(text,language){
  const raw=sanitizeDisplayText(stripOuterBackticks(text));
  const s=raw.trim();
  if(!s)return false;
  if(/^`[\s\S]+`$/.test(sanitizeDisplayText(String(text).trim())))return true;

  if(language==="python"){
    if(/^lambda\b[\s\S]*:\s*.+$/.test(s))return true;
    if(/^(?:break|continue|pass|return(?:\s+.*)?|raise(?:\s+.*)?|import\s+.+|from\s+\S+\s+import\s+.+)$/.test(s))return true;
    if(pythonAssignmentLine(s) || pythonControlLine(s) || pythonExpressionLine(s))return true;
    if(/^(?:[A-Za-z_]\w*(?:\.[A-Za-z_]\w*|\[[^\]\n]+\])*)\s*(?:==|!=|>=|<=|>|<)\s*.+$/.test(s))return true;
    if(/^[\[\{\(][\s\S]*[\]\}\)]$/.test(s))return true;
    if(s.includes("\n")){
      const lines=s.split(/\r?\n/).filter(x=>x.trim());
      return lines.length>0 && (
        pythonCodeLine(lines[0]) ||
        lines.some(line=>pythonCodeLine(line)) ||
        bracketBalance(s)===0 && /(?:\bdf\[|\bnp\.|\bpd\.|\blambda\b)/.test(s)
      );
    }
    return false;
  }
  if(language==="sql"){
    return /^(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/i.test(s) || (/\bSELECT\b/i.test(s)&&/\bFROM\b/i.test(s));
  }
  if(language==="dax"){
    return /^(?:[A-Za-z_][\w ]*\s*:?=\s*)?(?:CALCULATE|CALCULATETABLE|SUMX?|AVERAGEX?|COUNTROWS|DISTINCTCOUNT|DIVIDE|FILTER|IF|SWITCH|PRODUCT|SUMIF)\s*\(/i.test(s)
      || /^\[[^\]]+\]$/.test(s)
      || /^[A-Za-z_]\w*\[[^\]]+\]$/.test(s);
  }
  if(language==="excel"){
    return /^=?[A-Z][A-Z0-9._]*\s*\([^)]*\)$/i.test(s) || /^[A-Z]{1,3}\d+(?::[A-Z]{1,3}\d+)?$/i.test(s);
  }
  if(language==="m"){
    return /^(?:let\b|in\b|each\b|(?:Table|List|Text|Record|Excel|Csv|Json|Web)\.)/i.test(s);
  }
  return false;
}

export function displayTopicForQuestion(question={}){
  const original=String(question?.topic||"").trim();
  if(original && !/^(?:other|general)$/i.test(original))return original;

  const track=String(question?.trackId||question?.track||"").toLowerCase();
  if(!track.includes("python"))return original || "General";

  const questionText=sanitizeDisplayText(question?.question||"");
  const optionText=sanitizeDisplayText((question?.options||[]).map(o=>o?.text||"").join("\n"));
  const text=`${questionText}\n${optionText}`;

  if(/\b(?:np\.|numpy|ndarray|array\s*\()/i.test(text))return "NumPy";
  if(/\b(?:pd\.|pandas|DataFrame|df\[|fillna|dropna|groupby|sort_values|iloc|loc\[)/i.test(text))return "Pandas";
  if(/\b(?:plt\.|sns\.|matplotlib|seaborn|hist\(|scatter\(|boxplot|plot\()/i.test(text))return "Data Visualization";
  if(/\b(?:open\(|read\(|write\(|append\(|os\.|file\b|directory\b)/i.test(text))return "File Handling";

  // Prefer the question's own collection context before option-only function names.
  if(/\bmatrix\b/i.test(questionText) || /\b(?:second through fifth|access the value|index|slic(?:e|ing))\b/i.test(questionText)){
    return "Lists & Indexing";
  }
  if(/\bnew list\b/i.test(questionText) || /\blist containing only\b/i.test(questionText) || /\bcomprehension\b/i.test(text)){
    return "Lists & Comprehensions";
  }
  if(/\bsales\s*=\s*\[/i.test(questionText) || /\b(?:list|nested list)\b/i.test(questionText)){
    return "Lists & Indexing";
  }

  if(/\b(?:for\b|while\b|if\b|elif\b|else:|break\b|continue\b|range\()/i.test(questionText))return "Control Flow & Loops";
  if(/\b(?:lambda\b|def\s+\w+|return\b|map\(|filter\()/i.test(text))return "Functions & Lambda";
  if(/\b(?:dict|dictionary|\{[^}]*:[^}]*\})/i.test(text))return "Data Containers";
  if(/\b(?:==|!=|>=|<=|>|<|operator|boolean|print\()/i.test(text))return "Operators & Expressions";
  return original || "Python Fundamentals";
}

export function renderTechnicalOption(text,context={}){
  const raw=sanitizeDisplayText(text);
  const language=inferTechnicalLanguage(raw,context);
  const stripped=stripOuterBackticks(raw);
  if(looksLikeWholeCode(raw,language)){
    const multiline=stripped.includes("\n");
    if(multiline)return renderCodeBlock(stripped,language);
    return `<code class="technical-option-code" dir="ltr">${highlightCode(stripped,language)}</code>`;
  }
  return `<span class="technical-option-text">${renderInlineTechnical(raw,language)}</span>`;
}

function autoInlinePattern(language){
  if(language==="python")return /\b(?:(?:np|pd|plt|sns)\.[A-Za-z_]\w*(?:\([^)\n]{0,100}\)|\[[^\]\n]{0,100}\])?|[A-Za-z_]\w*\[[^\]\n]{1,80}\]|[A-Za-z_]\w*\([^)\n]{0,80}\))/g;
  if(language==="sql")return /\b(?:SELECT\b[^;\n]{0,180};|COUNT\s*\([^)\n]{0,80}\)|SUM\s*\([^)\n]{0,80}\)|AVG\s*\([^)\n]{0,80}\))/gi;
  if(language==="dax")return /\b(?:CALCULATE|CALCULATETABLE|SUMX?|AVERAGEX?|COUNTROWS|DISTINCTCOUNT|DIVIDE|FILTER|RELATED|SELECTEDVALUE)\s*\([^)\n]{0,140}\)/gi;
  if(language==="excel")return /=?[A-Z][A-Z0-9._]*\s*\([^)\n]{0,140}\)/g;
  if(language==="m")return /\b(?:Table|List|Text|Record|Excel|Csv|Json|Web)\.[A-Za-z_]\w*\s*\([^)\n]{0,140}\)/g;
  return null;
}

function renderAutoInlineChunk(text,language){
  const pattern=autoInlinePattern(language);
  if(!pattern)return escapeHtml(text);
  let out="",last=0,m;
  while((m=pattern.exec(text))){
    out+=escapeHtml(text.slice(last,m.index));
    out+=`<code class="technical-inline-code" dir="ltr">${highlightCode(m[0],language)}</code>`;
    last=m.index+m[0].length;
    if(m[0].length===0)pattern.lastIndex++;
  }
  out+=escapeHtml(text.slice(last));
  return out;
}

export function renderTechnicalRichText(text,context={}){
  const raw=sanitizeDisplayText(text);
  const language=inferTechnicalLanguage(raw,context);
  let out="",last=0,m;
  const tick=/`([^`\n]+)`/g;
  while((m=tick.exec(raw))){
    out+=renderAutoInlineChunk(raw.slice(last,m.index),language);
    out+=`<code class="technical-inline-code" dir="ltr">${highlightCode(m[1],inferTechnicalLanguage(m[1],context))}</code>`;
    last=m.index+m[0].length;
  }
  out+=renderAutoInlineChunk(raw.slice(last),language);
  return out;
}

export const technicalContentTestApi={
  looksLikeWholeCode,
  isCodeStart,
  isCodeContinuation,
  pythonCodeLine,
  pythonAssignmentLine,
  pythonControlLine,
  languageLabels:LANGUAGE_LABELS
};
