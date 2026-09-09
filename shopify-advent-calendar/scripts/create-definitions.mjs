import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient, requireEnv } from './lib/admin.mjs';
import { loadDefinitions } from './lib/definitions.mjs';
import { toDefinitionInput } from './lib/definition-input.mjs';

const MUTATION = `
mutation CreateDef($definition: MetaobjectDefinitionCreateInput!) {
  metaobjectDefinitionCreate(definition: $definition) {
    metaobjectDefinition { id type }
    userErrors { field message code }
  }
}`;

const BY_TYPE = `
query DefByType($type: String!) {
  metaobjectDefinitionByType(type: $type) { id type }
}`;

async function ensureDefinition(client, def, refIds) {
  const existing = await client(BY_TYPE, { type: def.type });
  if (existing.metaobjectDefinitionByType) {
    console.log(`= ${def.type} already exists (${existing.metaobjectDefinitionByType.id})`);
    return existing.metaobjectDefinitionByType.id;
  }
  const data = await client(MUTATION, { definition: toDefinitionInput(def, refIds) });
  const id = data.metaobjectDefinitionCreate.metaobjectDefinition.id;
  console.log(`+ created ${def.type} (${id})`);
  return id;
}

async function main() {
  const { store, token } = requireEnv();
  const client = createClient({ store, token });
  const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'metaobjects');
  const { day, calendar } = loadDefinitions(dir);
  const dayId = await ensureDefinition(client, day, {});
  await ensureDefinition(client, calendar, { advent_calendar_day: dayId });
  console.log('Done.');
}

main().catch((err) => { console.error(err.message); process.exit(1); });
