import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const block = readFileSync(join(root, 'snippets', 'advent-richtext.liquid'), 'utf8');
const inline = readFileSync(join(root, 'snippets', 'advent-richtext-inline.liquid'), 'utf8');

test('block renderer walks the root node and covers paragraph/heading/list', () => {
  assert.match(block, /for block in node\.children/);
  assert.match(block, /when 'paragraph'/);
  assert.match(block, /when 'heading'/);
  assert.match(block, /when 'list'/);
  assert.match(block, /<li>/);
  assert.match(block, /render 'advent-richtext-inline'/);
});

test('inline renderer escapes text and supports bold/italic/link', () => {
  assert.match(inline, /when 'text'/);
  assert.match(inline, /node\.value \| escape/);
  assert.match(inline, /node\.bold/);
  assert.match(inline, /node\.italic/);
  assert.match(inline, /when 'link'/);
  assert.match(inline, /node\.url \| escape/);
});
