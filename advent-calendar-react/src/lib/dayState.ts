export type DayState = 'locked' | 'today' | 'past' | 'opened';

export function getDayState(
  day: number,
  today: number,
  openedDays: ReadonlySet<number>,
): DayState {
  if (openedDays.has(day)) return 'opened';
  if (today > 0 && day === today) return 'today';
  if (today > 0 && day < today) return 'past';
  return 'locked';
}
