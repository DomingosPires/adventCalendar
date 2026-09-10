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
- `npm run create-defs` — create the two metaobject definitions in a store
  (needs `scripts/.env`; see `docs/INTEGRATION.md` §6).
- `npm run seed` — upsert the 25 day entries + the parent calendar entry.

## Install

- **`docs/quickstart.pdf`** (source `docs/quickstart.html`) — a printable
  step-by-step for adding the calendar to an **existing** theme: upload the
  files, create the two metaobjects, add the section, sanity-check, publish.
- **`docs/INTEGRATION.md`** — the full reference: every field and validation,
  the script path, the grid-layout system, colour precedence, all section
  settings, a QA checklist, and known limitations.

Regenerate the PDF from the HTML — see the comment at the top of
`docs/quickstart.html`.
