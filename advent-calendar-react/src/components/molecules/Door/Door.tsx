import { useState, type CSSProperties } from 'react';
import { Badge, type BadgeVariant } from '../../atoms/Badge';
import { DoorNumber } from '../../atoms/DoorNumber';
import type { CalendarDay } from '../../../data/calendar';
import type { DayState } from '../../../lib/dayState';
import styles from './Door.module.css';

const ARIA_LABEL: Record<DayState, (n: number) => string> = {
  locked: (n) => `Dia ${n}, ainda fechado`,
  today: (n) => `Dia ${n}, hoje — abrir`,
  past: (n) => `Dia ${n}, por abrir`,
  opened: (n) => `Dia ${n}, aberto`,
};

const BADGE_FOR_STATE: Partial<Record<DayState, BadgeVariant>> = {
  today: 'today',
  past: 'available',
  opened: 'opened',
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
  const badge = BADGE_FOR_STATE[state];

  const handleClick = () => {
    if (state === 'locked') {
      if (!reducedMotion()) setShaking(true);
      return;
    }
    onOpen(day.day);
  };

  const style = {
    '--grid-area': day.gridArea,
    '--grid-area-mobile': day.gridAreaMobile,
  } as CSSProperties;

  return (
    <button
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
      onAnimationEnd={() => setShaking(false)}
    >
      <span className={styles.panel} aria-hidden="true" />
      <DoorNumber value={day.day} size={day.size} />
      {badge && <Badge variant={badge} />}
    </button>
  );
}
