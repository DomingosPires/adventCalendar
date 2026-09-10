// Create (or update) a page that renders via templates/page.advent-calendar.json.
//   npm run create-page
// Idempotent: if a page with the target handle exists, only its
// template_suffix is set instead of creating a duplicate.

import { restClient, requireEnv, isEntrypoint } from './lib/admin.mjs';
import { pageInput } from './lib/theme-input.mjs';

const SUFFIX = 'advent-calendar';

/** Create or update the storefront page. `store` is only used for the printed URL. */
export async function run({ req, store, title = 'Advent Calendar', handle = 'advent-calendar', log = console.log } = {}) {
  const input = pageInput({ title, handle, suffix: SUFFIX });

  const { pages } = await req('GET', '/pages.json?limit=250&fields=id,handle,template_suffix');
  const existing = (pages || []).find((p) => p.handle === handle);

  let page;
  if (existing) {
    const r = await req('PUT', `/pages/${existing.id}.json`, {
      page: { id: existing.id, template_suffix: SUFFIX },
    });
    page = r.page;
    log(`~ updated page ${page.id} (${page.handle})`);
  } else {
    const r = await req('POST', '/pages.json', input);
    page = r.page;
    log(`+ created page ${page.id} (${page.handle})`);
  }

  const url = store ? `https://${store}/pages/${page.handle}` : `/pages/${page.handle}`;
  return { page, url };
}

async function main() {
  const { store, token } = requireEnv();
  const req = restClient({ store, token });
  const { url } = await run({ req, store });
  console.log(`Storefront: ${url}`);
  console.log('It renders once a theme carrying templates/page.advent-calendar.json '
    + 'is previewed or published (see npm run push-theme).');
}

if (isEntrypoint(import.meta.url)) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
