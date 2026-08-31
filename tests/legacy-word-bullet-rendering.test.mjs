import test from 'node:test';
import assert from 'node:assert/strict';
import {sanitizeDisplayText,renderTechnicalQuestion} from '../assets/js/technical-content.js';

test('legacy Word/Wingdings bullet U+F0B7 is normalized to a standard bullet for display',()=>{
  const source='KPIs:\n\uF0B7   Total Revenue\n\uF0B7   Profit';
  const rendered=sanitizeDisplayText(source);
  assert.equal(rendered,'KPIs:\n•   Total Revenue\n•   Profit');
  assert.equal(rendered.includes('\uF0B7'),false);
});

test('question renderer never emits the legacy private-use bullet glyph',()=>{
  const source='A CEO wants to see KPIs:\n\uF0B7   Total Revenue\n\uF0B7   Total Orders\nWhich visualization is most appropriate?';
  const html=renderTechnicalQuestion(source,{trackId:'looker',topic:'Dashboard Design & Navigation'});
  assert.equal(html.includes('\uF0B7'),false);
  assert.equal(html.includes('•   Total Revenue'),true);
  assert.equal(html.includes('•   Total Orders'),true);
});

test('technical code newlines and code characters remain unchanged by display sanitation',()=>{
  const sql='SELECT Revenue\nFROM Sales\nWHERE Revenue > 0;';
  assert.equal(sanitizeDisplayText(sql),sql);
});
