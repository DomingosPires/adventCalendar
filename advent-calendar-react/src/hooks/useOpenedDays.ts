import { useCallback, useState } from 'react';

const STORAGE_KEY = 'advent-calendar:opened';

let memoryFallback = new Set<number>();

function readOpenedDays(): Set<number> {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return new Set(memoryFallback);
  }
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((n): n is number => typeof n === 'number'));
    }
  } catch {
    // malformed — treat as empty
  }
  return new Set();
}

function writeOpenedDays(days: Set<number>): void {
  memoryFallback = new Set(days);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...days]));
  } catch {
    // in-memory fallback already updated
  }
}

export function useOpenedDays(): {
  openedDays: ReadonlySet<number>;
  markOpened: (day: number) => void;
} {
  const [openedDays, setOpenedDays] = useState<Set<number>>(readOpenedDays);

  const markOpened = useCallback((day: number) => {
    setOpenedDays((prev) => {
      if (prev.has(day)) return prev;
      const next = new Set(prev);
      next.add(day);
      writeOpenedDays(next);
      return next;
    });
  }, []);

  return { openedDays, markOpened };
}
