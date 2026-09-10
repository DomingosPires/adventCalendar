import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MOTIFS } from './seed-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'snippets', 'advent-motif.liquid'), 'utf8');

test('has a when-branch for all 10 motifs', () => {
  for (const m of MOTIFS) {
    assert.match(src, new RegExp(`when ['"]${m}['"]`), `missing ${m}`);
  }
});

test('falls back to wreath for unknown names', () => {
  assert.match(src, /assign\s+key\s*=\s*['"]wreath['"]/);
});

test('renders a single 100x100 svg and is aria-hidden', () => {
  assert.match(src, /viewBox=["']0 0 100 100["']/);
  assert.match(src, /aria-hidden=["']true["']/);
});
