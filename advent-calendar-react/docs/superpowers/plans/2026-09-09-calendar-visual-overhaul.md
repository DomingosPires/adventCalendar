# Calendar Visual Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the advent calendar a "modern with depth" art-direction and motion pass — framed doors with bevel and layered shadow, a coherent inline-SVG motif set replacing the five gift PNGs, a swung-open resting state, spring-driven grid entrance and door-open choreography, and a frosted-glass overlay that springs from the clicked door instead of a distorted shared-layout morph.

**Architecture:** A new elevation/glass token layer in `theme.css` underpins everything. A `src/lib/motion.ts` module centralises spring configs and the reduced-motion switch. A new `Motif` atom provides ten flat SVG illustrations, mapped per day in `calendar.ts` (the `image` field becomes `motif`). `Door` becomes a three-layer component (`.frame` / `.compartment` / `.leaf`) and reports its `getBoundingClientRect()` through `onOpen(day, rect)`. `DoorFocus` drops the `layoutId` shared-layout mechanism, takes an `originRect` prop, and springs a frosted-glass card from that rect with a contained door-swing and staggered content. `CalendarGrid` gains a staggered entrance. Header and background get a finishing pass.

**Tech Stack:** React 18.3.1, TypeScript (strict), Vite 5, Vitest + Testing Library (jsdom), CSS Modules (`classNameStrategy: 'non-scoped'`), framer-motion 11.18.2 (already installed).

**Spec:** `advent-calendar-react/docs/superpowers/specs/2026-09-09-calendar-visual-overhaul-design.md`

## Global Constraints

- **Dependency versions pinned exact** — no `^`/`~`. No new runtime deps (framer-motion 11.18.2 is already present).
- **`npm run lint`** (`eslint . --max-warnings 0`) and **`npm run build`** (`tsc -b` + vite) must both exit 0 before every commit. `npm run test:run` must be green before every commit. This plan contains **no** documented-red tasks — each task ends fully green.
- **Coverage thresholds are 95%** for statements / branches / functions / lines (`vite.config.ts`). Every new branch needs a test.
- **Vitest globals are on** — do not import `test`/`expect`/`vi`/`beforeEach`.
- **`MotionGlobalConfig.skipAnimations = true`** is set in `src/test/setup.ts`; framer animations collapse to one tick in jsdom. Assert on DOM / attributes / props, never on animation frames or timing.
- **User-facing copy is European Portuguese.** Exact strings are given in each task.
- **Do NOT touch** `calendar.ts`'s `gridArea` / `gridAreaMobile` values, the grid tessellation, `src/lib/dayState.ts`, `src/hooks/`, or any date logic.
- **Keep the a11y contract** established by the previous feature and its fix wave: overlay `role="dialog"` + `aria-modal="true"` + `aria-labelledby`; Esc / scrim-press-release / ✕ close; focus moves to ✕ on open and is restored to the source door on close; Tab focus trap; `document.body` scroll lock; the split mount effect (`[]` one-shot + `[onClose]` Escape listener); the scrim mousedown-target guard.
- **Visual fidelity:** each task delivers the spec's named structure, class names, token usage, transform values, and timings. Pixel-level aesthetic tuning happens in a screenshot-driven polish pass the controller runs after Task 8 — implementers are not expected to visually tune headlessly.
- **Commit message trailer:** every commit body ends with a blank line then exactly:

  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01GSf9aqVqzwa2vbAejXqV9Z
  ```

- **Test commands:** `npx vitest run <path>` for one file; `npm run test:run` for all; `npm run test:coverage` for the gate.
- Baseline before Task 1: **77 tests / 16 files green.**

## File Structure

| File | Responsibility |
|------|----------------|
| `src/styles/theme.css` | elevation / bevel / shadow ramp / glass / brass / radii / focus-ring tokens |
| `src/lib/motion.ts` | spring configs, durations, `reduced()` variant helper |
| `src/lib/motion.test.ts` | unit test for the above |
| `src/components/atoms/Motif/Motif.tsx` | `<Motif name>` — ten inline-SVG illustrations |
| `src/components/atoms/Motif/index.ts` | re-export + `MOTIF_NAMES` / `MotifName` |
| `src/components/atoms/Motif/Motif.test.tsx` | renders an svg per name; unknown → null |
| `src/data/calendar.ts` | `image: GiftImage` → `motif: MotifName` |
| `src/data/calendar.test.ts` | assert `motif` instead of `image` |
| `src/components/molecules/Door/Door.tsx` + `.module.css` | three-layer framed door, swung-open state, `onOpen(day, rect)` |
| `src/components/molecules/Door/doorLayoutId.ts` | **deleted** in Task 6 |
| `src/components/atoms/DoorNumber/DoorNumber.tsx` + `.module.css` | debossed number circle |
| `src/components/atoms/Badge/Badge.module.css` | brass "Hoje" pill |
| `src/components/organisms/CalendarGrid/CalendarGrid.tsx` + `.module.css` | staggered entrance, `onOpen` rect passthrough |
| `src/components/organisms/DoorFocus/DoorFocus.tsx` + `.module.css` | frosted-glass card, rect-origin spring, contained leaf, staggered content |
| `src/components/pages/CalendarPage/CalendarPage.tsx` | capture + thread `originRect` |
| `src/components/molecules/SiteHeader/SiteHeader.tsx` + `.module.css` | display type + ornament + entrance |
| `src/components/templates/CalendarTemplate/CalendarTemplate.module.css` | vignette + gradient background |
| `src/components/molecules/CopyableCode/CopyableCode.module.css` | brass code chip |
| `src/assets/gift1..5.png` | **deleted** in Task 8 |

---

## Task 1: Elevation, glass & brass tokens

**Files:**
- Modify: `src/styles/theme.css`

**Interfaces:**
- Consumes: nothing.
- Produces: the CSS custom properties every later task references. This task is **additive** — `--shadow-door`, `--door-border`, `--radius`, `--color-red*`, `--color-white`, `--color-cream`, `--color-ink` all stay (removed only in Task 8 once their last consumer migrates).

- [ ] **Step 1: Add the token block**

In `src/styles/theme.css`, inside `:root`, after the existing tokens, add:

```css
  /* --- elevation & surfaces --- */
  --surface-0: #17120f;
  --surface-1: #1f2e28;
  --surface-2: #24382f;
  --surface-3: #2b1f1a;
  --bevel-hi: inset 0 1px 0 rgba(255, 255, 255, 0.10),
    inset 1px 0 0 rgba(255, 255, 255, 0.05);
  --bevel-lo: inset 0 -2px 5px rgba(0, 0, 0, 0.45),
    inset -1px 0 0 rgba(0, 0, 0, 0.30);
  --shadow-1: 0 1px 2px rgba(0, 0, 0, 0.30);
  --shadow-2: 0 4px 10px rgba(0, 0, 0, 0.35), 0 1px 2px rgba(0, 0, 0, 0.30);
  --shadow-3: 0 14px 30px rgba(0, 0, 0, 0.45), 0 4px 8px rgba(0, 0, 0, 0.30);
  --shadow-4: 0 30px 80px rgba(0, 0, 0, 0.55), 0 8px 20px rgba(0, 0, 0, 0.40);
  --shadow-contact: 0 2px 6px rgba(0, 0, 0, 0.5);

  /* --- glass --- */
  --glass-bg: rgba(20, 14, 12, 0.72);
  --glass-solid: #1a1310; /* @supports-not fallback */
  --glass-border: rgba(255, 255, 255, 0.14);
  --blur-glass: 18px;

  /* --- accents --- */
  --glow-warm: #ffcf87;
  --color-brass: #c9a24b;
  --color-brass-dim: #8a6f33;

  /* --- motif fills (leaf context defaults; override per context) --- */
  --motif-ink: #cfe3d4;
  --motif-accent: #c9a24b;
  --motif-hi: rgba(255, 255, 255, 0.5);

  /* --- radii & focus --- */
  --radius-sm: 4px;
  --radius-md: 10px;
  --radius-lg: 18px;
  --focus-ring: 0 0 0 2px var(--surface-0), 0 0 0 4px var(--color-brass);
