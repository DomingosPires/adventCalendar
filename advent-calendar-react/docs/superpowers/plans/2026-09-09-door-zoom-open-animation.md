# Door zoom + outward-open animation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clicking an openable door zooms in on that door, swings it open outward, and reveals the day's content inside the box — replacing the separate modal dialog.

**Architecture:** Add `framer-motion`. The grid door becomes a `motion.button` with a `layoutId`; a portalled `DoorFocus` overlay renders a `motion.div` with the *same* `layoutId`, so framer morphs the grid cell into a centred card (the "zoom"). After the morph settles, an inner `motion.div` leaf animates `rotateY` to `-112deg` around a left hinge (opens outward). Content (number, title, message, promo code, close ✕) sits in the box behind the leaf. `CalendarPage` owns `openDay: number | null`; `DayDialog` is deleted and `CalendarTemplate` loses its `dialog` slot. Opened doors rest slightly ajar in the grid; the `Abrir`/`✓ Aberto` badge pills are removed, leaving only `Hoje`.

**Tech Stack:** React 18.3.1, TypeScript (strict), Vite 5, Vitest + Testing Library (jsdom), CSS Modules, framer-motion 11.18.2.

**Spec:** `docs/superpowers/specs/2026-09-09-door-zoom-open-animation-design.md`

## Global Constraints

- **Dependency versions are pinned exact — no `^`, no `~`.** Add `framer-motion` as `"framer-motion": "11.18.2"`.
- **Lint must pass clean:** `npm run lint` (`eslint . --max-warnings 0`).
- **Coverage thresholds are 95%** for statements / branches / functions / lines (`vite.config.ts`). Every new branch needs a test.
- **CSS Modules use `classNameStrategy: 'non-scoped'`** — `toHaveClass('scrim')` etc. match the raw class name.
- **Vitest globals are on** — do not import `test`, `expect`, `vi`, `beforeEach` (they are ambient).
- **User-facing copy is European Portuguese.** Exact strings are given in each task; copy them verbatim.
- **TDD:** failing test first, watch it fail, minimal implementation, watch it pass, commit.
- **Commit message trailer:** every commit message body ends with these two lines (blank line before them):

  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01GSf9aqVqzwa2vbAejXqV9Z
  ```

- **Test commands:** `npx vitest run <path>` for one file, `npm run test:run` for all, `npm run build` for typecheck + build.

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` | add `framer-motion` dependency |
| `src/test/setup.ts` | disable framer animations in jsdom so `AnimatePresence` / layout resolve synchronously |
| `src/components/atoms/Badge/Badge.tsx` | propless badge that renders only `Hoje` |
| `src/components/atoms/Badge/Badge.module.css` | badge styling, single variant |
| `src/components/atoms/Badge/Badge.test.tsx` | badge test |
| `src/components/molecules/Door/Door.tsx` | grid door: `motion.button` + `layoutId`, new aria-labels, badge only for `today` |
| `src/components/molecules/Door/Door.module.css` | left-hinge outward hover + ajar-when-opened |
| `src/components/molecules/Door/Door.test.tsx` | door test |
| `src/components/organisms/DoorFocus/DoorFocus.tsx` | **new** — portalled overlay: scrim + morphing card + leaf swing + content + close/esc/scrim + focus + scroll lock |
| `src/components/organisms/DoorFocus/DoorFocus.module.css` | **new** |
| `src/components/organisms/DoorFocus/index.ts` | **new** — re-export |
| `src/components/organisms/DoorFocus/DoorFocus.test.tsx` | **new** |
| `src/components/pages/CalendarPage/CalendarPage.tsx` | own `openDay`, render `DoorFocus`, drop `DayDialog` |
| `src/components/pages/CalendarPage/CalendarPage.test.tsx` | updated integration test |
| `src/components/templates/CalendarTemplate/CalendarTemplate.tsx` | remove `dialog` slot |
| `src/components/templates/CalendarTemplate/CalendarTemplate.test.tsx` | updated |
| `src/components/organisms/DayDialog/**` | **deleted** |

---

## Task 1: Add framer-motion + freeze animations in tests

**Files:**
- Modify: `package.json` (dependencies block)
- Modify: `src/test/setup.ts:1-7` (imports + top-level config)

