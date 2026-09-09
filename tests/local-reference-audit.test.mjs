import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {extractReferences,auditLocalReferences,runCli} from '../tools/local-reference-audit.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('extracts HTML, CSS, static imports and literal dynamic imports',()=>{
  assert.deepEqual(extractReferences({path:'index.html',text:'<script src="assets/js/app.js?v=0.22.7"></script><link href="assets/css/style.css?v=0.22.7">'}).map(x=>x.target),['assets/js/app.js?v=0.22.7','assets/css/style.css?v=0.22.7']);
  assert.equal(extractReferences({path:'assets/css/x.css',text:'a{background:url(../images/a.webp)}'})[0].target,'../images/a.webp');
  assert.equal(extractReferences({path:'assets/js/x.js',text:'import("./lazy.js?v=0.22.7")'})[0].target,'./lazy.js?v=0.22.7');
  assert.deepEqual(extractReferences({path:'x.mjs',text:'import x from "./a.js"; import "./b.js"; export {x} from "./c.js"'}).map(x=>x.target),['./a.js','./b.js','./c.js']);
  assert.deepEqual(extractReferences({path:'x.html',text:'<!-- <img src="fake.png"> --><img src="real.png">'}).map(x=>x.target),['real.png']);
  assert.deepEqual(extractReferences({path:'x.css',text:'/* url(fake.png) */ a{background:url(real.png)}'}).map(x=>x.target),['real.png']);
});

test('HTML raw-text and CSS inert tokens cannot invent dependencies',()=>{
  const html='<script src="real.js">const demo=`<img src="fake.png">`;</script><style>.x::after{content:"url(fake-2.png)"}</style><img src="real.png">';
  assert.deepEqual(extractReferences({path:'x.html',text:html}).map(x=>x.target),['real.js','real.png']);
  const css='/* url(comment.png) */ .a{content:"url(string.png)"}.b{background:url("real.png")}.c{mask:url(real-2.svg)}';
  assert.deepEqual(extractReferences({path:'x.css',text:css}).map(x=>x.target),['real.png','real-2.svg']);
});

test('HTML attribute reader ignores dependency-shaped text inside other attribute values',()=>{
  const html=`<!-- <img src="comment.png"> --><script data-demo='src="script-ghost.png"' src=boot.js>const x='<img href="raw.png">';</script><div data-demo='src="ghost.png"' title="poster='ghost-2.png'"><img src="real.png"><a href='real-2.html'><video poster=real-3.webp></video>`;
  assert.deepEqual(extractReferences({path:'x.html',text:html}).map(x=>x.target),['boot.js','real.png','real-2.html','real-3.webp']);
});

test('HTML RCDATA bodies are inert and recognized malformed raw end tags preserve later markup',()=>{
  const html='<textarea><img src="textarea-ghost.png"></textarea><title><a href="title-ghost.html"></title><script>const x=1;</ScRiPt data-x=">"><img src="real.png"><style>.x{}</style   data-y><a href="real.html">';
  assert.deepEqual(extractReferences({path:'x.html',text:html}).map(x=>x.target),['real.png','real.html']);
  assert.deepEqual(extractReferences({path:'x.html',text:'<script>const x="<img src=ghost>"'}),[],'unterminated raw text stays inert through EOF');
});

test('raw-text end tags only honor quotes in attribute values',()=>{
  const malformed='<script>ghost</script weird"><img src=real.png>';
  assert.deepEqual(extractReferences({path:'x.html',text:malformed}).map(x=>x.target),['real.png']);

  const quotedGreater='<script>ghost</ScRiPt data-x=">"><img src=after-quoted.png>';
  assert.deepEqual(extractReferences({path:'x.html',text:quotedGreater}).map(x=>x.target),['after-quoted.png']);
  assert.deepEqual(extractReferences({path:'x.html',text:'<script>ghost</scripture><img src=still-ghost.png>'}),[],'a longer tag name is not a script end tag');
  assert.deepEqual(extractReferences({path:'x.html',text:'<script>ghost</script data-x="unterminated>'}),[],'an unterminated quoted value keeps raw text inert through EOF');
});