```

- [ ] **Step 2: Retune existing palette values**

In the same `:root`, change these existing declarations to:

```css
  --bg-page: #17120f;
  --glow-today: 0 0 0 2px var(--color-brass), 0 0 22px 2px rgba(201, 162, 75, 0.55);
```

Leave every other existing token unchanged.

- [ ] **Step 3: Build + full suite (nothing should change)**

Run: `npm run build`
Expected: exit 0.
Run: `npm run test:run`
Expected: 77 passed / 16 files (no test asserts token values).
Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/styles/theme.css
git commit -m "feat: add elevation, glass and brass design tokens"
```

---

## Task 2: Motion module

**Files:**
- Create: `src/lib/motion.ts`
- Create: `src/lib/motion.test.ts`

**Interfaces:**
- Consumes: `framer-motion` types.
- Produces:
  - `springSoft: { type: 'spring'; stiffness: 200; damping: 26 }`
  - `springSnappy: { type: 'spring'; stiffness: 260; damping: 24 }`
  - `durations: { fast: 0.12; base: 0.25; slow: 0.45 }`
  - `reduced<T extends Record<string, unknown>>(reduce: boolean, full: T, flat: T): T` — returns `flat` when `reduce` is true, else `full`. Used to pick variant/transition objects.

- [ ] **Step 1: Write the failing test**

Create `src/lib/motion.test.ts`:

```ts
import { springSoft, springSnappy, durations, reduced } from './motion';

test('spring configs are framer spring objects', () => {
  expect(springSoft).toMatchObject({ type: 'spring', stiffness: 200, damping: 26 });
  expect(springSnappy).toMatchObject({ type: 'spring', stiffness: 260, damping: 24 });
});

test('durations expose fast/base/slow seconds', () => {
  expect(durations.fast).toBeLessThan(durations.base);
  expect(durations.base).toBeLessThan(durations.slow);
});

test('reduced() picks the flat value only when reduce is true', () => {
  const full = { opacity: 0, y: 12 };
  const flat = { opacity: 0 };
  expect(reduced(true, full, flat)).toBe(flat);
  expect(reduced(false, full, flat)).toBe(full);
});
```

- [ ] **Step 2: Run it — fails (module missing)**

Run: `npx vitest run src/lib/motion.test.ts`
Expected: FAIL — cannot find `./motion`.

- [ ] **Step 3: Write `src/lib/motion.ts`**

```ts
import type { Transition } from 'framer-motion';

export const springSoft: Transition = { type: 'spring', stiffness: 200, damping: 26 };
export const springSnappy: Transition = { type: 'spring', stiffness: 260, damping: 24 };

export const durations = { fast: 0.12, base: 0.25, slow: 0.45 } as const;

/** Pick `flat` under reduced motion, `full` otherwise. */
export function reduced<T>(reduce: boolean, full: T, flat: T): T {
  return reduce ? flat : full;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/motion.test.ts`
Expected: PASS.

- [ ] **Step 5: Build + lint + full suite**

Run: `npm run build && npm run lint && npm run test:run`
Expected: all exit 0; 80 tests / 17 files.

- [ ] **Step 6: Commit**

```bash
git add src/lib/motion.ts src/lib/motion.test.ts
git commit -m "feat: add shared motion config module"
```

---

## Task 3: Motif atom

**Files:**
- Create: `src/components/atoms/Motif/Motif.tsx`
- Create: `src/components/atoms/Motif/index.ts`
- Create: `src/components/atoms/Motif/Motif.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type MotifName = 'wreath' | 'candle' | 'star' | 'gift' | 'tree' | 'bell' | 'snowflake' | 'stocking' | 'bauble' | 'candycane'`
  - `const MOTIF_NAMES: readonly MotifName[]` — all ten, in that order.
  - `<Motif name={MotifName} title?: string />` — renders an `<svg viewBox="0 0 100 100" role="img" aria-hidden={title ? undefined : true} focusable="false" class="motif">`; unknown `name` renders `null`. Shapes fill from `var(--motif-ink)` / `var(--motif-accent)` / `var(--motif-hi)`.

- [ ] **Step 1: Write the failing test**

Create `src/components/atoms/Motif/Motif.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { Motif, MOTIF_NAMES } from './index';

test('renders an svg for every motif name', () => {
  for (const name of MOTIF_NAMES) {
    const { container, unmount } = render(<Motif name={name} />);
    const svg = container.querySelector('svg');
    expect(svg, name).not.toBeNull();
    expect(svg).toHaveAttribute('viewBox', '0 0 100 100');
    expect(svg?.querySelectorAll('*').length ?? 0).toBeGreaterThan(0);
    unmount();
  }
});

test('there are exactly ten distinct motifs', () => {
  expect(new Set(MOTIF_NAMES).size).toBe(10);
});

test('an unknown name renders nothing', () => {
  // @ts-expect-error deliberately invalid
  const { container } = render(<Motif name="reindeer" />);
  expect(container.querySelector('svg')).toBeNull();
});

test('a title makes it a labelled image', () => {
  const { container } = render(<Motif name="star" title="estrela" />);
  const svg = container.querySelector('svg');
  expect(svg).toHaveAttribute('role', 'img');
  expect(container.querySelector('title')).toHaveTextContent('estrela');
});
```

- [ ] **Step 2: Run it — fails (module missing)**

Run: `npx vitest run src/components/atoms/Motif/Motif.test.tsx`
Expected: FAIL — cannot find `./index`.

- [ ] **Step 3: Create `Motif.tsx`**

Flat two-tone shapes; `ink` = line/body, `accent` = brass detail, `hi` = a highlight sliver. Keep them simple and coherent.

