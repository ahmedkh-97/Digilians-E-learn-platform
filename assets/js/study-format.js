function escapeStudyHtml(value){
  return String(value ?? "").replace(/[&<>"']/g,char=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[char]));
}

export function normalizeStudyText(value){
  let text=String(value ?? "");
  const replacements=[
    [/;amp&/gi,"&"],
    [/&amp;/gi,"&"],
    [/&lt;/gi,"<"],
    [/&gt;/gi,">"],
    [/&quot;/gi,'"'],
    [/&#39;|&#x27;|&#039;/gi,"'"],
    [/&nbsp;/gi," "]
  ];
  for(let pass=0;pass<2;pass++){
    replacements.forEach(([pattern,replacement])=>{text=text.replace(pattern,replacement)});
  }
  return text;
}

export function formatStudyMixedText(value){
  const raw=normalizeStudyText(value);
  if(!raw)return "";

  const hasArabic=/[\u0600-\u06FF]/.test(raw);
  const hasLatin=/[A-Za-z]/.test(raw);

  if(hasLatin && !hasArabic){
    return `<bdi dir="ltr" class="study-inline-term study-inline-expression">${escapeStudyHtml(raw)}</bdi>`;
  }

  const technical=/((?:الـ|ال)\s*)?([A-Za-z][A-Za-z0-9_.'()[\]{}+\-/*=<>:,%]*(?:(?:[ \t]+|[ \t]*(?:→|↔|&|\||=)[ \t]*)(?:[A-Za-z&][A-Za-z0-9_.'()[\]{}+\-/*=<>:,%]*)){0,10})/g;
  let html="",last=0,match;
  while((match=technical.exec(raw))){
    html+=escapeStudyHtml(raw.slice(last,match.index));
    const prefix=match[1]||"";
    const term=match[2]||"";
    if(prefix){
      html+=`<span class="study-ar-tech" dir="rtl"><span class="study-ar-tech-prefix">${escapeStudyHtml(prefix.trim())}</span><bdi dir="ltr" class="study-inline-term">${escapeStudyHtml(term)}</bdi></span>`;
    }else{
      html+=`<bdi dir="ltr" class="study-inline-term">${escapeStudyHtml(term)}</bdi>`;
    }
    last=match.index+match[0].length;
  }
  html+=escapeStudyHtml(raw.slice(last));
  return html;
}