test('duplicate HTML dependency attributes follow browser first-occurrence wins behavior',()=>{
  const html='<img SRC="first.png" src="ignored-missing.png"><a href=first.html HREF=ignored.html><video poster="first.webp" POSTER="ignored.webp">';
  assert.deepEqual(extractReferences({path:'x.html',text:html}).map(x=>x.target),['first.png','first.html','first.webp']);
});

test('missing unquoted dependency values stay empty and retain first-occurrence ownership',()=>{
  const html='<img src= SRC=ignored.png><a href= HREF=ignored.html><video poster= POSTER=ignored.webp>';
  assert.deepEqual(extractReferences({path:'x.html',text:html}),[
    {target:'',kind:'html-src'},
    {target:'',kind:'html-href'},
    {target:'',kind:'html-poster'}
  ]);
  assert.deepEqual(extractReferences({path:'x.html',text:'<img src=real.png data-x=next><a href=real.html>'}).map(x=>x.target),['real.png','real.html'],'ordinary unquoted values remain intact');
});

test('literal dynamic imports allow options and trailing commas but reject computed first args',()=>{
  const text='import("./options.json", {with:{type:"json"}}); import("./trailing.js",); import("./computed.js"+suffix); import("./unclosed.js", {with: true};';
  const refs=extractReferences({path:'x.js',text});
  assert.deepEqual(refs.filter(x=>!x.reviewOnly).map(x=>x.target),['./options.json','./trailing.js']);
  assert.equal(refs.filter(x=>x.reviewOnly).length,2);
});

test('regex statements after control headers stay inert while call-result division remains executable',()=>{
  const text='if(ok) /import\\(".\\/if-fake.js"\\)/; while(ok) /import\\(".\\/while-fake.js"\\)/; for(;ok;) /import\\(".\\/for-fake.js"\\)/; with(obj) /import\\(".\\/with-fake.js"\\)/; call() / import("./division-real.js"); import("./later-real.js");';
  assert.deepEqual(extractReferences({path:'x.js',text}).filter(x=>!x.reviewOnly).map(x=>x.target),['./division-real.js','./later-real.js']);
});

test('JavaScript specifier strings decode standard escapes and continuations',()=>{
  const text='import("\\x2e/a.js"); import("\\u002e/b.js"); import("\\u{2e}/c.js"); import("./line\\\ncontinued.js"); import("\\056/octal.js");';
  assert.deepEqual(extractReferences({path:'x.js',text}).map(x=>x.target),['./a.js','./b.js','./c.js','./linecontinued.js','./octal.js']);
});

test('protocol-relative references are external',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'local-ref-protocol-'));
  fs.writeFileSync(path.join(root,'VERSION.txt'),'1.0.0');
  fs.writeFileSync(path.join(root,'index.html'),'<script src="//cdn.example/app.js"></script>');
  assert.deepEqual(auditLocalReferences({root,paths:['index.html']}).missing,[]);
});

test('JS reader ignores inert import text and keeps executable template substitutions',()=>{
  const text=[
    '// import "./comment.js"',
    'const s="import(\\"./string.js\\")";',
    'const r=/import\\(".\\/regex.js"\\)/;',
    'const t=`import("./raw.js") ${(()=>{ const r=/[{}]/; return import("./inside.js"); })()} ${({a:/}/}).a ? import("./deep.js") : null}`;',
    'import("./later.js");'
  ].join('\n');
  assert.deepEqual(extractReferences({path:'x.js',text}).map(x=>x.target),['./inside.js','./deep.js','./later.js']);
});

test('regex versus division and member-shaped import tokens do not swallow or fake references',()=>{
  const text='i++ / 2; /import(".\\/fake-a.js")/; obj.import("./fake-b.js"); obj?.import("./fake-c.js"); obj.#import; obj["import"]("./fake-d.js"); obj.typeof / 2; ({...typeof /}/}); import("./real.js");';
  assert.deepEqual(extractReferences({path:'x.js',text}).map(x=>x.target),['./real.js']);
});

