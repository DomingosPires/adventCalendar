import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'sections', 'advent-calendar.liquid'), 'utf8');
const schemaMatch = src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);

test('has a valid JSON schema with the required settings', () => {
  assert.ok(schemaMatch, 'no schema block');
  const schema = JSON.parse(schemaMatch[1]);
  const ids = schema.settings.filter((s) => s.id).map((s) => s.id);
  for (const id of ['calendar_entry', 'calendar_handle', 'grid_columns', 'grid_rows',
    'grid_columns_mobile', 'grid_rows_mobile', 'grid_gap', 'layout_guides', 'preview_day',
    'bg_override', 'text_override', 'door_override', 'door_text_override', 'accent_override']) {
    assert.ok(ids.includes(id), `missing setting ${id}`);
  }
  const entry = schema.settings.find((s) => s.id === 'calendar_entry');
  assert.equal(entry.type, 'metaobject');
  assert.equal(entry.metaobject_type, 'advent_calendar');
  assert.equal(schema.settings.find((s) => s.id === 'grid_columns').default, 7);
  assert.equal(schema.settings.find((s) => s.id === 'grid_rows').default, 8);
  assert.ok(schema.presets && schema.presets.length >= 1);
});

test('computes current_day with the December guard and preview override', () => {
  assert.match(src, /preview_day/);
  assert.match(src, /date:\s*['"]%m['"]/);        // month guard
  assert.match(src, /start_date/);
  assert.match(src, /assign current_day/);
});

test('emits colour vars with the documented fallback chain and defaults', () => {
  for (const [setting, dflt] of [
    ['bg_override', '#1c1613'], ['text_override', '#f6ede0'], ['door_override', '#2a3d35'],
    ['door_text_override', '#cfe3d4'], ['accent_override', '#c9a24b'],
  ]) {
    assert.ok(src.includes(setting), `missing ${setting}`);
    assert.ok(src.includes(dflt), `missing default ${dflt}`);
  }
  assert.match(src, /--advent-cols:/);
  assert.match(src, /data-current-day=/);
  assert.match(src, /advent-calendar\.js/);
  assert.match(src, /advent-calendar\.helpers\.js/);
});
