
export function normalizeBuildVersion(value){
  const raw=String(value??"").trim().replace(/^v/i,"");
  const match=raw.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if(!match)return null;
  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`;
}

export function resolveBuildVersion(doc=globalThis.document,fallback="unknown"){
  if(!doc)return fallback;

  const candidates=[
    doc.documentElement?.dataset?.buildVersion,
    doc.querySelector?.("[data-build-version]")?.dataset?.buildVersion,
    doc.getElementById?.("environmentBanner")?.dataset?.buildVersion
  ];

  for(const candidate of candidates){
    const normalized=normalizeBuildVersion(candidate);
    if(normalized)return normalized;
  }

  return fallback;
}

export function displayBuildVersion(value){
  const normalized=normalizeBuildVersion(value);
  return normalized?`V${normalized}`:"Unknown";
}