test('constructed dynamic imports are review-only',()=>{
  const refs=extractReferences({path:'x.js',text:'import(`./${name}.js`); import(base+"/x.js")'});
  assert.equal(refs.length,2);
  assert.ok(refs.every(ref=>ref.reviewOnly));
});

test('audit normalizes encoded traversal and backslashes and classifies symlinks',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'local-ref-'));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'local-ref-out-'));
  fs.mkdirSync(path.join(root,'assets'),{recursive:true});
  fs.writeFileSync(path.join(root,'VERSION.txt'),'1.2.3\n');
  fs.writeFileSync(path.join(root,'index.html'),'<script src="assets\\ok.js?v=1.2.3"></script><a href="%2e%2e/escape.js"></a><script src="assets/out.js"></script><script src="assets/broken.js"></script>');
  fs.writeFileSync(path.join(root,'assets','ok.js'),'');
  fs.writeFileSync(path.join(outside,'out.js'),'');
  fs.symlinkSync(path.join(outside,'out.js'),path.join(root,'assets','out.js'));
  fs.symlinkSync(path.join(root,'absent.js'),path.join(root,'assets','broken.js'));
  const report=auditLocalReferences({root,paths:['index.html']});
  assert.deepEqual(report.missing.map(x=>x.target),['assets/broken.js']);
  assert.deepEqual(report.outsideRoot.map(x=>x.target),['%2e%2e/escape.js','assets/out.js']);
});

test('broken symlinks escaping the root are outside while contained broken targets are missing',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'local-ref-broken-'));
  const outside=fs.mkdtempSync(path.join(os.tmpdir(),'local-ref-broken-out-'));
  fs.writeFileSync(path.join(root,'VERSION.txt'),'1.0.0');
  fs.symlinkSync(path.join(outside,'absent.js'),path.join(root,'escape.js'));
  fs.symlinkSync(path.join(root,'absent.js'),path.join(root,'contained.js'));
  fs.writeFileSync(path.join(root,'index.html'),'<script src="escape.js"></script><script src="contained.js"></script>');
  const report=auditLocalReferences({root,paths:['index.html']});
  assert.deepEqual(report.outsideRoot.map(x=>x.target),['escape.js']);
  assert.deepEqual(report.missing.map(x=>x.target),['contained.js']);
});

test('contained symlink loops are reported without crashing API or CLI',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'local-ref-loop-'));
  fs.writeFileSync(path.join(root,'VERSION.txt'),'1.0.0');
  fs.symlinkSync('loop-b.js',path.join(root,'loop-a.js'));
  fs.symlinkSync('loop-a.js',path.join(root,'loop-b.js'));
  fs.writeFileSync(path.join(root,'index.html'),'<script src="loop-a.js"></script>');
  const report=auditLocalReferences({root,paths:['index.html']});
  assert.deepEqual(report.missing.map(x=>x.target),['loop-a.js']);
  assert.deepEqual(report.outsideRoot,[]);
  assert.equal(runCli({root,paths:['index.html']}).exitCode,1);
});

test('output ordering uses a fixed code-point comparator',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'local-ref-order-'));
  fs.writeFileSync(path.join(root,'VERSION.txt'),'1.0.0');
  fs.writeFileSync(path.join(root,'x.html'),'<img src="z"><img src="A"><img src="a">');
  assert.deepEqual(auditLocalReferences({root,paths:['x.html']}).missing.map(x=>x.target),['A','a','z']);
});

test('CLI is read-only and exits non-zero only for confirmed failures',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'local-ref-cli-'));
  fs.writeFileSync(path.join(root,'VERSION.txt'),'1.0.0');
  fs.writeFileSync(path.join(root,'index.html'),'<script src="missing.js"></script>');
  const before=fs.readdirSync(root);
  const result=runCli({root,paths:['index.html']});
  assert.equal(result.exitCode,1);
  assert.deepEqual(fs.readdirSync(root),before);
});

test('current repository has no confirmed missing or outside-root literal runtime dependency',()=>{
  const report=auditLocalReferences({root:ROOT});
  assert.deepEqual(report.missing,[]);
  assert.deepEqual(report.outsideRoot,[]);
  assert.ok(Array.isArray(report.currentReleaseQueryMismatches));
});
