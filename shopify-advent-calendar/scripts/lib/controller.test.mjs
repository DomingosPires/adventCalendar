import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const js = readFileSync(join(root, 'assets', 'advent-calendar.js'), 'utf8');

test('uses the helper module, not its own copies', () => {
  assert.match(js, /AdventHelpers/);
  assert.match(js, /parseDayParam/);
  assert.match(js, /readOpened/);
  assert.match(js, /writeOpened/);
  assert.match(js, /buildCoverage/);
});

test('wires Shopify theme editor lifecycle events', () => {
  assert.match(js, /shopify:section:load/);
  assert.match(js, /shopify:section:unload/);
  assert.match(js, /data-advent-ready|dataset\.adventReady/);
});

test('honours reduced motion and the guides flag', () => {
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /data-guides|dataset\.guides/);
});

test('overlay: FLIP, focus trap, escape, scroll lock', () => {
  assert.match(js, /getBoundingClientRect/);
  assert.match(js, /\.animate\(/);
  assert.match(js, /Escape/);
  assert.match(js, /overflow/);
  assert.match(js, /key === 'Tab'|key === "Tab"/);
});

test('overlay restarts the reveal animation on every open', () => {
  assert.match(js, /classList\.remove\('advent__card--revealing'\)/);
  assert.match(js, /classList\.add\('advent__card--revealing'\)/);
  assert.match(js, /offsetWidth/);
});

test('copy feedback toggles a class + aria-label, not textContent', () => {
  assert.match(js, /classList\.add\('advent__code-hint--copied'\)/);
  assert.match(js, /classList\.remove\('advent__code-hint--copied'\)/);
  assert.match(js, /setAttribute\('aria-label', 'Código copiado'\)/);
  assert.match(js, /setAttribute\('aria-label', 'Copiar código'\)/);
});

test('storage key is namespaced by section id', () => {
  assert.match(js, /advent-calendar:opened:/);
});

test('is syntactically valid', async () => {
  await import('node:vm').then(({ Script }) => new Script(js));
});
