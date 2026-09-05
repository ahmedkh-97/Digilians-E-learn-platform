#!/usr/bin/env python3
from __future__ import annotations
import collections,difflib,json,re,unicodedata
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PL300=ROOT/'voucher/tracks/data-analysis/microsoft-pl-300'
BANKS=[PL300/'source-01-review-bank.json',PL300/'source-02-review-bank.json']
OUT=PL300/'source-dedup-audit.json'


def norm_text(value:str)->str:
    value=unicodedata.normalize('NFKC',value or '').lower()
    value=value.replace('power bl','power bi')
    value=re.sub(r'\s+',' ',value)
    value=re.sub(r'[^a-z0-9%+\-]+',' ',value)
    return re.sub(r'\s+',' ',value).strip()


def answer_texts(q:dict):
    if q.get('reviewMode')=='scored-text':
        ids=q.get('correctAnswers') or ([q.get('correctAnswer')] if q.get('correctAnswer') else [])
        by_id={str(o.get('id')):str(o.get('text') or '') for o in q.get('options') or []}
        return [by_id.get(str(i),'') for i in ids if by_id.get(str(i),'')]
    if q.get('reviewMode')=='native-structured':
        return [str((f.get('expected') or [''])[0]) for f in q.get('nativeResponse',{}).get('fields',[]) if (f.get('expected') or [''])[0]]
    return []


def member(q:dict):
    return {
      'id':q.get('id'),'sourceId':q.get('sourceId'),'questionNumber':q.get('questionNumber'),'occurrence':q.get('occurrence',1),
      'reviewMode':q.get('reviewMode'),'canonicalQuestionId':q.get('canonicalQuestionId'),'answerTexts':answer_texts(q)
    }


def main():
    questions=[]
    for path in BANKS:
        questions.extend(json.loads(path.read_text(encoding='utf-8')).get('questions',[]))
    if len(questions)!=509:raise SystemExit(f'Expected 509 source blocks, got {len(questions)}')

    groups=collections.defaultdict(list)
    for q in questions:groups[norm_text(q.get('questionText',''))].append(q)
    ordered=sorted(groups.items(),key=lambda kv:(kv[0],len(kv[1])))
    unique_clusters=[];duplicate_clusters=[];answer_conflicts=[]
    for idx,(fingerprint,items) in enumerate(ordered,1):
        rec={'clusterId':f'NQ-{idx:03d}','fingerprint':fingerprint,'members':[member(q) for q in items]}
        unique_clusters.append(rec)
        if len(items)>1:
            duplicate_clusters.append(rec)
            signatures={tuple(norm_text(x) for x in answer_texts(q)) for q in items if answer_texts(q)}
            if len(signatures)>1:
                answer_conflicts.append({'clusterId':rec['clusterId'],'questionPreview':items[0].get('questionText','')[:220],'members':rec['members'],'status':'review-required'})

    unlinked=[q for q in questions if q.get('reviewMode')=='scored-text' and not q.get('canonicalQuestionId')]
    # Fail-closed semantic pairing for the four unlinked text blocks. These are near-duplicate source variants,
    # so compare wording similarity and only treat high-similarity pairs as a promotion cluster.
    pending=set(q['id'] for q in unlinked);promotion_clusters=[]
    for q in unlinked:
        if q['id'] not in pending:continue
        pending.remove(q['id'])
        candidates=[]
        for other in unlinked:
            if other['id'] not in pending:continue
            score=difflib.SequenceMatcher(None,norm_text(q.get('questionText','')),norm_text(other.get('questionText',''))).ratio()
            candidates.append((score,other))
        candidates.sort(key=lambda x:x[0],reverse=True)
        members=[q]
        if candidates and candidates[0][0]>=0.72:
            pending.remove(candidates[0][1]['id']);members.append(candidates[0][1])
        signatures={tuple(norm_text(x) for x in answer_texts(item)) for item in members}
        conflict=len(members)>1 and len(signatures)>1
        promotion_clusters.append({
          'members':[member(item) for item in members],
          'wordingSimilarity':round(candidates[0][0],3) if len(members)>1 and candidates else None,
          'answerConflict':conflict,
          'status':'owner-approval-required' if conflict else 'eligible-for-review'
        })
    blocked=sum(1 for c in promotion_clusters if c['answerConflict'])
    safe=sum(len(c['members']) for c in promotion_clusters if not c['answerConflict'])

    master=json.loads((PL300/'master-bank.json').read_text(encoding='utf-8'))
    payload={
      'schemaVersion':1,'examId':'microsoft-pl-300','method':'normalized-question-text-v1','rawSourceBlocks':len(questions),
      'normalizedUniqueQuestions':len(unique_clusters),'uniqueClusters':unique_clusters,'duplicateClusters':duplicate_clusters,
      'answerConflictCandidates':answer_conflicts,
      'rankPromotion':{
        'currentRankedQuestions':len(master.get('questions',[])),
        'unlinkedTextBlocks':len(unlinked),
        'safeNewTextCandidates':safe,
        'blockedNewTextConflictClusters':blocked,
        'clusters':promotion_clusters,
        'note':('No unlinked rankable text blocks remain after owner-approved conflict resolution; remaining source-only blocks are intentionally non-ranked.' if not unlinked else 'No new text question is promoted to Ranking while near-duplicate source variants disagree on the scoring key. Explicit owner approval is required before any scoring correction or ranked promotion.')
      }
    }
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'raw':len(questions),'normalizedUnique':len(unique_clusters),'duplicateClusters':len(duplicate_clusters),'answerConflictCandidates':len(answer_conflicts),'rankPromotion':payload['rankPromotion']},ensure_ascii=False,indent=2))

if __name__=='__main__':main()
