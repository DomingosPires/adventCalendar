import type { Transition } from 'framer-motion';

export const springSoft: Transition = { type: 'spring', stiffness: 200, damping: 26 };
export const springSnappy: Transition = { type: 'spring', stiffness: 260, damping: 24 };

export const durations = { fast: 0.12, base: 0.25, slow: 0.45 } as const;

/** Pick `flat` under reduced motion, `full` otherwise. */
export function reduced<T>(reduce: boolean, full: T, flat: T): T {
  return reduce ? flat : full;
}
