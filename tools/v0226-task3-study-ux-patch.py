from pathlib import Path
import re

path=Path('assets/js/pl300-full-ranked-learning.js')
text=path.read_text(encoding='utf-8')

imports="""import {buildPl300PartStudyMetrics} from './pl300-learning-loop.js';\nimport {structuredInteractionKind} from './exam-structured.js';\n\n"""
if not text.startswith("import {buildPl300PartStudyMetrics}"):
    text=imports+text

anchor="""export function buildPl300PartOptionsMarkup({parts=[],activePartId='all'}={}){\n  const active=String(activePartId||'all');\n  const options=[`<option value=\"all\"${active==='all'?' selected':''}>All 509 Questions</option>`];\n  for(const part of Array.isArray(parts)?parts:[]){\n    const id=String(part?.id||'');\n    options.push(`<option value=\"${htmlEscape(id)}\"${active===id?' selected':''}>${htmlEscape(part?.label||id)}</option>`);\n  }\n  return options.join('');\n}\n\n"""
helpers="""export function pl300InteractionLabel(question={}){\n  if(question?.reviewMode==='source-reveal')return 'STUDY CHECKPOINT';\n  if(question?.reviewMode==='scored-text'){\n    const correct=(Array.isArray(question?.correctAnswers)&&question.correctAnswers.length?question.correctAnswers:[question?.correctAnswer]).filter(Boolean);\n    return correct.length>1?`MULTI SELECT · SELECT ${correct.length}`:'SINGLE CHOICE · RANKED';\n  }\n  if(question?.reviewMode==='native-structured'){\n    const kind=structuredInteractionKind({...question,responseType:'structured'});\n    if(kind==='yes-no')return 'YES / NO · RANKED';\n    if(kind==='ordered-fields')return 'ORDERING · RANKED';\n    if(kind==='choice-fields')return 'DROPDOWNS · RANKED';\n    return 'TEXT ENTRY · RANKED';\n  }\n  return 'STUDY MODE';\n}\n\nexport function buildPl300QuestionProgressModel({index=0,length=0,studied=0,total=0}={}){\n  const safeLength=Math.max(0,Math.floor(num(length)));\n  const safeTotal=Math.max(0,Math.floor(num(total,safeLength)));\n  const safeStudied=Math.max(0,Math.min(safeTotal,Math.floor(num(studied))));\n  const position=safeLength?Math.max(1,Math.min(safeLength,Math.floor(num(index))+1)):0;\n  return {\n    questionLabel:`Question ${position} of ${safeLength}`,\n    studiedLabel:`Studied ${safeStudied} of ${safeTotal}`,\n    percentage:safeTotal?Math.round((safeStudied/safeTotal)*100):0\n  };\n}\n\nexport function buildPl300PartCardModel({part={},index={},records={}}={}){\n  const metrics=buildPl300PartStudyMetrics({part,index,records});\n  const complete=metrics.total>0&&metrics.studied>=metrics.total;\n  const actionLabel=metrics.studied===0?'Start Part':!complete?'Continue Part':metrics.needReview>0?'Review Mistakes':'Part Mastered ✓';\n  return {\n    total:metrics.total,\n    studied:metrics.studied,\n    firstPassAccuracy:metrics.firstPassAccuracy,\n    firstPassAccuracyLabel:metrics.scored?`${round1(metrics.firstPassAccuracy)}%`:'—',\n    mistakes:metrics.needReview,\n    mastered:metrics.masteredConcepts,\n    completionPercentage:metrics.total?Math.round((metrics.studied/metrics.total)*100):0,\n    complete,\n    actionLabel\n  };\n}\n\n"""
if 'export function pl300InteractionLabel' not in text:
    if anchor not in text:
        raise SystemExit('Part options anchor missing')
    text=text.replace(anchor,anchor+helpers,1)

