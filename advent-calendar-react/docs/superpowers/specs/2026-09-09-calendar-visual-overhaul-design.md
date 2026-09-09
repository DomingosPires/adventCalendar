# Calendar visual overhaul — design

**Date:** 2026-09-09
**Status:** approved (pending spec review)
**Predecessor:** `2026-09-09-door-zoom-open-animation-design.md` (shipped; this builds on it)

## Problem

The calendar works but looks unfinished (`Downloads/Screenshot_3.png`,
`Screenshot_4.png`):

- **Opened doors in the grid** sit at a `-14deg` ajar tilt that reads as a
  rendering glitch, not an opened door.
- **The open overlay** stretches the door leaf into a large distorted trapezoid
  that overflows the card and covers half the screen (a side effect of the
  shared-layout `layoutId` morph); the card itself is a flat red rectangle with
  no design.
- **Generally:** grid doors are flat colour fills with dashed "debug-looking"
  borders and five near-identical tree patterns; motion is a single `rotateY`.

## Goals

A full art-direction + motion pass in a **"modern with depth"** register:
solid framed doors with bevel and layered shadow, a frosted-glass overlay,
spring physics, a grid entrance, and coherent illustration — so the calendar
reads as a polished app.

Out of scope: the grid tessellation geometry (7×8 desktop / 4×14 mobile with
varied door footprints — a recent, wanted feature) and the date-gating logic.
Only visuals and motion change.

## 1. Tokens & elevation — `src/styles/theme.css`

Keep the colour family (warm red accent + evergreen + cream), retuned for depth.
Add:

- **Surfaces:** `--surface-0` (page — very dark desaturated green-brown +
  radial vignette), `--surface-1` (door frame), `--surface-2` (leaf),
  `--surface-3` (raised card / content scrim).
- **Shadow ramp** (multi-layer; replaces the single `--shadow-door`):
  `--shadow-1` subtle, `--shadow-2` door at rest, `--shadow-3` hover lift,
  `--shadow-4` overlay card (large ambient + tight contact).
- **Bevel:** `--bevel-hi` (light top/left inset edge) + `--bevel-lo` (dark
  bottom/right inset edge), applied as `inset box-shadow`.
- **Glass:** `--glass-bg` (~`rgba(20,14,12,0.72)`), `--glass-border`,
  `--blur-glass`.
- **New accents:** `--glow-warm` (opened-compartment interior light),
  `--color-brass` (numbers, ✓, medallion, code chip, focus ring — replaces flat
  white). The accent red goes slightly deeper and is used sparingly (today
  glow, code chip, close-button seal).
- **Radii:** `--radius-sm` / `--radius-md` / `--radius-lg`.
- **Focus:** `--focus-ring` (2px brass + 2px offset), applied to every
  interactive element (doors, ✕, Copiar).

`--shadow-door`, `--door-border` (dashed) are removed; `--glow-today` retuned to
brass.

## 2. Door anatomy — `src/components/molecules/Door/`

Three layers inside the existing grid-area `motion.button`; `perspective` lives
on `.frame`.

- **`.frame`** — `position:absolute; inset:0`, `--surface-1`, `--radius-md`,
  bevel (`--bevel-hi/lo`), outer `--shadow-2`. The rim of the compartment.
- **`.compartment`** — recessed: inset from the frame, darker, `inset` shadow,
  a soft `--glow-warm` radial from the top. Holds a ✓ mark that fades in when
  `state === 'opened'`. Only visible through the swung-open leaf.
- **`.leaf`** — `position:absolute; inset:0`, the illustrated face,
  `transform-origin: left center`. State transforms:
  - `closed` (past/today/available before open): `rotateY(0)`, `--shadow-1`.
  - hover / focus-visible on an openable, not-opened, not-locked door:
    `rotateY(-18deg)` + small `translateZ` lift + frame shadow → `--shadow-3`,
    ~150 ms ease-out (CSS, not framer — 25 nodes).
  - `opened`: `rotateY(-105deg)`, resting against the frame side, with a
    contact shadow. Permanent.
  - `locked`: `rotateY(0)`, desaturated + darkened, no hover; click → the
    existing `shake` keyframe (kept).
- **Number** — debossed numeral in a small circle in a corner of the leaf face,
  present in every state. The opened compartment shows only ✓ + light, no
  duplicate number.

`DoorNumber` is restyled (debossed circle) and stays an atom used by the leaf.
`Badge` "Hoje" becomes a brass pill on the frame with a soft `--glow-today`
pulse; still only for `today`.

## 3. Illustrated set — `src/components/atoms/Motif/`

~10 inline-SVG motifs, flat two-tone + one highlight sliver for depth:
`wreath, candle, star, gift, tree, bell, snowflake, stocking, bauble,
candycane`. A single `<Motif name={MotifName} />` component (switch over
sub-components or an inline map), `viewBox="0 0 100 100"`, fills from
`--motif-ink` / `--motif-accent` / `--motif-hi` (defined per-context so the
leaf and the overlay watermark can tint differently).

