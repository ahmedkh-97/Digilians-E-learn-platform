import fs from 'node:fs';
import path from 'node:path';
import {types as utilTypes} from 'node:util';
import {fileURLToPath} from 'node:url';
import {safeOutputPath} from './platform-inventory.mjs';
import {checkProtectedBaselineEvidence} from './protected-payload-baseline.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const defaultRoot=path.resolve(here,'..');
const ACCEPTED_BASELINE_SHA='af59e73f7a51d2745430a1de2db298d0f97af728';
const ALLOWED_DISPOSITIONS=new Set(['keep','candidate-for-stage2','confirmed-defect','unresolved-keep']);
const FINDING_FIELDS=['id','severity','area','path','evidence','disposition','stage2Action'];
const REFERENCE_FIELDS=['source','target','kind'];
const SECURITY_BLOCK_FIELDS=['path','line','patternId','severity','message'];
const SECURITY_REVIEW_FIELDS=['path','line','patternId','severity','category','message'];
const SECURITY_REVIEW_CATEGORIES=new Set(['htmlSinks','storageAccess','externalEndpoints','dynamicCode','windowOpen']);
const EXPECTED_PROTECTED_BASELINE='docs/releases/V0.22.7-PROTECTED-PAYLOAD-BASELINE.json';
const codePointCompare=(a,b)=>String(a)<String(b)?-1:String(a)>String(b)?1:0;

function exactFields(value,fields,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);
  const unknown=Object.keys(value).filter(key=>!fields.includes(key));
  const missing=fields.filter(key=>!Object.hasOwn(value,key));
  if(unknown.length||missing.length)throw new Error(`${label} field contract violation: unknown=${unknown.join(',')} missing=${missing.join(',')}`);
  return Object.fromEntries(fields.map(field=>[field,value[field]]));
}

function plainObjectEntries(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  if(utilTypes.isProxy(value))return false;
  const prototype=Object.getPrototypeOf(value);
  if(prototype!==null){
    if(utilTypes.isProxy(prototype)||Object.getPrototypeOf(prototype)!==null)return false;
    const names=Object.getOwnPropertyNames(prototype).sort(codePointCompare);
    const ordinaryNames=Object.getOwnPropertyNames(Object.prototype).sort(codePointCompare);
    if(names.length!==ordinaryNames.length||names.some((name,index)=>name!==ordinaryNames[index]))return false;
    const constructor=Object.getOwnPropertyDescriptor(prototype,'constructor')?.value;
    if(typeof constructor!=='function'||utilTypes.isProxy(constructor)||constructor.prototype!==prototype
      ||Function.prototype.toString.call(constructor)!==Function.prototype.toString.call(Object))return false;
  }
  const keys=Reflect.ownKeys(value);
  if(keys.some(key=>typeof key!=='string'||key==='__proto__'||key==='prototype'||key==='constructor'))return false;
  const entries=[];
  for(const key of keys){
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!descriptor||!descriptor.enumerable||!Object.hasOwn(descriptor,'value'))return false;
    entries.push([key,descriptor.value]);
  }
  return entries;
}

function canonicalCompare(fields){
  return (a,b)=>{
    for(const field of fields){
      const left=a[field]===null?'\u0000':String(a[field]);
      const right=b[field]===null?'\u0000':String(b[field]);
      const order=codePointCompare(left,right);
      if(order)return order;
    }
    return 0;
  };
}

function referencesArray(value,label){
  if(!Array.isArray(value))throw new TypeError(`${label} must be an array`);
  return Array.from(value,item=>{
    const reference=exactFields(item,REFERENCE_FIELDS,'reference');
    if(typeof reference.source!=='string'||typeof reference.kind!=='string'||(reference.target!==null&&typeof reference.target!=='string'))throw new TypeError('reference fields have invalid types');
    return reference;
  }).sort(canonicalCompare(REFERENCE_FIELDS));
}

