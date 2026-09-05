#!/usr/bin/env python3
from __future__ import annotations
import argparse, collections, hashlib, json, re, unicodedata
from pathlib import Path
import fitz
from PIL import Image
import io

ROOT=Path(__file__).resolve().parents[1]
PL300=ROOT/'voucher/tracks/data-analysis/microsoft-pl-300'
OUT_ASSETS=PL300/'assets/source-review'


def clean_text(s:str)->str:
    s=(s or '').replace('\x06',' ').replace('\u00a0',' ').replace('￾','-')
    s=re.sub(r'[ \t]+',' ',s)
    s=re.sub(r' *\n *','\n',s)
    return s.strip()


def option_parse(question_raw:str):
    lines=question_raw.splitlines()
    opts=[]; current=None
    body=[]
    for line in lines:
        m=re.match(r'^\s*([A-H])\.\s*(.*)$',line)
        if m:
            if current: opts.append(current)
            current={'id':m.group(1),'text':m.group(2).strip()}
        elif current:
            current['text']=(current['text']+' '+line.strip()).strip()
        else:
            body.append(line)
    if current: opts.append(current)
    # Do not accept fake Mastered/Not Mastered as answer options for source visuals.
    fake={o['text'].lower().strip(' .') for o in opts}
    if fake and fake.issubset({'mastered','not mastered'}):
        return clean_text('\n'.join(body)), []
    return clean_text('\n'.join(body)), opts


def answer_ids(token:str|None, options):
    if not token: return []
    valid={o['id'] for o in options}
    # Source keys commonly use AE / AD / A,C. Keep only IDs that resolve.
    ids=[c for c in re.findall(r'[A-H]', token.upper()) if c in valid]
    out=[]
    for x in ids:
        if x not in out: out.append(x)
    return out


def make_id(source_id,qnum,occ):
    suffix=f'-o{occ}' if occ>1 else ''
    return f'pl300-{source_id}-q{str(qnum).zfill(3)}{suffix}'


def classify_type(raw:str):
    u=raw.upper()[:160]
    if 'HOTSPOT' in u: return 'hotspot'
    if 'DRAG DROP' in u: return 'drag-drop'
    if 'FILL IN THE BLANK' in u: return 'fill-blank'
    return 'mcq'


def strip_leading_labels(text:str):
    text=re.sub(r'^\s*(HOTSPOT|DRAG DROP|FILL IN THE BLANK)\s*[-–—]*\s*','',text,flags=re.I)
    text=re.sub(r'^\s*-?\s*\(Topic\s*\d+\)\s*','',text,flags=re.I)
    return clean_text(text)


def extract_source1(path:Path):
    doc=fitz.open(path)
    blocks=[]; markers=[]
    for pno,page in enumerate(doc,start=1):
        for b in page.get_text('blocks',sort=True):
            x0,y0,x1,y1,txt,*_=b
            txt=clean_text(txt)
            if not txt: continue
            rec={'page':pno,'y0':float(y0),'y1':float(y1),'x0':float(x0),'x1':float(x1),'text':txt}
            blocks.append(rec)
            m=re.search(r'^Question:\s*(\d+)\s*CertyIQ$',txt.replace('\n',' '),flags=re.I)
            if m: markers.append((len(blocks)-1,str(int(m.group(1))),1))
    out=[]
    for i,(idx,num,occ) in enumerate(markers):
        end_idx=markers[i+1][0] if i+1<len(markers) else len(blocks)
        seg=blocks[idx+1:end_idx]
        start=blocks[idx]
        nxt=blocks[end_idx] if end_idx<len(blocks) else {'page':len(doc),'y0':doc[-1].rect.height}
        ans_i=expl_i=None
        for j,r in enumerate(seg):
            if ans_i is None and re.match(r'^Answer:\s*',r['text'],re.I): ans_i=j
            if expl_i is None and re.match(r'^Explanation:\s*',r['text'],re.I): expl_i=j
        q_end=ans_i if ans_i is not None else (expl_i if expl_i is not None else len(seg))
        ab_end=expl_i if expl_i is not None and ans_i is not None and expl_i>ans_i else (min(ans_i+2,len(seg)) if ans_i is not None else q_end)
        qraw=clean_text('\n'.join(r['text'] for r in seg[:q_end]))
        araw=clean_text('\n'.join(r['text'] for r in seg[ans_i:ab_end])) if ans_i is not None else ''
        eraw=clean_text('\n'.join(r['text'] for r in seg[expl_i:])) if expl_i is not None else ''
        am=re.search(r'^Answer:\s*\n?\s*([A-H](?:\s*[,/&+]\s*[A-H]|[A-H])*)\b',araw,re.I|re.M)
        token=re.sub(r'[^A-H]','',am.group(1).upper()) if am else None
        ans_rec=seg[ans_i] if ans_i is not None else None
        exp_rec=seg[expl_i] if expl_i is not None else None
        out.append({
            'sourceId':'source-01','questionNumber':num,'occurrence':occ,'pageStart':start['page'],
            'pageEnd':seg[-1]['page'] if seg else start['page'],'type':classify_type(qraw),
            'questionRaw':qraw,'answerRaw':araw,'answerToken':token,'explanationRaw':eraw,
            '_start':start,'_answer':ans_rec,'_explanation':exp_rec,'_next':nxt
        })
    return out,doc