**Interfaces:**
- Consumes: nothing.
- Produces: `framer-motion` resolvable; in the test environment `MotionGlobalConfig.skipAnimations === true`, so `motion` elements apply their `animate` target immediately and `AnimatePresence` unmounts exiting children within a tick.

- [ ] **Step 1: Add the dependency**

In `package.json`, add to `"dependencies"` (keep alphabetical order — before `react`):

```json
  "dependencies": {
    "framer-motion": "11.18.2",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: `package-lock.json` updates, `node_modules/framer-motion` exists, exit 0.

- [ ] **Step 3: Verify the import resolves and the global-config export exists**

Run: `node -e "const m=require('framer-motion'); if(!m.MotionGlobalConfig) throw new Error('no MotionGlobalConfig'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Freeze animations in the test setup**

Edit `src/test/setup.ts` — add the import and the config line right after the existing imports (before the `afterEach`):

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { MotionGlobalConfig } from 'framer-motion';

MotionGlobalConfig.skipAnimations = true;

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 5: Run the full suite — nothing should have changed yet**

Run: `npm run test:run`
Expected: PASS, same test count as before this task.

- [ ] **Step 6: Typecheck + build**

Run: `npm run build`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/test/setup.ts
git commit -m "chore: add framer-motion and skip its animations under vitest"
```

(Remember the commit-message trailer from Global Constraints.)

---

## Task 2: Simplify Badge to a propless "Hoje" pill

**Files:**
- Modify: `src/components/atoms/Badge/Badge.tsx` (full rewrite)
- Modify: `src/components/atoms/Badge/Badge.module.css`
- Modify: `src/components/atoms/Badge/Badge.test.tsx` (full rewrite)

**Interfaces:**
- Consumes: nothing.
- Produces: `Badge` — a component taking **no props**, rendering `<span class="badge" data-variant="today">Hoje</span>`. The `BadgeVariant` type and `variant` prop no longer exist. `src/components/atoms/Badge/index.ts` keeps its `export * from './Badge'`.

- [ ] **Step 1: Rewrite the test to expect a propless badge**

Replace the entire contents of `src/components/atoms/Badge/Badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

test('renders the "Hoje" badge', () => {
  render(<Badge />);
  const el = screen.getByText('Hoje');
  expect(el).toHaveClass('badge');
  expect(el).toHaveAttribute('data-variant', 'today');
});
```

- [ ] **Step 2: Run it — it fails to compile (Badge still requires `variant`)**

Run: `npx vitest run src/components/atoms/Badge/Badge.test.tsx`
Expected: FAIL — type error / `variant` is required, or assertion mismatch.

- [ ] **Step 3: Rewrite `Badge.tsx`**

Replace the entire contents of `src/components/atoms/Badge/Badge.tsx`:

```tsx
import styles from './Badge.module.css';

