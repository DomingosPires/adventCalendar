import { CALENDAR, type GiftImage } from './calendar';

const IMAGES: GiftImage[] = ['gift1', 'gift2', 'gift3', 'gift4', 'gift5'];

test('has exactly 25 entries', () => {
  expect(CALENDAR).toHaveLength(25);
});

test('day values are the unique set 1..25', () => {
  const days = CALENDAR.map((d) => d.day).sort((a, b) => a - b);
  expect(days).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
});

test('every entry has a known image and non-empty grid areas', () => {
  for (const d of CALENDAR) {
    expect(IMAGES).toContain(d.image);
    expect(d.gridArea.trim().length).toBeGreaterThan(0);
    expect(d.gridAreaMobile.trim().length).toBeGreaterThan(0);
    expect(d.title.trim().length).toBeGreaterThan(0);
    expect(d.message.trim().length).toBeGreaterThan(0);
  }
});

test('every size is one of the four allowed values', () => {
  for (const d of CALENDAR) {
    expect(['1x1', '1x2', '2x1', '2x2']).toContain(d.size);
  }
});

/** Parse "<rowStart> / <colStart> / span <h> / span <w>" (1-indexed). */
function parseArea(area: string): { row: number; col: number; h: number; w: number } {
  const m = area.match(
    /^\s*(\d+)\s*\/\s*(\d+)\s*\/\s*span\s+(\d+)\s*\/\s*span\s+(\d+)\s*$/,
  );
  if (!m) throw new Error(`unparseable grid area: "${area}"`);
  return { row: +m[1], col: +m[2], h: +m[3], w: +m[4] };
}

/** Fail if any cell of a COLS x ROWS grid is uncovered or covered twice. */
function assertPerfectTiling(
  areas: string[],
  cols: number,
  rows: number,
  label: string,
): void {
  const owner: (number | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );
  areas.forEach((area, i) => {
    const { row, col, h, w } = parseArea(area);
    expect(
      row >= 1 && col >= 1 && row + h - 1 <= rows && col + w - 1 <= cols,
    ).toBe(true);
    for (let r = row - 1; r < row - 1 + h; r++) {
      for (let c = col - 1; c < col - 1 + w; c++) {
        expect(
          owner[r][c],
          `${label}: cell (${r + 1},${c + 1}) claimed by entry ${owner[r][c]! + 1} and ${i + 1}`,
        ).toBeNull();
        owner[r][c] = i;
      }
    }
  });
  const holes: string[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (owner[r][c] === null) holes.push(`(${r + 1},${c + 1})`);
    }
  }
  expect(holes, `${label}: empty cells ${holes.join(' ')}`).toEqual([]);
}

test('desktop layout perfectly tiles a 7x8 grid (no gaps, no overlaps)', () => {
  assertPerfectTiling(
    CALENDAR.map((d) => d.gridArea),
    7,
    8,
    'desktop',
  );
});

test('mobile layout perfectly tiles a 4x14 grid (no gaps, no overlaps)', () => {
  assertPerfectTiling(
    CALENDAR.map((d) => d.gridAreaMobile),
    4,
    14,
    'mobile',
  );
});

test('each footprint (both breakpoints) matches the door size', () => {
  for (const d of CALENDAR) {
    const [w, h] = d.size.split('x').map(Number); // "2x1" -> 2 wide, 1 tall
    for (const area of [d.gridArea, d.gridAreaMobile]) {
      const p = parseArea(area);
      expect({ w: p.w, h: p.h }, `day ${d.day} ${area}`).toEqual({ w, h });
    }
  }
});