def extract_source2(path:Path):
    doc=fitz.open(path)
    blocks=[]; markers=[]; occurrences=collections.Counter()
    for pno,page in enumerate(doc,start=1):
        for b in page.get_text('blocks',sort=True):
            x0,y0,x1,y1,txt,*_=b
            txt=clean_text(txt)
            if not txt: continue
            if txt.startswith('Certshared now are offering 100% pass ensure PL-300 dumps!'): continue
            if txt.startswith('Guaranteed success with Our exam guides'): continue
            rec={'page':pno,'y0':float(y0),'y1':float(y1),'x0':float(x0),'x1':float(x1),'text':txt}
            blocks.append(rec)
            m=re.match(r'^NEW QUESTION\s+(\d+)\b',txt,re.I)
            if m:
                n=str(int(m.group(1))); occurrences[n]+=1
                markers.append((len(blocks)-1,n,occurrences[n]))
    out=[]
    for i,(idx,num,occ) in enumerate(markers):
        end_idx=markers[i+1][0] if i+1<len(markers) else len(blocks)
        seg=[dict(r) for r in blocks[idx:end_idx]]
        start=seg[0]
        seg[0]['text']=re.sub(r'^NEW QUESTION\s+\d+\s*','',seg[0]['text'],flags=re.I).strip()
        nxt=blocks[end_idx] if end_idx<len(blocks) else {'page':len(doc),'y0':doc[-1].rect.height}
        ans_i=expl_i=None
        for j,r in enumerate(seg):
            if ans_i is None and re.match(r'^Answer:\s*',r['text'],re.I): ans_i=j
            if expl_i is None and re.match(r'^Explanation:\s*',r['text'],re.I): expl_i=j
        q_end=ans_i if ans_i is not None else (expl_i if expl_i is not None else len(seg))
        ab_end=expl_i if expl_i is not None and ans_i is not None and expl_i>ans_i else (min(ans_i+2,len(seg)) if ans_i is not None else q_end)
        qraw=clean_text('\n'.join(r['text'] for r in seg[:q_end]))
        araw=clean_text('\n'.join(r['text'] for r in seg[ans_i:ab_end])) if ans_i is not None else ''
        eraw=clean_text('\n'.join(r['text'] for r in seg[expl_i:])) if expl_i is not None else ''
        am=re.search(r'^Answer:\s*([A-H](?:\s*[,/&+]\s*[A-H]|[A-H])*)\b',araw,re.I|re.M)
        token=re.sub(r'[^A-H]','',am.group(1).upper()) if am else None
        ans_rec=seg[ans_i] if ans_i is not None else None
        exp_rec=seg[expl_i] if expl_i is not None else None
        out.append({
            'sourceId':'source-02','questionNumber':num,'occurrence':occ,'pageStart':start['page'],
            'pageEnd':seg[-1]['page'] if seg else start['page'],'type':classify_type(qraw),
            'questionRaw':qraw,'answerRaw':araw,'answerToken':token,'explanationRaw':eraw,
            '_start':start,'_answer':ans_rec,'_explanation':exp_rec,'_next':nxt
        })
    # The source ends with a promotional marker `NEW QUESTION 415` that contains no question.
    out=[q for q in out if not (q['questionNumber']=='415' and 'Thank You for Trying Our Product' in q['questionRaw'])]
    return out,doc


def draft_maps():
    d=json.load(open(PL300/'draft-master-bank.json',encoding='utf-8'))
    by1={}; by2=collections.defaultdict(list)
    for q in d.get('questions',[]):
        for r in q.get('sourceRefs',[]):
            sid=r.get('sourceId'); num=str(r.get('questionNumber'))
            if sid=='source-01': by1[num]=q
            elif sid=='source-02': by2[num].append(q)
    return by1,by2


def crop_parts(doc, start, end, out_prefix:Path, scale=1.35, quality=68):
    if not start or not end: return []
    sp=int(start['page']); ep=int(end['page'])
    paths=[]
    for page_no in range(sp,ep+1):
        page=doc[page_no-1]
        top=float(start['y0'])-6 if page_no==sp else 14
        bottom=float(end['y0'])-5 if page_no==ep else page.rect.height-14
        top=max(0,top); bottom=min(page.rect.height,bottom)
        if bottom-top<34: continue
        clip=fitz.Rect(45,max(0,top),567,bottom)
        pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),clip=clip,alpha=False)
        im=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
        rel=out_prefix.parent
        rel.mkdir(parents=True,exist_ok=True)
        suffix=f'-p{page_no}' if sp!=ep else ''
        path=Path(str(out_prefix)+suffix+'.webp')
        
        if not path.exists(): im.save(path,'WEBP',quality=quality,method=4)
        paths.append(path)
    return paths