```tsx
import type { ReactElement } from 'react';

export type MotifName =
  | 'wreath'
  | 'candle'
  | 'star'
  | 'gift'
  | 'tree'
  | 'bell'
  | 'snowflake'
  | 'stocking'
  | 'bauble'
  | 'candycane';

export const MOTIF_NAMES: readonly MotifName[] = [
  'wreath', 'candle', 'star', 'gift', 'tree',
  'bell', 'snowflake', 'stocking', 'bauble', 'candycane',
];

const ink = 'var(--motif-ink)';
const accent = 'var(--motif-accent)';
const hi = 'var(--motif-hi)';

const SHAPES: Record<MotifName, ReactElement> = {
  wreath: (
    <>
      <circle cx="50" cy="52" r="30" fill="none" stroke={ink} strokeWidth="12" />
      <circle cx="50" cy="52" r="30" fill="none" stroke={hi} strokeWidth="3" />
      <path d="M50 14l7 12h-14z" fill={accent} />
      <circle cx="38" cy="40" r="3" fill={accent} />
      <circle cx="64" cy="46" r="3" fill={accent} />
      <circle cx="46" cy="72" r="3" fill={accent} />
    </>
  ),
  candle: (
    <>
      <rect x="42" y="34" width="16" height="48" rx="3" fill={ink} />
      <rect x="42" y="34" width="5" height="48" fill={hi} />
      <rect x="34" y="80" width="32" height="8" rx="3" fill={accent} />
      <path d="M50 16c6 6 6 12 0 18-6-6-6-12 0-18z" fill={accent} />
      <path d="M50 20c3 4 3 8 0 12-3-4-3-8 0-12z" fill={hi} />
    </>
  ),
  star: (
    <>
      <path d="M50 12l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z" fill={ink} />
      <path d="M50 24l7 15 16 2-12 11 3 16-14-8v-36z" fill={hi} opacity="0.6" />
      <circle cx="50" cy="46" r="6" fill={accent} />
    </>
  ),
  gift: (
    <>
      <rect x="20" y="40" width="60" height="44" rx="4" fill={ink} />
      <rect x="20" y="40" width="60" height="12" fill={hi} opacity="0.5" />
      <rect x="44" y="40" width="12" height="44" fill={accent} />
      <path d="M50 40c-10-14-26-8-20 2 4 6 14 4 20-2zm0 0c10-14 26-8 20 2-4 6-14 4-20-2z" fill={accent} />
    </>
  ),
  tree: (
    <>
      <path d="M50 14l20 30H30zM50 34l24 34H26zM50 54l28 34H22z" fill={ink} />
      <rect x="44" y="84" width="12" height="10" fill={accent} />
      <circle cx="50" cy="18" r="4" fill={accent} />
      <path d="M50 14l20 30H50z" fill={hi} opacity="0.35" />
    </>
  ),
  bell: (
    <>
      <path d="M50 20c14 0 22 12 22 30 0 8 3 12 6 16H22c3-4 6-8 6-16 0-18 8-30 22-30z" fill={ink} />
      <path d="M50 20c-8 0-14 5-18 14 4 4 10 6 18 6z" fill={hi} opacity="0.5" />
      <circle cx="50" cy="82" r="6" fill={accent} />
      <rect x="47" y="12" width="6" height="10" rx="3" fill={accent} />
    </>
  ),
  snowflake: (
    <>
      <g stroke={ink} strokeWidth="6" strokeLinecap="round">
        <path d="M50 14v72M20 32l60 36M80 32L20 68" />
      </g>
      <g stroke={accent} strokeWidth="6" strokeLinecap="round">
        <path d="M50 24l-8 8M50 24l8 8M50 76l-8-8M50 76l8-8" />
      </g>
      <circle cx="50" cy="50" r="6" fill={hi} />
    </>
  ),
  stocking: (
    <>
      <path d="M40 20h24v34c0 6 4 8 10 12l8 6c6 4 4 14-4 14H40c-6 0-8-4-8-10z" fill={ink} />
      <path d="M40 20h24v10H40z" fill={accent} />
      <path d="M40 30h24v6H40z" fill={hi} opacity="0.5" />
      <circle cx="70" cy="86" r="4" fill={accent} />
    </>
  ),
  bauble: (
    <>
      <circle cx="50" cy="56" r="30" fill={ink} />
      <path d="M50 26a30 30 0 0 0-21 51z" fill={hi} opacity="0.4" />
      <rect x="44" y="14" width="12" height="12" rx="2" fill={accent} />
      <path d="M28 50h44M32 66h36" stroke={accent} strokeWidth="4" />
    </>
  ),
  candycane: (
    <>
      <path d="M40 84V44a18 18 0 0 1 36 0v6" fill="none" stroke={ink} strokeWidth="14" strokeLinecap="round" />
      <path d="M40 84V44a18 18 0 0 1 36 0v6" fill="none" stroke={accent} strokeWidth="14" strokeLinecap="round" strokeDasharray="8 10" />
      <path d="M40 84V44a18 18 0 0 1 12-17" fill="none" stroke={hi} strokeWidth="3" strokeLinecap="round" />
    </>
  ),
};

export interface MotifProps {
  name: MotifName;
  title?: string;
}

export function Motif({ name, title }: MotifProps): ReactElement | null {
  const shape = SHAPES[name];
  if (!shape) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      className="motif"
      role="img"
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {shape}
    </svg>
  );
}
```

- [ ] **Step 4: Create `index.ts`**

```ts
export * from './Motif';
```

- [ ] **Step 5: Run the Motif test**

