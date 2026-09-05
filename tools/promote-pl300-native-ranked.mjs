import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(ROOT,'voucher/tracks/data-analysis/microsoft-pl-300');
const read=name=>JSON.parse(fs.readFileSync(path.join(base,name),'utf8'));
const write=(name,value)=>fs.writeFileSync(path.join(base,name),JSON.stringify(value,null,2)+'\n');

const sourceBanks=[read('source-01-review-bank.json'),read('source-02-review-bank.json')];
const master=read('master-bank.json');
const architecture=read('content-architecture.json');
const config=read('config.json');
const manifest=read('source-manifest.json');
const dedupAudit=read('source-dedup-audit.json');
const sessionById=new Map(architecture.sessions.map(s=>[s.id,s]));
const domainById=new Map(architecture.domains.map(d=>[d.id,d]));

const sessions={
 'source-01:1':'pl300-s06-model-optimization','source-01:5':'pl300-s02-power-query','source-01:6':'pl300-s02-power-query','source-01:12':'pl300-s02-power-query','source-01:13':'pl300-s02-power-query','source-01:15':'pl300-s02-power-query','source-01:20':'pl300-s01-data-sources','source-01:31':'pl300-s01-data-sources','source-01:33':'pl300-s01-data-sources','source-01:35':'pl300-s02-power-query','source-01:42':'pl300-s04-star-schema','source-01:45':'pl300-s06-model-optimization','source-01:54':'pl300-s01-data-sources','source-01:61':'pl300-s06-model-optimization','source-01:63':'pl300-s04-star-schema','source-01:66':'pl300-s04-star-schema','source-01:68':'pl300-s04-star-schema','source-01:73':'pl300-s02-power-query','source-01:74':'pl300-s06-model-optimization','source-01:75':'pl300-s04-star-schema','source-01:79':'pl300-s05-dax','source-01:81':'pl300-s04-star-schema','source-01:89':'pl300-s06-model-optimization','source-01:90':'pl300-s05-dax','source-01:91':'pl300-s05-dax','source-01:95':'pl300-s05-dax','source-01:97':'pl300-s05-dax','source-01:101':'pl300-s05-dax','source-01:108':'pl300-s05-dax','source-01:146':'pl300-s05-dax','source-01:179':'pl300-s02-power-query','source-01:189':'pl300-s08-analytics','source-01:191':'pl300-s08-analytics','source-01:195':'pl300-s09-workspaces','source-01:202':'pl300-s07-visuals','source-01:209':'pl300-s02-power-query','source-01:212':'pl300-s08-analytics','source-01:219':'pl300-s07-visuals','source-01:221':'pl300-s09-workspaces','source-01:225':'pl300-s08-analytics','source-01:227':'pl300-s08-analytics','source-01:233':'pl300-s08-analytics','source-01:257':'pl300-s07-visuals','source-01:268':'pl300-s09-workspaces','source-01:278':'pl300-s02-power-query','source-01:300':'pl300-s09-workspaces','source-01:306':'pl300-s09-workspaces','source-01:317':'pl300-s09-workspaces','source-01:322':'pl300-s09-workspaces','source-01:344':'pl300-s09-workspaces','source-01:346':'pl300-s05-dax','source-01:347':'pl300-s10-security','source-01:355':'pl300-s04-star-schema','source-01:356':'pl300-s05-dax','source-01:359':'pl300-s10-security','source-01:361':'pl300-s07-visuals','source-01:366':'pl300-s09-workspaces','source-01:367':'pl300-s09-workspaces',
 'source-02:1':'pl300-s07-visuals','source-02:100':'pl300-s02-power-query','source-02:130':'pl300-s02-power-query','source-02:209':'pl300-s05-dax','source-02:353':'pl300-s09-workspaces','source-02:389':'pl300-s02-power-query'
};
const withheld={
 'source-01:28':'withheld-source-key-quality-review',
 'source-01:78':'withheld-ambiguous-source-explanation',
 'source-01:83':'withheld-formula-evidence-insufficient',
 'source-01:165':'withheld-context-dependent-answer-area',
 'source-01:197':'withheld-cross-source-answer-conflict-source-02-20',
 'source-01:287':'withheld-legacy-ui-wording',
 'source-02:8':'duplicate-suppressed-source-01-361',
 'source-02:20':'withheld-cross-source-answer-conflict-source-01-197',
 'source-02:50':'duplicate-suppressed-source-01-74',
 'source-02:157':'duplicate-suppressed-source-01-66',
 'source-02:174':'withheld-internal-source-explanation-conflict-sum-vs-sumx',
 'source-02:281':'duplicate-suppressed-source-01-15',
 'source-02:378':'duplicate-suppressed-source-01-90',
 'source-02:396':'withheld-freeform-dax-not-deterministic'
};

const candidates=sourceBanks.flatMap(bank=>bank.questions.filter(q=>q.reviewMode==='native-structured'));
if(candidates.length!==78)throw new Error(`Expected 78 candidates, got ${candidates.length}`);
const decisions=[];
for(const q of candidates){
 const sourceKey=`${q.sourceId}:${q.questionNumber}`;
 if(withheld[sourceKey]){
   decisions.push({sourceKey,sourceId:q.sourceId,questionNumber:String(q.questionNumber),status:'withheld',reason:withheld[sourceKey]});
   continue;
 }
 const sessionId=sessions[sourceKey];
 if(!sessionId)throw new Error(`No session decision for ${sourceKey}`);
 const session=sessionById.get(sessionId); if(!session)throw new Error(`Unknown session ${sessionId}`);
 decisions.push({sourceKey,sourceId:q.sourceId,questionNumber:String(q.questionNumber),status:'approved',reason:'explicit-source-answer-area-with-deterministic-normalized-text-scoring',sessionId,domainId:session.domainId});
}
const approved=decisions.filter(d=>d.status==='approved');
if(approved.length!==64)throw new Error(`Expected 64 approvals, got ${approved.length}`);
const review={
 schemaVersion:1,examId:'microsoft-pl-300',method:'fail-closed-native-ranked-review-v1',candidateCount:78,approvedCount:64,withheldCount:14,
 policy:'Promote only explicit source-backed structured answer areas that can be deterministically scored. Duplicates, conflicts, ambiguous items, and unstable/free-form items remain source practice only.',
 decisions
};
write('native-ranked-review.json',review);

