import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'snippets', 'advent-door.liquid'), 'utf8');

test('resolves grid area with override then default fallback for both modes', () => {
  assert.match(src, /day_entry\.grid_area\.value/);
  assert.match(src, /day_entry\.grid_area_mobile\.value/);
  assert.match(src, /render 'advent-grid-defaults'.*mode: 'desktop'/s);
  assert.match(src, /render 'advent-grid-defaults'.*mode: 'mobile'/s);
});

test('derives state from current_day', () => {
  assert.match(src, /current_day/);
  assert.match(src, /data-state=/);
  assert.match(src, /['"]today['"]/);
  assert.match(src, /['"]past['"]/);
  assert.match(src, /['"]locked['"]/);
});

test('is a button carrying day + area custom props + motif', () => {
  assert.match(src, /<button[^>]+class="advent__door"/);
  assert.match(src, /data-day="{{ *n *}}"|data-day="{{n}}"/);
  assert.match(src, /--area:/);
  assert.match(src, /--area-m:/);
  assert.match(src, /render 'advent-motif'/);
  assert.match(src, /aria-label/);
});
