import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '../../atoms/Badge';
import { DoorNumber } from '../../atoms/DoorNumber';
import type { CalendarDay } from '../../../data/calendar';
import type { DayState } from '../../../lib/dayState';
import { doorLayoutId } from './doorLayoutId';
import styles from './Door.module.css';

const ARIA_LABEL: Record<DayState, (n: number) => string> = {
  locked: (n) => `Dia ${n}, por abrir mais tarde`,
  today: (n) => `Dia ${n}, hoje`,
  past: (n) => `Dia ${n}, por abrir`,
  opened: (n) => `Dia ${n}, aberto — ver de novo`,
};

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export interface DoorProps {
  day: CalendarDay;
  state: DayState;
  onOpen: (day: number) => void;
}

export function Door({ day, state, onOpen }: DoorProps) {
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

  const handleClick = () => {
    if (state === 'locked') {
      if (!reducedMotion()) {
        setShaking(true);
        clearShakeTimeout();
        shakeTimeoutRef.current = setTimeout(() => setShaking(false), 600);
      }
      return;
    }
    onOpen(day.day);
  };

  const style = {
    '--grid-area': day.gridArea,
    '--grid-area-mobile': day.gridAreaMobile,
  } as CSSProperties;

  return (
    <motion.button
      layoutId={doorLayoutId(day.day)}
      type="button"
      data-state={state}
      aria-label={ARIA_LABEL[state](day.day)}
      style={style}
      className={[
        styles.door,
        styles[`img-${day.image}`],
        state === 'opened' ? styles.ajar : '',
        shaking ? styles.shake : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      onAnimationEnd={stopShaking}
    >
      <span className={styles.panel} aria-hidden="true" />
      <DoorNumber value={day.day} size={day.size} />
      {state === 'today' && <Badge />}
    </motion.button>
  );
}
