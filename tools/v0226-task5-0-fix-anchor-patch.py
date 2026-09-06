from pathlib import Path
p=Path(__file__).resolve().parent/'v0226-task5-smart-retry-patch.py'
text=p.read_text(encoding='utf-8')
old="export function buildSourcePracticeOptionsMarkup({question,record,selected=[],locked=false,retrying=false,renderRichText=value=>htmlEscape(value)}={}){"
new="export function buildSourcePracticeOptionsMarkup({question={},record=null,selected=[],locked=false,retrying=false,renderRichText=value=>htmlEscape(value)}={}){"
if old in text:
    text=text.replace(old,new,1)
elif new not in text:
    raise SystemExit('Task 5 options signature anchor missing')
p.write_text(text,encoding='utf-8')
print('Task 5 patch anchor aligned.')
