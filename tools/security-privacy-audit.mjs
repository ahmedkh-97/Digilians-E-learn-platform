import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const defaultRoot=path.resolve(here,'..');
const BINARY_EXTENSIONS=new Set([
  '.7z','.avif','.bmp','.eot','.gif','.gz','.ico','.jpeg','.jpg','.mp3','.mp4',
  '.pdf','.png','.tar','.tif','.tiff','.ttf','.webm','.webp','.woff','.woff2','.zip'
]);

const BLOCKING_PATTERNS=[
  {id:'private-key',regex:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g},
  {id:'github-pat',regex:/\b(?:ghp|github_pat)_[A-Za-z0-9_]{30,255}\b/g},
  {id:'supabase-service-role',regex:/\bSUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?[^\s"']{8,}/g}
];

const REVIEW_PATTERNS=[
  {category:'htmlSinks',id:'html-inner',regex:/\.innerHTML\s*=/g,message:'HTML assignment sink requires contextual review.'},
  {category:'htmlSinks',id:'html-outer',regex:/\.outerHTML\s*=/g,message:'HTML assignment sink requires contextual review.'},
  {category:'htmlSinks',id:'html-insert-adjacent',regex:/\binsertAdjacentHTML\s*\(/g,message:'HTML insertion sink requires contextual review.'},
  {category:'storageAccess',id:'storage-local',regex:/\blocalStorage\b/g,message:'Browser storage access requires privacy-boundary review.'},
  {category:'storageAccess',id:'storage-session',regex:/\bsessionStorage\b/g,message:'Browser storage access requires privacy-boundary review.'},
  {category:'externalEndpoints',id:'fetch-call',regex:/\bfetch\s*\(/g,message:'Network call requires endpoint and data-flow review.'},
  {category:'externalEndpoints',id:'http-endpoint',regex:/https?:\/\/[^\s"'`<>]+/g,message:'Literal HTTP(S) endpoint requires ownership review.'},
  {category:'dynamicCode',id:'eval-call',regex:/\beval\s*\(/g,message:'Dynamic code execution requires contextual review.'},
  {category:'dynamicCode',id:'function-constructor',regex:/\bnew\s+Function\s*\(/g,message:'Dynamic code construction requires contextual review.'},
  {category:'dynamicCode',id:'document-write',regex:/\bdocument\.write\s*\(/g,message:'Document write requires contextual review.'},
  {category:'windowOpen',id:'window-open',regex:/\bwindow\.open\s*\(/g,message:'Window opening requires target validation review.'}
];

const BLOCK_MESSAGE='High-confidence committed credential signature; rotate and remove it.';

function resolvedRoot(root){
  return root instanceof URL?path.resolve(fileURLToPath(root)):path.resolve(root||defaultRoot);
}

function displayPath(repoPath){
  return String(repoPath).replaceAll('\\','/').replace(/^\.\//,'');
}

function lineAt(text,index){
  let line=1;
  for(let offset=0;offset<index;offset+=1)if(text.charCodeAt(offset)===10)line+=1;
  return line;
}

function collectMatches({repoPath,text,patterns,severity}){
  const findings=[];
  for(const pattern of patterns){
    pattern.regex.lastIndex=0;
    for(const match of text.matchAll(pattern.regex)){
      findings.push({
        path:displayPath(repoPath),
        line:lineAt(text,match.index),
        patternId:pattern.id,
        severity,
        ...(pattern.category?{category:pattern.category}:{}),
        message:severity==='block'?BLOCK_MESSAGE:pattern.message,
        _index:match.index
      });
    }
  }
  return findings;
}

function findingOrder(a,b){
  return a.line-b.line
    ||String(a.category||'').localeCompare(String(b.category||''),'en')
    ||a.patternId.localeCompare(b.patternId,'en')
    ||a._index-b._index;
}

function publicFinding({ _index,...finding }){ // eslint-disable-line no-unused-vars
  return finding;
}

export function scanText({path:repoPath,text}){
  if(typeof text!=='string')throw new TypeError('scanText requires text as a string');
  const findings=[
    ...collectMatches({repoPath,text,patterns:BLOCKING_PATTERNS,severity:'block'}),
    ...collectMatches({repoPath,text,patterns:REVIEW_PATTERNS,severity:'review'})
  ];
  return findings.sort(findingOrder).map(publicFinding);
}

function trackedPaths(root){
  return execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'buffer'})
    .toString('utf8').split('\0').filter(Boolean).sort((a,b)=>displayPath(a).localeCompare(displayPath(b),'en'));
}

function unsafeTrackedPath(repoPath){
  if(path.isAbsolute(repoPath)||path.win32.isAbsolute(repoPath))return true;
  const segments=repoPath.split('/');
  return segments.some(segment=>segment===''||segment==='.'||segment==='..');
}

function readTrackedText(root,repoPath){
  if(unsafeTrackedPath(repoPath))return {skip:'unsafe-path'};
  if(BINARY_EXTENSIONS.has(path.extname(repoPath).toLowerCase()))return {skip:'binary-extension'};
  const noFollow=fs.constants.O_NOFOLLOW;
  const directoryFlag=fs.constants.O_DIRECTORY;
  if(process.platform!=='linux'||!Number.isInteger(noFollow)||!Number.isInteger(directoryFlag)||!fs.existsSync('/proc/self/fd')){
    throw new Error('secure directory-anchored reads are unavailable on this platform');
  }
  const segments=repoPath.split('/');
  const directories=[];
  let descriptor;
  try{
    let parent=fs.openSync(root,fs.constants.O_RDONLY|directoryFlag|noFollow);
    directories.push(parent);
    for(const segment of segments.slice(0,-1)){
      parent=fs.openSync(`/proc/self/fd/${parent}/${segment}`,fs.constants.O_RDONLY|directoryFlag|noFollow);
      directories.push(parent);
    }
    descriptor=fs.openSync(`/proc/self/fd/${parent}/${segments.at(-1)}`,fs.constants.O_RDONLY|noFollow);
    if(!fs.fstatSync(descriptor).isFile())return {skip:'not-regular-file'};
    const buffer=fs.readFileSync(descriptor);
    if(buffer.includes(0))return {skip:'binary-content'};
    return {text:buffer.toString('utf8')};
  }catch(error){
    if(error?.code==='ELOOP'||error?.code==='ENOTDIR')return {skip:'symlink'};
    if(error?.code==='ENOENT')return {skip:'missing'};
    throw error;
  }finally{
    if(descriptor!==undefined)fs.closeSync(descriptor);
    for(const directory of directories.reverse())fs.closeSync(directory);
  }
}

export function auditSecurityPrivacy({root=defaultRoot}={}){
  const repositoryRoot=resolvedRoot(root);
  const blockingFindings=[];
  const reviewInventory={
    htmlSinks:[],storageAccess:[],externalEndpoints:[],dynamicCode:[],windowOpen:[]
  };
  const skippedFiles=[];
  let scannedFiles=0;

  for(const repoPath of trackedPaths(repositoryRoot)){
    const loaded=readTrackedText(repositoryRoot,repoPath);
    if(loaded.skip){
      skippedFiles.push({path:displayPath(repoPath),reason:loaded.skip});
      continue;
    }
    scannedFiles+=1;
    for(const finding of scanText({path:repoPath,text:loaded.text})){
      if(finding.severity==='block')blockingFindings.push(finding);
      else reviewInventory[finding.category].push(finding);
    }
  }

  return {blockingFindings,reviewInventory,scannedFiles,skippedFiles};
}

function parseCliArgs(args){
  if(args.length===0)return defaultRoot;
  if(args.length===2&&args[0]==='--root')return path.resolve(args[1]);
  throw new Error('usage: node tools/security-privacy-audit.mjs [--root repository]');
}

export function runCli({root,args}={}){
  const report=auditSecurityPrivacy({root:root===undefined?parseCliArgs(args||[]):root});
  return {exitCode:report.blockingFindings.length?1:0,stdout:`${JSON.stringify(report,null,2)}\n`};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=runCli({args:process.argv.slice(2)});
  process.stdout.write(result.stdout);
  process.exitCode=result.exitCode;
}
