// Upload the advent-calendar section files + a page template to a theme.
//   npm run push-theme -- --theme <id>
// Uploads sections/ snippets/ assets/, generates templates/page.advent-calendar.json,
// and MERGES the `no_entry` key into the theme's existing locales/en.default.json
// (never blind-overwrites it). Pass an unpublished / duplicated theme, not the live one.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { restClient, requireEnv } from './lib/admin.mjs';
import { parseArgs, mergeLocaleNoEntry, pageTemplate } from './lib/theme-input.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

async function putAsset(req, themeId, key, value) {
  await req('PUT', `/themes/${themeId}/assets.json`, { asset: { key, value } });
  console.log(`~ ${key}`);
}

async function main() {
  const { theme } = parseArgs(process.argv.slice(2));
  const { store, token } = requireEnv();
  const req = restClient({ store, token });

  const { themes } = await req('GET', '/themes.json');
  const target = (themes || []).find((t) => t.id === theme);
  if (!target) {
    const list = (themes || []).map((t) => `${t.id} (${t.name} [${t.role}])`).join('; ');
    throw new Error(`Theme ${theme} not in this store. Themes: ${list}`);
  }
  console.log(`Target theme: ${target.id} — ${target.name} [${target.role}]`);
  if (target.role === 'main') console.log('WARNING: this is the LIVE theme.');

  for (const f of FILES) {
    await putAsset(req, theme, f, readFileSync(join(ROOT, f), 'utf8'));
  }

  await putAsset(req, theme, TEMPLATE_KEY, JSON.stringify(pageTemplate(), null, 2));

  let existing = '';
  try {
    const r = await req('GET', `/themes/${theme}/assets.json?asset[key]=${encodeURIComponent(LOCALE_KEY)}`);
    existing = (r && r.asset && r.asset.value) || '';
  } catch {
    console.log(`  (${LOCALE_KEY} not found — creating it)`);
  }
  await putAsset(req, theme, LOCALE_KEY, mergeLocaleNoEntry(existing));

  console.log('Done. Next: npm run create-page');
}

main().catch((err) => { console.error(err.message); process.exit(1); });
