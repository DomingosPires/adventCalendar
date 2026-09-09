import { useEffect, useRef, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CopyableCode } from '../../molecules/CopyableCode';
import type { CalendarDay } from '../../../data/calendar';
import styles from './DoorFocus.module.css';

const TITLE_ID = 'door-focus-title';
const LEAF_OPEN_DEG = -112;

export interface DoorFocusProps {
  day: CalendarDay | null;
  onClose: () => void;
}

export function DoorFocus({ day, onClose }: DoorFocusProps) {
  return (
    <AnimatePresence>
      {day && <DoorFocusPanel day={day} onClose={onClose} />}
    </AnimatePresence>
  );
}

interface PanelProps {
  day: CalendarDay;
  onClose: () => void;
}

function DoorFocusPanel({ day, onClose }: PanelProps) {
  const reduce = useReducedMotion();
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      returnFocusRef.current?.focus();
    };
  }, [onClose]);

  const stop = (event: MouseEvent) => event.stopPropagation();

  const leafTransition = reduce
    ? { duration: 0 }
    : { delay: 0.35, duration: 0.5, ease: 'easeInOut' as const };

  return createPortal(
    <motion.div
      className={styles.scrim}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
    >
      <motion.div
        layoutId={reduce ? undefined : `door-${day.day}`}
        initial={reduce ? { opacity: 0, scale: 0.92 } : false}
        animate={reduce ? { opacity: 1, scale: 1 } : undefined}
        exit={reduce ? { opacity: 0, scale: 0.92 } : { opacity: 0 }}
        transition={{ duration: reduce ? 0 : 0.3 }}
        className={styles.card}
        style={{ perspective: 1200 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onClick={stop}
      >
        <div className={styles.box}>
          <p className={styles.day}>{day.day}</p>
          <h2 id={TITLE_ID} className={styles.title}>
            {day.title}
          </h2>
          <p className={styles.message}>{day.message}</p>
          {day.code && <CopyableCode code={day.code} />}
        </div>

        <motion.div
          className={`${styles.leaf} ${styles[`img-${day.image}`]}`}
          style={{ transformOrigin: 'left center' }}
          initial={{ rotateY: reduce ? LEAF_OPEN_DEG : 0 }}
          animate={{ rotateY: LEAF_OPEN_DEG }}
          exit={{ rotateY: 0 }}
          transition={leafTransition}
          aria-hidden="true"
        />

        <button
          ref={closeRef}
          type="button"
          className={styles.close}
          aria-label="Fechar"
          onClick={onClose}
        >
          ✕
        </button>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
