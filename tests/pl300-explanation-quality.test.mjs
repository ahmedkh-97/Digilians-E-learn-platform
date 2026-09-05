import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bank = JSON.parse(fs.readFileSync(new URL('../voucher/tracks/data-analysis/microsoft-pl-300/draft-master-bank.json', import.meta.url), 'utf8'));
const ready = bank.questions.filter(q => q.productionReady === true);
const sourceKey = q => `${q.canonicalSourceRef?.sourceId}:${q.canonicalSourceRef?.questionNumber}`;
const hasArabic = text => /[\u0600-\u06FF]/.test(String(text || ''));

test('every production PL-300 explanation is concept-specific Arabic, never a generic fallback', () => {
  const bad = ready.filter(q => {
    const template = String(q.verification?.explanationTemplate || '');
    const summary = String(q.deepExplanation?.summary || '');
    return !template || template.startsWith('fallback-') || summary.length < 180 || !hasArabic(summary);
  });
  assert.deepEqual(bad.map(q => `${sourceKey(q)}:${q.verification?.explanationTemplate || 'missing'}`), []);
});

test('every production answer option has a substantive Arabic reason', () => {
  const bad = [];
  for (const q of ready) {
    const reasons = q.deepExplanation?.options || {};
    for (const option of q.options || []) {
      const reason = String(reasons[String(option.id)] || '');
      if (reason.length < 45 || !hasArabic(reason)) bad.push(`${sourceKey(q)}:${option.id}`);
    }
  }
  assert.deepEqual(bad, []);
});
