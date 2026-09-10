import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const H = require('./advent-calendar.helpers.js');

test('parseDayParam', () => {
  assert.equal(H.parseDayParam('?day=12'), 12);
  assert.equal(H.parseDayParam('?day=0'), null);
  assert.equal(H.parseDayParam('?day=26'), null);
  assert.equal(H.parseDayParam('?day=x'), null);
  assert.equal(H.parseDayParam(''), null);
});

test('readOpened tolerates missing / malformed / throwing storage', () => {
  assert.deepEqual([...H.readOpened({ getItem: () => null }, 'k')], []);
  assert.deepEqual([...H.readOpened({ getItem: () => '{bad' }, 'k')], []);
  assert.deepEqual([...H.readOpened({ getItem: () => '[1,2,"x",3]' }, 'k')].sort(), [1, 2, 3]);
  assert.deepEqual([...H.readOpened({ getItem: () => { throw new Error('nope'); } }, 'k')], []);
});

test('writeOpened serializes and swallows throws', () => {
  let stored;
  H.writeOpened({ setItem: (k, v) => { stored = v; } }, 'k', new Set([3, 1, 2]));
  assert.deepEqual(JSON.parse(stored).sort(), [1, 2, 3]);
  assert.doesNotThrow(() => H.writeOpened({ setItem: () => { throw new Error('full'); } }, 'k', new Set([1])));
});

test('readOpened falls back to the in-memory copy when storage throws', () => {
  const throwing = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
  H.writeOpened(throwing, 'fk', new Set([4, 8, 15]));
  assert.deepEqual([...H.readOpened(throwing, 'fk')].sort((a, b) => a - b), [4, 8, 15]);
});

test('parseArea', () => {
  assert.deepEqual(H.parseArea('3 / 6 / span 2 / span 2'), { row: 3, col: 6, rowSpan: 2, colSpan: 2 });
  assert.deepEqual(H.parseArea('5 / 5 / span 1 / span 1'), { row: 5, col: 5, rowSpan: 1, colSpan: 1 });
});

test('buildCoverage detects a full valid tiling', () => {
  const areas = [
    { day: 1, area: '1 / 1 / span 1 / span 2' },
    { day: 2, area: '1 / 3 / span 1 / span 2' },
    { day: 3, area: '2 / 1 / span 1 / span 4' },
  ];
  const r = H.buildCoverage(areas, 4, 2);
  assert.equal(r.covered, 8);
  assert.equal(r.total, 8);
  assert.deepEqual(r.empties, []);
  assert.deepEqual(r.overlaps, []);
});

test('buildCoverage reports empties and overlaps', () => {
  const areas = [
    { day: 1, area: '1 / 1 / span 1 / span 2' },
    { day: 2, area: '1 / 2 / span 1 / span 2' }, // overlaps col 2
  ];
  const r = H.buildCoverage(areas, 3, 2); // 6 cells
  assert.ok(r.empties.includes('2,1'));
  assert.equal(r.overlaps[0].cell, '1,2');
  assert.deepEqual(r.overlaps[0].days.sort(), [1, 2]);
});