pattern=r"export function buildPl300PartViewState\([\s\S]*?\n}\n\nexport function enrichPl300SourceQuestionsWithArabic"
replacement="""export function buildPl300PartViewState({parts=[],activePartId='all',records={},index={},totalAll=509,completedAll=0,activeFilter='all'}={}){\n  const list=Array.isArray(parts)?parts:[];\n  const activePart=list.find(part=>String(part?.id||'')===String(activePartId||'all'))||null;\n  const partTotal=activePart?.count||Math.max(0,num(totalAll,509));\n  const partCompleted=activePart\n    ?activePart.questionIds.filter(id=>Boolean(records?.[id])).length\n    :Math.max(0,Math.min(partTotal,num(completedAll)));\n  const activePartLabel=activePart?.label||'All 509 Questions';\n  const partOptionsHtml=buildPl300PartOptionsMarkup({parts:list,activePartId});\n  const partCatalogHtml=list.map(part=>{\n    const model=buildPl300PartCardModel({part,index,records});\n    const mastered=model.actionLabel==='Part Mastered ✓';\n    return `<article class=\"official-section-card pl300-study-part-card\" data-pl300-part-card=\"${htmlEscape(part?.id||'')}\"><div class=\"official-section-head\"><div><span class=\"eyebrow\">${htmlEscape(part?.domainTitle||'PL-300')}</span><h3>${htmlEscape(part?.sectionTitle||'Study Part')}</h3><p>Part ${num(part?.partNumber,1)} · ${model.total} Questions</p></div><span class=\"pool-chip ${mastered?'ready':'building'}\">${model.studied}/${model.total}</span></div><div class=\"pl300-study-part-metrics\"><span>Studied ${model.studied}/${model.total}</span><span>First-pass accuracy ${model.firstPassAccuracyLabel}</span><span>Mistakes ${model.mistakes}</span><span>Mastered ${model.mastered}</span></div><div class=\"progress-track\"><div class=\"progress-fill\" style=\"width:${model.completionPercentage}%\"></div></div><button type=\"button\" class=\"primary-btn wide\" data-pl300-part-select=\"${htmlEscape(part?.id||'')}\">${htmlEscape(model.actionLabel)}${mastered?'':' →'}</button></article>`;\n  }).join('');\n  const typeFilterLabel=activeFilter==='source-01'?'Source 01':activeFilter==='source-02'?'Source 02':activeFilter==='objective'?'Validated Objective':activeFilter==='checkpoint'?'Study Checkpoints':'All Types';\n  const filterLabel=activePart\n    ?`${activePart.domainTitle} → ${activePart.sectionTitle} · Part ${activePart.partNumber}${activeFilter!=='all'?` · ${typeFilterLabel}`:''}`\n    :(activeFilter==='all'?'All 509':typeFilterLabel);\n  return {activePart,partTotal,partCompleted,activePartLabel,partOptionsHtml,partCatalogHtml,showPartCatalog:!activePart,filterLabel};\n}\n\nexport function enrichPl300SourceQuestionsWithArabic"""
if 'pl300-study-part-metrics' not in text:
    text,count=re.subn(pattern,replacement,text,count=1)
    if count!=1:
        raise SystemExit('buildPl300PartViewState block not found')

# Extend review markup to accept the actual question model.
old_sig="""  typeLabel='',sourceLabel='',questionNumber='',occurrence=1,pageLabel='',domainId='',recordStatus='NOT STUDIED',\n"""
new_sig="""  question=null,typeLabel='',sourceLabel='',questionNumber='',occurrence=1,pageLabel='',domainId='',recordStatus='NOT STUDIED',\n"""
if old_sig in text:
    text=text.replace(old_sig,new_sig,1)
elif new_sig not in text:
    raise SystemExit('Review signature anchor missing')

text=text.replace("  const progress=length?((index+1)/length)*100:0;\n",'',1)
old_study="""  const studyPartProgress=studyPartTotal?(studyPartCompleted/studyPartTotal)*100:0;\n"""
if old_study in text:
    text=text.replace(old_study,"  const progressModel=buildPl300QuestionProgressModel({index,length,studied:studyPartCompleted,total:studyPartTotal});\n  const displayTypeLabel=question?pl300InteractionLabel(question):String(typeLabel||'').replace(/NON-RANKED/gi,'STUDY MODE');\n",1)
elif 'const progressModel=buildPl300QuestionProgressModel' not in text:
    raise SystemExit('Study progress anchor missing')

text=text.replace("      <div class=\"pl300-study-part-progress\"><div><i style=\"width:${studyPartProgress}%\"></i></div></div>\n",'',1)
old_progress="""    <section class=\"source-review-progress\"><span>${htmlEscape(filterLabel)}</span><strong>${index+1} / ${length}</strong><div><i style=\"width:${progress}%\"></i></div></section>\n"""
new_progress="""    <section class=\"source-review-progress\"><div class=\"source-review-progress-meta\"><span>${htmlEscape(progressModel.questionLabel)}</span><span>${htmlEscape(progressModel.studiedLabel)}</span></div><small>${htmlEscape(filterLabel)}</small><div><i style=\"width:${progressModel.percentage}%\"></i></div></section>\n"""
if old_progress in text:
    text=text.replace(old_progress,new_progress,1)
elif 'source-review-progress-meta' not in text:
    raise SystemExit('Source review progress anchor missing')

text=text.replace('${htmlEscape(typeLabel)}</span><h3>','${htmlEscape(displayTypeLabel)}</span><h3>',1)

path.write_text(text,encoding='utf-8')
print('V0.22.6 Task 3 study UX patch applied or already present.')
