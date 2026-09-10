// Pure builders for the theme-file / template / page provisioning scripts.

const NO_ENTRY = 'Select an Advent calendar entry in the section settings.';

/** Accept `123`, `"123"` or `"gid://shopify/OnlineStoreTheme/123"` → 123 (REST needs the numeric id). */
export function normalizeThemeId(input) {
  const m = /(\d+)\s*$/.exec(String(input).trim());
  if (!m) throw new Error(`Invalid theme id: ${input}`);
  return Number(m[1]);
}

/** Get the target theme id from argv. Accepts a bare positional id
 *  (`... 12345`), `--theme 12345`, or `--theme=12345`. The positional form
 *  is the one that survives `npm run … -- …` under PowerShell. */
export function parseArgs(argv) {
  let theme = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--theme') { theme = argv[i + 1]; i++; }
    else if (a.startsWith('--theme=')) { theme = a.slice('--theme='.length); }
    else if (theme === null && !a.startsWith('-')) { theme = a; }
  }
  if (!theme) {
    throw new Error(
      'Pass the target theme id:  npm run push-theme -- <theme-id>\n'
        + 'List ids with:  npm run list-themes\n'
        + 'Use an unpublished / duplicated theme, not the live one.',
    );
  }
  return { theme: normalizeThemeId(theme) };
}

/** Merge `sections.advent_calendar.no_entry` into an existing `en.default.json`
 *  string, preserving every other key. Empty/malformed input → a fresh object. */
export function mergeLocaleNoEntry(existingText) {
  let obj = {};
  if (existingText && String(existingText).trim()) {
    try { obj = JSON.parse(existingText); } catch { obj = {}; }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) obj = {};

  const sections = obj.sections && typeof obj.sections === 'object' && !Array.isArray(obj.sections)
    ? obj.sections : {};
  const advent = sections.advent_calendar && typeof sections.advent_calendar === 'object'
    && !Array.isArray(sections.advent_calendar)
    ? sections.advent_calendar : {};

  obj.sections = { ...sections, advent_calendar: { ...advent, no_entry: NO_ENTRY } };
  return JSON.stringify(obj, null, 2);
}

export const DEFAULT_GRID = { columns: 7, rows: 8, columnsMobile: 4, rowsMobile: 14, gap: 8 };

/** Parse a `cols/rows/mCols/mRows/gap` answer (any part blank/invalid → its default). */
export function parseGrid(answer) {
  const n = String(answer).split('/').map((s) => Number.parseInt(s.trim(), 10));
  const pick = (v, dflt, min) => (Number.isInteger(v) && v >= min ? v : dflt);
  return {
    columns: pick(n[0], DEFAULT_GRID.columns, 1),
    rows: pick(n[1], DEFAULT_GRID.rows, 1),
    columnsMobile: pick(n[2], DEFAULT_GRID.columnsMobile, 1),
    rowsMobile: pick(n[3], DEFAULT_GRID.rowsMobile, 1),
    gap: pick(n[4], DEFAULT_GRID.gap, 0),
  };
}

/** URL/handle slug: lowercase, strip accents, non-alphanumerics → single `-`. */
export function slugify(text) {
  return String(text)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'advent-calendar';
}

/** The `templates/page.advent-calendar.json` body: one advent-calendar section.
 *  Wired to the metaobject entry by GID (`entryId` → `calendar_entry`, the
 *  reliable path — same as the theme-editor picker) when available, and always
 *  by `calendar_handle` as a fallback. */
export function pageTemplate({ handle = 'advent-calendar-default', entryId = null, grid = {} } = {}) {
  const g = { ...DEFAULT_GRID, ...grid };
  const settings = {
    calendar_handle: handle,
    grid_columns: g.columns,
    grid_rows: g.rows,
    grid_columns_mobile: g.columnsMobile,
    grid_rows_mobile: g.rowsMobile,
    grid_gap: g.gap,
    layout_guides: false,
    preview_day: 0,
  };
  if (entryId) settings.calendar_entry = entryId;
  return {
    sections: { advent_calendar: { type: 'advent-calendar', settings } },
    order: ['advent_calendar'],
  };
}

/** REST `POST /pages.json` body. `suffix` maps to `templates/page.<suffix>.json`. */
export function pageInput({
  title = 'Advent Calendar',
  handle = 'advent-calendar',
  suffix = 'advent-calendar',
} = {}) {
  return { page: { title, handle, template_suffix: suffix, body_html: '' } };
}