def relroot(path:Path):
    return path.relative_to(ROOT).as_posix()


def build_review_questions(raw,doc,source_id, existing_map):
    result=[]
    for q in raw:
        body,opts=option_parse(q['questionRaw'])
        ids=answer_ids(q['answerToken'],opts)
        # Source-02 visual keys A/B are Mastered placeholders, never score them.
        text_scored=(q['type']=='mcq' and len(opts)>=2 and bool(ids))
        existing=None
        if source_id=='source-01': existing=existing_map.get(q['questionNumber'])
        else:
            candidates=existing_map.get(q['questionNumber'],[])
            existing=candidates[0] if candidates else None
        # If the canonical item has a visual, preserve it in source review even if text-scored.
        existing_visual=existing.get('visualAsset') if existing else None
        needs_source_visual=(q['type']!='mcq' or not text_scored)
        qvisuals=[]; avisuals=[]
        safe_key=f"{source_id}-q{str(q['questionNumber']).zfill(3)}"+(f"-o{q['occurrence']}" if q['occurrence']>1 else '')
        if needs_source_visual:
            start=q['_start']; ans=q['_answer']; exp=q['_explanation']; nxt=q['_next']
            if ans:
                qpaths=crop_parts(doc,start,ans,OUT_ASSETS/(safe_key+'-question'))
                # Reveal region differs by source. For source-01, Answer -> Explanation contains selected answer image.
                # For source-02, Explanation -> next question often contains the source's solved image / explanation.
                if source_id=='source-01' and exp:
                    apaths=crop_parts(doc,ans,exp,OUT_ASSETS/(safe_key+'-answer'))
                else:
                    reveal_start=exp or ans
                    apaths=crop_parts(doc,reveal_start,nxt,OUT_ASSETS/(safe_key+'-answer')) if reveal_start else []
                qvisuals=[relroot(x) for x in qpaths]
                avisuals=[relroot(x) for x in apaths]
        elif existing_visual:
            qvisuals=[existing_visual]
        entry={
            'id':make_id(source_id,q['questionNumber'],q['occurrence']),
            'sourceId':source_id,'questionNumber':q['questionNumber'],'occurrence':q['occurrence'],
            'pageStart':q['pageStart'],'pageEnd':q['pageEnd'],'sourceType':q['type'],
            'reviewMode':'scored-text' if text_scored else 'source-reveal',
            'questionText':strip_leading_labels(body if body else q['questionRaw']),
            'options':opts if text_scored else [],
            'sourceAnswerToken':q['answerToken'],
            'sourceExplanation':re.sub(r'^Explanation:\s*','',q['explanationRaw'],flags=re.I).strip(),
            'questionVisuals':qvisuals,'answerVisuals':avisuals,
            'canonicalQuestionId':existing.get('id') if existing else None,
            'productionReady':bool(existing and existing.get('productionReady') is True),
            'sourceFidelity':{'questionWording':'parsed-from-pdf','answerEvidence':'pdf-text-or-source-reveal','adaptedScoring':False}
        }
        if text_scored:
            if len(ids)==1: entry['correctAnswer']=ids[0]
            else: entry['correctAnswers']=ids
        result.append(entry)
    return result


def write_bank(source_id,title,questions):
    out=PL300/f'{source_id}-review-bank.json'
    payload={'schemaVersion':1,'examId':'microsoft-pl-300','sourceId':source_id,'title':title,
             'mode':'source-review','questionCount':len(questions),'questions':questions}
    out.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return out


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--source1',required=True); ap.add_argument('--source2',required=True)
    args=ap.parse_args()
    OUT_ASSETS.mkdir(parents=True,exist_ok=True)
    q1,d1=extract_source1(Path(args.source1)); q2,d2=extract_source2(Path(args.source2))
    if len(q1)!=369 or len(q2)!=140: raise SystemExit(f'Unexpected source counts: {len(q1)} / {len(q2)}')
    by1,by2=draft_maps()
    r1=build_review_questions(q1,d1,'source-01',by1)
    r2=build_review_questions(q2,d2,'source-02',by2)
    write_bank('source-01','PL-300 Final.pdf',r1)
    write_bank('source-02','PL-300 Final 2.pdf',r2)
    stats={
      'source-01':collections.Counter(q['reviewMode'] for q in r1),
      'source-02':collections.Counter(q['reviewMode'] for q in r2),
      'assets':len(list(OUT_ASSETS.glob('*.webp')))
    }
    print(json.dumps(stats,default=dict,indent=2))

if __name__=='__main__': main()