export function Badge() {
  return (
    <span className={styles.badge} data-variant="today">
      Hoje
    </span>
  );
}
```

- [ ] **Step 4: Trim `Badge.module.css`**

Replace the entire contents of `src/components/atoms/Badge/Badge.module.css`:

```css
.badge {
  position: absolute;
  top: var(--space-1);
  left: var(--space-1);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
  background: #ffd87a;
  color: var(--color-ink);
  pointer-events: none;
}
```

- [ ] **Step 5: Run the Badge test**

Run: `npx vitest run src/components/atoms/Badge/Badge.test.tsx`
Expected: PASS.

- [ ] **Step 6: Full suite — Door still references `BadgeVariant`, so this is expected to fail now**

Run: `npm run test:run`
Expected: FAIL in `src/components/molecules/Door/Door.tsx` (imports `BadgeVariant`) and `Door.test.tsx`. That is fixed in Task 3. Do **not** touch Door here.

- [ ] **Step 7: Commit**

```bash
git add src/components/atoms/Badge/
git commit -m "refactor: reduce Badge to a single propless \"Hoje\" pill"
```

---

## Task 3: Grid door — motion.button, layoutId, new labels, ajar-when-opened

**Files:**
- Modify: `src/components/molecules/Door/Door.tsx`
- Modify: `src/components/molecules/Door/Door.module.css`
- Modify: `src/components/molecules/Door/Door.test.tsx`

**Interfaces:**
- Consumes: `Badge` (propless, Task 2); `framer-motion`'s `motion`.
- Produces: `Door` — unchanged prop signature `{ day: CalendarDay; state: DayState; onOpen: (day: number) => void }`. Renders a `motion.button` with `layoutId={`door-${day.day}`}`, `data-state={state}`, and one of these accessible names:
  - `locked` → `Dia ${n}, por abrir mais tarde`
  - `today` → `Dia ${n}, hoje`
  - `past` → `Dia ${n}, por abrir`
  - `opened` → `Dia ${n}, aberto — ver de novo`

  A `Badge` renders **only** when `state === 'today'`. When `state === 'opened'` the button also carries the `ajar` class.

- [ ] **Step 1: Update the tests**

In `src/components/molecules/Door/Door.test.tsx`:

Replace the `test.each([...])('state %s has data-state and aria-label', ...)` block with:

```tsx
test.each([
  ['locked', 'Dia 5, por abrir mais tarde'],
  ['today', 'Dia 5, hoje'],
  ['past', 'Dia 5, por abrir'],
  ['opened', 'Dia 5, aberto — ver de novo'],
] as const)('state %s has data-state and aria-label', (state, label) => {
  render(<Door day={day} state={state} onOpen={vi.fn()} />);
  const btn = screen.getByRole('button');
  expect(btn).toHaveAttribute('data-state', state);
  expect(btn).toHaveAccessibleName(label);
});
```

Replace the `test('locked shows no badge; today/past/opened show their badge', ...)` block with:

```tsx
test('only the today state renders a badge', () => {
  const { rerender } = render(<Door day={day} state="locked" onOpen={vi.fn()} />);
  expect(screen.queryByText('Hoje')).not.toBeInTheDocument();
  rerender(<Door day={day} state="today" onOpen={vi.fn()} />);
  expect(screen.getByText('Hoje')).toBeInTheDocument();
  rerender(<Door day={day} state="past" onOpen={vi.fn()} />);
  expect(screen.queryByText('Hoje')).not.toBeInTheDocument();
  rerender(<Door day={day} state="opened" onOpen={vi.fn()} />);
  expect(screen.queryByText('Hoje')).not.toBeInTheDocument();
});

test('an opened door carries the ajar class; others do not', () => {
  const { rerender } = render(<Door day={day} state="opened" onOpen={vi.fn()} />);
  expect(screen.getByRole('button')).toHaveClass('ajar');
  rerender(<Door day={day} state="past" onOpen={vi.fn()} />);
  expect(screen.getByRole('button')).not.toHaveClass('ajar');
});
```

Leave the shake tests, the "clicking a today/past/opened door calls onOpen" test, and the grid-area custom-properties test unchanged.

- [ ] **Step 2: Run the Door test — expect failures on labels + badge + ajar**

Run: `npx vitest run src/components/molecules/Door/Door.test.tsx`
Expected: FAIL — old aria-labels, `getByText('Abrir')` gone, ajar-class assertion.

- [ ] **Step 3: Rewrite `Door.tsx`**

Replace the entire contents of `src/components/molecules/Door/Door.tsx`:

```tsx
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '../../atoms/Badge';
import { DoorNumber } from '../../atoms/DoorNumber';
import type { CalendarDay } from '../../../data/calendar';
import type { DayState } from '../../../lib/dayState';
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
      layoutId={`door-${day.day}`}
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
```

- [ ] **Step 4: Update `Door.module.css` — left hinge, outward rotation**

In `src/components/molecules/Door/Door.module.css` make exactly these changes:

Change `.panel`'s `transform-origin`:

```css
.panel {
  position: absolute;
  inset: 0;
  border: var(--door-border);
  border-radius: var(--radius);
  background-size: cover;
  background-position: center;
  box-shadow: var(--shadow-door);
  transform-origin: left center;
  transition: transform 0.5s ease-in-out;
}
```

Replace the hover/focus rule and the `.ajar` rules (the block currently reading `.door:not([data-state='locked'])...hover .panel { transform: rotateY(24deg); }` down through `.door.ajar:focus-visible .panel { transform: rotateY(72deg); }`) with:

```css
.door:not([data-state='locked']):not(.ajar):hover .panel,
.door:not([data-state='locked']):not(.ajar):focus-visible .panel {
  transform: rotateY(-24deg);
}

.ajar .panel {
  transform: rotateY(-14deg);
  filter: brightness(0.9);
}

