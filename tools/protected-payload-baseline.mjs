import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {safeOutputPath} from './platform-inventory.mjs';

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
    .filter(Boolean)
    .map(normalizePath)
    .sort();
}

function trackedPathsUnderRoot(paths,protectedRoot,exclusions){
  const normalizedRoot=`${normalizePath(protectedRoot).replace(/\/$/,'')}/`;
  return paths.filter(repoPath=>repoPath.startsWith(normalizedRoot)&&!exclusions.has(repoPath));
}

function sha256(buffer){
  return createHash('sha256').update(buffer).digest('hex');
}

function repositorySha(root){
  return execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
}

export function buildProtectedBaseline({root=defaultRoot,policy,baselineSha}={}){
  if(!policy)throw new TypeError('buildProtectedBaseline requires a policy');
  if(!baselineSha)throw new TypeError('buildProtectedBaseline requires a baselineSha');
  const resolvedRoot=rootPath(root);
  const exclusions=new Set((policy.protectedExclusions||[]).map(normalizePath));
  const paths=trackedPaths(resolvedRoot);
  const roots=(policy.protectedRoots||[]).map(protectedRoot=>{
    const files=trackedPathsUnderRoot(paths,protectedRoot,exclusions);
    const rootDigest=createHash('sha256');
    let totalBytes=0;
    for(const repoPath of files){
      const buffer=fs.readFileSync(path.resolve(resolvedRoot,...repoPath.split('/')));
      const file={path:repoPath,sha256:sha256(buffer)};
      totalBytes+=buffer.length;
      rootDigest.update(file.path); rootDigest.update('\0');
      rootDigest.update(file.sha256); rootDigest.update('\0');
    }
    return {
      path:normalizePath(protectedRoot),
      fileCount:files.length,
      totalBytes,
      sha256:rootDigest.digest('hex')
    };
  });
  return {
    schemaVersion:1,
    baselineVersion:'0.22.7',
    baselineSha,
    exclusions:[...exclusions].sort(),
    roots
  };
}

function writeBaseline(root,baselinePath,json){
  const destination=safeOutputPath(root,baselinePath);
  const noFollow=fs.constants.O_NOFOLLOW;
  const directoryFlag=fs.constants.O_DIRECTORY;
  if(process.platform!=='linux'||!Number.isInteger(noFollow)||!Number.isInteger(directoryFlag)||!fs.existsSync('/proc/self/fd')){
    throw new Error('secure directory-anchored writes are unavailable on this platform');
  }
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

function baselineLocation(root,baselinePath){
  const resolvedRoot=rootPath(root);
  return {
    path:safeOutputPath(resolvedRoot,baselinePath),
    file:normalizePath(baselinePath)
  };
}

export function checkProtectedBaselineEvidence({root=defaultRoot,policy,baselinePath,readBaseline=location=>fs.readFileSync(location,'utf8')}={}){
  if(!baselinePath)throw new TypeError('checkProtectedBaseline requires a baselinePath');
  const resolvedRoot=rootPath(root);
  const location=baselineLocation(resolvedRoot,baselinePath);
  const expected=JSON.parse(readBaseline(location.path));
  const actual=buildProtectedBaseline({root:resolvedRoot,policy,baselineSha:expected.baselineSha});
  const expectedRoots=new Map((expected.roots||[]).map(root=>[root.path,root]));
  const actualRoots=new Map(actual.roots.map(root=>[root.path,root]));
  const changedRoots=[...new Set([...expectedRoots.keys(),...actualRoots.keys()])]
    .filter(rootPath=>{
      const expectedRoot=expectedRoots.get(rootPath);
      const actualRoot=actualRoots.get(rootPath);
      return !expectedRoot||!actualRoot
        ||expectedRoot.fileCount!==actualRoot.fileCount
        ||expectedRoot.totalBytes!==actualRoot.totalBytes
        ||expectedRoot.sha256!==actualRoot.sha256;
    })
    .sort();
  return {
    status:changedRoots.length===0?'pass':'fail',
    baselineFile:location.file,
    baselineSha:expected.baselineSha,
    changedRoots
  };
}

export function checkProtectedBaseline(options={}){
  const {status,baselineFile,changedRoots}=checkProtectedBaselineEvidence(options);
  return {status,baselineFile,changedRoots};
}

function parseCliArgs(args){
  if(args.length===0)return {mode:'print'};
  const writeIndex=args.indexOf('--write');
  const checkIndex=args.indexOf('--check');
  if(writeIndex!==-1&&checkIndex!==-1)throw new Error('choose either --write or --check');
  if(checkIndex!==-1){
    if(args.length!==2||checkIndex!==0)throw new Error('usage: node tools/protected-payload-baseline.mjs --check docs/releases/baseline.json');
    return {mode:'check',baselinePath:args[1]};
  }
  if(writeIndex!==-1){
    if(args.length!==4||writeIndex!==0||args[2]!=='--baseline-sha'||!args[3]){
      throw new Error('usage: node tools/protected-payload-baseline.mjs --write docs/releases/baseline.json --baseline-sha <sha>');
    }
    return {mode:'write',baselinePath:args[1],baselineSha:args[3]};
  }
  throw new Error('usage: node tools/protected-payload-baseline.mjs [--write docs/releases/baseline.json --baseline-sha <sha>|--check docs/releases/baseline.json]');
}

export function runCli({root=defaultRoot,args=process.argv.slice(2)}={}){
  const resolvedRoot=rootPath(root);
  const policy=JSON.parse(fs.readFileSync(path.join(resolvedRoot,'tools','platform-audit-policy.json'),'utf8'));
  const options=parseCliArgs(args);
  if(options.mode==='print'){
    const baseline=buildProtectedBaseline({root:resolvedRoot,policy,baselineSha:repositorySha(resolvedRoot)});
    return {output:`${JSON.stringify(baseline,null,2)}\n`,exitCode:0};
  }
  if(options.mode==='write'){
    const baseline=buildProtectedBaseline({root:resolvedRoot,policy,baselineSha:options.baselineSha});
    const location=baselineLocation(resolvedRoot,options.baselinePath);
    writeBaseline(resolvedRoot,options.baselinePath,`${JSON.stringify(baseline,null,2)}\n`);
    const totalFiles=baseline.roots.reduce((total,root)=>total+root.fileCount,0);
    const totalBytes=baseline.roots.reduce((total,root)=>total+root.totalBytes,0);
    return {output:`wrote ${location.file}: ${baseline.roots.length} roots, ${totalFiles} files, ${totalBytes} bytes\n`,exitCode:0};
  }
  const result=checkProtectedBaseline({root:resolvedRoot,policy,baselinePath:options.baselinePath});
  if(result.status==='pass')return {output:`protected payload baseline passed: ${result.baselineFile}\n`,exitCode:0};
  return {output:`protected payload baseline changed: ${result.changedRoots.join(', ')}\n`,exitCode:1};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const result=runCli();
    process.stdout.write(result.output);
    process.exitCode=result.exitCode;
  }catch(error){
    process.stderr.write(`${error.message}\n`);
    process.exitCode=1;
  }
}
