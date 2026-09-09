import { motion } from 'framer-motion';
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

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.025, delayChildren: 0.1 } },
};

export function CalendarGrid({ items, onOpen }: CalendarGridProps) {
  return (
    <motion.div
      className={styles.grid}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {items.map(({ day, state }) => (
        <Door key={day.day} day={day} state={state} onOpen={onOpen} />
      ))}
    </motion.div>
  );
}