Run: `npx vitest run src/components/atoms/Motif/Motif.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 6: Coverage on the new file**

Run: `npx vitest run --coverage src/components/atoms/Motif/Motif.test.tsx`
Expected: `Motif.tsx` ≥ 95% on every metric (the `if (!shape) return null` branch is covered by the unknown-name test; the `title` ternary by the labelled test).

- [ ] **Step 7: Build + lint + full suite**

Run: `npm run build && npm run lint && npm run test:run`
Expected: all exit 0; 84 tests / 18 files.

- [ ] **Step 8: Commit**

```bash
git add src/components/atoms/Motif/
git commit -m "feat: add the Motif atom with ten flat SVG illustrations"
```

---

## Task 4: Move the calendar data off gift images onto motifs

**Files:**
- Modify: `src/data/calendar.ts`
- Modify: `src/data/calendar.test.ts`
- Modify: `src/components/molecules/Door/Door.tsx` (minimal — swap the image class for `<Motif>`)
- Modify: `src/components/molecules/Door/Door.module.css` (drop `.img-gift*` rules)
- Modify: `src/components/molecules/Door/Door.test.tsx` (fixture `image` → `motif`)
- Modify: `src/components/organisms/DoorFocus/DoorFocus.tsx` (minimal — swap the image class for `<Motif>`)
- Modify: `src/components/organisms/DoorFocus/DoorFocus.module.css` (drop `.img-gift*` rules)
- Modify: `src/components/organisms/DoorFocus/DoorFocus.test.tsx` (fixtures `image` → `motif`)

**Interfaces:**
- Consumes: `MotifName`, `MOTIF_NAMES`, `Motif` from `../../atoms/Motif` (Task 3).
- Produces: `CalendarDay` has `motif: MotifName` and no longer has `image`. `GiftImage` is removed. This is a **structure-only** swap — the doors and overlay keep their current look minus the gift photo (a `<Motif>` shows instead); the visual rebuild is Tasks 5–6.

- [ ] **Step 1: Update the data test first**

In `src/data/calendar.test.ts`:

Replace the import line and the `IMAGES` const:

```ts
import { CALENDAR } from './calendar';
import { MOTIF_NAMES } from '../components/atoms/Motif';
```

Replace the `'every entry has a known image ...'` test with:

```ts
test('every entry has a known motif and non-empty grid areas', () => {
  for (const d of CALENDAR) {
    expect(MOTIF_NAMES).toContain(d.motif);
    expect(d.gridArea.trim().length).toBeGreaterThan(0);
    expect(d.gridAreaMobile.trim().length).toBeGreaterThan(0);
    expect(d.title.trim().length).toBeGreaterThan(0);
    expect(d.message.trim().length).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 2: Run it — fails (`motif` missing)**

Run: `npx vitest run src/data/calendar.test.ts`
Expected: FAIL — `d.motif` is `undefined`, not in `MOTIF_NAMES`; `GiftImage` import gone.

- [ ] **Step 3: Rewrite `calendar.ts`**

Replace the type imports/exports at the top:

```ts
import type { MotifName } from '../components/atoms/Motif';

export type DoorSize = '1x1' | '1x2' | '2x1' | '2x2';
```

(Remove `export type GiftImage = ...`.)

In `CalendarDay`, replace `image: GiftImage;` with `motif: MotifName;`.

In every entry of `CALENDAR`, replace the `image: 'giftN'` field with a `motif` from this exact mapping (keep field order — put `motif` where `image` was):

| day | motif | day | motif | day | motif |
|-----|-------|-----|-------|-----|-------|
| 1 | wreath | 10 | candle | 19 | bell |
| 2 | star | 11 | bell | 20 | stocking |
| 3 | candycane | 12 | star | 21 | snowflake |
| 4 | gift | 13 | bauble | 22 | gift |
| 5 | candle | 14 | snowflake | 23 | bell |
| 6 | snowflake | 15 | bauble | 24 | candle |
| 7 | bauble | 16 | tree | 25 | tree |
| 8 | gift | 17 | stocking | | |
| 9 | candle | 18 | tree | | |

- [ ] **Step 4: Run the data test**

Run: `npx vitest run src/data/calendar.test.ts`
Expected: PASS.

- [ ] **Step 5: Point Door at the motif (minimal)**

In `src/components/molecules/Door/Door.tsx`:

- add `import { Motif } from '../../atoms/Motif';`
- remove `styles[\`img-${day.image}\`]` from the `className` array.
- inside the `.panel` span, render the motif. Change:

  ```tsx
  <span className={styles.panel} aria-hidden="true" />
  ```

  to:

  ```tsx
  <span className={styles.panel} aria-hidden="true">
    <Motif name={day.motif} />
  </span>
  ```

In `src/components/molecules/Door/Door.module.css`:

- delete the five `.img-gift1 .panel { ... }` … `.img-gift5 .panel { ... }` rules.
- add so the motif sizes within the panel:

  ```css
  .panel .motif {
    position: absolute;
    inset: 22%;
    width: 56%;
    height: 56%;
  }
  ```

In `src/components/molecules/Door/Door.test.tsx`: change the `day` fixture's `image: 'gift5'` to `motif: 'candle'`.

- [ ] **Step 6: Point DoorFocus at the motif (minimal)**

In `src/components/organisms/DoorFocus/DoorFocus.tsx`:

- add `import { Motif } from '../../atoms/Motif';`
- change the leaf `motion.div`'s `className` from `` `${styles.leaf} ${styles[`img-${day.image}`]}` `` to just `styles.leaf`, and render `<Motif name={day.motif} />` as its child:

  ```tsx
  <motion.div
    className={styles.leaf}
    style={{ transformOrigin: 'left center' }}
    initial={{ rotateY: reduce ? LEAF_OPEN_DEG : 0, filter: reduce ? 'brightness(0.45)' : 'brightness(1)' }}
    animate={{ rotateY: LEAF_OPEN_DEG, filter: 'brightness(0.45)' }}
    exit={{ rotateY: 0, filter: 'brightness(1)', transition: { duration: reduce ? 0 : 0.2, ease: 'easeInOut' } }}
    transition={leafTransition}
    aria-hidden="true"
  >
    <Motif name={day.motif} />
  </motion.div>
  ```

In `src/components/organisms/DoorFocus/DoorFocus.module.css`:

- delete the five `.img-gift1 { ... }` … `.img-gift5 { ... }` rules.
- add:

  ```css
  .leaf .motif {
    position: absolute;
    inset: 24%;
    width: 52%;
    height: 52%;
  }
  ```

In `src/components/organisms/DoorFocus/DoorFocus.test.tsx`: in the `withCode` fixture replace `image: 'gift2'` with `motif: 'gift'`. (`noCode` spreads `withCode`, so it inherits.)

- [ ] **Step 7: Full verification**

Run: `npx vitest run src/data/calendar.test.ts src/components/molecules/Door/Door.test.tsx src/components/organisms/DoorFocus/DoorFocus.test.tsx`
Expected: PASS.
Run: `npm run test:run`
Expected: 84 tests / 18 files green (test count unchanged — no tests added or removed).
Run: `npm run build && npm run lint`
Expected: both exit 0. (`tsc` confirms no lingering `image` / `GiftImage` reference.)

- [ ] **Step 8: Commit**

```bash
git add src/data/ src/components/molecules/Door/ src/components/organisms/DoorFocus/
git commit -m "feat: replace the gift-image field with a per-day motif"
```

---

## Task 5: Rebuild the grid door with depth and a swung-open state

**Files:**
- Modify: `src/components/molecules/Door/Door.tsx`
- Modify: `src/components/molecules/Door/Door.module.css`
- Modify: `src/components/molecules/Door/Door.test.tsx`
- Modify: `src/components/atoms/DoorNumber/DoorNumber.tsx`
- Modify: `src/components/atoms/DoorNumber/DoorNumber.module.css`
- Modify: `src/components/atoms/DoorNumber/DoorNumber.test.tsx` (if class assertions break)
- Modify: `src/components/organisms/CalendarGrid/CalendarGrid.tsx` (widen `onOpen` type)
- Modify: `src/components/organisms/CalendarGrid/CalendarGrid.test.tsx` (rect arg)

**Interfaces:**
- Consumes: `Motif` (Task 3/4), `styles` tokens (Task 1).
- Produces:
  - `Door` prop `onOpen` becomes `(day: number, rect: DOMRect) => void`. `handleClick` for a non-locked door calls `onOpen(day.day, event.currentTarget.getBoundingClientRect())`.
  - `CalendarGridProps.onOpen` widens to `(day: number, rect: DOMRect) => void`; it passes the same reference to every `Door`.
  - `CalendarPage`'s existing `handleOpen(dayNumber: number)` stays assignable (fewer params) — no change needed there in this task.
  - DOM: `motion.button.door[data-state]` › `.frame` › (`.compartment` › `.check`) + (`.leaf` › `Motif` + `DoorNumber`). `data-state` values unchanged (`locked|today|past|opened`). `opened` also adds class `styles.opened` (replacing `styles.ajar`). `layoutId` stays for now (removed in Task 6).

- [ ] **Step 1: Update `Door.test.tsx`**

- Replace the `'an opened door carries the ajar class; others do not'` test with:

```tsx
test('an opened door carries the opened class; others do not', () => {
  const { rerender } = render(<Door day={day} state="opened" onOpen={vi.fn()} />);
  expect(screen.getByRole('button')).toHaveClass('opened');
  rerender(<Door day={day} state="past" onOpen={vi.fn()} />);
  expect(screen.getByRole('button')).not.toHaveClass('opened');
});
```

- Replace the `test.each(['today', 'past', 'opened'])('clicking a %s door calls onOpen ...')` with:

```tsx
test.each(['today', 'past', 'opened'] as const)(
  'clicking a %s door calls onOpen with the day number and its rect',
  (state) => {
    const onOpen = vi.fn();
    render(<Door day={day} state={state} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(
      5,
      expect.objectContaining({
        top: expect.any(Number),
        left: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      }),
    );
  },
);
```

- Add a test that the number is present in every state:

```tsx
test.each(['locked', 'today', 'past', 'opened'] as const)(
  'the day number is shown on the %s door',
  (state) => {
    render(<Door day={day} state={state} onOpen={vi.fn()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  },
);
```

Leave the aria-label, badge-only-for-today, shake, reduced-motion, and grid-area tests unchanged.

- [ ] **Step 2: Run it — fails on `opened` class and the rect arg**

Run: `npx vitest run src/components/molecules/Door/Door.test.tsx`
Expected: FAIL — `.ajar`→`.opened`, `onOpen` called with one arg.

- [ ] **Step 3: Rewrite `Door.tsx`**

```tsx
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '../../atoms/Badge';
import { DoorNumber } from '../../atoms/DoorNumber';
import { Motif } from '../../atoms/Motif';
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
  onOpen: (day: number, rect: DOMRect) => void;
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

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (state === 'locked') {
      if (!reducedMotion()) {
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

  return (
    <motion.button
      layoutId={doorLayoutId(day.day)}
      type="button"
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
          <Motif name={day.motif} />
          <DoorNumber value={day.day} size={day.size} />
        </span>
      </span>
      {state === 'today' && <Badge />}
    </motion.button>
  );
}
```

- [ ] **Step 4: Rewrite `Door.module.css`**

Structure per spec §2. Concrete values below are the starting point; keep the class names, the transform directions/magnitudes, and the token usage exactly.

```css
.door {
  position: relative;
  grid-area: var(--grid-area-mobile);
  margin: 4px;
  padding: 0;
  border: 0;
  min-width: 0;
  background: transparent;
  cursor: pointer;
  perspective: 700px;
}

@media (min-width: 769px) {
  .door { grid-area: var(--grid-area); }
}

.door:focus-visible { outline: none; }
.door:focus-visible .frame { box-shadow: var(--shadow-2), var(--focus-ring); }

.frame {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-md);
  background: var(--surface-1);
  box-shadow: var(--bevel-hi), var(--bevel-lo), var(--shadow-2);
  transform-style: preserve-3d;
}

.compartment {
  position: absolute;
  inset: 8%;
  border-radius: var(--radius-sm);
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(255, 207, 135, 0.28), transparent 70%),
    #12201b;
  box-shadow: inset 0 6px 12px rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.check {
  font-size: 1.6rem;
  color: var(--color-brass);
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.opened .check { opacity: 1; transform: scale(1); }

.leaf {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-md);
  background: linear-gradient(160deg, var(--surface-2), #1c2c25);
  box-shadow: var(--bevel-hi), var(--shadow-1);
  transform-origin: left center;
  transform-style: preserve-3d;
  transition: transform 0.35s ease, box-shadow 0.2s ease, filter 0.3s ease;
}
.leaf::after { /* inset panel line */
  content: '';
  position: absolute;
  inset: 8%;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--radius-sm);
}
.leaf .motif { position: absolute; inset: 22%; width: 56%; height: 56%; }

.door[data-state='locked'] .leaf { filter: grayscale(0.5) brightness(0.6); }

.door[data-state='today'] .frame { box-shadow: var(--bevel-hi), var(--bevel-lo), var(--glow-today); }
.door[data-state='today'] { animation: pulse 2.4s ease-in-out infinite; }

.door:not([data-state='locked']):not(.opened):hover .leaf,
.door:not([data-state='locked']):not(.opened):focus-visible .leaf {
  transform: translateZ(8px) rotateY(-18deg);
  box-shadow: var(--bevel-hi), var(--shadow-3);
}

.opened .leaf {
  transform: rotateY(-105deg);
  box-shadow: var(--shadow-contact);
}

.shake { animation: shake 0.5s; }

@keyframes shake {
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  70% { transform: translate(3px, 1px) rotate(-1deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
}

@keyframes pulse { 50% { transform: scale(1.03); } }

@media (prefers-reduced-motion: reduce) {
  .leaf,
  .check,
  .door[data-state='today'],
  .shake { animation: none; transition: none; }
  .door:not([data-state='locked']):not(.opened):hover .leaf,
  .door:not([data-state='locked']):not(.opened):focus-visible .leaf { transform: none; }
  .opened .leaf { transform: rotateY(-105deg); } /* keep the open state, just no animation */
}
```

- [ ] **Step 5: Restyle `DoorNumber`**

`src/components/atoms/DoorNumber/DoorNumber.module.css`:

```css
.number {
  position: absolute;
  top: 8%;
  left: 8%;
  width: 1.9em;
  height: 1.9em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-brass);
  background: rgba(0, 0, 0, 0.25);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.12),
    inset 0 -1px 2px rgba(0, 0, 0, 0.5);
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
  line-height: 1;
}

.size-1x1 { font-size: 0.8rem; }
.size-1x2 { font-size: 0.95rem; }
.size-2x1 { font-size: 1.1rem; }
.size-2x2 { font-size: 1.4rem; }
```

`DoorNumber.tsx` is unchanged (same markup/props). If `DoorNumber.test.tsx` asserts old positioning classes, update only the assertion to the surviving `size-*` class + the rendered value; do not change the component API.

- [ ] **Step 6: Widen `CalendarGrid`**

`src/components/organisms/CalendarGrid/CalendarGrid.tsx`: change

```ts
  onOpen: (day: number) => void;
```

to

```ts
  onOpen: (day: number, rect: DOMRect) => void;
```

No other change — `onOpen` is passed straight to each `Door`.

`src/components/organisms/CalendarGrid/CalendarGrid.test.tsx`: change the forwarding test's assertion:

```tsx
test('forwards onOpen with the clicked day number and rect', () => {
  const onOpen = vi.fn();
  render(<CalendarGrid items={items} onOpen={onOpen} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dia 5, hoje' }));
  expect(onOpen).toHaveBeenCalledWith(5, expect.objectContaining({ width: expect.any(Number) }));
});
```

- [ ] **Step 7: Verify**

Run: `npx vitest run src/components/molecules/Door/ src/components/atoms/DoorNumber/ src/components/organisms/CalendarGrid/`
Expected: PASS.
Run: `npm run test:run` — 85 tests / 18 files (one Door test added; DoorNumber count may shift by the test edit — adjust the expected number to whatever the green run reports and record it).
Run: `npm run test:coverage` — all four thresholds ≥95% (`Door.tsx`, `DoorNumber.tsx` 100%).
Run: `npm run build && npm run lint` — both exit 0.

- [ ] **Step 8: Commit**

```bash
git add src/components/molecules/Door/ src/components/atoms/DoorNumber/ src/components/organisms/CalendarGrid/
git commit -m "feat: rebuild the grid door with a framed three-layer body and swung-open state"
```

---

## Task 6: Frosted-glass overlay that springs from the door

**Files:**
- Modify: `src/components/organisms/DoorFocus/DoorFocus.tsx`
- Modify: `src/components/organisms/DoorFocus/DoorFocus.module.css`
- Modify: `src/components/organisms/DoorFocus/DoorFocus.test.tsx`
- Modify: `src/components/pages/CalendarPage/CalendarPage.tsx`
- Modify: `src/components/pages/CalendarPage/CalendarPage.test.tsx` (only if a selector breaks)
- Modify: `src/components/molecules/CopyableCode/CopyableCode.module.css`
- Delete: `src/components/molecules/Door/doorLayoutId.ts`
- Modify: `src/components/molecules/Door/Door.tsx` (drop the `layoutId` / `doorLayoutId` import)

**Interfaces:**
- Consumes: `Motif`, `motion.ts` (`springSoft`, `durations`, `reduced`), tokens.
- Produces:
  - `DoorFocusProps` becomes `{ day: CalendarDay | null; originRect: DOMRect | null; onClose: () => void }`.
  - `CalendarPage` holds `const [origin, setOrigin] = useState<DOMRect | null>(null)`; `handleOpen(dayNumber: number, rect: DOMRect)` sets both `openDay` and `origin`; renders `<DoorFocus day={openDayData} originRect={origin} onClose={...} />`.
  - `doorLayoutId.ts` is deleted; no `layoutId` anywhere.
  - The card `motion.div` keeps `data-reduced-motion={reduce ? 'true' : 'false'}` (the existing branch signal). Non-reduced: `initial` = fixed at the `originRect` box, `animate` = centred, `springSoft`. Reduced: crossfade centred, content already visible.
  - Everything in the a11y contract (Global Constraints) is preserved verbatim from the current file: the two effects, `trapTab`, `onScrimMouseDown`/`onScrimClick`, `role`/`aria-*`, `close` button.

- [ ] **Step 1: Update `DoorFocus.test.tsx`**

- Every `render(<DoorFocus ... />)` gains `originRect={null}` (reduced-motion path renders identically; non-reduced with a null rect must still render a centred dialog — the component treats `null` as "no origin, start centred small").
- The two fixtures already carry `motif` (Task 4). Keep them.
- Add a test that a rect origin is accepted:

```tsx
test('accepts an origin rect without crashing', () => {
  const rect = { top: 10, left: 10, width: 40, height: 40, right: 50, bottom: 50, x: 10, y: 10, toJSON() {} } as DOMRect;
  render(<DoorFocus day={withCode} originRect={rect} onClose={vi.fn()} />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
```

- The `'with motion allowed the card takes the shared-layout branch'` test: keep it, but reword the comment — it now asserts the spring-from-rect branch via `data-reduced-motion="false"`. Assertion unchanged.
- Keep all focus-trap / scroll-lock / Esc / scrim / code-visibility / reduced-motion tests unchanged apart from the `originRect` prop.

- [ ] **Step 2: Run it — fails (required `originRect` prop, import path)**

Run: `npx vitest run src/components/organisms/DoorFocus/DoorFocus.test.tsx`
Expected: FAIL — `originRect` missing from props type.

- [ ] **Step 3: Rewrite `DoorFocus.tsx`**

Keep the whole `DoorFocusPanel` effect/trap/scrim machinery. Change: props, the card's `initial`/`animate`/`transition` (spring from `originRect`), remove `layoutId` + the `doorLayoutId` import, add the `Motif` watermark behind the glass, wrap the content in a `motion.div` stagger container, add the `.cardLeaf` (renamed from `.leaf` to avoid the grid door's class — or keep `.leaf`, scoped by module), and the light-bloom element.

```tsx
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
```

- [ ] **Step 4: Rewrite `DoorFocus.module.css`**

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
  width: min(92vw, 460px);
  max-height: 88vh;
  border-radius: var(--radius-lg);
  overflow: hidden;
  color: var(--color-cream);
  background: var(--glass-solid);
  border: 1px solid var(--glass-border);
  box-shadow: var(--shadow-4);
}
@supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .card {
    background: var(--glass-bg);
    -webkit-backdrop-filter: blur(var(--blur-glass)) saturate(1.2);
    backdrop-filter: blur(var(--blur-glass)) saturate(1.2);
  }
}

