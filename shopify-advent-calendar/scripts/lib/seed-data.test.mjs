import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadSeed, MOTIFS, parseArea } from './seed-data.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'metaobjects', 'seed');

test('there are exactly 25 day files with unique days 1..25', () => {
  const { days } = loadSeed(dir);
  assert.equal(days.length, 25);
  const nums = days.map((d) => Number(d.fields.day)).sort((a, b) => a - b);
  assert.deepEqual(nums, Array.from({ length: 25 }, (_, i) => i + 1));
});

test('every day has a known motif and a well-formed grid area', () => {
  const { days } = loadSeed(dir);
  for (const d of days) {
    assert.ok(MOTIFS.includes(d.fields.motif), `bad motif in ${d.handle}`);
    for (const key of ['grid_area', 'grid_area_mobile']) {
      const a = parseArea(d.fields[key]);
      assert.ok(a.row >= 1 && a.col >= 1 && a.rowSpan >= 1 && a.colSpan >= 1, `${d.handle}.${key}`);
    }
  }
});

test('desktop default areas tile the 7x8 grid exactly', () => {
  const { days } = loadSeed(dir);
  const seen = new Map();
  for (const d of days) {
    const { row, col, rowSpan, colSpan } = parseArea(d.fields.grid_area);
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        const k = `${r},${c}`;
        assert.ok(!seen.has(k), `overlap at ${k} (${d.handle} vs ${seen.get(k)})`);
        seen.set(k, d.handle);
      }
    }
  }
  assert.equal(seen.size, 56);
});

test('parent seed has the five colors and heading', () => {
  const { calendar } = loadSeed(dir);
  assert.equal(calendar.fields.heading, 'Calendário do Advento');
  for (const k of ['background_color', 'text_color', 'door_color', 'door_text_color', 'accent_color']) {
    assert.match(calendar.fields[k], /^#[0-9a-f]{6}$/i);
  }
});
