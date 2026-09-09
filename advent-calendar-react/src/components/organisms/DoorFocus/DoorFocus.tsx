import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CopyableCode } from '../../molecules/CopyableCode';
import { Motif } from '../../atoms/Motif';
import { springSoft, durations } from '../../../lib/motion';
import type { CalendarDay } from '../../../data/calendar';
import styles from './DoorFocus.module.css';

const TITLE_ID = 'door-focus-title';
const FOCUSABLE =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

// Ref-counted so overlapping open panels (a fast re-open while the previous is
// still exiting) don't leave the body scroll-locked.
let scrollLocks = 0;

export interface DoorFocusProps {
  day: CalendarDay | null;
  /** The clicked door's rect — accepted for the open flow; not used for layout. */
  originRect: DOMRect | null;
  onClose: () => void;
}

export function DoorFocus({ day, originRect, onClose }: DoorFocusProps) {
  return (
    <AnimatePresence>
      {day && (
        <DoorFocusPanel
          key={day.day}
          day={day}
          originRect={originRect}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}

interface PanelProps {
  day: CalendarDay;
  originRect: DOMRect | null;
  onClose: () => void;
}

function DoorFocusPanel({ day, onClose }: PanelProps) {
  const reduce = useReducedMotion() ?? false;
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pressStartedOnScrim = useRef(false);

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    if (scrollLocks++ === 0) document.body.style.overflow = 'hidden';
    return () => {
      if (--scrollLocks === 0) document.body.style.overflow = '';
      returnFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const stop = (event: MouseEvent) => event.stopPropagation();

  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;
    const card = cardRef.current;
    /* v8 ignore next */
    if (!card) return;
    const focusables = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE));
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

  const contentVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : 0.07,
        delayChildren: reduce ? 0 : 0.28,
      },
    },
  };
  const itemVariants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 10, filter: 'blur(6px)' },
        show: { opacity: 1, y: 0, filter: 'blur(0px)' },
      };
  const medallionVariants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, scale: 0.6 },
        show: {
          opacity: 1,
          scale: 1,
          transition: { type: 'spring' as const, stiffness: 420, damping: 14 },
        },
      };

  return createPortal(
    <motion.div
      className={styles.scrim}
      onMouseDown={onScrimMouseDown}
      onClick={onScrimClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: reduce ? 0 : durations.base }}
    >
      <motion.div
        ref={cardRef}
        data-reduced-motion={reduce ? 'true' : 'false'}
        className={styles.card}
        initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{
          opacity: 0,
          scale: reduce ? 1 : 0.92,
          transition: { duration: durations.fast },
        }}
        transition={reduce ? { duration: durations.fast } : springSoft}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onClick={stop}
        onKeyDown={trapTab}
      >
        <div className={styles.watermark} aria-hidden="true">
          <Motif name={day.motif} className={styles.motif} />
        </div>

        <motion.div
          className={styles.box}
          variants={contentVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div className={styles.medallion} variants={medallionVariants}>
            <span className={styles.medallionNumber}>{day.day}</span>
          </motion.div>
          <motion.h2
            id={TITLE_ID}
            className={styles.title}
            variants={itemVariants}
          >
            {day.title}
          </motion.h2>
          <motion.p className={styles.message} variants={itemVariants}>
            {day.message}
          </motion.p>
          {day.code && (
            <motion.div variants={itemVariants}>
              <CopyableCode code={day.code} />
            </motion.div>
          )}
        </motion.div>

        {/* The cover sits static over the content and fades away to reveal it. */}
        <motion.div
          className={styles.cardLeaf}
          initial={{ opacity: reduce ? 0 : 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 1, transition: { duration: reduce ? 0 : 0.16 } }}
          transition={
            reduce
              ? { duration: 0 }
              : { delay: 0.15, duration: 0.55, ease: 'easeInOut' }
          }
          aria-hidden="true"
        >
          <Motif name={day.motif} className={styles.motif} />
          {!reduce && (
            <motion.div
              className={styles.shine}
              data-shine
              initial={{ x: '-130%' }}
              animate={{ x: '130%' }}
              transition={{ delay: 0.1, duration: 0.5, ease: 'easeInOut' }}
            />
          )}
        </motion.div>

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