.watermark {
  position: absolute;
  right: -18%;
  bottom: -12%;
  width: 78%;
  opacity: 0.10;
  --motif-ink: var(--color-brass);
  --motif-accent: var(--color-brass);
}
.watermark .motif { width: 100%; height: auto; }

.bloom {
  position: absolute;
  inset: -20%;
  background: radial-gradient(40% 40% at 50% 55%, rgba(255, 207, 135, 0.35), transparent 70%);
  opacity: 0;
  animation: bloom 0.9s ease-out 0.35s both;
  pointer-events: none;
}
@keyframes bloom {
  30% { opacity: 1; }
  100% { opacity: 0.25; }
}

.box {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-4) var(--space-4);
  text-align: center;
  max-height: 88vh;
  overflow: auto;
}

.medallion {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 35% 30%, #e7c877, var(--color-brass-dim));
  box-shadow: inset 0 2px 3px rgba(255, 255, 255, 0.4), 0 4px 10px rgba(0, 0, 0, 0.4);
}
/* the DoorNumber inside sits static, centred */
.medallion :global(.number),
.medallion .number {
  position: static;
  width: auto;
  height: auto;
  background: none;
  box-shadow: none;
  color: #2b1a10;
  font-size: 1.6rem;
}

.title { margin: 0; font-family: var(--font-display); font-size: 1.5rem; }
.message { margin: 0; font-size: 1rem; line-height: 1.55; max-width: 34ch; }

