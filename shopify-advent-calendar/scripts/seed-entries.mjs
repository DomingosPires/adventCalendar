import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient, requireEnv } from './lib/admin.mjs';
import { loadSeed } from './lib/seed-data.mjs';
import { toUpsertInput, buildParentFields } from './lib/seed-input.mjs';

const UPSERT = `
mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
  metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
    metaobject { id handle type }
    userErrors { field message code }
  }
}`;

async function main() {
  const { store, token } = requireEnv();
  const client = createClient({ store, token });
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'metaobjects', 'seed');
  const { calendar, days } = loadSeed(dir);

  const gids = [];
  for (const day of days.sort((a, b) => Number(a.fields.day) - Number(b.fields.day))) {
    const input = toUpsertInput(day, 'advent_calendar_day');
    const data = await client(UPSERT, input);
    const id = data.metaobjectUpsert.metaobject.id;
    gids.push(id);
    console.log(`~ ${day.handle} -> ${id}`);
  }

  const parent = {
    handle: { type: 'advent_calendar', handle: calendar.handle },
    metaobject: {
      fields: buildParentFields(calendar.fields, gids),
      capabilities: { publishable: { status: 'ACTIVE' } },
    },
  };
  const data = await client(UPSERT, parent);
  console.log(`~ ${calendar.handle} -> ${data.metaobjectUpsert.metaobject.id}`);
  console.log('Done. Pick this entry in the section settings.');
}

main().catch((err) => { console.error(err.message); process.exit(1); });
