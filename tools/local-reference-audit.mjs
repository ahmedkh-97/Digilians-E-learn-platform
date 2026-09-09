import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT=path.resolve(HERE,'..');
const codePointCompare=(a,b)=>a<b?-1:a>b?1:0;

function rootPath(root){return root instanceof URL?fileURLToPath(root):path.resolve(root||DEFAULT_ROOT);}
function trackedRuntimePaths(root){
  return execFileSync('git',['ls-files','-z','--','*.html','*.css','*.js','*.mjs'],{cwd:root,encoding:'buffer'})
    .toString('utf8').split('\0').filter(Boolean)
    .filter(repoPath=>! /^(?:docs|tests|tools)\//.test(repoPath));
}

function quoted(text,start){
  const quote=text[start]; let value='';
  for(let i=start+1;i<text.length;i++){
    if(text[i]===quote)return {value,end:i+1};
    if(text[i]==='\\'&&i+1<text.length){
      const next=text[++i];
      if(next==='\n')continue;
      if(next==='\r'){if(text[i+1]==='\n')i++;continue;}
      if(next==='x'&&/^[\da-f]{2}$/i.test(text.slice(i+1,i+3))){value+=String.fromCodePoint(parseInt(text.slice(i+1,i+3),16));i+=2;continue;}
      if(next==='u'&&text[i+1]==='{'){
        const end=text.indexOf('}',i+2);const digits=end<0?'':text.slice(i+2,end);
        if(/^[\da-f]{1,6}$/i.test(digits)&&parseInt(digits,16)<=0x10ffff){value+=String.fromCodePoint(parseInt(digits,16));i=end;continue;}
      }
      if(next==='u'&&/^[\da-f]{4}$/i.test(text.slice(i+1,i+5))){value+=String.fromCodePoint(parseInt(text.slice(i+1,i+5),16));i+=4;continue;}
      if(/[0-7]/.test(next)){
        let digits=next;
        while(digits.length<3&&/[0-7]/.test(text[i+1]||'')&&parseInt(digits+text[i+1],8)<=255)digits+=text[++i];
        value+=String.fromCodePoint(parseInt(digits,8));continue;
      }
      const escapes={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v'};
      value+=escapes[next]??next;
    }else value+=text[i];
  }
  return {value,end:text.length};
}

const regexPrefixWords=new Set(['return','throw','case','delete','void','typeof','new','in','instanceof','yield','await','else','do']);
const controlHeaderWords=new Set(['if','while','for','with','switch','catch']);
function permitsRegex(previous){
  if(!previous)return true;
  if(previous.type==='word')return regexPrefixWords.has(previous.value);
  if(previous.type==='close')return Boolean(previous.regexAfter);
  if(['memberWord','string','number','regex','template','postfix'].includes(previous.type))return false;
  return true;
}

function skipRegex(text,start){
  let inClass=false;
  for(let i=start+1;i<text.length;i++){
    if(text[i]==='\\'){i++;continue;}
    if(text[i]==='[')inClass=true;
    else if(text[i]===']')inClass=false;
    else if(text[i]==='/'&&!inClass){
      i++; while(/[a-z]/i.test(text[i]||''))i++;
      return i;
    }
  }
  return text.length;
}

function lex(text,start=0,stopAtBrace=false){
  const tokens=[]; let previous=null; let depth=stopAtBrace?1:0; const parens=[];
  const push=token=>{tokens.push(token);previous=token;};
  for(let i=start;i<text.length;){
    const c=text[i];
    if(/\s/.test(c)){i++;continue;}
    if(c==='/'&&text[i+1]==='/'){i=text.indexOf('\n',i+2);if(i<0)i=text.length;continue;}
    if(c==='/'&&text[i+1]==='*'){const end=text.indexOf('*/',i+2);i=end<0?text.length:end+2;continue;}
    if(c==='/'&&permitsRegex(previous)){i=skipRegex(text,i);push({type:'regex',value:'/'});continue;}
    if(c==='"'||c==="'"){const item=quoted(text,i);push({type:'string',value:item.value});i=item.end;continue;}
    if(c==='`'){
      let j=i+1; let expression=false;
      for(;j<text.length;){
        if(text[j]==='\\'){j+=2;continue;}
        if(text[j]==='`'){j++;break;}
        if(text[j]==='$'&&text[j+1]==='{'){
          expression=true;
          const nested=lex(text,j+2,true); tokens.push(...nested.tokens); j=nested.end;
          continue;
        }
        j++;
      }
      push({type:'template',value:expression?null:text.slice(i+1,j-1),expression});i=j;continue;
    }
    if(/[A-Za-z_$]/.test(c)){
      let j=i+1;while(/[\w$]/.test(text[j]||''))j++;
      push({type:previous?.type==='member'?'memberWord':'word',value:text.slice(i,j)});i=j;continue;
    }
    if(/[0-9]/.test(c)){let j=i+1;while(/[\w.]/.test(text[j]||''))j++;push({type:'number',value:text.slice(i,j)});i=j;continue;}
    if(text.startsWith('...',i)){push({type:'operator',value:'...'});i+=3;continue;}
    if(text.startsWith('?.',i)){push({type:'member',value:'?.'});i+=2;continue;}
    if(text.startsWith('++',i)||text.startsWith('--',i)){push({type:'postfix',value:text.slice(i,i+2)});i+=2;continue;}
    if(c==='{'){depth++;push({type:'open',value:c});i++;continue;}
    if(c==='}'){
      if(stopAtBrace&&--depth===0)return {tokens,end:i+1};
      push({type:'close',value:c});i++;continue;
    }
    if(c===')'){push({type:'close',value:c,regexAfter:Boolean(parens.pop())});i++;continue;}
    if(c===']'){push({type:'close',value:c});i++;continue;}
    if(c==='.'||c==='#'){push({type:'member',value:c});i++;continue;}
    if(c==='('){parens.push(previous?.type==='word'&&controlHeaderWords.has(previous.value));push({type:'open',value:c});i++;continue;}
    push({type:'operator',value:c});i++;
  }
  return {tokens,end:text.length};
}

function jsReferences(text){
  const tokens=lex(text).tokens; const refs=[];
  const hasClosingParen=openIndex=>{
    let depth=0;
    for(let j=openIndex;j<tokens.length;j++){
      if(tokens[j].value==='(')depth++;
      else if(tokens[j].value===')'&&--depth===0)return true;
    }
    return false;
  };
  for(let i=0;i<tokens.length;i++){
    if(tokens[i].type!=='word'||(tokens[i].value!=='import'&&tokens[i].value!=='export'))continue;
    if(tokens[i-1]?.type==='member'||tokens[i-1]?.value===']')continue;
    if(tokens[i].value==='import'&&tokens[i+1]?.value==='('){
      const arg=tokens[i+2];
      const literalEnd=tokens[i+3]?.value;
      const complete=hasClosingParen(i+1);
      if(complete&&arg?.type==='string'&&(literalEnd===')'||literalEnd===','))refs.push({target:arg.value,kind:'js-dynamic'});
      else if(complete&&arg?.type==='template'&&!arg.expression&&(literalEnd===')'||literalEnd===','))refs.push({target:arg.value,kind:'js-dynamic'});
      else refs.push({target:null,kind:'js-dynamic-constructed',reviewOnly:true});
      continue;
    }
    if(tokens[i].value==='import'&&tokens[i+1]?.type==='string'){refs.push({target:tokens[i+1].value,kind:'js-import'});continue;}
    for(let j=i+1;j<tokens.length&&tokens[j].value!==';';j++){
      if(tokens[j].type==='word'&&tokens[j].value==='from'&&tokens[j+1]?.type==='string'){
        refs.push({target:tokens[j+1].value,kind:'js-import'});break;
      }
    }
  }
  return refs;
}

export function extractReferences({path:repoPath,text}){
  const ext=path.posix.extname(String(repoPath).replaceAll('\\','/')).toLowerCase();
  if(ext==='.html')return htmlReferences(text);
  if(ext==='.css'){
    return cssReferences(text);
  }
  if(ext==='.js'||ext==='.mjs')return jsReferences(text);
  return [];
}

function htmlTagEnd(text,start){
  let state='before-name'; let quote=null;
  for(let i=start;i<text.length;i++){
    const c=text[i];
    if(state==='quoted-value'){
      if(c===quote){state='before-name';quote=null;}
      continue;
    }
    if(state==='unquoted-value'){
      if(c==='>')return i;
      if(/\s/.test(c))state='before-name';
      continue;
    }
    if(state==='before-value'){
      if(/\s/.test(c))continue;
      if(c==='>')return i;
      if(c==='"'||c==="'"){state='quoted-value';quote=c;continue;}
      state='unquoted-value';continue;
    }
    if(c==='>')return i;
    if(state==='before-name'){
      if(/\s/.test(c)||c==='/')continue;
      state='name';
    }
    if(state==='name'){
      if(c==='='){state='before-value';continue;}
      if(/\s/.test(c)){state='after-name';continue;}
      if(c==='/')state='before-name';
      continue;
    }
    if(state==='after-name'){
      if(/\s/.test(c))continue;
      if(c==='='){state='before-value';continue;}
      if(c==='/'){state='before-name';continue;}
      state='name';
    }
  }
  return -1;
}

function duplicateAssignmentAt(tagText,start,currentName){
  let end=start;
  while(end<tagText.length&&!/[\s=/>]/.test(tagText[end]))end++;
  if(tagText.slice(start,end).toLowerCase()!==currentName)return false;
  while(/\s/.test(tagText[end]||''))end++;
  return tagText[end]==='=';
}

function tagReferences(tagText,nameEnd){
  const refs=[]; const seen=new Set(); let i=nameEnd;
  while(i<tagText.length){
    while(/\s/.test(tagText[i]||''))i++;
    if(i>=tagText.length||tagText[i]==='>'||tagText[i]==='/')break;
    const start=i;while(i<tagText.length&&!/[\s=/>]/.test(tagText[i]))i++;
    const name=tagText.slice(start,i).toLowerCase();
    const duplicate=seen.has(name);seen.add(name);
    while(/\s/.test(tagText[i]||''))i++;
    if(tagText[i]!=='=')continue;
    i++;
    const afterEquals=i;
    while(/\s/.test(tagText[i]||''))i++;
    let value='';
    if(i>afterEquals&&duplicateAssignmentAt(tagText,i,name)){
      // A repeated attribute token after a missing value belongs to the tag;
      // keep the first attribute's effective value empty and parse the repeat.
    }else if(tagText[i]==='"'||tagText[i]==="'"){
      const quote=tagText[i++];const valueStart=i;
      while(i<tagText.length&&tagText[i]!==quote)i++;
      value=tagText.slice(valueStart,i);if(tagText[i]===quote)i++;
    }else{
      const valueStart=i;while(i<tagText.length&&!/[\s>]/.test(tagText[i]))i++;
      value=tagText.slice(valueStart,i);
    }
    if(!duplicate&&(name==='src'||name==='href'||name==='poster'))refs.push({target:value,kind:`html-${name}`});
  }
  return refs;
}

function htmlRawEnd(text,start,name){
  const lower=text.toLowerCase();const needle=`</${name.toLowerCase()}`;let cursor=start;
  while(cursor<text.length){
    const found=lower.indexOf(needle,cursor);
    if(found<0)return -1;
    const boundary=text[found+needle.length]||'';
    if(boundary==='>'||boundary==='/'||/[\t\n\f\r ]/.test(boundary)){
      const end=htmlTagEnd(text,found+needle.length);
      if(end>=0)return end+1;
      return -1;
    }
    cursor=found+needle.length;
  }
  return -1;
}

function htmlReferences(text){
  const refs=[];
  for(let i=0;i<text.length;){
    if(text.startsWith('<!--',i)){const end=text.indexOf('-->',i+4);i=end<0?text.length:end+3;continue;}
    if(text[i]!=='<'){i++;continue;}
    if(text[i+1]==='/'||text[i+1]==='!'||text[i+1]==='?'){const end=htmlTagEnd(text,i+1);i=end<0?text.length:end+1;continue;}
    let nameStart=i+1;while(/\s/.test(text[nameStart]||''))nameStart++;
    let nameEnd=nameStart;while(/[\w:-]/.test(text[nameEnd]||''))nameEnd++;
    if(nameEnd===nameStart){i++;continue;}
    const name=text.slice(nameStart,nameEnd).toLowerCase();
    const end=htmlTagEnd(text,nameEnd);
    if(end<0)break;
    const tagText=text.slice(i,end+1);
    refs.push(...tagReferences(tagText,nameEnd-i));
    i=end+1;
    if(name==='script'||name==='style'||name==='textarea'||name==='title'){
      const rawEnd=htmlRawEnd(text,i,name);i=rawEnd<0?text.length:rawEnd;
    }
  }
  return refs;
}

function cssReferences(text){
  const refs=[];
  for(let i=0;i<text.length;){
    if(text[i]==='/'&&text[i+1]==='*'){const end=text.indexOf('*/',i+2);i=end<0?text.length:end+2;continue;}
    if(text[i]==='"'||text[i]==="'"){i=quoted(text,i).end;continue;}
    if(text.slice(i,i+3).toLowerCase()==='url'&&!/[\w-]/.test(text[i-1]||'')){
      let j=i+3;while(/\s/.test(text[j]||''))j++;
      if(text[j]==='('){
        j++;while(/\s/.test(text[j]||''))j++;
        let target='';
        if(text[j]==='"'||text[j]==="'"){const item=quoted(text,j);target=item.value;j=item.end;}
        else {const start=j;while(j<text.length&&text[j]!==')')j++;target=text.slice(start,j).trim();}
        while(/\s/.test(text[j]||''))j++;
        if(text[j]===')')refs.push({target,kind:'css-url'});
        i=j+1;continue;
      }
    }
    i++;
  }
  return refs;
}

function ignored(target){return !target||target.startsWith('//')||/^(?:https?:|mailto:|tel:|data:|blob:|node:|#)/i.test(target);}
function bareModule(target,kind){return kind.startsWith('js-')&&!target.startsWith('.')&&!target.startsWith('/')&&!target.startsWith('\\');}
function splitTarget(target){
  const clean=target.split(/[?#]/,1)[0];
  try{return decodeURIComponent(clean).replaceAll('\\','/');}catch{return clean.replaceAll('\\','/');}
}
function within(root,candidate){const relative=path.relative(root,candidate);return relative===''||(!relative.startsWith(`..${path.sep}`)&&relative!=='..'&&!path.isAbsolute(relative));}
function orderFindings(items){return items.sort((a,b)=>codePointCompare(a.source,b.source)||codePointCompare(a.target||'',b.target||'')||codePointCompare(a.kind,b.kind));}

function brokenSymlinkEscapes(root,candidate){
  let parts=path.relative(root,candidate).split(path.sep).filter(Boolean);
  let current=root; let followed=0;
  for(let i=0;i<parts.length;){
    current=path.join(current,parts[i]);
    let stat;
    try{stat=fs.lstatSync(current);}catch(error){if(error?.code==='ENOENT'||error?.code==='ENOTDIR')return false;throw error;}
    if(!stat.isSymbolicLink()){i++;continue;}
    if(++followed>40)return false;
    const target=fs.readlinkSync(current);
    const resolved=path.resolve(path.dirname(current),target,...parts.slice(i+1));
    if(!within(root,resolved))return true;
    parts=path.relative(root,resolved).split(path.sep).filter(Boolean);current=root;i=0;
  }
  return false;
}

export function auditLocalReferences({root=DEFAULT_ROOT,paths}={}){
  const resolvedRoot=rootPath(root);
  const release=fs.readFileSync(path.join(resolvedRoot,'VERSION.txt'),'utf8').trim();
  const sourcePaths=(paths||trackedRuntimePaths(resolvedRoot)).map(x=>String(x).replaceAll('\\','/')).sort(codePointCompare);
  const all=[]; const reviewOnlyDynamicReferences=[];
  for(const source of sourcePaths){
    const sourceFile=path.resolve(resolvedRoot,...source.split('/'));
    const text=fs.readFileSync(sourceFile,'utf8');
    for(const ref of extractReferences({path:source,text})){
      const finding={source,target:ref.target,kind:ref.kind};
      if(ref.reviewOnly){reviewOnlyDynamicReferences.push(finding);continue;}
      if(ignored(ref.target)||bareModule(ref.target,ref.kind))continue;
      all.push(finding);
    }
  }
  const missing=[]; const outsideRoot=[]; const resolved=[];
  for(const finding of all){
    const normalized=splitTarget(finding.target);
    const projectPrefix=`/${path.basename(resolvedRoot)}/`;
    const rooted=normalized.startsWith(projectPrefix)?normalized.slice(projectPrefix.length):normalized;
    const candidate=rooted.startsWith('/')?path.resolve(resolvedRoot,`.${rooted}`):normalized.startsWith(projectPrefix)?path.resolve(resolvedRoot,rooted):path.resolve(resolvedRoot,path.dirname(finding.source),rooted);
    if(!within(resolvedRoot,candidate)){outsideRoot.push(finding);continue;}
    try{
      const real=fs.realpathSync(candidate);
      if(!within(fs.realpathSync(resolvedRoot),real)){outsideRoot.push(finding);continue;}
      resolved.push({...finding,resolved:path.relative(resolvedRoot,candidate).replaceAll('\\','/')});
    }catch(error){
      if(error?.code==='ENOENT'||error?.code==='ENOTDIR'||error?.code==='ELOOP'){
        if(brokenSymlinkEscapes(resolvedRoot,candidate))outsideRoot.push(finding);else missing.push(finding);
      }else throw error;
    }
  }

  const currentModules=new Set(['index.html']); let changed=true;
  while(changed){
    changed=false;
    for(const item of resolved){
      if(!currentModules.has(item.source))continue;
      const query=/[?&]v=([^&#]+)/.exec(item.target)?.[1];
      if(query===release&&/\.(?:m?js)$/i.test(item.resolved)&&!currentModules.has(item.resolved)){currentModules.add(item.resolved);changed=true;}
    }
  }
  const currentReleaseQueryMismatches=resolved.filter(item=>currentModules.has(item.source)&&/[?&]v=([^&#]+)/.test(item.target)&&/[?&]v=([^&#]+)/.exec(item.target)[1]!==release).map(({resolved:_resolved,...item})=>item);
  return {
    release,
    missing:orderFindings(missing),
    outsideRoot:orderFindings(outsideRoot),
    currentReleaseQueryMismatches:orderFindings(currentReleaseQueryMismatches),
    reviewOnlyDynamicReferences:orderFindings(reviewOnlyDynamicReferences)
  };
}

export function runCli({root=DEFAULT_ROOT,paths,args=process.argv.slice(2)}={}){
  if(args.length)throw new Error('usage: node tools/local-reference-audit.mjs');
  const report=auditLocalReferences({root,paths});
  return {output:`${JSON.stringify(report,null,2)}\n`,exitCode:report.missing.length||report.outsideRoot.length?1:0};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=runCli();process.stdout.write(result.output);process.exitCode=result.exitCode;
}
