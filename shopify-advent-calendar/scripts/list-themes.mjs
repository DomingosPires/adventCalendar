// Print this store's themes and their ids/roles — pick one for `push-theme`.
//   npm run list-themes

import { restClient, requireEnv, isEntrypoint } from './lib/admin.mjs';

async function main() {
  const { store, token } = requireEnv();
  const req = restClient({ store, token });
  const { themes } = await req('GET', '/themes.json?fields=id,name,role,updated_at');
  for (const t of themes || []) {
    console.log(`${String(t.id).padEnd(14)} ${String(t.role).padEnd(11)} ${t.name}`);
  }
  console.log('\nUse an unpublished / duplicated theme with:  npm run push-theme -- --theme <id>');
}

if (isEntrypoint(import.meta.url)) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
