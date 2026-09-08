import { act, renderHook } from '@testing-library/react';
import { useOpenedDays } from './useOpenedDays';

const KEY = 'advent-calendar:opened';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

test('falls back to memory and mounts when getItem throws', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const { result } = renderHook(() => useOpenedDays());
  expect([...result.current.openedDays]).toEqual([]);
});

test('starts empty when storage is empty', () => {
  const { result } = renderHook(() => useOpenedDays());
  expect([...result.current.openedDays]).toEqual([]);
});

test('markOpened records a day and persists it', () => {
  const { result } = renderHook(() => useOpenedDays());
  act(() => result.current.markOpened(4));
  expect([...result.current.openedDays]).toEqual([4]);
  expect(JSON.parse(window.localStorage.getItem(KEY) as string)).toEqual([4]);
});

test('a fresh hook restores the persisted set', () => {
  window.localStorage.setItem(KEY, JSON.stringify([2, 7]));
  const { result } = renderHook(() => useOpenedDays());
  expect([...result.current.openedDays].sort((a, b) => a - b)).toEqual([2, 7]);
});

test('markOpened is idempotent', () => {
  const { result } = renderHook(() => useOpenedDays());
  act(() => result.current.markOpened(4));
  const first = result.current.openedDays;
  act(() => result.current.markOpened(4));
  expect(result.current.openedDays).toBe(first);
});

test('malformed JSON in storage is treated as empty', () => {
  window.localStorage.setItem(KEY, '{not json');
  const { result } = renderHook(() => useOpenedDays());
  expect([...result.current.openedDays]).toEqual([]);
});

test('still records opens in memory when setItem throws', () => {
  const { result } = renderHook(() => useOpenedDays());
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  act(() => result.current.markOpened(9));
  expect([...result.current.openedDays]).toEqual([9]);
});
