import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadSeed, parseArea } from './seed-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'snippets', 'advent-grid-defaults.liquid'), 'utf8');
const { days } = loadSeed(join(root, 'metaobjects', 'seed'));

test('snippet contains a when-branch for every day 1..25', () => {
  for (let d = 1; d <= 25; d++) {
    assert.match(src, new RegExp(`when ${d}\\b`), `missing when ${d}`);
  }
});

test('each seed grid_area string appears literally in the snippet', () => {
  for (const day of days) {
    assert.ok(src.includes(day.fields.grid_area), `desktop area for day ${day.fields.day} missing`);
    assert.ok(src.includes(day.fields.grid_area_mobile), `mobile area for day ${day.fields.day} missing`);
  }
});

test('every literal area in the snippet is well-formed', () => {
  const matches = src.match(/\d+ \/ \d+ \/ span \d+ \/ span \d+/g) || [];
  assert.ok(matches.length >= 40);
  for (const m of matches) {
    const a = parseArea(m);
    assert.ok(a.row >= 1 && a.col >= 1 && a.rowSpan >= 1 && a.colSpan >= 1);
  }
});