.door.ajar:hover .panel,
.door.ajar:focus-visible .panel {
  transform: rotateY(-14deg);
}
```

Leave `.shake`, `@keyframes shake`, `@keyframes pulse`, the `[data-state]` filter/glow rules, and the `@media (prefers-reduced-motion: reduce)` block unchanged (its `transform: none` reset selectors already match the ones above).

- [ ] **Step 5: Run the Door test**

Run: `npx vitest run src/components/molecules/Door/Door.test.tsx`
Expected: PASS.

- [ ] **Step 6: Full suite — CalendarPage integration will still fail (old labels), that is Task 5**

Run: `npm run test:run`
Expected: `Badge` + `Door` files PASS. `CalendarPage.test.tsx` FAILS on `name: 'Dia 5, hoje — abrir'` / `'Dia 20, ainda fechado'`. Leave it for Task 5.

- [ ] **Step 7: Lint**

Run: `npm run lint`
Expected: exit 0 (no unused `BadgeVariant` import remaining).

- [ ] **Step 8: Commit**

```bash
git add src/components/molecules/Door/
git commit -m "feat: make the grid door a shared-layout element that opens outward"
```

---

## Task 4: DoorFocus overlay — zoom-morph card, outward leaf swing, content

**Files:**
- Create: `src/components/organisms/DoorFocus/DoorFocus.tsx`
- Create: `src/components/organisms/DoorFocus/DoorFocus.module.css`
- Create: `src/components/organisms/DoorFocus/index.ts`
- Create: `src/components/organisms/DoorFocus/DoorFocus.test.tsx`

**Interfaces:**
- Consumes: `CalendarDay` type (`src/data/calendar.ts`); `CopyableCode` (`src/components/molecules/CopyableCode`); `framer-motion`'s `AnimatePresence`, `motion`, `useReducedMotion`; `react-dom`'s `createPortal`.
- Produces: `DoorFocus` — `{ day: CalendarDay | null; onClose: () => void }`. When `day` is non-null it portals into `document.body`:
  - `<div class="scrim">` — clicking it calls `onClose`.
  - `<div class="card" role="dialog" aria-modal="true" aria-labelledby="door-focus-title">` — has `layoutId={`door-${day.day}`}` unless reduced motion; clicking it does **not** close.
  - Inside: `.day` (number), `<h2 id="door-focus-title" class="title">`, `.message`, `<CopyableCode>` when `day.code` is set, a `.leaf` (`aria-hidden`), and a `.close` button (`aria-label="Fechar"`).
  - On mount: focus moves to `.close`; `document.body.style.overflow` is set to `hidden`. On unmount: overflow restored, focus returned to the element that was focused before mount. `Escape` anywhere calls `onClose`.

- [ ] **Step 1: Write the test file**

Create `src/components/organisms/DoorFocus/DoorFocus.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DoorFocus } from './DoorFocus';
import type { CalendarDay } from '../../../data/calendar';

const withCode: CalendarDay = {
  day: 8,
  title: 'Código secreto',
  message: 'Guarda o código.',
  code: 'ADVENTO-08',
  image: 'gift2',
  size: '1x1',
  gridArea: '1 / 1 / span 1 / span 1',
  gridAreaMobile: '1 / 1 / span 1 / span 1',
};
const noCode: CalendarDay = { ...withCode, day: 9, title: 'Luz das velas', message: 'Acende uma vela.', code: undefined };

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
    matches: q.includes('reduce') ? matches : false,
    media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
}

afterEach(() => vi.restoreAllMocks());

