import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const defaultRoot=path.resolve(here,'..');

function rootPath(root){
  return root instanceof URL?fileURLToPath(root):path.resolve(root||defaultRoot);
}

function normalizePath(repoPath){
  return String(repoPath).replaceAll('\\','/').replace(/^\.\//,'');
}

function trackedPaths(root){
  return execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'buffer'})
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
}

function metadataCandidate(repoPath,buffer){
  if(!repoPath.endsWith('.json'))return null;
  try{
    const value=JSON.parse(buffer.toString('utf8'));
    if(!value||Array.isArray(value)||typeof value!=='object')return null;
    for(const key of ['generatedFrom','generatedBy','generator']){
      if(Object.hasOwn(value,key))return `metadata:${key}`;
    }
  }catch{}
  return null;
}

function documentationCandidate(repoPath,buffer){
  if(!/\.(?:md|mjs|js|html)$/i.test(repoPath))return null;
  const header=buffer.toString('utf8',0,Math.min(buffer.length,4096));
  return /^\s*(?:<!--\s*)?(?:@generated|generated file|this file (?:is|was) generated|do not edit: generated)/im.test(header)
    ?'documentation:generated-marker'
    :null;
}

export function classifyPath(repoPath,policy){
  const normalizedPath=normalizePath(repoPath);
  const matches=policy.rules.filter(rule=>new RegExp(rule.pattern).test(normalizedPath));
  return matches[0]?.classification||'unclassified';
}

export function sha256(buffer){
  return createHash('sha256').update(buffer).digest('hex');
}

export function buildInventory({root=defaultRoot,paths,policy}){
  if(!policy)throw new TypeError('buildInventory requires a policy');
  const resolvedRoot=rootPath(root);
  const normalizedPaths=(paths||trackedPaths(resolvedRoot))
    .map(normalizePath)
    .sort();
  const declaredOutputs=new Set((policy.generatedArtifacts||[]).map(artifact=>normalizePath(artifact.output)));
  const files=[];
  const generatedReviewCandidates=[];
  const summary={};

  for(const repoPath of normalizedPaths){
    const absolutePath=path.resolve(resolvedRoot,...repoPath.split('/'));
    const buffer=fs.readFileSync(absolutePath);
    const classification=classifyPath(repoPath,policy);
    const file={path:repoPath,classification,size:buffer.length,sha256:sha256(buffer)};
    files.push(file);
    const total=summary[classification]||{count:0,bytes:0};
    total.count+=1;
    total.bytes+=buffer.length;
    summary[classification]=total;
    if(!declaredOutputs.has(repoPath)){
      const evidence=metadataCandidate(repoPath,buffer)||documentationCandidate(repoPath,buffer);
      if(evidence)generatedReviewCandidates.push({path:repoPath,evidence});
    }
  }

  const orderedSummary=Object.fromEntries(Object.entries(summary).sort(([a],[b])=>a<b?-1:a>b?1:0));
  return {
    baselineVersion:fs.readFileSync(path.join(resolvedRoot,'VERSION.txt'),'utf8').trim(),
    baselineSha:execFileSync('git',['rev-parse','HEAD'],{cwd:resolvedRoot,encoding:'utf8'}).trim(),
    files,
    summary:orderedSummary,
    unclassified:files.filter(file=>file.classification==='unclassified').map(file=>file.path),
    provenance:{generatedArtifacts:(policy.generatedArtifacts||[]).map(artifact=>structuredClone(artifact))},
    generatedReviewCandidates
  };
}

function rejectSymlink(location,label){
  if(fs.lstatSync(location).isSymbolicLink())throw new Error(`${label} cannot be a symlink`);
}

export function safeOutputPath(root,output){
  if(!output)throw new Error('--write requires a repository-relative path');
  const normalized=normalizePath(output);
  const directChild=/^docs\/releases\/([^/]+)$/.exec(normalized);
  if(path.isAbsolute(output)||path.win32.isAbsolute(output)||!directChild||directChild[1]==='.'||directChild[1]==='..'){
    throw new Error('--write path must be a repository-relative direct child of docs/releases/');
  }
  const resolvedRoot=path.resolve(root);
  const docsRoot=path.join(resolvedRoot,'docs');
  const releasesRoot=path.join(docsRoot,'releases');
  rejectSymlink(resolvedRoot,'repository root');
  rejectSymlink(docsRoot,'docs/');
  rejectSymlink(releasesRoot,'docs/releases/');
  const destination=path.join(releasesRoot,directChild[1]);
  try{
    if(fs.lstatSync(destination).isSymbolicLink())throw new Error('--write destination cannot be a symlink');
  }catch(error){
    if(error?.code!=='ENOENT')throw error;
  }
  return destination;
}

function writeInventory(root,output,json,{beforeSecureTraversal}={}){
  const destination=safeOutputPath(root,output);
  const noFollow=fs.constants.O_NOFOLLOW;
  const directoryFlag=fs.constants.O_DIRECTORY;
  if(process.platform!=='linux'||!Number.isInteger(noFollow)||!Number.isInteger(directoryFlag)||!fs.existsSync('/proc/self/fd')){
    throw new Error('secure directory-anchored writes are unavailable on this platform');
  }
  beforeSecureTraversal?.();
  const directoryFlags=fs.constants.O_RDONLY|directoryFlag|noFollow;
  const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|noFollow;
  let rootDescriptor;
  let docsDescriptor;
  let releasesDescriptor;
  let descriptor;
  try{
    rootDescriptor=fs.openSync(path.resolve(root),directoryFlags);
    docsDescriptor=fs.openSync(`/proc/self/fd/${rootDescriptor}/docs`,directoryFlags);
    releasesDescriptor=fs.openSync(`/proc/self/fd/${docsDescriptor}/releases`,directoryFlags);
    descriptor=fs.openSync(`/proc/self/fd/${releasesDescriptor}/${path.basename(destination)}`,flags,0o600);
    fs.writeFileSync(descriptor,json,'utf8');
  }finally{
    if(descriptor!==undefined)fs.closeSync(descriptor);
    if(releasesDescriptor!==undefined)fs.closeSync(releasesDescriptor);
    if(docsDescriptor!==undefined)fs.closeSync(docsDescriptor);
    if(rootDescriptor!==undefined)fs.closeSync(rootDescriptor);
  }
}

export function runCli({root=defaultRoot,args=process.argv.slice(2),beforeSecureTraversal}={}){
  const writeIndex=args.indexOf('--write');
  if(writeIndex!==-1&&(writeIndex!==0||args.length!==2))throw new Error('usage: node tools/platform-inventory.mjs [--write docs/releases/inventory.json]');
  const resolvedRoot=rootPath(root);
  const policy=JSON.parse(fs.readFileSync(path.join(resolvedRoot,'tools','platform-audit-policy.json'),'utf8'));
  const inventory=buildInventory({root:resolvedRoot,policy});
  const json=`${JSON.stringify(inventory,null,2)}\n`;
  if(writeIndex===-1)return json;
  writeInventory(resolvedRoot,args[1],json,{beforeSecureTraversal});
  return '';
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))process.stdout.write(runCli());
