# Shopify Advent Calendar

A Shopify port of `advent-calendar-react/` — the 25-door mosaic advent calendar
(irregular tiling, snow, one surprise per door, date-gated doors, opened doors
remembered) rebuilt as **a classic Shopify theme section**.

## Data model — two metaobjects

All content and styling live in two metaobject definitions:

| Type handle | Display name | Purpose |
|---|---|---|
| `advent_calendar` | Advent Calendar | Global config: heading, colours, start date, and the ordered list of days. One entry, chosen in the section. |
| `advent_calendar_day` | Advent Calendar Day | One entry per day (1–25): title, message, code, motif, image, link, and an optional grid position/size override. |

The section reads one `advent_calendar` entry (via a `metaobject` setting, or a
handle-text fallback), resolves colours, iterates `days` ordered by the `day`
field, and renders the grid. See `docs/INTEGRATION.md` for the full install.

## Repo layout — what Shopify consumes

Only these four folders are uploaded to / read by Shopify:

```
sections/   snippets/   assets/   locales/
```

`metaobjects/`, `scripts/`, and `docs/` are **not** consumed by Shopify. They are
for the person installing the section:

- `metaobjects/` — human-readable definition JSON (source of truth for the data
  design) plus seed data. Not a Shopify format.
- `scripts/` — Node provisioning scripts (Admin GraphQL) to create the
  definitions and seed the 25 entries.
- `docs/` — `INTEGRATION.md`, the manual install guide.

## Commands

Run from this directory (`shopify-advent-calendar/`), Node ≥ 18:

- `npm test` — `node --test`: Node unit tests for the JS helpers and the
  provisioning-script libs, plus structural checks over the Liquid/CSS/schema
  (grid contract, motif keys, 25-day layout table, section settings).
- `npm run check` — Theme Check (`@shopify/cli theme check`). Expected: 0
  offenses of severity `error`.

Provisioning (need `scripts/.env` with a custom-app token — see
`docs/custom-app.pdf`):

- `npm run setup` — **interactive wizard**: runs the whole install (definitions
  → 25 entries → theme files + template → page → optional publish), prompting
  for theme id, page title/handle and grid.
- `npm run setup -- --dry-run` — ask everything, print the plan, touch nothing.
- `npm run create-defs` / `npm run seed` — the two metaobject steps on their own.
- `npm run list-themes` / `npm run push-theme -- <theme-id>` / `npm run create-page`
  — the theme-files and page steps on their own.
- `npm run teardown` — **destructive**, interactive: remove the page, the theme
  files, and/or the metaobject definitions (which deletes all their entries).
  Each part is opt-in and confirmed by typing.

## Install / docs

- **`docs/custom-app.pdf`** — create the Shopify custom app + pick the API
  scopes + put the token in `scripts/.env`. Do this first.
- **`docs/quickstart.pdf`** — printable step-by-step for a by-hand install into
  an existing theme, plus the API path. Includes the 25 default day entries.
- **`docs/INTEGRATION.md`** — the full reference: every field, the script/API
  path, the grid-layout system, colour precedence, all section settings, a QA
  checklist, §13 troubleshooting, and known limitations.
- **`CHANGELOG.md`** — notable changes.

The `.pdf` files are tracked; their `.html` sources are not — recover from git
history (`git log -- docs/<name>.html`) if a PDF needs regenerating. Drop a
screenshot at `docs/preview.png` to show the finished calendar.

## Licence

MIT — see `LICENSE`.
