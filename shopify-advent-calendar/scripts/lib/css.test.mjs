import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = readFileSync(join(root, 'assets', 'advent-calendar.css'), 'utf8');

test('grid uses the section custom properties', () => {
  assert.match(css, /grid-template-columns:\s*repeat\(var\(--advent-cols\)/);
  assert.match(css, /grid-template-rows:\s*repeat\(var\(--advent-rows\)/);
  assert.match(css, /\.advent__door\s*{[^}]*grid-area:\s*var\(--area\)/s);
});

test('has a mobile breakpoint at 700px using the -m custom props', () => {
  assert.match(css, /@media[^{]*max-width:\s*700px/);
  assert.match(css, /var\(--advent-cols-m\)/);
});

test('maps motif vars and honours reduced motion', () => {
  assert.match(css, /--motif-ink:/);
  assert.match(css, /--motif-accent:/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('styles the four door states and the guide overlay', () => {
  for (const s of ['locked', 'today', 'past', 'opened']) {
    assert.match(css, new RegExp(`\\[data-state="${s}"\\]`), `no rule for ${s}`);
  }
  assert.match(css, /\.advent__guide/);
  assert.match(css, /\.advent__scrim/);
  assert.match(css, /\.advent__card/);
});
