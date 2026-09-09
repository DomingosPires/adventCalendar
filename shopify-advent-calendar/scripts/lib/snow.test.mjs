import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'snippets', 'advent-snow.liquid'), 'utf8');

test('loops to build flake spans and is aria-hidden', () => {
  assert.match(src, /aria-hidden=["']true["']/);
  assert.match(src, /\(1\.\.[a-z_]+\)|\(1\.\.\d+\)/);
  assert.match(src, /advent__snow/);
});
