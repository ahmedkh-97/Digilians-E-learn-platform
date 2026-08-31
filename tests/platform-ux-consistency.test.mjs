import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const app=read('assets/js/app.js');
const css=read('assets/css/style.css');
const html=read('index.html');
const predeploy=read('tools/pre-deploy-check.mjs');

test('full track exam navigation returns to the selected learning track',()=>{
  assert.match(app,/function\s+returnToSelectedTrack\s*\(/,'track return helper must exist');
  assert.match(app,/category\s*===\s*["']Track Exam["']/,'track exam must be detected explicitly');
  assert.match(app,/backToLibraryBtn[\s\S]{0,1400}returnToSelectedTrack/,'setup back action must return track exams to their track');
  assert.match(app,/exitExamBtn[\s\S]{0,1800}returnToSelectedTrack/,'exam exit must return track exams to their track');
  assert.match(app,/nextExamBtn[\s\S]{0,2200}returnToSelectedTrack/,'result next action must return track exams to their track');
  assert.match(app,/reviewHomeBtn[\s\S]{0,1400}returnToSelectedTrack/,'review home action must return track exams to their track');
});

test('track exam setup labels its back action with the selected track',()=>{
  assert.match(app,/backToLibraryBtn["']\)\.textContent\s*=\s*isStandardTrackExam\(\)/,'setup must update the back label for track exams');
});

test('keyboard users receive a global focus-visible indicator',()=>{
  assert.match(css,/:where\([^}]*button[^}]*a\[href\][^}]*\):focus-visible/,'global interactive focus-visible rule is required');
  assert.match(css,/outline:\s*3px\s+solid\s+var\(--primary\)/,'focus indicator must be visually explicit');
});

test('mark-for-review uses dark-theme warning contrast instead of light-only brown text',()=>{
  assert.match(css,/\[data-theme="dark"\]\s+\.mark-review-btn[\s\S]{0,260}color:\s*var\(--warning\)/,'dark mark button must use the dark-theme warning token');
  assert.match(css,/\[data-theme="dark"\]\s+\.mark-review-btn\.marked[\s\S]{0,260}color:\s*var\(--warning\)/,'dark marked state must keep accessible warning text');
});

test('exam feedback and answered progress announce dynamic changes accessibly',()=>{
  assert.match(html,/id="answeredCount"[^>]*aria-live="polite"/,'answered count must be a polite live region');
  assert.match(html,/id="instantFeedback"[^>]*aria-live="polite"/,'instant feedback must be a polite live region');
});


test('pre-deploy permanently runs the UX consistency regression gate',()=>{
  assert.match(predeploy,/platform-ux-consistency\.test\.mjs/,'pre-deploy must run the UX consistency regression');
});
