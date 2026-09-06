from pathlib import Path
import json
import re

ROOT=Path(__file__).resolve().parents[1]
VERSION='0.22.6'
PREVIOUS='0.22.5'

# Single product/runtime identity. Do not touch historical docs or old changelog entries.
(ROOT/'VERSION.txt').write_text(VERSION+'\n',encoding='utf-8')

for relative in [
    'index.html',
    'assets/js/app.js',
    'assets/js/storage.js',
    'assets/js/analytics.js',
    'assets/js/update-manager.js',
    'assets/js/voucher-source-practice-native.js',
]:
    path=ROOT/relative
    text=path.read_text(encoding='utf-8')
    text=text.replace(PREVIOUS,VERSION)
    if relative=='assets/js/voucher-source-practice-native.js':
        text=re.sub(r"source-practice-native\.css\?v=\d+\.\d+\.\d+",f"source-practice-native.css?v={VERSION}",text)
        text=re.sub(r"pl300-source-practice-selection-guard\.js\?v=\d+\.\d+\.\d+",f"pl300-source-practice-selection-guard.js?v={VERSION}",text)
    if relative=='assets/js/update-manager.js':
        text=text.replace('PL-300 Runtime Cache & Freeze Hotfix','PL-300 Learning UX & Smart Review')
    path.write_text(text,encoding='utf-8')

# Keep the legacy cache-bust regression test protecting the current runtime identity.
legacy_test=ROOT/'tests/v0225-pl300-cache-bust.test.mjs'
legacy=legacy_test.read_text(encoding='utf-8').replace('V0.22.5','V0.22.6').replace('0.22.5','0.22.6')
legacy_test.write_text(legacy,encoding='utf-8')

# Release notes: prepend only the new release; preserve V0.22.5 history unchanged.
changelog_path=ROOT/'data/changelog.json'
changelog=json.loads(changelog_path.read_text(encoding='utf-8'))
release={
    'version':VERSION,
    'title':'PL-300 Learning UX & Smart Review',
    'date':'2026-09-06',
    'type':'learning',
    'summary':'Upgrades the PL-300 509-question ranked journey into a clearer source-backed learning flow with deliberate recovery, delayed retry, and End-of-Part Review while preserving immutable first-pass scoring and source fidelity.',
    'highlights':[
        'Repairs and protects source-backed native choices behind the fresh V0.22.6 cache identity so browsers load the current learner controls instead of stale modules.',
        'Clarifies part labels, studied progress, and navigation: unanswered questions use Skip for now, while saved answers use Next without rewriting first-pass history.',
        'Separates Original source view reference evidence from the Answer Area and keeps every interaction fail-closed when explicit source-backed choices do not exist.',
        'Adds delayed retry after four distinct in-part question transitions plus End-of-Part Review metrics for Studied, First-pass correct, Recovered, and Need review.',
        'Part cards resume at the first unstudied question, route completed weak parts into review, and expose Continue only after the part is mastered.',
        'Arabic explanations and learning tips remain source-backed only; no synthetic distractors, rationales, or answer content are introduced.'
    ]
}
changelog['latest']=VERSION
changelog['releases']=[release,*[item for item in changelog.get('releases',[]) if item.get('version')!=VERSION]]
changelog_path.write_text(json.dumps(changelog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# Permanent branch/PR validation. This workflow validates; it never mutates release files.
workflow="""name: V0.22.6 PL-300 Learning UX Validation

on:
  push:
    branches:
      - feature/v0.22.6-pl300-learning-ux
  pull_request:
    branches:
      - main

permissions:
  contents: read

jobs:
  release-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Focused V0.22.6 learning UX gate
        run: >-
          node --test
          tests/v0226-pl300-source-practice-fidelity.test.mjs
          tests/v0226-pl300-native-choice-fidelity.test.mjs
          tests/v0226-pl300-learning-loop.test.mjs
          tests/v0226-pl300-learning-storage.test.mjs
          tests/v0226-pl300-study-ux.test.mjs
          tests/v0226-pl300-answer-area.test.mjs
          tests/v0226-pl300-learning-controller.test.mjs
          tests/v0226-pl300-release-identity.test.mjs
          tests/v0226-pl300-ci-contract.test.mjs
          tests/v0224-pl300-preselect-dropdowns.test.mjs
          tests/pl300-source-answer-lock.test.mjs
          tests/pl300-source-practice-selection-guard.test.mjs
          tests/pl300-source-practice-freeze-regression.test.mjs

      - name: Release identity and startup performance gate
        run: node --test tests/v0226-pl300-release-identity.test.mjs tests/v0226-pl300-ci-contract.test.mjs tests/release-identity-gate.test.mjs tests/platform-ux-performance.test.mjs

      - name: Exhaustive PL-300 509 audit gate
        run: node --test tests/v0223-pl300-native-arabic-regression.test.mjs

      - name: PL-300 full-ranked index check
        run: node tools/pl300-full-ranked-index.mjs --check

      - name: Full Node regression
        run: node --test tests/*.test.mjs

      - name: Pre-deploy gate
        run: node tools/pre-deploy-check.mjs
"""
(ROOT/'.github/workflows/v0223-branch-ci.yml').write_text(workflow,encoding='utf-8')

print('V0.22.6 release/cache identity and permanent CI patch applied.')
