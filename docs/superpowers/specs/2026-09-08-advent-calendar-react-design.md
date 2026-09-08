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
- Components organised by the **Atomic Design** pattern
  (atoms → molecules → organisms → templates → pages).
- Test suite (Vitest + React Testing Library) with an enforced **≥ 95 %
  coverage** gate; a PR cannot be approved below it.
- Static build, deployable to GitHub Pages / Vercel with no config.

## Non-goals

- Multi-language. Content is a single locale (Portuguese) in the data file.
- Any brand / e-commerce specifics (promo rules, "buy" button, per-URL data).
  A generic optional `code` field keeps the copy-to-clipboard interaction.
- A backend, accounts, or cross-device sync. `localStorage` only.
- A CMS or admin UI. Day content is edited directly in `data/calendar.ts`.
- Configurable day count. Fixed at 25 to match the existing grid layout.

## Architecture

### Atomic Design layering

Components live under `src/components/<layer>/<Name>/`. Each component folder
holds `<Name>.tsx`, `<Name>.module.css`, `<Name>.test.tsx`, and `index.ts`
(re-export only). Layers and the **one-way import rule** — a component may
import components only from layers strictly below it, never sideways, never up:

| Layer | Contains | May import from |
|---|---|---|
| **atoms** | Indivisible UI: `Button`, `Badge`, `DoorNumber`, `Snow` (leaf canvas) | nothing (other than `lib/`, `styles/`) |
| **molecules** | Small groups of atoms with one job: `Door`, `CopyableCode`, `SiteHeader` | atoms |
| **organisms** | Sections with their own layout/state: `CalendarGrid`, `DayDialog` | molecules, atoms |
| **templates** | Page skeleton, slots, no data/hooks: `CalendarTemplate` | organisms, molecules, atoms |
| **pages** | A template wired to data, hooks, state: `CalendarPage` | templates, organisms, hooks, data |

`hooks/`, `lib/`, `data/`, `styles/`, `assets/` are cross-cutting and may be
imported by any layer. An ESLint rule (`import/no-restricted-paths` or
`eslint-plugin-boundaries`) encodes the table above and fails CI on violation.

