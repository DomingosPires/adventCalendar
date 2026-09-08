# Advent Calendar — React rewrite (design)

Date: 2026-09-08
Status: approved (pending spec review)

## Context

There is an existing advent calendar in `adventCalendar/calendario advento/`
(built for the Mr. Blue brand, 2022): a plain HTML page with an irregular grid
of 25 gift tiles, jQuery + `zoomooz` for the open/zoom animation, Bootstrap for
utilities, and `snowstorm` for falling snow. Behaviour: only the current day's
door opens (zoom + reveal a promo with an optional copyable code); past days are
darkened and inert; future days shake on click. Language (PT/ES/EN) was chosen
from the page URL.

The goal of the rewrite is a **portfolio piece**: a clean, self-contained React
implementation of the same idea, no brand coupling. Same visual concept (the
irregular tile grid + snow), modern animations, and a small amount of added
polish (opened-days persistence, accessibility).

The old folder stays untouched as a reference. The rewrite lives in a new
top-level folder `advent-calendar-react/`.

## Goals

- Vite + React 18 + TypeScript, no jQuery / zoomooz / Bootstrap / snowstorm.
- Reproduce the irregular grid layout and the snow.
- Door open = CSS 3D flip; day content shown in a centered dialog.
- Date-gated like the original, plus: past unopened days are also openable, and
  which days have been opened is remembered across reloads.
- Four visually distinct door states so a visitor is never confused about which
  door is "today".
- Accessible: keyboard operable, screen-reader labels, respects
  `prefers-reduced-motion`.
- Focused test suite (Vitest + React Testing Library).
- Static build, deployable to GitHub Pages / Vercel with no config.

## Non-goals

- Multi-language. Content is a single locale (Portuguese) in the data file.
- Any brand / e-commerce specifics (promo rules, "buy" button, per-URL data).
  A generic optional `code` field keeps the copy-to-clipboard interaction.
- A backend, accounts, or cross-device sync. `localStorage` only.
- A CMS or admin UI. Day content is edited directly in `data/calendar.ts`.
- Configurable day count. Fixed at 25 to match the existing grid layout.

## Architecture

```
advent-calendar-react/
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  vitest.config.ts            # or test config inside vite.config.ts
  src/
    main.tsx
    App.tsx
    App.module.css
    data/
      calendar.ts             # CalendarDay[] — content + grid layout
    components/
      Calendar.tsx
      Calendar.module.css
      Door.tsx
      Door.module.css
      DayDialog.tsx
      DayDialog.module.css
      Snow.tsx
    hooks/
      useOpenedDays.ts
      useAdventDay.ts
    lib/
      dayState.ts
      clipboard.ts
    styles/
      theme.css               # CSS custom properties: palette, type, spacing
    assets/
      background.png
      gift1.png … gift5.png
  src/**/*.test.ts(x)         # co-located tests
```

### Data model

```ts
export type DoorSize = '1x1' | '1x2' | '2x1' | '2x2';
export type GiftImage = 'gift1' | 'gift2' | 'gift3' | 'gift4' | 'gift5';

export interface CalendarDay {
  day: number;                 // 1..25, unique
  title: string;               // short headline shown in the dialog
  message: string;             // 1–2 sentence body
  code?: string;               // optional, shown with a "copy" button
  image: GiftImage;            // door face
  size: DoorSize;              // for per-size type scaling in the dialog
  gridArea: string;            // desktop grid-area (row / col / span / span)
  gridAreaMobile: string;      // mobile grid-area
}

export const CALENDAR: CalendarDay[];   // length 25, days 1..25
```

`gridArea` / `gridAreaMobile` values are ported directly from the existing CSS
(`.grid__item--N` rules, desktop and `max-width: 768px` variants). The grid
column/row templates are ported the same way into `Calendar.module.css`.

### State model

`lib/dayState.ts`:

