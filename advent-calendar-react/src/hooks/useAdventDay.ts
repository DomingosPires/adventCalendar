import { useState } from 'react';

const MAX_DAY = 25;
const DECEMBER = 11;

function parseOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get('day');
  if (raw === null) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_DAY) return null;
  return value;
}

export function computeAdventDay(now: Date, search: string): number {
  const override = parseOverride(search);
  if (override !== null) return override;
  if (now.getMonth() !== DECEMBER) return 0;
  return Math.min(now.getDate(), MAX_DAY);
}

export function useAdventDay(): number {
  const [day] = useState(() =>
    computeAdventDay(new Date(), window.location.search),
  );
  return day;
}
