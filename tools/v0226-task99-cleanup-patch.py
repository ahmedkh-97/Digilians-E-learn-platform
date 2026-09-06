from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
removed=[]

for relative in [
    'docs/superpowers/specs/2026-09-06-pl300-v0226-learning-ux-design.md',
    'docs/superpowers/plans/2026-09-06-pl300-v0226-learning-ux.md',
]:
    path=ROOT/relative
    if path.exists():
        path.unlink()
        removed.append(relative)

for path in sorted((ROOT/'tools').glob('v0226-task*-patch.py')):
    relative=str(path.relative_to(ROOT))
    path.unlink()
    removed.append(relative)

print(f'V0.22.6 temporary scaffolding cleanup removed {len(removed)} files.')
for relative in removed:
    print(f' - {relative}')
