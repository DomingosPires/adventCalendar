import test from 'node:test';
import assert from 'node:assert/strict';
import { toDefinitionInput } from './definition-input.mjs';

const day = {
  type: 'advent_calendar_day', name: 'Advent Calendar Day', displayNameKey: 'title',
  access: { storefront: 'PUBLIC_READ' }, capabilities: { publishable: { enabled: true } },
  fieldDefinitions: [
    { key: 'day', name: 'Day', type: 'number_integer', required: true,
      validations: [{ name: 'min', value: '1' }] },
    { key: 'title', name: 'Title', type: 'single_line_text_field' },
  ],
};

test('maps a plain definition unchanged', () => {
  const input = toDefinitionInput(day);
  assert.equal(input.type, 'advent_calendar_day');
  assert.equal(input.access.storefront, 'PUBLIC_READ');
  assert.equal(input.fieldDefinitions[0].validations[0].value, '1');
  assert.equal(input.fieldDefinitions[1].required, false);
});

test('resolves @ref: validation values from refIds', () => {
  const cal = {
    type: 'advent_calendar', name: 'Advent Calendar',
    fieldDefinitions: [
      { key: 'days', name: 'Days', type: 'list.metaobject_reference', required: true,
        validations: [{ name: 'metaobject_definition', value: '@ref:advent_calendar_day' }] },
    ],
  };
  const input = toDefinitionInput(cal, { advent_calendar_day: 'gid://shopify/MetaobjectDefinition/99' });
  assert.equal(input.fieldDefinitions[0].validations[0].value, 'gid://shopify/MetaobjectDefinition/99');
});

test('throws when an @ref cannot be resolved', () => {
  const cal = { type: 'x', name: 'X', fieldDefinitions: [
    { key: 'days', name: 'D', type: 'list.metaobject_reference',
      validations: [{ name: 'metaobject_definition', value: '@ref:missing' }] },
  ] };
  assert.throws(() => toDefinitionInput(cal, {}), /missing/);
});
