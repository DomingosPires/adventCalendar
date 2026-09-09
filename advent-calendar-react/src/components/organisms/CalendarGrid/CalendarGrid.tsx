import { Door } from '../../molecules/Door';
import type { CalendarDay } from '../../../data/calendar';
import type { DayState } from '../../../lib/dayState';
import styles from './CalendarGrid.module.css';

export interface CalendarGridItem {
  day: CalendarDay;
  state: DayState;
}

export interface CalendarGridProps {
  items: CalendarGridItem[];
  onOpen: (day: number, rect: DOMRect) => void;
}

export function CalendarGrid({ items, onOpen }: CalendarGridProps) {
  return (
    <div className={styles.grid}>
      {items.map(({ day, state }) => (
        <Door key={day.day} day={day} state={state} onOpen={onOpen} />
      ))}
    </div>
  );
}
