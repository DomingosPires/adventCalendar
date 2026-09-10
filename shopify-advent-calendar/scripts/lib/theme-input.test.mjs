import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeThemeId, parseArgs, mergeLocaleNoEntry, pageTemplate, pageInput,
} from './theme-input.mjs';

const NO_ENTRY = 'Select an Advent calendar entry in the section settings.';

test('normalizeThemeId accepts a number, a numeric string, or a GID', () => {
  assert.equal(normalizeThemeId(123), 123);
  assert.equal(normalizeThemeId('123'), 123);
  assert.equal(normalizeThemeId('gid://shopify/OnlineStoreTheme/98765'), 98765);
  assert.throws(() => normalizeThemeId('nope'), /Invalid theme id/);
});

test('parseArgs reads --theme and --theme=', () => {
  assert.deepEqual(parseArgs(['--theme', '111']), { theme: 111 });
  assert.deepEqual(parseArgs(['--theme=gid://shopify/OnlineStoreTheme/222']), { theme: 222 });
  assert.throws(() => parseArgs([]), /Pass the target theme id/);
});

test('mergeLocaleNoEntry adds the key to an empty locale', () => {
  const merged = JSON.parse(mergeLocaleNoEntry(''));
  assert.deepEqual(merged, { sections: { advent_calendar: { no_entry: NO_ENTRY } } });
});

test('mergeLocaleNoEntry preserves every other key', () => {
  const existing = JSON.stringify({
    general: { hello: 'Olá' },
    sections: { header: { menu: 'Menu' }, advent_calendar: { stale: 'x' } },
  });
  const merged = JSON.parse(mergeLocaleNoEntry(existing));
  assert.equal(merged.general.hello, 'Olá');
  assert.equal(merged.sections.header.menu, 'Menu');
  assert.equal(merged.sections.advent_calendar.stale, 'x');
  assert.equal(merged.sections.advent_calendar.no_entry, NO_ENTRY);
});

test('mergeLocaleNoEntry treats malformed / non-object input as empty', () => {
  assert.deepEqual(JSON.parse(mergeLocaleNoEntry('{not json')),
    { sections: { advent_calendar: { no_entry: NO_ENTRY } } });
  assert.deepEqual(JSON.parse(mergeLocaleNoEntry('[1,2,3]')),
    { sections: { advent_calendar: { no_entry: NO_ENTRY } } });
});

test('pageTemplate wires the section via calendar_handle', () => {
  const t = pageTemplate();
  assert.deepEqual(t.order, ['advent_calendar']);
  assert.equal(t.sections.advent_calendar.type, 'advent-calendar');
  assert.equal(t.sections.advent_calendar.settings.calendar_handle, 'advent-calendar-default');
  assert.equal(t.sections.advent_calendar.settings.grid_columns, 7);
  assert.equal(t.sections.advent_calendar.settings.grid_rows, 8);
  assert.equal(pageTemplate({ handle: 'my-cal' }).sections.advent_calendar.settings.calendar_handle, 'my-cal');
});

test('pageInput targets templates/page.advent-calendar.json', () => {
  const { page } = pageInput();
  assert.equal(page.title, 'Advent Calendar');
  assert.equal(page.handle, 'advent-calendar');
  assert.equal(page.template_suffix, 'advent-calendar');
});
