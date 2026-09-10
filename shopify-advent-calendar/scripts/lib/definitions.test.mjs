import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadDefinitions, DAY_FIELD_KEYS, CALENDAR_FIELD_KEYS } from './definitions.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'metaobjects');

test('day definition has the expected shape', () => {
  const { day } = loadDefinitions(dir);
  assert.equal(day.type, 'advent_calendar_day');
  assert.equal(day.access.storefront, 'PUBLIC_READ');
  assert.equal(day.capabilities.publishable.enabled, true);
  assert.deepEqual(day.fieldDefinitions.map((f) => f.key), DAY_FIELD_KEYS);
  const motif = day.fieldDefinitions.find((f) => f.key === 'motif');
  assert.match(motif.validations[0].value, /"wreath".*"candycane"/);
});

test('calendar definition references the day definition', () => {
  const { calendar } = loadDefinitions(dir);
  assert.equal(calendar.type, 'advent_calendar');
  assert.deepEqual(calendar.fieldDefinitions.map((f) => f.key), CALENDAR_FIELD_KEYS);
  const days = calendar.fieldDefinitions.find((f) => f.key === 'days');
  assert.equal(days.type, 'list.metaobject_reference');
  assert.equal(days.validations[0].value, '@ref:advent_calendar_day');
});

test('calendar background_type is a three-choice select', () => {
  const { calendar } = loadDefinitions(dir);
  const bgType = calendar.fieldDefinitions.find((f) => f.key === 'background_type');
  assert.equal(bgType.type, 'single_line_text_field');
  assert.equal(bgType.validations[0].name, 'choices');
  assert.deepEqual(JSON.parse(bgType.validations[0].value), ['solid', 'gradient', 'image']);
  for (const k of ['gradient_color_start', 'gradient_color_end', 'gradient_angle',
    'background_image', 'background_image_dim']) {
    assert.ok(calendar.fieldDefinitions.some((f) => f.key === k), `missing ${k}`);
  }
});
