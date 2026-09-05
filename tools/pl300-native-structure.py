#!/usr/bin/env python3
from __future__ import annotations
import json,re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PL300=ROOT/'voucher/tracks/data-analysis/microsoft-pl-300'
BANKS=[PL300/'source-01-review-bank.json',PL300/'source-02-review-bank.json']
AUDIT=PL300/'native-structure-audit.json'

EXPLANATION_STARTERS=(
    'reference','references','note','incorrect','why ','this ','the ','when ','you ','a ','an ','by ','with ',
    'from ','for ','example','syntax','managing ','see:','see ','source:','source ','because ','since ','in many ',
    'to apply ','to format ','to create ','to resolve ','to meet ','to extract ','to use ','to gain ','we ','it '
)
KNOWN_VALUE_PREFIXES=(
    'row label','key column','fact table','surrogate key','data source type','transformation','report file',
    'dataset file','dataset','authentication','parameter type','create','type','format','field','property'
)
BLOCKED_TOKENS={'answer','explanation','reference','references','box','step','select','source','see','https'}


def compact(s:str)->str:
    s=(s or '').replace('\u00a0',' ').replace('￾','-')
    s=re.sub(r'[ \t]+',' ',s)
    return s.strip()


def answer_clean(s:str)->str:
    s=compact(s)
    s=re.sub(r'\s*[-–—]\s*$','',s).strip(' .:;')
    # Repair common PDF line-wrap artifacts around punctuation.
    s=re.sub(r'\s+([,;)\]])',r'\1',s)
    s=re.sub(r'([([])\s+',r'\1',s)
    low=s.lower()
    for prefix in KNOWN_VALUE_PREFIXES:
        marker=prefix+':'
        if low.startswith(marker):
            s=s[len(marker):].strip()
            break
    return s


def plausible(value:str)->bool:
    value=answer_clean(value)
    if not value or len(value)>180:return False
    words=value.split()
    if len(words)>22:return False
    low=value.lower().strip()
    if low in BLOCKED_TOKENS:return False
    if low.startswith('http') or 'docs.microsoft.com' in low or 'learn.microsoft.com' in low:return False
    if value.count('=')>3:return False
    # Long explanatory sentences are not answer values.
    if len(words)>9 and re.search(r'\b(?:because|should|allows|provides|returns|means|typically|therefore|which|where|will|would)\b',low):
        return False
    return True


def normalize_box_headers(text:str)->str:
    # Source PDFs frequently split "Box", the number, and ':' across lines.
    text=re.sub(r'(?im)\bBox\s*\n\s*(\d+)\s*:\s*',lambda m:f'Box {m.group(1)}: ',text)
    return text


def is_explanation_start(line:str)->bool:
    low=line.lower().strip()
    return any(low.startswith(x) for x in EXPLANATION_STARTERS)


def extract_boxes(text:str):
    text=normalize_box_headers(text)
    text=re.sub(r'(?im)\bBox\s*(\d+)\s*:',lambda m:f'Box {m.group(1)}:',text)
    matches=list(re.finditer(r'(?im)^\s*Box\s*(\d+)\s*:\s*(.*)$',text))
    if not matches:return []
    fields=[]
    for idx,m in enumerate(matches):
        number=m.group(1)
        block_end=matches[idx+1].start() if idx+1<len(matches) else len(text)
        first=m.group(2).strip()
        tail=text[m.end():block_end]
        lines=([first] if first else [])+tail.splitlines()
        parts=[]
        for raw in lines:
            line=compact(raw)
            if not line:continue
            if line in {'-','–','—'}:break
            # If answer and prose share the same line, keep only the answer before the separator.
            if re.search(r'\s[-–—]\s+',line):
                left=re.split(r'\s[-–—]\s+', line, maxsplit=1)[0]
                if left:parts.append(left)
                break
            if line.endswith(('-', '–','—')):
                parts.append(line[:-1])
                break
            if parts:
                low=line.lower()
                if is_explanation_start(line) or line.startswith('*') or line.startswith('http'):
                    break
                if re.match(r'^[A-Z][A-Za-z /_-]{1,24}:\s+',line) and not any(low.startswith(k+':') for k in KNOWN_VALUE_PREFIXES):
                    break
                # Once an answer phrase has started, a normal prose sentence signals explanation.
                if len(line.split())>=5 and (line.endswith('.') or re.match(r'^[A-Z][a-z]+\s',line)):
                    break
            parts.append(line)
            if len(' '.join(parts).split())>22:break
        value=answer_clean(' '.join(parts))
        if plausible(value):
            aliases=[value]
            num=re.match(r'^(\d+(?:\.\d+)?)\s+[A-Za-z]+$',value)
            if num:aliases.append(num.group(1))
            fields.append({'id':f'box-{number}','label':f'Box {number}','expected':aliases})
    # Never promote a partially parsed hotspot.
    return fields if len(fields)==len(matches) else []