test('renders nothing when day is null', () => {
  render(<DoorFocus day={null} onClose={vi.fn()} />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('shows the day content and links the title', () => {
  render(<DoorFocus day={withCode} onClose={vi.fn()} />);
  const dialog = screen.getByRole('dialog');
  const heading = screen.getByRole('heading', { level: 2 });
  expect(heading).toHaveTextContent('Código secreto');
  expect(dialog).toHaveAttribute('aria-labelledby', heading.id);
  expect(screen.getByText('Guarda o código.')).toBeInTheDocument();
});

test('renders the promo code only when the day has one', () => {
  const { rerender } = render(<DoorFocus day={withCode} onClose={vi.fn()} />);
  expect(screen.getByText('ADVENTO-08')).toBeInTheDocument();
  rerender(<DoorFocus day={noCode} onClose={vi.fn()} />);
  expect(screen.queryByText('ADVENTO-08')).not.toBeInTheDocument();
});

test('close button, scrim click and Escape all call onClose; card click does not', () => {
  const onClose = vi.fn();
  render(<DoorFocus day={withCode} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(3);
  onClose.mockClear();
  fireEvent.click(screen.getByRole('dialog'));
  expect(onClose).not.toHaveBeenCalled();
});

test('moves focus to the close button and restores it on close', async () => {
  const trigger = document.createElement('button');
  document.body.appendChild(trigger);
  trigger.focus();
  expect(trigger).toHaveFocus();

  const { rerender } = render(<DoorFocus day={withCode} onClose={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Fechar' })).toHaveFocus();

  rerender(<DoorFocus day={null} onClose={vi.fn()} />);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();
  trigger.remove();
});

test('locks body scroll while open and restores it after', async () => {
  const { rerender } = render(<DoorFocus day={withCode} onClose={vi.fn()} />);
  expect(document.body.style.overflow).toBe('hidden');
  rerender(<DoorFocus day={null} onClose={vi.fn()} />);
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(document.body.style.overflow).toBe('');
});

test('under reduced motion it still renders a working dialog', () => {
  mockReducedMotion(true);
  const onClose = vi.fn();
  render(<DoorFocus day={noCode} onClose={onClose} />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run it — module does not exist yet**

Run: `npx vitest run src/components/organisms/DoorFocus/DoorFocus.test.tsx`
Expected: FAIL — cannot find `./DoorFocus`.

- [ ] **Step 3: Create `DoorFocus.tsx`**

Create `src/components/organisms/DoorFocus/DoorFocus.tsx`:

```tsx
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
      {day && <DoorFocusPanel key={day.day} day={day} onClose={onClose} />}
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
```

- [ ] **Step 4: Create `DoorFocus.module.css`**

Create `src/components/organisms/DoorFocus/DoorFocus.module.css`:

```css
.scrim {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
}

.card {
  position: relative;
  width: min(86vw, 420px);
  aspect-ratio: 3 / 4;
  border-radius: var(--radius);
  background: var(--color-red);
  color: var(--color-white);
  box-shadow: var(--shadow-door);
}

.box {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4);
  text-align: center;
  overflow: auto;
}

.day {
  font-family: var(--font-display);
  font-size: 3rem;
  margin: 0;
}

.title {
  margin: 0;
  font-size: 1.4rem;
}

.message {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
}

.leaf {
  position: absolute;
  inset: 0;
  border: var(--door-border);
  border-radius: var(--radius);
  background-size: cover;
  background-position: center;
  box-shadow: var(--shadow-door);
  backface-visibility: hidden;
}

.img-gift1 { background-image: url('../../../assets/gift1.png'); }
.img-gift2 { background-image: url('../../../assets/gift2.png'); }
.img-gift3 { background-image: url('../../../assets/gift3.png'); }
.img-gift4 { background-image: url('../../../assets/gift4.png'); }
.img-gift5 { background-image: url('../../../assets/gift5.png'); }

.close {
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  width: 32px;
  height: 32px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--color-white);
  color: var(--color-red-dark);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  z-index: 2;
}
```

- [ ] **Step 5: Create the barrel**

Create `src/components/organisms/DoorFocus/index.ts`:

```ts
export * from './DoorFocus';
```

- [ ] **Step 6: Run the DoorFocus test**

Run: `npx vitest run src/components/organisms/DoorFocus/DoorFocus.test.tsx`
Expected: PASS (all 7 tests).

- [ ] **Step 7: Coverage on the new file**

Run: `npx vitest run --coverage src/components/organisms/DoorFocus/DoorFocus.test.tsx`
Expected: `DoorFocus.tsx` at 100% / ≥95% on every column. If a branch is uncovered, add the missing assertion before moving on.

- [ ] **Step 8: Lint**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/components/organisms/DoorFocus/
git commit -m "feat: add DoorFocus overlay that zooms in and swings the door open"
```

---

## Task 5: Wire CalendarPage, drop DayDialog, trim CalendarTemplate

**Files:**
- Modify: `src/components/pages/CalendarPage/CalendarPage.tsx`
- Modify: `src/components/pages/CalendarPage/CalendarPage.test.tsx`
- Modify: `src/components/templates/CalendarTemplate/CalendarTemplate.tsx`
- Modify: `src/components/templates/CalendarTemplate/CalendarTemplate.test.tsx`
- Delete: `src/components/organisms/DayDialog/DayDialog.tsx`, `DayDialog.module.css`, `DayDialog.test.tsx`, `index.ts`

**Interfaces:**
- Consumes: `DoorFocus` (Task 4); `Door` new aria-labels (Task 3).
- Produces: `CalendarTemplateProps` is now `{ header: ReactNode; grid: ReactNode }` (no `dialog`). `CalendarPage` renders `<DoorFocus>` as a sibling of `<CalendarTemplate>` and owns `openDay: number | null`.

- [ ] **Step 1: Update the CalendarTemplate test**

Replace the single test in `src/components/templates/CalendarTemplate/CalendarTemplate.test.tsx` with:

```tsx
test('renders the header and grid slots plus the snow canvas', () => {
  const { container } = render(
    <CalendarTemplate
      header={<div data-testid="header" />}
      grid={<div data-testid="grid" />}
    />,
  );
  expect(screen.getByTestId('header')).toBeInTheDocument();
  expect(screen.getByTestId('grid')).toBeInTheDocument();
  expect(container.querySelector('canvas')).toBeInTheDocument();
});
```

- [ ] **Step 2: Update the CalendarPage test**

In `src/components/pages/CalendarPage/CalendarPage.test.tsx`:

- add `waitFor` to the import: `import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';`
- in `test('renders the 25 doors with the header', ...)` leave as is.
- in `test("opening today's door shows its content and marks it opened", ...)` replace the body with:

```tsx
  setSearch('?day=5');
  render(<CalendarPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Dia 5, hoje' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent(
    'Receita rápida',
  );
  expect(
    screen.getByRole('button', { name: 'Dia 5, aberto — ver de novo' }),
  ).toBeInTheDocument();
```

- in `test('a locked door does not open the dialog', ...)` change the button name to `'Dia 20, por abrir mais tarde'`.
- replace `test('closing the dialog clears the selected day', ...)` with:

```tsx
test('closing the overlay clears the open day', async () => {
  setSearch('?day=5');
  render(<CalendarPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Dia 5, hoje' }));
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  );
});
```

- [ ] **Step 3: Run both tests — expect failures (old wiring)**

Run: `npx vitest run src/components/templates/CalendarTemplate/CalendarTemplate.test.tsx src/components/pages/CalendarPage/CalendarPage.test.tsx`
Expected: FAIL — `CalendarTemplate` still requires `dialog`; `CalendarPage` still renders `DayDialog`.

- [ ] **Step 4: Trim `CalendarTemplate.tsx`**

Replace the entire contents of `src/components/templates/CalendarTemplate/CalendarTemplate.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Snow } from '../../atoms/Snow';
import styles from './CalendarTemplate.module.css';

export interface CalendarTemplateProps {
  header: ReactNode;
  grid: ReactNode;
}

export function CalendarTemplate({ header, grid }: CalendarTemplateProps) {
  return (
    <div className={styles.page}>
      <div className={styles.background} aria-hidden="true" />
      <Snow />
      <main className={styles.content}>
        {header}
        {grid}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Rewrite `CalendarPage.tsx`**

Replace the entire contents of `src/components/pages/CalendarPage/CalendarPage.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { CalendarTemplate } from '../../templates/CalendarTemplate';
import { SiteHeader } from '../../molecules/SiteHeader';
import { CalendarGrid, type CalendarGridItem } from '../../organisms/CalendarGrid';
import { DoorFocus } from '../../organisms/DoorFocus';
import { CALENDAR } from '../../../data/calendar';
import { getDayState } from '../../../lib/dayState';
import { useAdventDay } from '../../../hooks/useAdventDay';
import { useOpenedDays } from '../../../hooks/useOpenedDays';

const TITLE = 'Calendário do Advento';
const SUBTITLE = 'Abre uma porta por dia até ao Natal';

export function CalendarPage() {
  const today = useAdventDay();
  const { openedDays, markOpened } = useOpenedDays();
  const [openDay, setOpenDay] = useState<number | null>(null);

  const items = useMemo<CalendarGridItem[]>(
    () =>
      CALENDAR.map((day) => ({
        day,
        state: getDayState(day.day, today, openedDays),
      })),
    [today, openedDays],
  );

  const handleOpen = (dayNumber: number) => {
    markOpened(dayNumber);
    setOpenDay(dayNumber);
  };

  const openDayData =
    CALENDAR.find((entry) => entry.day === openDay) ?? null;

  return (
    <>
      <CalendarTemplate
        header={<SiteHeader title={TITLE} subtitle={SUBTITLE} />}
        grid={<CalendarGrid items={items} onOpen={handleOpen} />}
      />
      <DoorFocus day={openDayData} onClose={() => setOpenDay(null)} />
    </>
  );
}
```

- [ ] **Step 6: Delete the DayDialog organism**

Run:
```bash
git rm src/components/organisms/DayDialog/DayDialog.tsx src/components/organisms/DayDialog/DayDialog.module.css src/components/organisms/DayDialog/DayDialog.test.tsx src/components/organisms/DayDialog/index.ts
```
Expected: 4 files staged for deletion. Confirm nothing else imports it:
```bash
grep -rn "DayDialog" src/
```
Expected: no output.

- [ ] **Step 7: Run the two updated tests**

Run: `npx vitest run src/components/templates/CalendarTemplate/CalendarTemplate.test.tsx src/components/pages/CalendarPage/CalendarPage.test.tsx`
Expected: PASS.

- [ ] **Step 8: Full suite**

Run: `npm run test:run`
Expected: PASS, no `DayDialog` file in the run.

- [ ] **Step 9: Coverage gate**

Run: `npm run test:coverage`
Expected: PASS with all four thresholds ≥ 95%. If `CalendarPage.tsx` `?? null` shows a partial branch, add an assertion to the "renders the 25 doors" test that no `dialog` is present initially (`expect(screen.queryByRole('dialog')).not.toBeInTheDocument()`), which exercises the `null` side.

- [ ] **Step 10: Lint + build**

Run: `npm run lint && npm run build`
Expected: both exit 0.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: reveal day content in the DoorFocus overlay, remove DayDialog"
```

---

## Self-Review

**1. Spec coverage**

| Spec item | Task |
|-----------|------|
| Zoom into the clicked door (layout morph) | 3 (`layoutId` on door) + 4 (`layoutId` on card) |
| Door swings open outward | 3 (CSS left hinge, negative rotateY) + 4 (leaf `rotateY: -112`, `transformOrigin: left center`) |
| Content inside the box, behind the leaf, no modal | 4 (`.box` + `.leaf`) + 5 (remove `DayDialog`) |
| Remove `Abrir` / `✓ Aberto` labels; keep `Hoje` | 2 (Badge) + 3 (`state === 'today'` gate) |
| Opened door rests slightly ajar | 3 (`.ajar .panel { rotateY(-14deg) }`) |
| `prefers-reduced-motion` respected | 4 (`useReducedMotion` branch) + 3 (existing CSS media block, unchanged) |
| Keyboard + SR access (dialog role, esc, focus, scroll lock) | 4 |
| New aria-label strings | 3 |
| `framer-motion` added, exact version | 1 |
| Delete `DayDialog`, drop `dialog` slot | 5 |
| Tests updated: Badge, Door, CalendarTemplate, CalendarPage; new DoorFocus; delete DayDialog test | 2, 3, 5, 4 |

No gaps.

**2. Placeholder scan** — no TBD / "handle edge cases" / bare "write tests"; every code step has full code.

**3. Type consistency** — `DoorFocusProps { day: CalendarDay | null; onClose: () => void }` consumed by CalendarPage exactly. `layoutId` string form `` `door-${day.day}` `` identical in Door (Task 3) and DoorFocus (Task 4). `Badge` is propless in Task 2 and called `<Badge />` in Task 3. `TITLE_ID = 'door-focus-title'` matches the test's `aria-labelledby` assertion (via `heading.id`). `CalendarTemplateProps` drops `dialog` in Task 5 and the test stops passing it.

**Risks carried from the spec:** if the cross-portal `layoutId` morph flickers in the real browser, fall back to a measured-rect `initial`/`animate` on the card (one `getBoundingClientRect` at open) — no plan task depends on the morph mechanism beyond "card appears and grows".
