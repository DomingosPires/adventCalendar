import { renderHook } from '@testing-library/react';
import { computeAdventDay, useAdventDay } from './useAdventDay';

test('returns the day of month in December', () => {
  expect(computeAdventDay(new Date(2026, 11, 10), '')).toBe(10);
});

test('clamps to 25 late in December', () => {
  expect(computeAdventDay(new Date(2026, 11, 30), '')).toBe(25);
});

test('returns 0 outside December', () => {
  expect(computeAdventDay(new Date(2026, 5, 15), '')).toBe(0);
});

test('?day= override wins, even outside December', () => {
  expect(computeAdventDay(new Date(2026, 5, 15), '?day=10')).toBe(10);
});

test('out-of-range or non-integer override is ignored', () => {
  expect(computeAdventDay(new Date(2026, 11, 10), '?day=99')).toBe(10);
  expect(computeAdventDay(new Date(2026, 11, 10), '?day=abc')).toBe(10);
  expect(computeAdventDay(new Date(2026, 11, 10), '?day=0')).toBe(10);
});

test('useAdventDay reads the system clock once', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 11, 5));
  try {
    const { result } = renderHook(() => useAdventDay());
    expect(result.current).toBe(5);
  } finally {
    vi.useRealTimers();
  }
});