.cardLeaf {
  position: absolute;
  inset: 0;
  z-index: 2;
  border-radius: var(--radius-lg);
  background: linear-gradient(160deg, var(--surface-2), #1c2c25);
  box-shadow: var(--bevel-hi), 8px 0 24px rgba(0, 0, 0, 0.5);
}
.cardLeaf .motif { position: absolute; inset: 30%; width: 40%; height: 40%; }

.close {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  z-index: 3;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: var(--color-brass);
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.15s ease;
}
.close:hover { transform: scale(1.08); }
.close:focus-visible { outline: none; box-shadow: var(--focus-ring); }

@media (prefers-reduced-motion: reduce) {
  .bloom, .cardLeaf { animation: none; }
}
```

- [ ] **Step 5: Wire `CalendarPage.tsx`**

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
  const [origin, setOrigin] = useState<DOMRect | null>(null);

  const items = useMemo<CalendarGridItem[]>(
    () =>
      CALENDAR.map((day) => ({
        day,
        state: getDayState(day.day, today, openedDays),
      })),
    [today, openedDays],
  );

  const handleOpen = (dayNumber: number, rect: DOMRect) => {
    markOpened(dayNumber);
    setOrigin(rect);
    setOpenDay(dayNumber);
  };

  const openDayData = CALENDAR.find((entry) => entry.day === openDay) ?? null;

  return (
    <>
      <CalendarTemplate
        header={<SiteHeader title={TITLE} subtitle={SUBTITLE} />}
        grid={<CalendarGrid items={items} onOpen={handleOpen} />}
      />
      <DoorFocus
        day={openDayData}
        originRect={origin}
        onClose={() => setOpenDay(null)}
      />
    </>
  );
}
```

- [ ] **Step 6: Drop `doorLayoutId`**

- In `src/components/molecules/Door/Door.tsx`: remove `import { doorLayoutId } from './doorLayoutId';` and the `layoutId={doorLayoutId(day.day)}` prop on `motion.button`.
- `git rm src/components/molecules/Door/doorLayoutId.ts`
- Confirm: `grep -rn "doorLayoutId\|layoutId" src/` → no output.

- [ ] **Step 7: Restyle `CopyableCode.module.css`**

Restyle the code chip to brass; keep every class name the component uses. Read the current file first and change only colours/borders/spacing:

```css
/* .code — the chip */
.code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  border: 1px solid var(--color-brass-dim);
  color: var(--color-brass);
  background: rgba(0, 0, 0, 0.25);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  letter-spacing: 0.04em;
}
```

Leave `.wrap`, `.copied`, `.error`, and any button styling structurally intact (adjust colour only).

- [ ] **Step 8: Verify**

Run: `npx vitest run src/components/organisms/DoorFocus/ src/components/pages/CalendarPage/`
Expected: PASS. If `CalendarPage.test.tsx`'s `getByRole('heading', { level: 2 })` or `{ name: 'Fechar' }` selectors are unaffected (they are — markup for those is unchanged), no edit needed there.
Run: `npm run test:run` — full suite green; record the count.
Run: `npm run test:coverage` — all four thresholds ≥95%. `DoorFocus.tsx` may expose new branches (`reduce || !originRect`, the `day.code` wrapper) — add focused assertions in `DoorFocus.test.tsx` if any dips below (a rect-present render + a rect-null render + a code/no-code render cover them).
Run: `npm run build && npm run lint` — both exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/components/organisms/DoorFocus/ src/components/pages/CalendarPage/ src/components/molecules/Door/ src/components/molecules/CopyableCode/
git commit -m "feat: spring the overlay from the door into a frosted-glass card"
```

---

## Task 7: Staggered grid entrance

**Files:**
- Modify: `src/components/organisms/CalendarGrid/CalendarGrid.tsx`
- Modify: `src/components/organisms/CalendarGrid/CalendarGrid.module.css` (if needed)
- Modify: `src/components/molecules/Door/Door.tsx` (accept a `variants` role as a motion child)
- Modify: `src/components/organisms/CalendarGrid/CalendarGrid.test.tsx`
- Modify: `src/components/molecules/Door/Door.test.tsx` (only if the motion-child change needs it)

**Interfaces:**
- Consumes: `motion.ts` (`springSnappy`), `useReducedMotion`.
- Produces:
  - `CalendarGrid` renders a `motion.div` (class `grid`) with `initial="hidden" animate="show"` and `variants={{ hidden: {}, show: { transition: { staggerChildren, delayChildren } } }}`.
  - `Door`'s `motion.button` gains `variants={doorVariants}` where `hidden = { opacity: 0, y: 12, scale: 0.94 }`, `show = { opacity: 1, y: 0, scale: 1, transition: springSnappy }`. Under reduced motion both are `{ opacity: 1 }`. The `Door` reads `useReducedMotion` (it already has a `reducedMotion()` helper — reuse or switch to the hook; keep one source of truth).
  - No prop changes to `Door` or `CalendarGrid` beyond what Task 5 set.

- [ ] **Step 1: Update `CalendarGrid.test.tsx`**

The three existing tests must still pass (`container.firstChild` is the `motion.div` with class `grid`; 25 buttons; forwarding). Add:

```tsx
test('the grid is a motion container (has the grid class on its root element)', () => {
  const { container } = render(<CalendarGrid items={items} onOpen={vi.fn()} />);
  expect(container.firstChild).toHaveClass('grid');
  expect((container.firstChild as HTMLElement).tagName).toBe('DIV');
});
```

- [ ] **Step 2: Run — passes already except the new assertion detail**

Run: `npx vitest run src/components/organisms/CalendarGrid/CalendarGrid.test.tsx`
Expected: the three originals PASS; decide if the new one needs the impl (it will once `motion.div` is in).

- [ ] **Step 3: `CalendarGrid.tsx`**

```tsx
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
```

- [ ] **Step 4: `Door.tsx` — become a motion child**

Add near the top:

```tsx
import { motion, useReducedMotion } from 'framer-motion';
import { springSnappy } from '../../../lib/motion';
```

Inside `Door`, replace the `reducedMotion()` free function usage in `handleClick` with the hook (`const reduce = useReducedMotion() ?? false;` then `if (!reduce) { ...shake... }`). Delete the `reducedMotion()` helper.

Add:

```tsx
  const doorVariants = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 12, scale: 0.94 },
        show: { opacity: 1, y: 0, scale: 1, transition: springSnappy },
      };
