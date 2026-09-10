// Create (or update) an "Advent Calendar" page that renders via
// templates/page.advent-calendar.json.
//   npm run create-page
// Idempotent: if a page with handle `advent-calendar` exists, its
// template_suffix is set instead of creating a duplicate.

import { restClient, requireEnv } from './lib/admin.mjs';
import { pageInput } from './lib/theme-input.mjs';

async function main() {
  const { store, token } = requireEnv();
  const req = restClient({ store, token });
  const input = pageInput();

  const { pages } = await req('GET', '/pages.json?limit=250&fields=id,handle,template_suffix');
  const existing = (pages || []).find((p) => p.handle === input.page.handle);

  let page;
  if (existing) {
    const r = await req('PUT', `/pages/${existing.id}.json`, {
      page: { id: existing.id, template_suffix: input.page.template_suffix },
    });
    page = r.page;
    console.log(`~ updated page ${page.id} (${page.handle})`);
  } else {
    const r = await req('POST', '/pages.json', input);
    page = r.page;
    console.log(`+ created page ${page.id} (${page.handle})`);
  }

  console.log(`Storefront: https://${store}/pages/${page.handle}`);
  console.log('It renders once a theme carrying templates/page.advent-calendar.json '
    + 'is previewed or published (see npm run push-theme).');
}

main().catch((err) => { console.error(err.message); process.exit(1); });