const original=master.questions.filter(q=>q.responseType!=='structured');
if(original.length!==201)throw new Error(`Expected 201 existing ranked questions, got ${original.length}`);
const byKey=new Map(candidates.map(q=>[`${q.sourceId}:${q.questionNumber}`,q]));
const promoted=approved.map(decision=>{
 const src=byKey.get(decision.sourceKey); const session=sessionById.get(decision.sessionId); const domain=domainById.get(decision.domainId);
 const num=String(src.questionNumber).padStart(3,'0');
 const id=`pl300-native-${src.sourceId.replace('source-','s')}-q${num}`;
 const expectedTexts=(src.nativeResponse?.fields||[]).flatMap(f=>f.expected||[]).map(String);
 return {
   id,
   question:src.questionText,
   options:[],
   responseType:'structured',
   nativeResponse:src.nativeResponse,
   topicId:decision.domainId,
   topic:domain?.title||decision.domainId,
   sourceType:'voucher',
   productionReady:true,
   status:'approved-native-structured',
   explanationStatus:'source-reviewed-structured',
   explanation:{en:String(src.sourceExplanation||'')},
   sourceExplanation:String(src.sourceExplanation||''),
   visualAsset:Array.isArray(src.questionVisuals)?(src.questionVisuals[0]||null):null,
   visualAssets:Array.isArray(src.questionVisuals)?src.questionVisuals:[],
   visualAlt:`PL-300 source ${src.sourceId} question ${src.questionNumber} exhibit`,
   sourceRefs:[{sourceId:src.sourceId,questionNumber:String(src.questionNumber),pageStart:src.pageStart,pageEnd:src.pageEnd,sourceAnswerTexts:expectedTexts}],
   canonicalSourceRef:{sourceId:src.sourceId,questionNumber:String(src.questionNumber)},
   nativeRankedReview:{sourceId:src.sourceId,questionNumber:String(src.questionNumber),sourceKey:decision.sourceKey,sessionId:decision.sessionId,domainId:decision.domainId,reviewStatus:'approved'},
   shuffle:{options:'locked'},
   verification:{status:'approved-for-production',basis:'native-source-evidence-review',scopeBasis:'supplied PL-300 source PDFs',responseEngine:'native-structured-v1'}
 };
});
master.questions=[...original,...promoted];
master.questionCount=master.questions.length;
master.productionScope='Reviewed PL-300 ranked bank with canonical text questions plus fail-closed native structured source questions; full source practice remains available for all 509 source blocks.';
write('master-bank.json',master);

architecture.questionCount=master.questions.length;
for(const q of promoted)architecture.questionSessionMap[q.id]=q.nativeRankedReview.sessionId;
write('content-architecture.json',architecture);

config.subtitle=`Power BI Data Analyst • ${master.questions.length} ranked + 509 source-practice blocks`;
config.masterBankQuestionCount=master.questions.length;
config.fullBankExam.questionCount=master.questions.length;
config.fullBankExam.durationMinutes=master.questions.length*2;
config.releaseNotes.note='Native Structured Ranked Engine V1 promotes 64 deterministic source-backed visual/answer-area questions into Domain Ranked Learning. 14 native candidates remain fail-closed for duplicate, conflict, ambiguity, or free-form reasons. Full Source Practice still preserves all 509 source blocks.';
config.releaseNotes.rankExpansion={rankedQuestions:master.questions.length,textRankedQuestions:201,nativeRankedQuestions:64,nativeRankedReviewFile:'voucher/tracks/data-analysis/microsoft-pl-300/native-ranked-review.json',excludedMalformedCluster:['source-01:249','source-02:242']};
write('config.json',config);

manifest.audit.productionReadyTextQuestions=201;
manifest.audit.nativeRankedQuestions=64;
manifest.audit.productionReadyQuestions=master.questions.length;
manifest.audit.totalRankedQuestions=master.questions.length;
manifest.audit.note='All 271 canonical text questions remain resolved: 201 ranked text questions and 70 fail-closed text questions. Native Ranked Engine V1 additionally promotes 64 of 78 deterministic structured source items; 14 remain fail-closed. All 509 source blocks remain practiceable.';
manifest.fullSourceReview.nativeRankedQuestions=64;
manifest.fullSourceReview.nativeRankedReviewFile='voucher/tracks/data-analysis/microsoft-pl-300/native-ranked-review.json';
write('source-manifest.json',manifest);

dedupAudit.rankPromotion={
  ...(dedupAudit.rankPromotion||{}),
  currentRankedQuestions:master.questions.length,
  rankedTextQuestions:201,
  nativeRankedQuestions:64,
  unlinkedTextBlocks:0,
  safeNewTextCandidates:0,
  blockedNewTextConflictClusters:0,
  clusters:[],
  note:'No unlinked rankable text blocks remain after owner-approved conflict resolution. Native Ranked Engine V1 additionally promotes 64 explicitly reviewed structured items; remaining native items are fail-closed in native-ranked-review.json.'
};
write('source-dedup-audit.json',dedupAudit);
console.log(JSON.stringify({ranked:master.questions.length,native:promoted.length,withheld:review.withheldCount},null,2));
