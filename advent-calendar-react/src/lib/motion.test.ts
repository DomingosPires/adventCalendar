import { springSoft, springSnappy, durations, reduced } from './motion';

test('spring configs are framer spring objects', () => {
  expect(springSoft).toMatchObject({ type: 'spring', stiffness: 200, damping: 26 });
  expect(springSnappy).toMatchObject({ type: 'spring', stiffness: 260, damping: 24 });
});

test('durations expose fast/base/slow seconds', () => {
  expect(durations.fast).toBeLessThan(durations.base);
  expect(durations.base).toBeLessThan(durations.slow);
});

test('reduced() picks the flat value only when reduce is true', () => {
  const full = { opacity: 0, y: 12 };
  const flat = { opacity: 0 };
  expect(reduced(true, full, flat)).toBe(flat);
  expect(reduced(false, full, flat)).toBe(full);
});