```

On the `motion.button`, add `variants={doorVariants}`. Do not set `initial`/`animate` on it (the parent container drives them via context).

- [ ] **Step 5: Reduced-motion + tests**

- `Door.test.tsx`: the `mockReducedMotion` helper already stubs `window.matchMedia`; framer's `useReducedMotion` is memoised process-wide, so a bare spy may not flip it in this file. If the "locked door under reduced motion does not add the shake class" test now fails because the hook is memoised, mirror `DoorFocus.test.tsx`'s approach: add a top-of-file `vi.mock('framer-motion', ...)` that spreads `importOriginal` and overrides `useReducedMotion` to read `window.matchMedia('(prefers-reduced-motion: reduce)').matches`. Keep `motion` real.
- Verify `CalendarGrid.test.tsx` count/forwarding tests still pass under `skipAnimations` (stagger collapses to instant).

- [ ] **Step 6: Verify**

Run: `npx vitest run src/components/organisms/CalendarGrid/ src/components/molecules/Door/`
Expected: PASS.
Run: `npm run test:run` — full suite green; record count.
Run: `npm run test:coverage` — ≥95% all four. Cover both `doorVariants` branches (a reduced-motion render + a normal render — the existing reduced-motion shake test plus any normal render covers it).
Run: `npm run build && npm run lint` — exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/components/organisms/CalendarGrid/ src/components/molecules/Door/
git commit -m "feat: stagger the calendar doors in on load"
```

---

## Task 8: Header, background, badge, focus & cleanup

**Files:**
- Modify: `src/components/molecules/SiteHeader/SiteHeader.tsx` + `.module.css`
- Modify: `src/components/molecules/SiteHeader/SiteHeader.test.tsx` (if class assertions break)
- Modify: `src/components/templates/CalendarTemplate/CalendarTemplate.module.css`
- Modify: `src/components/atoms/Badge/Badge.module.css`
- Modify: `src/components/atoms/Badge/Badge.test.tsx` (only if a class assertion breaks)
- Modify: `src/styles/theme.css` (remove now-dead tokens)
- Delete: `src/assets/gift1.png` … `src/assets/gift5.png`

**Interfaces:**
- Consumes: tokens.
- Produces: no API changes. `--shadow-door`, `--door-border`, `--radius` (if fully unused), and `--color-red` usages are removed only after `grep` proves no consumer remains.

