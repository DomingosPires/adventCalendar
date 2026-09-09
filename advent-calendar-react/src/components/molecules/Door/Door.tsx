import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Badge } from '../../atoms/Badge';
import { DoorNumber } from '../../atoms/DoorNumber';
import { Motif } from '../../atoms/Motif';
import type { CalendarDay } from '../../../data/calendar';
import type { DayState } from '../../../lib/dayState';
import { springSnappy } from '../../../lib/motion';
import styles from './Door.module.css';

const ARIA_LABEL: Record<DayState, (n: number) => string> = {
  locked: (n) => `Dia ${n}, por abrir mais tarde`,
  today: (n) => `Dia ${n}, hoje`,
  past: (n) => `Dia ${n}, por abrir`,
  opened: (n) => `Dia ${n}, aberto — ver de novo`,
};

export interface DoorProps {
  day: CalendarDay;
  state: DayState;
  onOpen: (day: number, rect: DOMRect) => void;
}

export function Door({ day, state, onOpen }: DoorProps) {
  const reduce = useReducedMotion() ?? false;
  const [shaking, setShaking] = useState(false);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const clearShakeTimeout = () => {
    if (shakeTimeoutRef.current) {
      clearTimeout(shakeTimeoutRef.current);
      shakeTimeoutRef.current = undefined;
    }
  };

  useEffect(() => clearShakeTimeout, []);

  const stopShaking = () => {
    clearShakeTimeout();
    setShaking(false);
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (state === 'locked') {
      if (!reduce) {
        setShaking(true);
        clearShakeTimeout();
        shakeTimeoutRef.current = setTimeout(() => setShaking(false), 600);
      }
      return;
    }
    onOpen(day.day, event.currentTarget.getBoundingClientRect());
  };

  const style = {
    '--grid-area': day.gridArea,
    '--grid-area-mobile': day.gridAreaMobile,
  } as CSSProperties;

  const doorVariants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 12, scale: 0.94 },
        show: { opacity: 1, y: 0, scale: 1, transition: springSnappy },
      };

  return (
    <motion.button
      type="button"
      variants={doorVariants}
      data-state={state}
      aria-label={ARIA_LABEL[state](day.day)}
      style={style}
      className={[
        styles.door,
        state === 'opened' ? styles.opened : '',
        shaking ? styles.shake : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      onAnimationEnd={stopShaking}
    >
      <span className={styles.frame} aria-hidden="true">
        <span className={styles.compartment}>
          <span className={styles.check} aria-hidden="true">✓</span>
        </span>
        <span className={styles.leaf}>
          <Motif name={day.motif} className={styles.motif} />
        </span>
        <DoorNumber value={day.day} size={day.size} />
      </span>
      {state === 'today' && <Badge />}
    </motion.button>
  );
}
