from pathlib import Path


def replace_once(path: Path, old: str, new: str, marker: str):
    text = path.read_text(encoding='utf-8')
    if marker in text:
        return False
    if old not in text:
        raise SystemExit(f'Expected anchor missing in {path}: {old[:80]!r}')
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


# Keep getVoucherAttempts exactly on its pre-V0.22.6 public contract.
storage = Path('assets/js/voucher-storage.js')
text = storage.read_text(encoding='utf-8')
expanded = """export function getVoucherAttempts(ownerId,examId,{storage,rankEligibleOnly=false,sizeMode=null}={}){\n  let attempts=getVoucherState(ownerId,{storage}).attempts;\n  if(examId)attempts=attempts.filter(x=>String(x?.examId)===String(examId));\n  if(rankEligibleOnly)attempts=attempts.filter(x=>x?.rankEligible===true);\n  if(sizeMode)attempts=attempts.filter(x=>String(x?.sizeMode||'')===String(sizeMode));\n  return attempts;\n}\n"""
original = """export function getVoucherAttempts(ownerId,examId,{storage}={}){\n  const attempts=getVoucherState(ownerId,{storage}).attempts;\n  if(!examId)return attempts;\n  return attempts.filter(x=>String(x?.examId)===String(examId));\n}\n"""
if expanded in text:
    storage.write_text(text.replace(expanded, original, 1), encoding='utf-8')
elif original not in text:
    raise SystemExit('Could not verify getVoucherAttempts contract')

backup = Path('assets/js/backup-restore.js')
text = backup.read_text(encoding='utf-8')

old_init = 'const target=out.owners[ownerId]||{attempts:[],seenByExam:{},sourcePractice:{},updatedAt:null};'
new_init = 'const target=out.owners[ownerId]||{attempts:[],seenByExam:{},sourcePractice:{},sourceLearningByExam:{},updatedAt:null};'
if old_init in text:
    text = text.replace(old_init, new_init, 1)
elif new_init not in text:
    raise SystemExit('mergeVoucher owner initializer anchor missing')

old_normalize = 'target.sourcePractice=target.sourcePractice&&typeof target.sourcePractice==="object"&&!Array.isArray(target.sourcePractice)?target.sourcePractice:{};'
new_normalize = old_normalize + '\n    target.sourceLearningByExam=target.sourceLearningByExam&&typeof target.sourceLearningByExam==="object"&&!Array.isArray(target.sourceLearningByExam)?target.sourceLearningByExam:{};'
if 'target.sourceLearningByExam=target.sourceLearningByExam&&typeof target.sourceLearningByExam' not in text:
    if old_normalize not in text:
        raise SystemExit('mergeVoucher sourcePractice normalize anchor missing')
    text = text.replace(old_normalize, new_normalize, 1)

practice_block = '''    for(const [questionId,practice] of Object.entries(record?.sourcePractice||{})){\n      const currentPractice=target.sourcePractice[questionId];\n      const curPracticeTime=Date.parse(currentPractice?.answeredAt||0)||0;\n      const inPracticeTime=Date.parse(practice?.answeredAt||0)||0;\n      if(!currentPractice || inPracticeTime>=curPracticeTime)target.sourcePractice[questionId]=practice;\n    }\n'''
learning_block = practice_block + '''    for(const [examId,learning] of Object.entries(record?.sourceLearningByExam||{})){\n      if(!learning||typeof learning!=="object"||Array.isArray(learning))continue;\n      const currentLearning=target.sourceLearningByExam[examId];\n      const curLearningTime=Date.parse(currentLearning?.updatedAt||0)||0;\n      const inLearningTime=Date.parse(learning?.updatedAt||0)||0;\n      if(!currentLearning || inLearningTime>=curLearningTime)target.sourceLearningByExam[examId]=structuredClone(learning);\n    }\n'''
if 'for(const [examId,learning] of Object.entries(record?.sourceLearningByExam||{}))' not in text:
    if practice_block not in text:
        raise SystemExit('mergeVoucher practice merge anchor missing')
    text = text.replace(practice_block, learning_block, 1)

backup.write_text(text, encoding='utf-8')
print('V0.22.6 Task 2 storage patch applied or already present.')