def extract_numbered_sequence(text:str):
    m=re.search(r'(?im)^\s*Correct Sequence\s*=\s*([0-9]+(?:\s*>\s*[0-9]+){1,8})\s*$',text)
    if m:
        value=re.sub(r'\s+','',m.group(1))
        return [{'id':'sequence','label':'Sequence','expected':[value]}]
    lines=text.splitlines(); items=[]; started=False
    for line in lines:
        s=compact(line).lstrip('*').strip()
        m=re.match(r'^(\d+)\s*[.)-]\s*(.+)$',s)
        if m:
            value=answer_clean(m.group(2))
            if not plausible(value):return []
            items.append({'id':f'step-{len(items)+1}','label':f'Step {len(items)+1}','expected':[value]})
            started=True;continue
        if started and s:break
    return items if len(items)>=2 else []


def extract_inline_numbered_sequence(text:str):
    first=compact(text.split('\n',1)[0])
    matches=list(re.finditer(r'(?:^|\s)(\d+)\s*[.)]\s*',first))
    if len(matches)<2:return []
    fields=[]
    for idx,m in enumerate(matches):
        end=matches[idx+1].start() if idx+1<len(matches) else len(first)
        value=answer_clean(first[m.end():end])
        if not plausible(value):return []
        fields.append({'id':f'step-{idx+1}','label':f'Step {idx+1}','expected':[value]})
    return fields


def extract_known_label_values(text:str):
    fields=[]
    labels=('data source type','transformation','authentication','report file','dataset file','dataset','fact table','surrogate key','customer id','purchasedatetime','human resources','country')
    for line in text.splitlines()[:14]:
        s=compact(line)
        m=re.match(r'^([A-Za-z][A-Za-z0-9 /_\-]{1,32})\s*:\s*(.+)$',s)
        if not m:continue
        label=answer_clean(m.group(1)); value=answer_clean(m.group(2)); low=label.lower()
        if not any(low==x or low.startswith(x+' ') for x in labels):continue
        if plausible(value):fields.append({'id':f'field-{len(fields)+1}','label':label,'expected':[value]})
    return fields if fields else []


MANUAL_NATIVE={
    'pl300-source-01-q020':[('Connection timeout','10 minutes'),('Navigator display','Only tables that contain data')],
    'pl300-source-01-q028':[('Report file','Import'),('Dataset file','DirectQuery')],
    'pl300-source-01-q033':[('Employee review data','Private'),('Sales opportunities','Organizational')],
    'pl300-source-01-q035':[('Start on row 3','Remove top rows'),('Use row 3 as column names','Use first row as headers')],
    'pl300-source-01-q042':[('Fact table','Test Result'),('Surrogate key','Patient key')],
    'pl300-source-01-q045':[('Customer ID','Remove the column'),('PurchaseDateTime','Split the column into separate date and time columns')],
    'pl300-source-01-q054':[('Data source','Web'),('Authentication','Basic')],
    'pl300-source-01-q061':[('Row label','Name'),('Key column','ID'),('Featured table','Yes')],
    'pl300-source-01-q081':[('Relationship cardinality','One-to-many'),('Cross-filter direction','Single')],
    'pl300-source-01-q146':[('Function','HASONEVALUE'),('Rank method','DENSE')],
    'pl300-source-01-q165':[('First selection','Quick measures'),('Second selection','Month Start Date column')],
    'pl300-source-01-q179':[('Value','Whole number'),('Datetime','Date')],
    'pl300-source-01-q209':[('Unique values','20'),('Value below Peer, flowering species','Elm, American')],
    'pl300-source-01-q225':[('Visual type','Line'),('Analytics feature','Anomaly detection')],
    'pl300-source-01-q227':[('Reference line','Average reference line'),('Drill field well','Axis')],
    'pl300-source-01-q257':[('Visual','Matrix'),('Drill behavior','Apply drill down filters to Selected Visual')],
    'pl300-source-01-q268':[('Report1','Power BI Paginated (.rdl)'),('Report2','Power BI (.pbix)')],
    'pl300-source-01-q278':[('First answer','Column Quality'),('Second answer','Column Quality')],
    'pl300-source-01-q287':[('Column spacing','Enable overlap for every series'),('Percent change labels','Enable data labels for the Plan series')],
    'pl300-source-01-q300':[('Step 1','Open a report in Editing view'),('Step 2','With no visualizations selected, select Pin to a dashboard'),('Step 3','Pin the live page to an existing or new dashboard')],
    'pl300-source-01-q317':[('Analyze externally','Use Analyze in Excel'),('Permission','Grant Build permission')],
    'pl300-source-01-q322':[('HR dataset','Grant User1 the Build permission'),('WorkspaceB','Assign User1 the Contributor role')],
    'pl300-source-01-q367':[('Distribution method','Using an App'),('Audience group','A mail-enabled security group in Azure Active Directory')],
    'pl300-source-02-q001':[('Visualization type','KPI'),('Indicator','Sales[sales_amount]'),('Trend axis','Date[month]'),('Target goals','Targets[sales_target]')],
    'pl300-source-02-q100':[('Step 1','Convert list to table'),('Step 2','Expand Column'),('Step 3','Set Date type')],
    'pl300-source-02-q157':[('Step 1','Merge [Region_Manager] and [Manager] by using an inner join'),('Step 2','Merge [Sales_Region] and [Sales_Manager] by using an inner join'),('Step 3','Merge [Sales_Region] and [Region_Manager] by using an inner join')],
    'pl300-source-02-q209':[('Box 1','TOPN'),('Box 2','SUMMARIZE'),('Box 3','DESC')],
    'pl300-source-02-q353':[('Box 1','CONTOSO BIKES report'),('Box 2','three datasets')],
    'pl300-source-02-q281':[('Step 1','From Power BI Desktop, select Get Data, and then select Folder'),('Step 2','From Power Query Editor, remove the Content column'),('Step 3','From Power Query Editor, expand the Attributes column')],
}