function securityArray(value,fields,label,category){
  if(!Array.isArray(value))throw new TypeError(`${label} must be an array`);
  return Array.from(value,item=>{
    const finding=exactFields(item,fields,'security');
    if(typeof finding.path!=='string'||!Number.isInteger(finding.line)||finding.line<1||typeof finding.patternId!=='string'||typeof finding.severity!=='string'||typeof finding.message!=='string')throw new TypeError('security fields have invalid types');
    if(category!==undefined&&finding.category!==category)throw new Error(`security category mismatch: expected ${category}`);
    return finding;
  }).sort(canonicalCompare(fields));
}

function canonicalSummary(files,summary){
  if(!summary||typeof summary!=='object'||Array.isArray(summary))throw new TypeError('invalid inventory summary');
  const actual={};
  for(const file of files){
    if(!file||typeof file.classification!=='string'||!Number.isInteger(file.size)||file.size<0)throw new TypeError('invalid inventory file record');
    const aggregate=actual[file.classification]||{count:0,bytes:0};
    aggregate.count+=1;aggregate.bytes+=file.size;actual[file.classification]=aggregate;
  }
  const keys=[...new Set([...Object.keys(actual),...Object.keys(summary)])].sort(codePointCompare);
  const output={};
  for(const key of keys){
    const item=exactFields(summary[key],['count','bytes'],'inventory summary');
    if(!Number.isInteger(item.count)||item.count<0||!Number.isInteger(item.bytes)||item.bytes<0)throw new TypeError('inventory summary values must be non-negative integers');
    if(item.count!==actual[key]?.count||item.bytes!==actual[key]?.bytes)throw new Error(`inventory summary does not reconcile for ${key}`);
    output[key]={count:item.count,bytes:item.bytes};
  }
  return output;
}

function validateFinding(finding){
  if(!finding||typeof finding!=='object'||Array.isArray(finding))throw new TypeError('finding must be an object');
  const unknown=Object.keys(finding).filter(key=>!FINDING_FIELDS.includes(key));
  const missing=FINDING_FIELDS.filter(key=>!Object.hasOwn(finding,key));
  if(unknown.length||missing.length)throw new Error(`finding field contract violation: unknown=${unknown.join(',')} missing=${missing.join(',')}`);
  for(const field of FINDING_FIELDS)if(typeof finding[field]!=='string')throw new TypeError(`finding field ${field} must be a string`);
  if(!ALLOWED_DISPOSITIONS.has(finding.disposition))throw new Error(`unknown finding disposition: ${finding.disposition}`);
  return Object.fromEntries(FINDING_FIELDS.map(field=>[field,finding[field]]));
}

export function buildStage1Report({inventory,references,security,protectedStatus,findings}){
  if(inventory?.baselineVersion!=='0.22.7')throw new Error('Stage 1 inventory baselineVersion must be 0.22.7');
  if(!Array.isArray(inventory.files)||!inventory.summary)throw new TypeError('invalid inventory report');
  if(!references||!security||!protectedStatus||!Array.isArray(findings))throw new TypeError('all Stage 1 audit inputs are required');
  if(protectedStatus.status!=='pass')throw new Error('protected payload status must pass');
  if(protectedStatus.baselineFile!==EXPECTED_PROTECTED_BASELINE)throw new Error('protected payload baseline path is not authoritative');
  if(protectedStatus.baselineSha!==ACCEPTED_BASELINE_SHA)throw new Error('protected payload identity does not match the accepted baseline');
  const securityEntries=plainObjectEntries(security.reviewInventory);
  if(!securityEntries)throw new TypeError('security.reviewInventory must be a non-null plain object with own enumerable data properties');
  const reviewed=Array.from(findings,validateFinding).sort((a,b)=>codePointCompare(a.id,b.id));
  if(new Set(reviewed.map(item=>item.id)).size!==reviewed.length)throw new Error('finding ids must be unique');
  const byClassification=canonicalSummary(inventory.files,inventory.summary);
  const totalBytes=inventory.files.reduce((total,file)=>total+file.size,0);
  const securityCategories=securityEntries.map(([category])=>category);
  const unknownSecurityCategory=securityCategories.find(category=>!SECURITY_REVIEW_CATEGORIES.has(category));
  if(unknownSecurityCategory)throw new Error(`unknown security review category: ${unknownSecurityCategory}`);
  return {
    schemaVersion:1,
    baselineVersion:'0.22.7',
    baselineSha:ACCEPTED_BASELINE_SHA,
    inventory:{
      trackedFiles:inventory.files.length,
      totalBytes,
      byClassification
    },
    protectedPayloads:{status:protectedStatus.status,baselineFile:protectedStatus.baselineFile},
    references:{
      missing:referencesArray(references.missing,'references.missing'),
      outsideRoot:referencesArray(references.outsideRoot,'references.outsideRoot'),
      currentReleaseQueryMismatches:referencesArray(references.currentReleaseQueryMismatches,'references.currentReleaseQueryMismatches'),
      reviewOnlyDynamicReferences:referencesArray(references.reviewOnlyDynamicReferences,'references.reviewOnlyDynamicReferences')
    },
    security:{
      blockingFindings:securityArray(security.blockingFindings,SECURITY_BLOCK_FIELDS,'security.blockingFindings'),
      reviewInventory:Object.fromEntries(securityEntries.sort(([a],[b])=>codePointCompare(a,b)).map(([category,items])=>[
        category,securityArray(items,SECURITY_REVIEW_FIELDS,`security.reviewInventory.${category}`,category)
      ]))
    },
    findings:reviewed
  };
}

