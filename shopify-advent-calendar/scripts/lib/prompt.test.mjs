import test from 'node:test';
import assert from 'node:assert/strict';
import { yes } from './prompt.mjs';

test('yes() — blank returns the default', () => {
  assert.equal(yes('', true), true);
  assert.equal(yes('  ', false), false);
});

test('yes() — s / sim / y / yes are affirmative, anything else is not', () => {
  for (const a of ['s', 'S', 'sim', 'SIM', 'y', 'Yes']) assert.equal(yes(a, false), true);
  for (const a of ['n', 'não', 'nope', 'x', '0']) assert.equal(yes(a, true), false);
});