`src/data/calendar.ts`: the `image: GiftImage` field is replaced by
`motif: MotifName`, curated per day (e.g. day 1 = `wreath`, 24 = `candle`,
25 = `tree`). `GiftImage` type and the five `gift{1..5}` values are removed.

The leaf face = subtle vertical gradient (`--surface-2` → slightly darker) +
the `Motif` centred (~60% on 1×1, larger on 2×2 — same SVG, CSS sizing) + a
faint inset panel line + the debossed number circle.

`src/assets/gift1..5.png` are deleted along with the `.img-gift{1..5}` CSS
rules in `Door.module.css` and `DoorFocus.module.css`.

## 4. Motion choreography

A shared `src/lib/motion.ts` exports the spring configs and durations
(`springSoft ≈ {stiffness:200,damping:26}`, `springSnappy ≈
{stiffness:260,damping:24}`, `durations`), plus `reduced(variants)` /
`useMotion()` helpers so `Door`, `CalendarGrid`, and `DoorFocus` share one
feel and one reduced-motion switch.

**Grid entrance (once, on mount):** `CalendarGrid` becomes a `motion.div` with
`variants` + `staggerChildren ≈ 0.025`, `delayChildren ≈ 0.1`. Each `Door` is a
`motion` child: `hidden {opacity:0, y:12, scale:0.94}` → `show {opacity:1, y:0,
scale:1}` with `springSnappy`. Stagger follows DOM order.

**Opening a door (click):**
1. `Door` reads its own `getBoundingClientRect()` and calls
   `onOpen(day, rect)`.
2. That door's leaf transitions to the permanent `opened` state
   (`rotateY(-105deg)`, ~350 ms) — so when the overlay later closes, the grid
   door is already open behind it.
3. `CalendarPage` stores `{ day, rect }`; `DoorFocus` receives the rect.
4. The overlay card (portal, `position:fixed`) springs from `rect` to centred:
   `initial` = the rect's `top/left/width/height` + door-ish `borderRadius`;
   `animate` = centred final geometry (`width: min(92vw, 460px)`, auto height,
   `max-height: 88vh`) with `springSoft`. Scrim fades `0 → 1` (~200 ms).
5. Once the card settles (`onAnimationComplete` or a short fallback delay), a
   **contained** `.cardLeaf` (`position:absolute; inset:0` of the card; card has
   `overflow:hidden` and `perspective`; `transform-origin: left center`)
   animates `rotateY: 0 → -110deg` + `filter: brightness(1 → 0.4)` (~450 ms).
   This is the reveal — fully inside the card, fixing the Screenshot_4 spill.
6. Content **staggers in** behind the leaf as it passes ~45°: a `motion`
   wrapper with `staggerChildren ≈ 0.06` — medallion number → title → message →
   code chip — each `{opacity:0, y:8} → {opacity:1, y:0}`.
7. **Light bloom** (no confetti): as the leaf swings, `--glow-warm` in the
   compartment/card interior briefly intensifies and blooms just past the card
   edges, then settles (~600 ms). Optionally 3–4 very faint dust motes drift up
   in the light. Reduced-motion: static glow only.