```ts
export type DayState = 'locked' | 'today' | 'past' | 'opened';

export function getDayState(
  day: number,
  today: number,          // effective advent day, 0 when before Dec 1
  openedDays: ReadonlySet<number>,
): DayState;
```

Rules:

- `openedDays.has(day)` → `'opened'` (wins over everything; a future day can
  never be in the set).
- `day === today` → `'today'`.
- `day < today` → `'past'`.
- `day > today` (or `today === 0`) → `'locked'`.

`hooks/useAdventDay.ts` computes the effective day once on mount:

- Read `?day=` from `location.search`. If it parses to an integer in 1..25, use
  it (demo override, no visible UI).
- Otherwise, from `new Date()`:
  `effectiveDay = (month === December) ? min(dayOfMonth, 25) : 0`.
- `effectiveDay === 0` means "outside the season": every door is `locked`.
  Showing a finished calendar year-round is out of scope; the `?day=` override
  covers demoing off-season.

`hooks/useOpenedDays.ts`:

```ts
export function useOpenedDays(): {
  openedDays: ReadonlySet<number>;
  markOpened: (day: number) => void;
};
```

- Backing store: `localStorage` key `advent-calendar:opened`, JSON array of
  numbers.
- All access wrapped in try/catch. If `localStorage` throws or is unavailable,
  fall back to in-memory state for the session (a module-level `Set`), so the UI
  still works.
- `markOpened` is idempotent; writes the updated array back.

### Components

**`App.tsx`** — full-viewport layout: background image layer, `<Snow />`
overlay, header (title + subtitle), `<Calendar />`. Owns nothing stateful.

**`Calendar.tsx`** — calls `useAdventDay()` and `useOpenedDays()`. Maps
`CALENDAR` to `<Door />`, passing `day`, its `CalendarDay`, the computed
`DayState`, and an `onOpen` callback. Holds the "which day is in the dialog"
UI state (`selectedDay: CalendarDay | null`). Renders one `<DayDialog />`.

- `onOpen(day)`:
  - state `'locked'` → do nothing here; the Door plays its own shake.
  - state `'today' | 'past' | 'opened'` → `markOpened(day)` and
    `setSelectedDay(dayData)`.

**`Door.tsx`** — a `<button>` sized via `gridArea` (inline style, switched by a
CSS media query through two custom properties `--grid-area` /
`--grid-area-mobile`). Contents: the gift image as background, the day number,
and a state badge. Behaviour:

- `'locked'`: on click, toggle a `.shake` class for the animation's duration
  (via `animationend` or a timeout), do **not** call `onOpen` with an opening
  intent. `aria-label="Dia {n}, ainda fechado"`. `aria-disabled` is **not**
  set (still focusable so the shake feedback is reachable), but
  `data-state="locked"`.
- `'today'`: full-colour face, animated glow ring + "Hoje" badge, larger
  number. `aria-label="Dia {n}, hoje — abrir"`.
- `'past'`: full-colour face, **no** glow, a small corner "abrir" affordance
  (a chevron/parcel icon), subtle border. `aria-label="Dia {n}, por abrir"`.
- `'opened'`: door face rendered ajar via a persistent partial `rotateY`,
  a check badge, face dimmed. `aria-label="Dia {n}, aberto"`.
- On open (`today`/`past`/`opened`): play the flip transition, then call
  `onOpen(day)`. The flip is CSS `transform: rotateY(...)` +
  `transition: transform .5s ease-in-out` on an inner "door panel" element,
  `transform-origin: bottom left` (matches the original).
- All motion is gated behind `@media (prefers-reduced-motion: no-preference)`;
  with reduced motion the door just switches state with no flip/shake/glow.

**`DayDialog.tsx`** — wraps the native `<dialog>` element.

- `open` when `selectedDay != null`; call `dialogRef.current.showModal()` /
  `.close()` in an effect. Native `<dialog>` gives focus trapping, `Esc` to
  close, and `::backdrop`.
