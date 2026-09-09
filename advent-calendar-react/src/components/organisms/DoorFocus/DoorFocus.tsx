import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CopyableCode } from '../../molecules/CopyableCode';
import { doorLayoutId } from '../../molecules/Door/doorLayoutId';
import type { CalendarDay } from '../../../data/calendar';
import styles from './DoorFocus.module.css';

const TITLE_ID = 'door-focus-title';
const LEAF_OPEN_DEG = -112;
const FOCUSABLE =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

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
  const cardRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pressStartedOnScrim = useRef(false);

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
      returnFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const stop = (event: MouseEvent) => event.stopPropagation();

  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const card = cardRef.current;
    /* v8 ignore next */
    if (!card) return;

    const focusables = Array.from(
      card.querySelectorAll<HTMLElement>(FOCUSABLE),
    );
    /* v8 ignore next */
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    const outside = !card.contains(active);

    if (event.shiftKey && (active === first || outside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault();
      first.focus();
    }
  };

  const onScrimMouseDown = (event: MouseEvent) => {
    pressStartedOnScrim.current = event.target === event.currentTarget;
  };

  const onScrimClick = () => {
    if (pressStartedOnScrim.current) onClose();
    pressStartedOnScrim.current = false;
  };

  const leafTransition = reduce
    ? { duration: 0 }
    : { delay: 0.35, duration: 0.5, ease: 'easeInOut' as const };

  return createPortal(
    <motion.div
      className={styles.scrim}
      onMouseDown={onScrimMouseDown}
      onClick={onScrimClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: reduce ? 0 : 0.2 }}
    >
      <motion.div
        ref={cardRef}
        layoutId={reduce ? undefined : doorLayoutId(day.day)}
        data-reduced-motion={reduce ? 'true' : 'false'}
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
        onKeyDown={trapTab}
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
          initial={{
            rotateY: reduce ? LEAF_OPEN_DEG : 0,
            filter: reduce ? 'brightness(0.45)' : 'brightness(1)',
          }}
          animate={{ rotateY: LEAF_OPEN_DEG, filter: 'brightness(0.45)' }}
          exit={{
            rotateY: 0,
            filter: 'brightness(1)',
            transition: { duration: reduce ? 0 : 0.2, ease: 'easeInOut' },
          }}
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
