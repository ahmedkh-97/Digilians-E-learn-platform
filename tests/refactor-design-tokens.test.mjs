import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const tokensPath=path.join(root,'assets/css/tokens.css');
const stylePath=path.join(root,'assets/css/style.css');
const indexPath=path.join(root,'index.html');
const quickCheckPath=path.join(root,'tools/quick-local-check.mjs');
const preDeployPath=path.join(root,'tools/pre-deploy-check.mjs');
const windowsBasicPath=path.join(root,'tools/windows-basic-check.ps1');

const expectedLight={
  '--bg':'#f6f9ff','--bg-2':'#eef4ff','--surface':'rgba(255,255,255,.82)','--surface-solid':'#ffffff',
  '--surface-soft':'#f4f7ff','--text':'#101827','--muted':'#657086','--line':'#dfe7f3','--line-strong':'#c8d5e8',
  '--primary':'#3268f2','--primary-strong':'#204bd8','--primary-soft':'#e9f0ff','--success':'#1eaa7a','--danger':'#e05561',
  '--shadow':'0 24px 70px rgba(37,58,98,.13)','--radius':'22px','--ease':'cubic-bezier(.2,.75,.25,1)'
};
const expectedDark={
  '--bg':'#07101f','--bg-2':'#0a1528','--surface':'rgba(14,27,49,.86)','--surface-solid':'#0f1c31',
  '--surface-soft':'#12223a','--text':'#eef5ff','--muted':'#94a4bb','--line':'#213551','--line-strong':'#2d4668',
  '--primary':'#75a1ff','--primary-strong':'#8eb2ff','--primary-soft':'#132c59','--success':'#64d7ad','--danger':'#ff8991',
  '--shadow':'0 24px 70px rgba(0,0,0,.28)'
};

function blockFor(css,selector){
  const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1]||'';
}

function assertVars(block,expected){
  for(const [name,value] of Object.entries(expected)){
    assert.match(block,new RegExp(`${name.replace(/-/g,'\\-')}\\s*:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*;`),`${name} must preserve its v0.20.37 value`);
  }
}

test('semantic theme tokens are isolated in a load-first stylesheet without changing their values',()=>{
  assert.equal(fs.existsSync(tokensPath),true,'assets/css/tokens.css must exist');
  const tokens=fs.readFileSync(tokensPath,'utf8');
  const style=fs.readFileSync(stylePath,'utf8');
  const index=fs.readFileSync(indexPath,'utf8');
  const quickCheck=fs.readFileSync(quickCheckPath,'utf8');
  const preDeploy=fs.readFileSync(preDeployPath,'utf8');
  const windowsBasic=fs.readFileSync(windowsBasicPath,'utf8');

  assertVars(blockFor(tokens,':root'),expectedLight);
  assertVars(blockFor(tokens,'[data-theme="dark"]'),expectedDark);
  assert.doesNotMatch(style,/^\s*:root\s*\{/,'style.css must not keep a duplicate root token block');
  assert.doesNotMatch(style,/^\s*\[data-theme="dark"\]\s*\{/,'style.css must not keep the top-level dark token block');

  const tokenLink=index.indexOf('assets/css/tokens.css');
  const styleLink=index.indexOf('assets/css/style.css');
  assert.ok(tokenLink>=0,'index.html must load tokens.css');
  assert.ok(styleLink>=0,'index.html must load style.css');
  assert.ok(tokenLink<styleLink,'tokens.css must load before style.css');
  assert.match(quickCheck,/assets\/css\/tokens\.css/,'Quick Local Check must require tokens.css');
  assert.match(preDeploy,/assets\/css\/tokens\.css/,'Full Pre-Deploy must require tokens.css');
  assert.match(windowsBasic,/assets\\css\\tokens\.css/,'Windows basic check must require tokens.css');
});
