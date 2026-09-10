import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient, requireEnv, isEntrypoint } from './lib/admin.mjs';
import { loadSeed } from './lib/seed-data.mjs';
import { toUpsertInput, buildParentFields } from './lib/seed-input.mjs';

const UPSERT = `
mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
  metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
    metaobject { id handle type }
    userErrors { field message code }
  }
}`;

/** Upsert the 25 day entries + the parent entry (idempotent, by handle). */
export async function run({ client, dir, log = console.log } = {}) {
  const { calendar, days } = loadSeed(dir);

  const gids = [];
  for (const day of days.sort((a, b) => Number(a.fields.day) - Number(b.fields.day))) {
    const data = await client(UPSERT, toUpsertInput(day, 'advent_calendar_day'));
    const id = data.metaobjectUpsert.metaobject.id;
    gids.push(id);
    log(`~ ${day.handle} -> ${id}`);
  }

  const parent = {
    handle: { type: 'advent_calendar', handle: calendar.handle },
    metaobject: {
      fields: buildParentFields(calendar.fields, gids),
      capabilities: { publishable: { status: 'ACTIVE' } },
    },
  };
  const data = await client(UPSERT, parent);
  const parentId = data.metaobjectUpsert.metaobject.id;
  log(`~ ${calendar.handle} -> ${parentId}`);
  return { parentHandle: calendar.handle, parentId, dayIds: gids };
}

async function main() {
  const { store, token } = requireEnv();
  const client = createClient({ store, token });
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'metaobjects', 'seed');
  await run({ client, dir });
  console.log('Done. Pick this entry in the section settings.');
}

if (isEntrypoint(import.meta.url)) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
