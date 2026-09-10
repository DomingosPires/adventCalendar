import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const MOTIFS = [
  'wreath', 'candle', 'star', 'gift', 'tree',
  'bell', 'snowflake', 'stocking', 'bauble', 'candycane',
];

export function parseArea(str) {
  const p = String(str).split('/').map((s) => s.trim());
  const span = (s) => {
    const m = /span\s+(\d+)/.exec(s || '');
    return m ? Number(m[1]) : Number(s) || 1;
  };
  return {
    row: Number(p[0]) || 1,
    col: Number(p[1]) || 1,
    rowSpan: span(p[2]),
    colSpan: span(p[3]),
  };
}

export function loadSeed(dir) {
  const calendar = JSON.parse(readFileSync(join(dir, 'advent_calendar.json'), 'utf8'));
  const days = readdirSync(join(dir, 'days'))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, 'days', f), 'utf8')));
  return { calendar, days };
}
