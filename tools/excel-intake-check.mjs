import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readJson=rel=>JSON.parse(fs.readFileSync(path.join(ROOT,rel),'utf8'));
const fail=message=>{throw new Error(message)};

const manifest=readJson('data/excel-intake/source-manifest.json');
const status=readJson('data/excel-intake/week-status.json');

if(manifest.sources?.length!==29) fail(`Excel source manifest expected 29 sources, found ${manifest.sources?.length??0}`);
const weekCounts=Object.fromEntries([1,2,3].map(week=>[week,manifest.sources.filter(source=>source.week===week).length]));
if(JSON.stringify(weekCounts)!==JSON.stringify({1:9,2:10,3:10})) fail(`Excel week source counts mismatch: ${JSON.stringify(weekCounts)}`);

const weeks=status.weeks||[];
if(weeks.length!==3) fail(`Expected 3 Excel weeks, found ${weeks.length}`);
for(const week of weeks){
  if(!week.studyReady) fail(`Excel Week ${week.week} Study must be ready`);
  if(!week.practiceReady) fail(`Excel Week ${week.week} Practice must be ready`);
  if(week.examReady) fail(`Excel Week ${week.week} Exam must remain locked`);
}
if(!status.trackExam?.ready) fail('Excel Full Track Exam must be ready');
if(status.trackExam?.examId!=='data-analysis-excel-track-v1') fail(`Excel Full Track Exam id mismatch: ${status.trackExam?.examId||'missing'}`);
if(status.trackExam?.bankQuestions!==228 || status.trackExam?.formQuestions!==50) fail('Excel Full Track Exam counts mismatch');
if(status.trackExam?.minutes!==60 || status.trackExam?.ranked!==true) fail('Excel Full Track Exam runtime profile mismatch');

console.log('PASS Excel Intake: 29 sources / 3 weeks / Study + Practice ready / Week Exams locked / Full Track Exam ready');
