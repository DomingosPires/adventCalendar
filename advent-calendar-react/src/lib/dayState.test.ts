import { getDayState } from './dayState';

const none = new Set<number>();

test('current day with nothing opened is "today"', () => {
  expect(getDayState(5, 5, none)).toBe('today');
});

test('earlier day with nothing opened is "past"', () => {
  expect(getDayState(3, 5, none)).toBe('past');
});

test('later day is "locked"', () => {
  expect(getDayState(9, 5, none)).toBe('locked');
});

test('every day is "locked" before the season (today = 0)', () => {
  expect(getDayState(1, 0, none)).toBe('locked');
  expect(getDayState(25, 0, none)).toBe('locked');
});

test('an opened day is "opened" even if it is today', () => {
  expect(getDayState(5, 5, new Set([5]))).toBe('opened');
});

test('an opened day is "opened" even if it is in the past', () => {
  expect(getDayState(3, 5, new Set([3]))).toBe('opened');
});
