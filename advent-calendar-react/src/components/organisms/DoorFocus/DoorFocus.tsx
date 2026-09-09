import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CopyableCode } from '../../molecules/CopyableCode';
import { DoorNumber } from '../../atoms/DoorNumber';
import { Motif } from '../../atoms/Motif';
import { springSoft, durations } from '../../../lib/motion';
import type { CalendarDay } from '../../../data/calendar';
import styles from './DoorFocus.module.css';

const TITLE_ID = 'door-focus-title';
const LEAF_OPEN_DEG = -110;
const FOCUSABLE =
  'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

export interface DoorFocusProps {
  day: CalendarDay | null;
  originRect: DOMRect | null;
  onClose: () => void;
}

export function DoorFocus({ day, originRect, onClose }: DoorFocusProps) {
  return (
    <AnimatePresence>
      {day && (
        <DoorFocusPanel day={day} originRect={originRect} onClose={onClose} />
      )}
    </AnimatePresence>
  );
}

interface PanelProps {
  day: CalendarDay;
  originRect: DOMRect | null;
  onClose: () => void;
}

function DoorFocusPanel({ day, originRect, onClose }: PanelProps) {
  const reduce = useReducedMotion() ?? false;
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

  // Card open/close geometry.
  const cardInitial =
    reduce || !originRect
      ? { opacity: 0, scale: 0.94 }
      : {
          opacity: 0.6,
          position: 'fixed' as const,
          top: originRect.top,
          left: originRect.left,
          width: originRect.width,
          height: originRect.height,
        };
  const cardAnimate = reduce || !originRect
    ? { opacity: 1, scale: 1 }
    : { opacity: 1, position: 'fixed' as const, top: '50%', left: '50%', width: 'min(92vw, 460px)', height: 'auto', x: '-50%', y: '-50%' };
  const cardExit = reduce
    ? { opacity: 0, scale: 0.94, transition: { duration: durations.fast } }
    : { opacity: 0, scale: 0.96, transition: { duration: durations.base } };
  const cardTransition = reduce ? { duration: durations.fast } : springSoft;

  const contentVariants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.06, delayChildren: reduce ? 0 : 0.2 } },
  };
  const itemVariants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

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
        style={{ perspective: 1400 }}
        initial={cardInitial}
        animate={cardAnimate}
        exit={cardExit}
        transition={cardTransition}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onClick={stop}
        onKeyDown={trapTab}
      >
        <div className={styles.watermark} aria-hidden="true">
          <Motif name={day.motif} />
        </div>
        <div className={styles.bloom} aria-hidden="true" />

        <motion.div
          className={styles.box}
          variants={contentVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div className={styles.medallion} variants={itemVariants}>
            <DoorNumber value={day.day} size={day.size} />
          </motion.div>
          <motion.h2 id={TITLE_ID} className={styles.title} variants={itemVariants}>
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

        <motion.div
          className={styles.cardLeaf}
          style={{ transformOrigin: 'left center' }}
          initial={{ rotateY: reduce ? LEAF_OPEN_DEG : 0, filter: reduce ? 'brightness(0.4)' : 'brightness(1)' }}
          animate={{ rotateY: LEAF_OPEN_DEG, filter: 'brightness(0.4)' }}
          exit={{ rotateY: 0, filter: 'brightness(1)', transition: { duration: reduce ? 0 : 0.2, ease: 'easeInOut' } }}
          transition={reduce ? { duration: 0 } : { delay: 0.35, duration: durations.slow, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          <Motif name={day.motif} />
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
