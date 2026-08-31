"""Read-only Excel Week 2 production sanity report retained for local release compatibility."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
status=json.loads((ROOT/'data/excel-intake/week-status.json').read_text(encoding='utf-8'))
week2=next((w for w in status.get('weeks',[]) if w.get('week')==2),None)
if not week2:
    raise SystemExit('FAIL: Excel Week 2 status not found')
print('Excel Week 2 production is already built; this support script is read-only.')
print(f"Sources: {week2.get('sourceCount')} | Study sections: {week2.get('studyProduction',{}).get('sections')} | Practice questions: {week2.get('practiceProduction',{}).get('questionCount')}")
