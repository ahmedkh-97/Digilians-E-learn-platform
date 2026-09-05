import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const base=path.join(root,'voucher','tracks','data-analysis','microsoft-pl-300');
const read=name=>JSON.parse(fs.readFileSync(path.join(base,name),'utf8'));
const sourceKey=(sourceId,questionNumber)=>`${String(sourceId)}:${Number(questionNumber)}`;
const occurrenceId=q=>`${q.sourceId}:${String(Number(q.questionNumber)).padStart(3,'0')}:${Number(q.occurrence||1)}`;

export function buildFullRankedIndex(){
  const sourceBanks=['source-01-review-bank.json','source-02-review-bank.json'].map(read);
  const sourceQuestions=sourceBanks.flatMap(bank=>bank.questions||[]);
  const masterQuestions=read('master-bank.json').questions||[];
  const draftQuestions=read('draft-master-bank.json').questions||[];
  const dedup=read('source-dedup-audit.json');
  const nativeReview=read('native-ranked-review.json');
  const architecture=read('content-architecture.json');

  const masterById=new Map(masterQuestions.map(q=>[String(q.id),q]));
  const draftById=new Map(draftQuestions.map(q=>[String(q.id),q]));
  const sessionById=new Map((architecture.sessions||[]).map(s=>[String(s.id),s]));
  const clusterByQuestionId=new Map();
  for(const cluster of dedup.uniqueClusters||[]){
    for(const member of cluster.members||[])clusterByQuestionId.set(String(member.id),String(cluster.clusterId));
  }
  const nativeDecisionByKey=new Map((nativeReview.decisions||[]).map(d=>[sourceKey(d.sourceId,d.questionNumber),d]));
  const nativeMasterByKey=new Map();
  for(const q of masterQuestions){
    const raw=q?.nativeRankedReview?.sourceKey;
    if(!raw)continue;
    const parts=String(raw).split(':');
    if(parts.length>=2)nativeMasterByKey.set(sourceKey(parts[0],parts[1]),q);
  }

  const records=sourceQuestions.map(q=>{
    let validated=null;
    let objectiveKind=null;
    if(q.reviewMode==='scored-text'&&q.canonicalQuestionId&&masterById.has(String(q.canonicalQuestionId))){
      validated=masterById.get(String(q.canonicalQuestionId));
      objectiveKind='text';
    }else if(q.reviewMode==='native-structured'){
      validated=nativeMasterByKey.get(sourceKey(q.sourceId,q.questionNumber))||null;
      if(validated)objectiveKind='structured';
    }

    const mode=validated?'objective':'checkpoint';
    const canonicalId=String(q.canonicalQuestionId||'');
    const draft=draftById.get(canonicalId)||null;
    const nativeDecision=nativeDecisionByKey.get(sourceKey(q.sourceId,q.questionNumber))||null;
    const sectionId=validated
      ?String(architecture.questionSessionMap?.[validated.id]||nativeDecision?.sessionId||'')||null
      :String(architecture.questionSessionMap?.[canonicalId]||nativeDecision?.sessionId||'')||null;
    const section=sectionId?sessionById.get(sectionId):null;
    const domainId=String(
      validated?.topicId||
      section?.domainId||
      draft?.topicId||
      nativeDecision?.domainId||
      ''
    )||null;
    const dedupCluster=clusterByQuestionId.get(String(q.id))||occurrenceId(q);
    const eqCluster=validated?`canonical:${validated.id}`:dedupCluster;
    let reason='checkpoint-source-reveal';
    if(validated&&objectiveKind==='text')reason='validated-master-text';
    else if(validated&&objectiveKind==='structured')reason='validated-native-structured';
    else if(q.reviewMode==='scored-text')reason='checkpoint-unvalidated-text';
    else if(q.reviewMode==='native-structured')reason='checkpoint-native-withheld';

    return {
      occurrenceId:occurrenceId(q),
      questionId:String(q.id),
      sourceId:String(q.sourceId),
      questionNumber:String(q.questionNumber),
      occurrence:Number(q.occurrence||1),
      sourceType:String(q.sourceType||''),
      reviewMode:String(q.reviewMode||''),
      mode,
      objectiveKind,
      validatedQuestionId:validated?String(validated.id):null,
      canonicalQuestionId:q.canonicalQuestionId?String(q.canonicalQuestionId):null,
      equivalenceClusterId:eqCluster,
      domainId,
      sectionId,
      ranking:{completionWeight:1,accuracyWeight:validated?1:0},
      reason
    };
  });

  const sourceCounts=Object.fromEntries(sourceBanks.map(bank=>[String(bank.sourceId),Number(bank.questionCount||bank.questions?.length||0)]));
  const validatedConcepts=new Set(records.filter(r=>r.mode==='objective').map(r=>r.validatedQuestionId));
  const mappedDomainCount=records.filter(r=>r.domainId).length;
  return {
    schemaVersion:1,
    examId:'microsoft-pl-300',
    generatedFrom:{
      sourceBanks:['source-01-review-bank.json','source-02-review-bank.json'],
      masterBank:'master-bank.json',
      dedupAudit:'source-dedup-audit.json',
      nativeRankedReview:'native-ranked-review.json',
      contentArchitecture:'content-architecture.json'
    },
    policy:'509 occurrence completion; competitive accuracy only across validated master concepts; duplicate occurrences collapse by canonical equivalence cluster.',
    questionCount:records.length,
    sources:sourceCounts,
    objectiveOccurrences:records.filter(r=>r.mode==='objective').length,
    checkpointOccurrences:records.filter(r=>r.mode==='checkpoint').length,
    validatedConceptCount:validatedConcepts.size,
    mappedDomainOccurrences:mappedDomainCount,
    unclassifiedOccurrences:records.length-mappedDomainCount,
    records
  };
}

export function writeFullRankedIndex(){
  const out=buildFullRankedIndex();
  fs.writeFileSync(path.join(base,'full-ranked-index.json'),`${JSON.stringify(out,null,2)}\n`);
  return out;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const checkOnly=process.argv.includes('--check');
  const out=buildFullRankedIndex();
  const target=path.join(base,'full-ranked-index.json');
  if(checkOnly){
    const expected=`${JSON.stringify(out,null,2)}\n`;
    const current=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';
    if(current!==expected){
      console.error('PL-300 full ranked index is stale. Run: node tools/pl300-full-ranked-index.mjs');
      process.exit(1);
    }
    console.log(`PL-300 full ranked index check: ${out.questionCount}/${out.questionCount} occurrences; ${out.validatedConceptCount} validated concepts; ${out.checkpointOccurrences} checkpoints.`);
  }else{
    fs.writeFileSync(target,`${JSON.stringify(out,null,2)}\n`);
    console.log(`PL-300 full ranked index: ${out.questionCount} occurrences; ${out.validatedConceptCount} validated concepts; ${out.checkpointOccurrences} checkpoints.`);
  }
}
