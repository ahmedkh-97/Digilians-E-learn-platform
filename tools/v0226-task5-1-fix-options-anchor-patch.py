from pathlib import Path
p=Path(__file__).resolve().parent/'v0226-task5-smart-retry-patch.py'
text=p.read_text(encoding='utf-8')
text=text.replace("selected.length?'':'disabled'","chosen.length?'':'disabled'")
text=text.replace('correctIds.length','correctIds.size')
text=text.replace(' First-pass scoring is preserved.','')
p.write_text(text,encoding='utf-8')
print('Task 5 options action anchor aligned.')
