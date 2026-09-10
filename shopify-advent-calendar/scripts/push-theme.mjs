// Upload the advent-calendar section files + a page template to a theme.
//   npm run push-theme -- <theme-id>
// Uploads sections/ snippets/ assets/, generates templates/page.advent-calendar.json,
// and MERGES the `no_entry` key into the theme's existing locales/en.default.json
// (never blind-overwrites it). Pass an unpublished / duplicated theme, not the live one.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { restClient, requireEnv, isEntrypoint } from './lib/admin.mjs';
import { parseArgs, mergeLocaleNoEntry, pageTemplate } from './lib/theme-input.mjs';

const FILES = [
  'sections/advent-calendar.liquid',
  'snippets/advent-door.liquid',
  'snippets/advent-overlay.liquid',
  'snippets/advent-grid-defaults.liquid',
  'snippets/advent-motif.liquid',
  'snippets/advent-snow.liquid',
  'assets/advent-calendar.css',
  'assets/advent-calendar.helpers.js',
  'assets/advent-calendar.js',
];

const LOCALE_KEY = 'locales/en.default.json';
const TEMPLATE_KEY = 'templates/page.advent-calendar.json';

/**
 * Upload every advent-calendar file to `themeId`, generate the page template,
 * and merge the locale key. `rootDir` = the `shopify-advent-calendar/` folder.
 */
export async function run({ req, themeId, rootDir, calendarHandle, grid, log = console.log } = {}) {
  const { themes } = await req('GET', '/themes.json');
  const target = (themes || []).find((t) => t.id === themeId);
  if (!target) {
    const list = (themes || []).map((t) => `${t.id} (${t.name} [${t.role}])`).join('; ');
    throw new Error(`Theme ${themeId} not in this store. Themes: ${list}`);
  }
  log(`Target theme: ${target.id} — ${target.name} [${target.role}]`);
  if (target.role === 'main') log('WARNING: this is the LIVE theme.');

  const put = async (key, value) => {
    await req('PUT', `/themes/${themeId}/assets.json`, { asset: { key, value } });
    log(`~ ${key}`);
  };

  for (const f of FILES) {
    await put(f, readFileSync(join(rootDir, f), 'utf8'));
  }
  await put(TEMPLATE_KEY, JSON.stringify(pageTemplate({ handle: calendarHandle, grid }), null, 2));

  let existing = '';
  try {
    const r = await req('GET', `/themes/${themeId}/assets.json?asset[key]=${encodeURIComponent(LOCALE_KEY)}`);
    existing = (r && r.asset && r.asset.value) || '';
  } catch {
    log(`  (${LOCALE_KEY} not found — creating it)`);
  }
  await put(LOCALE_KEY, mergeLocaleNoEntry(existing));

  return { themeId, themeName: target.name, role: target.role };
}

async function main() {
  const { theme } = parseArgs(process.argv.slice(2));
  const { store, token } = requireEnv();
  const req = restClient({ store, token });
  const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
  await run({ req, themeId: theme, rootDir });
  console.log('Done. Next: npm run create-page');
}

if (isEntrypoint(import.meta.url)) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
