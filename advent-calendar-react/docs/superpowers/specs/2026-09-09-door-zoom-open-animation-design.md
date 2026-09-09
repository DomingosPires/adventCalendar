# Door zoom + open animation — design

**Date:** 2026-09-09
**Status:** approved (pending spec review)

## Problem

Opened doors look broken (see `Downloads/Screenshot_2.png`): the panel rotates
`rotateY(72deg)` around a `bottom left` origin — reads as folding *inward* — and
behind it there is only the giant grid number on empty background, because the
day's content lives in a separate modal (`DayDialog`), not behind the door.
Floating `Abrir` / `✓ Aberto` badge pills add clutter.

## Goals

1. Clicking an openable door **zooms in on that door** (its grid cell morphs to a
   large centred card), then the door **swings open outward** (toward the viewer).
2. The day's content (number, title, message, promo code, close control) sits
   **inside the box, behind the door leaf**, and is revealed by the swing — no
   separate modal.
3. Remove the visible `Abrir` and `✓ Aberto` labels. Keep only `Hoje`.
4. An already-opened door rests **slightly ajar** in the grid.
5. Honour `prefers-reduced-motion`; keep keyboard + screen-reader access.

Non-goals: changing the grid layout, the date-gating logic, the data model, or
the snow/header.

## Approach

Add **`framer-motion`**. Use a shared-layout (`layoutId`) morph for the zoom
instead of hand-rolled FLIP measurement.

### State

`CalendarPage` replaces `selectedDay: CalendarDay | null` with
`openDay: number | null`.

- `handleOpen(n)` → `markOpened(n)` + `setOpenDay(n)`.
- `handleClose()` → `setOpenDay(null)`.

`DayDialog` organism is deleted. `CalendarTemplate` loses its `dialog` slot; the
focus overlay is rendered by `CalendarGrid` / `CalendarPage` via a portal, so the
template only needs `header` + `grid`.

### Components

**`Door` (grid cell)** — becomes a `motion.button` with
`layoutId={`door-${day.day}`}`.

- States unchanged: `locked | today | past | opened`.
- `locked` click → shake (as today). Non-locked click → `onOpen(day.day)`.
- `opened` resting look: leaf holds a small permanent `rotateY(-14deg)` and a
  faint inner shadow — "already opened", no text.
- Visible `Badge` only for `today`.

**`DoorFocus` (new organism)** — rendered in a portal (to `document.body`) inside
`<AnimatePresence>` when `openDay != null`.

- `motion.div` **scrim**: fades in; click closes.
- `motion.div` **card** with the **same `layoutId`** as the grid door → framer
  morphs grid-cell → centred card, `width: min(86vw, 420px)`, aspect kept close
  to the door's. This is the "zoom to the door".
- Inside the card, two layers:
  - `.box` — compartment: the gift image, dimmed, plus content:
    day number, `<h2>` title, message paragraph, `CopyableCode` when `code` is
    set, and a close **✕** button.
  - `.leaf` — the door leaf: `position: absolute; inset: 0`, parent
    `perspective: 1200px`, `transform-origin: left center` (hinge on the left).
    After the layout morph completes (`onLayoutAnimationComplete`, or a ~250 ms
    fallback timer), animate `rotateY: 0 → -112deg` so the free edge comes
    forward and past the plane (opens **outward**). Back face is darker with a
    drop shadow so it reads as a real door.
- Close (✕ / scrim / `Escape`): leaf swings shut (`-112 → 0`), then the card
  morphs back to the grid cell, then the overlay unmounts.

**`Badge`** — drop `available` and `opened` variants (type, `LABEL` map, CSS).
Keeps `today` → `Hoje`. `BADGE_FOR_STATE` in `Door` becomes `{ today: 'today' }`.

### Accessibility

- Card: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` the `<h2>` id.
- On open, move focus to the ✕ button; on close, restore focus to the source
  door button (reuse the intent of the old `DayDialog` effect logic).
- `Escape` closes. Scrim is `aria-hidden`.
- Body scroll locked while open.
- `aria-label` per state on the door button stays; wording changes so no visible
  or spoken "abrir"/"aberto" pill — the label text itself may keep "aberto"
  (e.g. `Dia 5, aberto`) since that is descriptive, not a control label. Final
  strings: `locked → "Dia N, por abrir mais tarde"`, `today → "Dia N, hoje"`,
  `past → "Dia N, por abrir"`, `opened → "Dia N, aberto — ver de novo"`.

### Reduced motion

`prefers-reduced-motion: reduce` → no layout morph, no rotate: the overlay
cross-fades in with the leaf already at `-112deg` (or hidden), and cross-fades
out. `framer-motion` transitions set to `duration: 0` in that branch.

## Files

| File | Change |
|------|--------|
| `package.json` / lockfile | add `framer-motion` |
| `components/molecules/Door/Door.tsx` + `.module.css` | `motion.button`, `layoutId`, ajar opened state, hinge-left outward rotation, badge only for `today` |
| `components/organisms/DoorFocus/` | **new** — portal overlay: scrim + morphing card + leaf + content |
| `components/organisms/DoorFocus/DoorFocus.module.css` | **new** |
| `components/pages/CalendarPage/CalendarPage.tsx` | `openDay` state; render `DoorFocus`; drop `DayDialog` |
| `components/organisms/CalendarGrid/CalendarGrid.tsx` | pass through whatever `DoorFocus` needs (or `CalendarPage` owns it directly) |
| `components/templates/CalendarTemplate/CalendarTemplate.tsx` + `.module.css` | remove `dialog` slot |
| `components/atoms/Badge/Badge.tsx` + `.module.css` | drop `available` / `opened` variants |
| `components/organisms/DayDialog/**` | **delete** |

## Testing

- **Badge.test** — drop the `available` / `opened` cases; keep `today`.
- **Door.test** — update `aria-label` expectations; badge assertion becomes
  "only `today` renders a badge; `past`/`opened` render none"; opened door has
  the ajar marker; click still calls `onOpen` for non-locked, shakes for locked.
- **CalendarTemplate.test** — drop the `dialog` slot assertion.
- **CalendarPage.test** — opening today's door still reveals its content
  (`role="dialog"` with the `<h2>` title) and marks it opened; locked door does
  not open the overlay; `Escape` / close button clears `openDay`.
- **DoorFocus.test** — **new**: renders scrim + dialog when given a day; ✕,
  scrim click, and `Escape` all call `onClose`; focus lands on ✕; content shows
  title/message and `CopyableCode` when `code` is set; under reduced motion no
  rotate transition is applied (assert via style/prop, not animation frames).
- **DayDialog.test** — **delete**.
- `framer-motion` in jsdom: animations are effectively no-ops; assert on
  presence/DOM/props, never on animation frames (matches existing Snow-test
  discipline). Provide `layout` mocking only if a test proves flaky.

## Risks

- `layoutId` morph across a portal boundary: supported by framer-motion, but if
  the shared element flickers, fall back to animating the card's own
  `initial/animate` from the door's measured rect (one `getBoundingClientRect`
  on open) — still no continuous measurement.
- Bundle size: `framer-motion` ~ tens of KB gzipped. Acceptable for this app;
  noted, not blocking.