**Closing (✕ / scrim / Esc):**
- Content fades out fast (~120 ms, no stagger).
- `.cardLeaf` swings shut `-110 → 0` (~250 ms) with **its own delay-free
  `exit` transition** so it never blocks unmount (the FW#1 lesson).
- Card springs back toward `rect` + fades; scrim fades (with
  `pointerEvents:'none'` on exit); then `AnimatePresence` unmounts.
- Focus returns to the source door button; body scroll unlocks. The split
  mount effect (`[]` one-shot + `[onClose]` Escape) and the Tab focus trap from
  the previous feature's fix wave are kept.

**Reduced motion (`useReducedMotion`):** every spring → `duration:0` or a
120 ms fade; no leaf rotation (grid doors just present; overlay cross-fades in
centred with content already visible); no bloom, no motes; no grid cascade.

## 5. The frosted-glass card — `src/components/organisms/DoorFocus/`

- Card: `--glass-bg` + `backdrop-filter: blur(var(--blur-glass)) saturate(1.2)`,
  1px `--glass-border` (light top edge), `--radius-lg`, `--shadow-4`.
- **Behind the glass:** the day's `Motif`, oversized, low-opacity, corner-offset
  as a tinted watermark — gives the blur something to work on.
- **Content:** sits on a soft `radial-gradient` scrim (`--surface-3` → transparent)
  so text contrast is guaranteed on glass — not a hard box. Number in a **brass
  medallion** at top; title `--font-display`; message body; then `CopyableCode`
  restyled as a brass-bordered monospace chip with the "Copiar" button and the
  existing `role="status"` copied / error feedback (logic unchanged).
- **✕:** top-right on a small glass circle, brass icon, `:hover` scale,
  keyboard-focusable, inside the focus trap.
- **`.cardLeaf`:** the same illustrated face as the grid leaf; darkens via
  `filter` (no `backface-visibility` — FW#6); free-edge `box-shadow` for depth;
  clipped by the card's `overflow:hidden`.
- Long content scrolls inside the card; ✕ stays pinned.
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` the title; Esc /
  scrim / ✕ close; focus move + restore; body scroll lock — all kept.

## 6. Header & finish

- **`SiteHeader`:** title `--font-display`, larger, slight negative tracking,
  a thin brass ornament flanking it; subtitle with more breathing room. Enters
  fade + slight-y on load, before the grid cascade.
- **`CalendarTemplate` `.background`:** sharper radial vignette + a subtle
  cool-top → warm-bottom gradient behind the snow.
- **Snow:** kept. A small optional depth pass (two parallax layers — smaller,
  slower, blurred behind; larger in front) if cheap; not blocking.
- **Focus ring:** `--focus-ring` on doors, ✕, Copiar.

## 7. Files & tests

**New:** `src/components/atoms/Motif/` (component + motifs + `index.ts` +
test), `src/lib/motion.ts` (+ test).

**Changed:** `src/styles/theme.css`, `Door.tsx` / `.module.css`,
`DoorNumber.tsx` / `.module.css`, `Badge.tsx` / `.module.css`,
`CalendarGrid.tsx` / `.module.css`, `DoorFocus.tsx` / `.module.css`,
`CalendarPage.tsx`, `CalendarTemplate.module.css`, `SiteHeader.tsx` /
`.module.css`, `CopyableCode.module.css`, `src/data/calendar.ts`.

**Removed:** `src/assets/gift1..5.png`; the `.img-gift{1..5}` rules.

**Interface changes:**
- `CalendarDay.image: GiftImage` → `CalendarDay.motif: MotifName`.
- `Door` `onOpen: (day: number) => void` → `onOpen: (day: number, rect: DOMRect) => void`; threaded through `CalendarGrid` and `CalendarPage`.
- `DoorFocus` gains an origin-rect prop (`originRect: DOMRect | null` alongside
  `day`), replacing the `layoutId` shared-layout mechanism; `doorLayoutId`
  helper and the `layoutId` props on `Door` / `DoorFocus` are removed.

**Tests:**
- `calendar.test.ts` — assert `motif` (a valid `MotifName`) per day instead of `image`.
- `Motif.test.tsx` — renders an `<svg>` for each `MotifName`; unknown name renders nothing / a fallback.
- `motion.test.ts` — `reduced()` flattens variants; spring configs shaped as expected.
- `Door.test.tsx` — `opened` state exposes the swung class/`data-state`; hover class toggles on openable non-opened; number present on the leaf in every state; clicking a non-locked door calls `onOpen(day, rect)` with a `DOMRect` (mock `getBoundingClientRect`); locked shake retained; grid-area custom props retained.
- `DoorFocus.test.tsx` — opens from an `originRect` prop (no `layoutId`); scrim/✕/Esc close; focus to ✕ + restored; body scroll lock + restore; Tab trap wraps; `CopyableCode` shows only with a code; reduced-motion renders a working dialog with content already visible; the staggered content wrapper renders all four parts.
- `CalendarPage.test.tsx` — `onOpen` now carries a rect; overlay opens with the day's content and marks it opened; Esc / ✕ clears it; a locked door does not open it; `matchMedia` stub stays narrowed to only force `prefers-reduced-motion` false (FW#4).
- `CalendarGrid.test.tsx` — the `motion.div` container + stagger variants do not break the 25-button count, the grid class, or `onOpen` forwarding (now with a rect).
- `SiteHeader` / `Badge` / `CopyableCode` — class-name assertions updated where markup changed.
- Coverage stays ≥ 95% on all four metrics; `MotionGlobalConfig.skipAnimations = true` keeps everything deterministic.
- `npm run build` and `npm run lint` clean.

## Risks

- `backdrop-filter` is unsupported in jsdom (irrelevant to tests) and on a few
  old browsers — provide a solid `--glass-bg` fallback via `@supports not`.
- The rect-origin spring needs `getBoundingClientRect` at click time; on a
  viewport resize while open the origin is stale, but it is only used for the
  open/close transition, not layout — acceptable.
- Many simultaneously animated nodes on the grid entrance (25). Spring on
  transform/opacity only, `will-change` sparingly, and it runs once — should be
  fine; verify no jank on a mid-range machine.
- Illustration quality is bounded by what flat SVG can express; the two-tone +
  highlight system is chosen to stay coherent rather than detailed.