```
advent-calendar-react/
  index.html
  package.json
  vite.config.ts               # includes the Vitest + coverage config
  tsconfig.json
  .eslintrc.cjs                # atomic-layer boundary rules
  .github/workflows/ci.yml
  src/
    main.tsx                   # renders <CalendarPage />
    components/
      atoms/
        Button/                # Button.tsx, .module.css, .test.tsx, index.ts
        Badge/                 # "Hoje" / check / "abrir" chevron variants
        DoorNumber/            # the day numeral on the door face
        Snow/                  # fixed <canvas>, rAF loop, leaf
      molecules/
        Door/                  # gift face + DoorNumber + Badge; flip / shake
        CopyableCode/          # code text + Button + copied/error status
        SiteHeader/            # title + subtitle
      organisms/
        CalendarGrid/          # the irregular grid of <Door>; owns selectedDay
        DayDialog/             # native <dialog>: title, message, CopyableCode
      templates/
        CalendarTemplate/      # background layer + Snow slot + header/grid slots
      pages/
        CalendarPage/          # useAdventDay + useOpenedDays -> template
    hooks/
      useOpenedDays.ts
      useAdventDay.ts
    lib/
      dayState.ts
      clipboard.ts
    data/
      calendar.ts              # CalendarDay[] — content + grid layout
    styles/
      theme.css                # CSS custom properties: palette, type, spacing
    assets/
      background.png
      gift1.png … gift5.png
  src/test/setup.ts            # RTL + jest-dom, matchMedia/dialog polyfills
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

**atoms/`Button`** — styled `<button>` wrapper: `variant` (`solid` | `ghost`),
`type` default `"button"`, forwards ref and the rest of the native props. Used
by `CopyableCode` and `DayDialog`'s close control.

**atoms/`Badge`** — small pill/icon with `variant`: `today` ("Hoje"),
`opened` (check), `available` (chevron / "abrir"). Presentational only.

**atoms/`DoorNumber`** — the day numeral rendered on the door face; `size` prop
drives the type scale.

**atoms/`Snow`** — the fixed full-viewport `<canvas>` and its `requestAnimation
Frame` loop (details below). A leaf: no children, no other components.

**pages/`CalendarPage`** — calls `useAdventDay()` and `useOpenedDays()`, builds
the `CalendarDay` + `DayState` list, holds the `selectedDay: CalendarDay | null`
UI state, and renders `<CalendarTemplate>` with the header, grid and dialog
filled in.

- `onOpen(day)`:
  - state `'locked'` → do nothing here; the Door plays its own shake.
  - state `'today' | 'past' | 'opened'` → `markOpened(day)` and
    `setSelectedDay(dayData)`.

**templates/`CalendarTemplate`** — pure layout: full-viewport background image
layer, `<Snow />`, and named slots (`header`, `grid`, `dialog`) as props. No
hooks, no data.

**organisms/`CalendarGrid`** — receives the day list and `onOpen`; renders the
irregular CSS grid of `<Door>` (grid templates ported from the original CSS).

**molecules/`SiteHeader`** — title + subtitle.

**molecules/`Door`** — a `<button>` sized via `gridArea` (inline style, switched by a
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

**organisms/`DayDialog`** — wraps the native `<dialog>` element.

- `open` when `selectedDay != null`; call `dialogRef.current.showModal()` /
  `.close()` in an effect. Native `<dialog>` gives focus trapping, `Esc` to
  close, and `::backdrop`.
- Content: day number, `title`, `message`, and — if `code` is set —
  `<CopyableCode code={code} />`.
- Close via the backdrop click, `Esc`, or an explicit "Fechar" `Button`; on
  close `CalendarPage` sets `selectedDay = null`.
- Type scale keyed off `selectedDay.size` (ported intent from the original's
  `.card_2x2 .advento .title` etc., but only as it affects the dialog).

**molecules/`CopyableCode`** — shows `code` in a pill with a `Button`; calls
`lib/clipboard.copyText`. On success shows "Copiado" for ~2s; on failure shows
"Não foi possível copiar" and selects the text so the user can copy manually.
Isolated from `DayDialog` so its clipboard states are unit-testable.

**atoms/`Snow`** — a fixed-position full-viewport `<canvas>` behind the content
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
- Component styles are CSS Modules, co-located in each component folder.
  No CSS framework.
- Grid: `CalendarGrid.module.css` holds the `grid-template-columns/rows` for
  mobile and the `min-width: 769px` desktop variant, ported from the original.
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

Vitest + React Testing Library + `@testing-library/jest-dom`. **Every component,
hook and lib module ships with a co-located `*.test.tsx?` file** — this is a
hard rule, not "focused, not exhaustive". Environment: `jsdom`, with
`src/test/setup.ts` registering jest-dom and polyfilling `matchMedia` and
`HTMLDialogElement.showModal/close` (jsdom lacks them).

### Coverage gate (≥ 95 %)

- `vite.config.ts` `test.coverage`: provider `v8`, reporters `text` +
  `lcov` + `html`, and `thresholds` set to **95** for `statements`,
  `branches`, `functions`, and `lines`. Vitest exits non-zero when any metric
  is below 95, which fails the command and the CI job.
- `coverage.include`: `src/**/*.{ts,tsx}`. `coverage.exclude`: `src/main.tsx`,
  `**/index.ts` barrels, `**/*.test.*`, `src/test/**`, `src/data/**` (static
  data), type-only files.
- npm scripts: `test` (watch), `test:run` (once), `test:coverage`
  (`vitest run --coverage`), `lint`, `typecheck`.

### Test inventory

- **`lib/dayState.test.ts`**: `getDayState` across locked / today / past /
  opened, including `today === 0` (pre-December) and the `opened` set overriding
  a past/today day; every branch hit.
- **`lib/clipboard.test.ts`**: `writeText` success path; `writeText` rejects →
  `execCommand` fallback path; both unavailable → returns `false`, never throws.
- **`hooks/useOpenedDays.test.ts`**: starts empty; `markOpened` persists and a
  re-mount restores; `markOpened` is idempotent; `localStorage.setItem`
  throwing → hook still records opens in memory; malformed JSON in storage →
  treated as empty.
- **`hooks/useAdventDay.test.ts`**: `?day=10` override respected; non-integer /
  out-of-range override ignored; mocked December date returns the clamped day
  (e.g. Dec 30 → 25); mocked June date returns 0.
- **`atoms/Button`**: renders children, `type="button"` default, `variant`
  class, forwards `onClick` and `ref`.
- **`atoms/Badge`**: each `variant` renders its label/icon and class.
- **`atoms/DoorNumber`**: renders the number; `size` drives the class.
- **`atoms/Snow`**: mounts a `<canvas>`; requests animation frames when motion
  is allowed; renders nothing / starts no loop when `prefers-reduced-motion:
  reduce`; cancels the frame on unmount. `requestAnimationFrame` /
  `cancelAnimationFrame` / `matchMedia` mocked.
- **`molecules/Door`**: right `aria-label` / `data-state` per state; the
  correct `Badge` variant per state; clicking a `locked` door adds the shake
  class and does not call `onOpen`; clicking `today` / `past` / `opened` calls
  `onOpen(day)`; with `prefers-reduced-motion` no shake/flip class is applied
  but `onOpen` still fires.
- **`molecules/CopyableCode`**: renders the code; "Copiar" calls a mocked
  `copyText`; success → "Copiado" shown then cleared; failure → error text
  shown and the code element selected.
- **`molecules/SiteHeader`**: renders title + subtitle text.
- **`organisms/CalendarGrid`**: renders 25 `Door`s; forwards `onOpen` with the
  clicked day; applies the grid class.
- **`organisms/DayDialog`**: calls `showModal` when `selectedDay` set and
  `close` when cleared; shows `title` / `message`; renders `CopyableCode` only
  when `code` is set; "Fechar" and `Esc` and backdrop click each invoke
  `onClose`; type-scale class follows `size`.
- **`templates/CalendarTemplate`**: renders the `header` / `grid` / `dialog`
  slots and the `Snow` layer.
- **`pages/CalendarPage`**: with `?day=` fixed, renders the grid; clicking
  today's door opens the dialog with that day's content and the day becomes
  `opened` (persisted via the real `useOpenedDays`, `localStorage` mocked);
  clicking a locked door does not open the dialog.
- **`data/calendar.test.ts`**: invariant — exactly 25 entries, `day` values are
  the unique set 1..25, every `image` is a known key, every `gridArea` /
  `gridAreaMobile` is non-empty.

No E2E / visual-regression layer; the coverage gate is enforced on unit +
component tests only.

## CI

`.github/workflows/ci.yml`, run on every PR and push to `main`:

1. `npm ci`
2. `npm run typecheck` (`tsc --noEmit`)
3. `npm run lint` (ESLint, including the atomic-layer boundary rule)
4. `npm run test:coverage` — fails if any coverage metric < 95 %
5. `npm run build`

Branch protection on `main` requires this workflow to pass, so a PR that drops
coverage below 95 % or violates a layer boundary cannot be merged.

## Deployment

- `vite build` → static `dist/`.
- `vite.config.ts` `base` set so it works under a GitHub Pages project path;
  a short README section covers Pages and Vercel.
- Optional follow-up (not in the first plan): a `deploy` workflow publishing
  `dist/` to GitHub Pages on push to `main`.

## Open questions

None outstanding. The "past days openable, with a distinct look from today"
decision is settled and reflected in the Door state model above.
