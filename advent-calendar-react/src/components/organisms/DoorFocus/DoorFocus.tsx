import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AnimatePresence,
  motion,
  useAnimate,
  useReducedMotion,
} from 'framer-motion';
import { CopyableCode } from '../../molecules/CopyableCode';
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

interface FlipDelta {
  dx: number;
  dy: number;
  sx: number;
  sy: number;
}

function DoorFocusPanel({ day, originRect, onClose }: PanelProps) {
  const reduce = useReducedMotion() ?? false;
  const [scope, rawAnimate] = useAnimate<HTMLDivElement>();
  // framer's useAnimate overloads don't cleanly accept a transform-keyframes
  // object literal for a DOM element; narrow it to what we actually call.
  const animate = rawAnimate as (
    el: Element,
    keyframes: Record<string, Array<number | string>>,
    options?: Record<string, unknown>,
  ) => void;
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const pressStartedOnScrim = useRef(false);
  const [flip, setFlip] = useState<FlipDelta | null>(null);

  // FLIP: the card lives at its natural centred layout and never animates its
  // box (framer can't tween `position`/`width`/`height: auto`). Instead we
  // measure the settled card, work out the transform that would drop it back
  // onto the clicked door's rect, and spring from there to identity.
  const doFlip = !reduce && originRect !== null;

  useLayoutEffect(() => {
    /* v8 ignore next */
    if (!doFlip || !scope.current) return;
    const card = scope.current.getBoundingClientRect();
    // jsdom (and a not-yet-laid-out card) report zeroes — nothing to measure.
    if (card.width === 0 || card.height === 0) return;
    const delta: FlipDelta = {
      dx:
        originRect.left +
        originRect.width / 2 -
        (card.left + card.width / 2),
      dy:
        originRect.top +
        originRect.height / 2 -
        (card.top + card.height / 2),
      sx: originRect.width / card.width,
      sy: originRect.height / card.height,
    };
    setFlip(delta);
    animate(
      scope.current,
      {
        x: [delta.dx, 0],
        y: [delta.dy, 0],
        scaleX: [delta.sx, 1],
        scaleY: [delta.sy, 1],
        opacity: [0.35, 1],
      },
      // Same feel as springSoft; the mini engine wants a plain options object.
      { type: 'spring', stiffness: 200, damping: 26 },
    );
    // Mount-only: originRect is captured at open time and never changes here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const card = scope.current;
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
  // FLIP branch: the imperative animate() above drives the entrance, so the
  // element takes no declarative initial/animate; on close it recoils toward
  // the door using the measured delta. Fade branch (reduced motion, or no
  // origin rect): a plain centred crossfade.
  const cardInitial = doFlip ? false : { opacity: 0, scale: 0.94 };
  const cardAnimate = doFlip ? undefined : { opacity: 1, scale: 1 };
  const cardExit =
    doFlip && flip
      ? {
          opacity: 0,
          x: flip.dx,
          y: flip.dy,
          scaleX: flip.sx,
          scaleY: flip.sy,
          transition: { duration: durations.base, ease: 'easeIn' as const },
        }
      : {
          opacity: 0,
          scale: doFlip ? 1 : 0.94,
          transition: { duration: durations.fast },
        };
  const cardTransition = doFlip
    ? undefined
    : reduce
      ? { duration: durations.fast }
      : springSoft;

  const contentVariants = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduce ? 0 : 0.07,
        delayChildren: reduce ? 0 : 0.3,
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
        className={styles.halo}
        data-halo
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: reduce ? 0.5 : 1 }}
        exit={{ opacity: 0 }}
        transition={{
          delay: reduce ? 0 : 0.45,
          duration: reduce ? 0 : 0.6,
          ease: 'easeOut',
        }}
      />
      <motion.div
        ref={scope}
        data-reduced-motion={reduce ? 'true' : 'false'}
        data-open-anim={doFlip ? 'flip' : 'fade'}
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
          <Motif name={day.motif} className={styles.motif} />
          {!reduce && (
            <motion.div
              className={styles.shine}
              data-shine
              initial={{ x: '-130%' }}
              animate={{ x: '130%' }}
              transition={{ delay: 0.12, duration: 0.55, ease: 'easeInOut' }}
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