export function writeStage1Report({root=defaultRoot,output,report}){
  const destination=safeOutputPath(root,output);
  const noFollow=fs.constants.O_NOFOLLOW;
  const directoryFlag=fs.constants.O_DIRECTORY;
  if(process.platform!=='linux'||!Number.isInteger(noFollow)||!Number.isInteger(directoryFlag)||!fs.existsSync('/proc/self/fd')){
    throw new Error('secure directory-anchored writes are unavailable on this platform');
  }
  const directoryFlags=fs.constants.O_RDONLY|directoryFlag|noFollow;
  const flags=fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|noFollow;
  let rootDescriptor;let docsDescriptor;let releasesDescriptor;let descriptor;
  try{
    rootDescriptor=fs.openSync(path.resolve(root),directoryFlags);
    docsDescriptor=fs.openSync(`/proc/self/fd/${rootDescriptor}/docs`,directoryFlags);
    releasesDescriptor=fs.openSync(`/proc/self/fd/${docsDescriptor}/releases`,directoryFlags);
    descriptor=fs.openSync(`/proc/self/fd/${releasesDescriptor}/${path.basename(destination)}`,flags,0o600);
    fs.writeFileSync(descriptor,`${JSON.stringify(report,null,2)}\n`,'utf8');
  }finally{
    if(descriptor!==undefined)fs.closeSync(descriptor);
    if(releasesDescriptor!==undefined)fs.closeSync(releasesDescriptor);
    if(docsDescriptor!==undefined)fs.closeSync(docsDescriptor);
    if(rootDescriptor!==undefined)fs.closeSync(rootDescriptor);
  }
}

function parseArgs(args){
  const allowed=new Set(['--inventory','--references','--security','--protected-baseline','--findings','--write']);
  if(args.length!==12)throw new Error('six option/value pairs are required');
  const options={};
  for(let i=0;i<args.length;i+=2){
    if(!allowed.has(args[i])||!args[i+1]||Object.hasOwn(options,args[i]))throw new Error(`invalid argument: ${args[i]||''}`);
    options[args[i].slice(2)]=args[i+1];
  }
  if(Object.keys(options).length!==allowed.size)throw new Error('all Stage 1 report arguments are required');
  return options;
}

function readJson(location){return JSON.parse(fs.readFileSync(location,'utf8'));}

export function runCli({root=defaultRoot,args=process.argv.slice(2),checkBaselineEvidence=checkProtectedBaselineEvidence}={}){
  const options=parseArgs(args);
  const policy=readJson(path.join(root,'tools','platform-audit-policy.json'));
  const baselinePath=options['protected-baseline'];
  const protectedStatus=checkBaselineEvidence({root,policy,baselinePath});
  const report=buildStage1Report({
    inventory:readJson(options.inventory),
    references:readJson(options.references),
    security:readJson(options.security),
    protectedStatus,
    findings:readJson(options.findings)
  });
  writeStage1Report({root,output:options.write,report});
  return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{runCli();}catch(error){process.stderr.write(`${error.message}\n`);process.exitCode=1;}
}
