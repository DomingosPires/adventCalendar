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