- [ ] **Step 1: `SiteHeader`**

`SiteHeader.tsx` — wrap the title in a flex row with two brass ornament rules:

```tsx
import { motion } from 'framer-motion';
import styles from './SiteHeader.module.css';

export interface SiteHeaderProps {
  title: string;
  subtitle: string;
}

export function SiteHeader({ title, subtitle }: SiteHeaderProps) {
  return (
    <motion.header
      className={styles.header}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.titleRow}>
        <span className={styles.rule} aria-hidden="true" />
        <h1 className={styles.title}>{title}</h1>
        <span className={styles.rule} aria-hidden="true" />
      </div>
      <p className={styles.subtitle}>{subtitle}</p>
    </motion.header>
  );
}
```

`SiteHeader.module.css`:

```css
.header {
  text-align: center;
  padding: var(--space-5) var(--space-3) var(--space-3);
  color: var(--color-cream);
}
.titleRow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}
.rule {
  height: 1px;
  width: clamp(24px, 12vw, 96px);
  background: linear-gradient(90deg, transparent, var(--color-brass), transparent);
}
.title {
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  letter-spacing: -0.01em;
  margin: 0 0 var(--space-2);
}
.subtitle {
  font-style: italic;
  font-size: clamp(1rem, 2.5vw, 1.2rem);
  opacity: 0.75;
  letter-spacing: 0.02em;
  margin: var(--space-2) 0 0;
}
```

If `SiteHeader.test.tsx` asserts on structure, update it to still find the `h1` (title) and the subtitle text; the `titleRow`/`rule` are decorative.

- [ ] **Step 2: `CalendarTemplate` background**

`CalendarTemplate.module.css` `.background`:

```css
.background {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(120% 90% at 50% -10%, rgba(70, 110, 100, 0.22), transparent 55%),
    radial-gradient(140% 120% at 50% 120%, rgba(60, 20, 16, 0.5), transparent 60%),
    radial-gradient(circle at 50% 0%, #241a15, var(--surface-0) 70%);
}
```

(Drop the `background.png` layer only if it is not adding value — read the file, keep it as the base layer if it is currently visible and wanted; otherwise remove it. If removed, also delete `src/assets/background.png` and update any test.)

- [ ] **Step 3: `Badge` brass pill**

`Badge.module.css`:

```css
.badge {
  position: absolute;
  top: var(--space-1);
  left: var(--space-1);
  z-index: 4;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
  color: #2b1a10;
  background: linear-gradient(180deg, #e7c877, var(--color-brass));
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), var(--glow-today);
  pointer-events: none;
}
```

`Badge.tsx` unchanged. If `Badge.test.tsx` asserts `toHaveClass('badge')` only — still passes.

- [ ] **Step 4: Focus rings**

Confirm `--focus-ring` is applied on: `.door:focus-visible .frame` (Task 5), `.close:focus-visible` (Task 6), and the `CopyableCode` copy button. Add to `CopyableCode.module.css` for its button if missing:

```css
.wrap button:focus-visible { outline: none; box-shadow: var(--focus-ring); }
```

- [ ] **Step 5: Delete dead assets + tokens**

- `grep -rn "gift1\|gift2\|gift3\|gift4\|gift5\|img-gift" src/` → expect no output. Then `git rm src/assets/gift1.png src/assets/gift2.png src/assets/gift3.png src/assets/gift4.png src/assets/gift5.png`.
- `grep -rn "shadow-door\|door-border" src/` → expect no output. Remove `--shadow-door` and `--door-border` from `theme.css`.
- `grep -rn "var(--radius)\b" src/` → if none, remove `--radius` (keep `--radius-sm/md/lg`). If some remain, leave `--radius`.
- `grep -rn "color-red\|color-white" src/` → migrate any stragglers to `--color-cream` / `--color-brass` / surfaces, or leave the tokens if still used. Do not force-remove a token that still has a consumer.

- [ ] **Step 6: Full gate**

Run: `npm run test:run` — full suite green; record final count.
Run: `npm run test:coverage` — all four thresholds ≥95%.
Run: `npm run build` — exit 0.
Run: `npm run lint` — exit 0.
Run: `grep -rn "DayDialog\|doorLayoutId\|img-gift\|\.png" src/` — only expected `.png` hits are `background.png` if kept.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: finish the header, background, badge and focus treatment; drop dead assets"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| §1 tokens & elevation | 1 (add), 8 (remove dead) |
| §2 door anatomy (frame/compartment/leaf, states, hover, opened −105°, locked, number) | 5 |
| §3 illustrated set (Motif, `motif` field, retire PNGs) | 3 (atom), 4 (data + wire), 8 (delete PNGs) |
| §4 choreography — grid entrance | 7 |
| §4 choreography — open (rect capture, grid leaf to opened, card spring from rect, contained cardLeaf, staggered content, light bloom) | 5 (rect + grid opened state), 6 (card spring, cardLeaf, stagger, bloom) |
| §4 choreography — close (fast content fade, delay-free leaf exit, card back, focus/scroll restore) | 6 |
| §4 reduced motion | 2 (`reduced()`), 5, 6, 7 (each gates its own) |
| §5 frosted-glass card (glass, watermark, content scrim, medallion, code chip, ✕, cardLeaf) | 6 (card + medallion + cardLeaf), 6 (CopyableCode) |
| §6 header & finish (SiteHeader, background, snow, focus ring) | 8 |
| §7 files/tests/interface changes | every task's test steps |

No gaps. Snow depth pass is spec-optional and intentionally omitted from tasks (Global Constraints let the polish pass add it if wanted).

**2. Placeholder scan** — no "TBD"/"handle edge cases"/bare "write tests". CSS blocks are complete and concrete; the plan states aesthetic values are a starting point tuned in the post-Task-8 screenshot pass (an explicit process step, not a placeholder). Test counts say "record the count" where a test edit makes the exact number depend on the green run — this is deliberate, not vague: the instruction is to read the number off the passing run and pin it.

**3. Type consistency**
- `onOpen: (day: number, rect: DOMRect) => void` — introduced in Task 5 (`Door`, `CalendarGrid`), consumed in Task 6 (`CalendarPage.handleOpen`). Task 5 explicitly relies on `(day: number) => void` staying assignable to it until Task 6 widens `handleOpen`.
- `DoorFocusProps` gains `originRect: DOMRect | null` in Task 6; `CalendarPage` supplies it the same task.
- `MotifName` / `MOTIF_NAMES` from `../../atoms/Motif` (Task 3) — consumed by `calendar.ts` and `calendar.test.ts` (Task 4), `Door.tsx` / `DoorFocus.tsx` (Task 4). Import path from `src/data/` is `../components/atoms/Motif`; from `src/components/{molecules,organisms}/*/` it is `../../atoms/Motif`.
- `doorLayoutId` exists through Tasks 4–5 (both `Door` and `DoorFocus` import it) and is deleted in Task 6 after both drop it.
- `springSoft` / `springSnappy` / `durations` / `reduced` from `../../../lib/motion` (Task 2) — consumed in Tasks 6 and 7.
- `styles.ajar` → `styles.opened` rename: Task 5 changes the class and its one test assertion together.
