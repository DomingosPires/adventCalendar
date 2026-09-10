# Changelog

Notable changes to the Shopify Advent Calendar section. No formal versioning yet.

## Unreleased

### Added
- `npm run setup` — interactive installer: definitions → 25 entries → theme
  files + template → page → optional publish. `--dry-run` prints the plan
  without calling the API.
- `npm run teardown` — reverse it (page, theme files, metaobject definitions +
  their entries). Destructive; each part is opt-in and confirmed by typing.
- `npm run push-theme -- <theme-id>` / `npm run create-page` /
  `npm run list-themes` — the theme-file and page steps as standalone REST
  scripts.
- `background_type` on the `advent_calendar` metaobject — `solid` / `gradient`
  / `image`, with per-type fields; only the selected type is applied.
- `docs/quickstart.pdf`, `docs/custom-app.pdf` — printable guides.
- `MIT LICENSE`, `engines: node >=18`.

### Changed
- Scripts read `scripts/.env` automatically (`parseDotEnv`); real environment
  variables still win.
- `advent-overlay.liquid` uses Shopify's `image_tag` filter and `image.value`.
- Seed `message` is sent as the rich-text AST JSON (`toRichText`), not HTML —
  so `npm run seed` works against a live store.

### Fixed
- In-memory `localStorage` fallback restored in `advent-calendar.helpers.js`.
- Removed `role="list"` / `role="listitem"` from the door grid (a11y).

## 2026-09-10 — initial port

React advent calendar (`advent-calendar-react/`) ported to a classic Shopify
theme section driven by two metaobjects, built and reviewed via
subagent-driven development. Merged to `main` at `4f7af6a`.
