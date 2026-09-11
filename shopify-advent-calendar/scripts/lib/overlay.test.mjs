import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'snippets', 'advent-overlay.liquid'), 'utf8');

test('is a per-day template keyed by day number', () => {
  assert.match(src, /<template[^>]+class="advent__tpl"[^>]+data-day="{{ *[a-z_]+ *}}"/);
});

test('outputs title, rich-text message, and conditional image / code / cta', () => {
  assert.match(src, /day_entry\.title\.value/);
  // metaobject fields are never auto-converted to HTML (unlike resource
  // metafields) — hand the parsed AST (.value) to the manual renderer.
  assert.match(src, /render 'advent-richtext', node: day_entry\.message\.value/);
  assert.match(src, /day_entry\.image/);
  assert.match(src, /day_entry\.code\.value != blank/);
  assert.match(src, /day_entry\.link_url\.value != blank/);
  assert.match(src, /day_entry\.link_label\.value/);
});

test('carries the cover leaf that lifts away on open', () => {
  assert.match(src, /class="advent__card-leaf"/);
  assert.match(src, /class="advent__card-shine"/);
});

test('code button is icon-only, with an accessible label instead of text', () => {
  assert.match(src, /aria-label="Copiar código"/);
  assert.doesNotMatch(src, />\s*copiar\s*</i);
  assert.match(src, /advent__code-icon--copy/);
  assert.match(src, /advent__code-icon--check/);
});
