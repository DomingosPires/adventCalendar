// Pure builders for the theme-file / template / page provisioning scripts.

const NO_ENTRY = 'Select an Advent calendar entry in the section settings.';

/** Accept `123`, `"123"` or `"gid://shopify/OnlineStoreTheme/123"` → 123 (REST needs the numeric id). */
export function normalizeThemeId(input) {
  const m = /(\d+)\s*$/.exec(String(input).trim());
  if (!m) throw new Error(`Invalid theme id: ${input}`);
  return Number(m[1]);
}

/** Parse `--theme <id>` / `--theme=<id>` from argv; throw with guidance if absent. */
export function parseArgs(argv) {
  let theme = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--theme') { theme = argv[i + 1]; i++; }
    else if (argv[i].startsWith('--theme=')) { theme = argv[i].slice('--theme='.length); }
  }
  if (!theme) {
    throw new Error(
      'Pass the target theme id: npm run push-theme -- --theme <id>\n'
        + 'List ids with: GET /admin/api/2025-01/themes.json\n'
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

/** The `templates/page.advent-calendar.json` body: one advent-calendar section
 *  wired to the metaobject entry via the `calendar_handle` text setting. */
export function pageTemplate({ handle = 'advent-calendar-default' } = {}) {
  return {
    sections: {
      advent_calendar: {
        type: 'advent-calendar',
        settings: {
          calendar_handle: handle,
          grid_columns: 7,
          grid_rows: 8,
          grid_columns_mobile: 4,
          grid_rows_mobile: 14,
          grid_gap: 8,
          layout_guides: false,
          preview_day: 0,
        },
      },
    },
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
