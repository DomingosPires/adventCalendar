import test from 'node:test';
import assert from 'node:assert/strict';
import { toUpsertInput, buildParentFields } from './seed-input.mjs';

test('toUpsertInput shapes a day entry', () => {
  const input = toUpsertInput({ handle: 'advent-day-03', fields: { day: '3', title: 'X' } }, 'advent_calendar_day');
  assert.deepEqual(input.handle, { type: 'advent_calendar_day', handle: 'advent-day-03' });
  assert.deepEqual(input.metaobject.fields, [
    { key: 'day', value: '3' }, { key: 'title', value: 'X' },
  ]);
  assert.equal(input.metaobject.capabilities.publishable.status, 'ACTIVE');
});

test('toUpsertInput wraps the message field as rich-text AST JSON', () => {
  const input = toUpsertInput({ handle: 'advent-day-01', fields: { day: '1', message: 'Hello world.' } }, 'advent_calendar_day');
  const msg = input.metaobject.fields.find((f) => f.key === 'message');
  const ast = JSON.parse(msg.value);
  assert.equal(ast.type, 'root');
  assert.equal(ast.children[0].children[0].value, 'Hello world.');
});

test('buildParentFields appends days as a JSON array of GIDs', () => {
  const fields = buildParentFields({ heading: 'H' }, ['gid://shopify/Metaobject/1', 'gid://shopify/Metaobject/2']);
  assert.deepEqual(fields.find((f) => f.key === 'heading'), { key: 'heading', value: 'H' });
  assert.equal(
    fields.find((f) => f.key === 'days').value,
    '["gid://shopify/Metaobject/1","gid://shopify/Metaobject/2"]',
  );
});