def manual_native(question:dict):
    rows=MANUAL_NATIVE.get(question.get('id'))
    if not rows:return None
    return [{'id':f'field-{i+1}','label':label,'expected':[value]} for i,(label,value) in enumerate(rows)]


def derive_native(question:dict):
    if question.get('reviewMode')!='source-reveal':return None
    if question.get('sourceType')=='fill-blank':return None
    text=str(question.get('sourceExplanation') or '').strip()
    if not text:return None
    fields=manual_native(question)
    if fields:
        return {'interaction':'ordered-fields' if question.get('sourceType')=='drag-drop' else 'fields','scoring':'normalized-text','evidence':'source-explanation-curated','fields':fields,'normalization':{'caseInsensitive':True,'ignoreWhitespaceAndPunctuation':True}}
    for extractor in (extract_boxes,extract_numbered_sequence,extract_inline_numbered_sequence,extract_known_label_values):
        fields=extractor(text)
        if fields:
            return {'interaction':'ordered-fields' if question.get('sourceType')=='drag-drop' else 'fields','scoring':'normalized-text','evidence':'source-explanation','fields':fields,'normalization':{'caseInsensitive':True,'ignoreWhitespaceAndPunctuation':True}}
    return None

def main():
    converted=[]; remaining=[]
    total_text=0
    for path in BANKS:
        bank=json.loads(path.read_text(encoding='utf-8'))
        for q in bank.get('questions',[]):
            if q.get('reviewMode')=='scored-text':
                total_text+=1
                continue
            if q.get('reviewMode')=='native-structured' and q.get('nativeResponse'):
                native=q['nativeResponse']
                converted.append({'id':q['id'],'sourceId':q['sourceId'],'questionNumber':q['questionNumber'],'sourceType':q['sourceType'],'fields':[f['expected'][0] for f in native.get('fields',[]) if f.get('expected')]})
                q.setdefault('sourceFidelity',{})['adaptedScoring']=True
                q['rankingImpact']='none'
                continue
            native=derive_native(q)
            if native:
                q['reviewMode']='native-structured'
                q['nativeResponse']=native
                q.setdefault('sourceFidelity',{})['adaptedScoring']=True
                q['rankingImpact']='none'
                converted.append({'id':q['id'],'sourceId':q['sourceId'],'questionNumber':q['questionNumber'],'sourceType':q['sourceType'],'fields':[f['expected'][0] for f in native['fields']]})
            else:
                q.pop('nativeResponse',None)
                q.setdefault('sourceFidelity',{})['adaptedScoring']=False
                q['rankingImpact']='none'
                remaining.append({'id':q['id'],'sourceId':q['sourceId'],'questionNumber':q['questionNumber'],'sourceType':q['sourceType'],'reason':'insufficient explicit text answer evidence'})
        path.write_text(json.dumps(bank,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

    manifest_path=PL300/'source-manifest.json'
    manifest=json.loads(manifest_path.read_text(encoding='utf-8'))
    fsr=manifest.setdefault('fullSourceReview',{})
    fsr['autoScoredTextBlocks']=total_text
    fsr['nativeStructuredVisualBlocks']=len(converted)
    fsr['selfGradedVisualBlocks']=len(remaining)
    fsr['policy']='All actual source question blocks remain practiceable and non-ranked. Text MCQs auto-score from preserved source keys. Visual/answer-area items with explicit textual source-answer evidence use native normalized-text scoring; items without sufficient textual answer evidence retain source reveal + self-grading. No distractors or answer choices are invented.'
    manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

    audit={'schemaVersion':1,'examId':'microsoft-pl-300','method':'explicit-source-explanation-only','convertedCount':len(converted),'remainingSelfGradedCount':len(remaining),'converted':converted,'remaining':remaining}
    AUDIT.write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'converted':len(converted),'remaining':len(remaining),'autoText':total_text},indent=2))

if __name__=='__main__': main()