- Content: day number, `title`, `message`, and — if `code` is set — the code in
  a pill with a "Copiar" button.
- Copy button calls `lib/clipboard.copyText(code)`. On success show "Copiado"
  for ~2s; on failure show "Não foi possível copiar" and select the text so the
  user can copy manually.
- Close via the backdrop click, `Esc`, or an explicit "Fechar" button; on close
  `Calendar` sets `selectedDay = null`.
- Type scale keyed off `selectedDay.size` (ported intent from the original's
  `.card_2x2 .advento .title` etc., but only as it affects the dialog).

**`Snow.tsx`** — a fixed-position full-viewport `<canvas>` behind the content
(`pointer-events: none`, low `z-index`).

- ~50–80 flakes, each `{ x, y, r, speedY, drift, phase }`.
- `requestAnimationFrame` loop; flakes fall, drift sinusoidally, wrap to the top
  when below the viewport.
- Resize handler updates canvas size to `devicePixelRatio`.
- Pause the loop on `visibilitychange` (tab hidden) and resume on return.
- Render nothing / never start the loop when
  `matchMedia('(prefers-reduced-motion: reduce)')` matches.

### `lib/clipboard.ts`

```ts
export async function copyText(text: string): Promise<boolean>;
```

- Try `navigator.clipboard.writeText`. On rejection or absence, fall back to a
  hidden `<textarea>` + `document.execCommand('copy')`. Return whether either
  path succeeded. Never throw.

## Styling

- `styles/theme.css` defines custom properties on `:root`: colour palette
  (deep red / cream / white, echoing the original `#b42f25`), font stacks,
  spacing steps, radii, shadow, and the door face border style.
- Component styles are CSS Modules. No CSS framework.
- Grid: `Calendar.module.css` holds the `grid-template-columns/rows` for mobile
  and the `min-width: 769px` desktop variant, ported from the original.
- Layout is responsive down to ~320px; the grid template swaps at 769px exactly
  as the original did.

## Error handling

| Situation | Handling |
|---|---|
| `localStorage` unavailable / throws | try/catch, in-memory `Set` fallback for the session |
| Clipboard API missing / rejects | `execCommand` fallback; on total failure show an error message and select the code text |
| `?day=` not an integer 1..25 | ignored, fall back to the real date |
| Current month is not December | `effectiveDay = 0`, all doors `locked` |
| A gift image fails to load | `alt` text on the image; door still functions |
| `CALENDAR` data malformed (dev error) | not defensively handled; a dev-time invariant test asserts 25 unique days 1..25 |

## Testing

Vitest + React Testing Library. Focused, not exhaustive.

- **`dayState.test.ts`**: `getDayState` across locked / today / past / opened,
  including `today === 0` (pre-December) and the `opened` set overriding a
  past/today day.
- **`useOpenedDays.test.ts`**: starts empty; `markOpened` persists and a
  re-mount restores; simulate `localStorage.setItem` throwing and assert the
  hook still records opens in memory.
- **`useAdventDay.test.ts`**: `?day=10` override respected; invalid override
  ignored; a mocked December date returns the clamped day; a mocked June date
  returns 0.
- **`Door.test.tsx`**: renders the right `aria-label` / `data-state` per state;
  clicking a `locked` door adds the shake class and does not call `onOpen` with
  an open; clicking a `today` door calls `onOpen(day)`.
- **`DayDialog.test.tsx`**: shows `title` / `message`; renders the code pill
  only when `code` is set; clicking "Copiar" calls a mocked `copyText` and
  surfaces the "Copiado" state.

No E2E / visual-regression layer.

## Deployment

- `vite build` → static `dist/`.
- `vite.config.ts` `base` set so it works under a GitHub Pages project path;
  a short README section covers Pages and Vercel.

## Open questions

None outstanding. The "past days openable, with a distinct look from today"
decision is settled and reflected in the Door state model above.
