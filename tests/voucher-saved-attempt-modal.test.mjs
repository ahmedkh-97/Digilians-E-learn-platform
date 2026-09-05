import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync(new URL('../assets/js/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('Voucher saved attempt uses accessible in-app modal instead of browser confirm',()=>{
  for(const id of ['voucherSavedAttemptModal','voucherSavedAttemptTitle','voucherSavedAttemptMeta','voucherSavedAttemptResumeBtn','voucherSavedAttemptNewBtn','voucherSavedAttemptCancelBtn']){
    assert.match(html,new RegExp(`id=["']${id}["']`));
  }
  assert.match(html,/id="voucherSavedAttemptDialog"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*aria-labelledby="voucherSavedAttemptTitle"/);
  assert.match(app,/function resolveVoucherSavedAttempt\(/);
  const launch=app.match(/function launchPreparedVoucherExam\([\s\S]*?\n}\n\nasync function prepareExam/)?.[0]||'';
  assert.match(launch,/resolveVoucherSavedAttempt/);
  assert.doesNotMatch(launch,/\bconfirm\s*\(/);
});
