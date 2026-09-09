# Shopify Advent Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port `advent-calendar-react/` to a classic Shopify theme section whose content and styling live in two metaobjects (`advent_calendar`, `advent_calendar_day`).

**Architecture:** A Liquid section reads one `advent_calendar` metaobject entry (picked in the theme editor), injects its colors as CSS custom properties, and iterates its `days` list. Each day renders as a CSS-grid door whose position comes from an optional per-entry `grid_area` override, else a baked-in defaults map matching the React layout. A vanilla-JS controller handles localStorage persistence, `?day=N` preview, the overlay (FLIP open, focus trap), and an opt-in layout-validation overlay. Two zero-dependency Node scripts provision the metaobject definitions and seed 25 day entries via the Admin GraphQL API; a manual path in `INTEGRATION.md` does the same by hand.

**Tech Stack:** Shopify Liquid (Online Store 2.0 section), vanilla JS (ES2020, Web Animations API), CSS custom properties + CSS Grid, Node ≥18 with built-in `node:test` (scripts + JS helpers), `@shopify/cli` Theme Check (lint), Shopify Admin GraphQL API `2025-01`.

**Spec:** `docs/superpowers/specs/2026-09-09-shopify-advent-calendar-design.md`

## Global Constraints

- Classic theme section, single store. No app, no theme app extension, no Admin UI.
- Exactly 25 days. Default grid: **7 columns × 8 rows** desktop, **4 × 14** mobile (56 cells each).
- Metaobject type handles: `advent_calendar`, `advent_calendar_day`. Both `access.storefront = PUBLIC_READ`, `capabilities.publishable.enabled = true`.
- Motif keys (exactly these 10): `wreath, candle, star, gift, tree, bell, snowflake, stocking, bauble, candycane`. Unknown/empty → `wreath`.
- No standalone `size` field — a door's size is the two `span` values inside its `grid_area` string. Syntax: `"<row> / <col> / span <height> / span <width>"`.
- Color precedence: section setting override → metaobject `color` field → hard-coded default. Defaults: bg `#1c1613`, text `#f6ede0`, door `#2a3d35`, door-text `#cfe3d4`, accent `#c9a24b`.
- localStorage key: `advent-calendar:opened:{section.id}`. Value: JSON array of integers. Malformed → empty. In-memory fallback if `localStorage` throws.
- `prefers-reduced-motion`: no FLIP, no shake, no snow, no shine.
- Node scripts: `"type": "module"`, zero runtime dependencies (native `fetch`), env `SHOPIFY_STORE` + `SHOPIFY_ADMIN_TOKEN`, API version `2025-01`.
- Only files under `sections/`, `snippets/`, `assets/`, `locales/` are consumed by Shopify. `metaobjects/`, `scripts/`, `docs/` are for the installer.
- All new files live under `shopify-advent-calendar/` (sibling of `advent-calendar-react/`).
- Liquid has no test runner: Liquid/JSON files are verified with Theme Check + structural `node:test` assertions; rendering and DOM behavior are verified with a documented manual QA script against a Shopify dev store.

---

### Task 1: Project scaffold + Admin GraphQL client

**Files:**
- Create: `shopify-advent-calendar/package.json`
- Create: `shopify-advent-calendar/.gitignore`
- Create: `shopify-advent-calendar/.theme-check.yml`
- Create: `shopify-advent-calendar/scripts/lib/admin.mjs`
- Test: `shopify-advent-calendar/scripts/lib/admin.test.mjs`

**Interfaces:**
- Produces:
  - `adminEndpoint(store: string, version = '2025-01'): string` — returns `https://<store>/admin/api/<version>/graphql.json`.
  - `parseGraphQLResponse(body: object): { data: object }` — throws `Error` with joined `errors[].message` or joined `userErrors` when present; else returns `{ data }`.
  - `createClient({ store, token, fetchImpl = fetch }): (query: string, variables?: object) => Promise<object>` — POSTs, calls `parseGraphQLResponse`, returns `data`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "shopify-advent-calendar",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "check": "npx --yes @shopify/cli@latest theme check || true",
    "create-defs": "node scripts/create-definitions.mjs",
    "seed": "node scripts/seed-entries.mjs"
  }
}
```

- [ ] **Step 2: Create `.gitignore` and `.theme-check.yml`**

`.gitignore`:
```
node_modules/
.env
```

`.theme-check.yml` (partial theme — disable whole-theme checks):
```yaml
extends: theme-check:recommended
ignore:
  - node_modules/**
  - scripts/**
  - metaobjects/**
  - docs/**
MissingTemplate:
  enabled: false
UndefinedObject:
  enabled: false
```

- [ ] **Step 3: Write the failing test**

`scripts/lib/admin.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { adminEndpoint, parseGraphQLResponse, createClient } from './admin.mjs';

test('adminEndpoint builds the versioned GraphQL URL', () => {
  assert.equal(
    adminEndpoint('demo.myshopify.com'),
    'https://demo.myshopify.com/admin/api/2025-01/graphql.json',
  );
  assert.equal(
    adminEndpoint('demo.myshopify.com', '2024-10'),
    'https://demo.myshopify.com/admin/api/2024-10/graphql.json',
  );
});

test('parseGraphQLResponse returns data when clean', () => {
  assert.deepEqual(parseGraphQLResponse({ data: { ok: 1 } }), { data: { ok: 1 } });
});

test('parseGraphQLResponse throws on top-level errors', () => {
  assert.throws(
    () => parseGraphQLResponse({ errors: [{ message: 'bad' }, { message: 'worse' }] }),
    /bad; worse/,
  );
});

test('parseGraphQLResponse throws on nested userErrors', () => {
  assert.throws(
    () => parseGraphQLResponse({
      data: { thing: { userErrors: [{ field: ['x'], message: 'taken' }] } },
    }),
    /taken/,
  );
});

test('createClient posts and unwraps data', async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url, opts });
    return { json: async () => ({ data: { hello: 'world' } }) };
  };
  const client = createClient({ store: 'demo.myshopify.com', token: 't', fetchImpl: fakeFetch });
  const data = await client('query { hello }', { a: 1 });
  assert.equal(data.hello, 'world');
  assert.equal(calls[0].url, 'https://demo.myshopify.com/admin/api/2025-01/graphql.json');
  assert.equal(calls[0].opts.headers['X-Shopify-Access-Token'], 't');
  assert.equal(JSON.parse(calls[0].opts.body).variables.a, 1);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/admin.test.mjs`
Expected: FAIL — `Cannot find module './admin.mjs'`.

- [ ] **Step 5: Write minimal implementation**

`scripts/lib/admin.mjs`:
```js
const DEFAULT_VERSION = '2025-01';

export function adminEndpoint(store, version = DEFAULT_VERSION) {
  return `https://${store}/admin/api/${version}/graphql.json`;
}

function collectUserErrors(node, acc) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.userErrors) && node.userErrors.length) {
    for (const e of node.userErrors) acc.push(e.message);
  }
  for (const key of Object.keys(node)) collectUserErrors(node[key], acc);
}

export function parseGraphQLResponse(body) {
  if (Array.isArray(body.errors) && body.errors.length) {
    throw new Error(body.errors.map((e) => e.message).join('; '));
  }
  const userErrors = [];
  collectUserErrors(body.data, userErrors);
  if (userErrors.length) throw new Error(userErrors.join('; '));
  return { data: body.data };
}

export function createClient({ store, token, version = DEFAULT_VERSION, fetchImpl = fetch }) {
  const url = adminEndpoint(store, version);
  return async function run(query, variables = {}) {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    });
    const body = await res.json();
    return parseGraphQLResponse(body).data;
  };
}

export function requireEnv() {
  const store = process.env.SHOPIFY_STORE;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!store || !token) {
    throw new Error('Set SHOPIFY_STORE and SHOPIFY_ADMIN_TOKEN environment variables.');
  }
  return { store, token };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/admin.test.mjs`
Expected: PASS (5 tests).

- [ ] **Step 7: Commit**

```bash
git add shopify-advent-calendar/package.json shopify-advent-calendar/.gitignore shopify-advent-calendar/.theme-check.yml shopify-advent-calendar/scripts/lib/admin.mjs shopify-advent-calendar/scripts/lib/admin.test.mjs
git commit -m "feat(shopify-advent): scaffold project + Admin GraphQL client"
```

---

### Task 2: Metaobject definition files

**Files:**
- Create: `shopify-advent-calendar/metaobjects/advent_calendar_day.definition.json`
- Create: `shopify-advent-calendar/metaobjects/advent_calendar.definition.json`
- Create: `shopify-advent-calendar/scripts/lib/definitions.mjs`
- Test: `shopify-advent-calendar/scripts/lib/definitions.test.mjs`

**Interfaces:**
- Produces:
  - `loadDefinitions(dir): { day: object, calendar: object }` — reads the two JSON files, `JSON.parse`s them.
  - `DAY_FIELD_KEYS: string[]` and `CALENDAR_FIELD_KEYS: string[]` — the expected `fieldDefinitions[].key` lists, in order.

- [ ] **Step 1: Create `advent_calendar_day.definition.json`**

```json
{
  "type": "advent_calendar_day",
  "name": "Advent Calendar Day",
  "displayNameKey": "title",
  "access": { "storefront": "PUBLIC_READ" },
  "capabilities": { "publishable": { "enabled": true } },
  "fieldDefinitions": [
    { "key": "day", "name": "Day", "type": "number_integer", "required": true,
      "validations": [ { "name": "min", "value": "1" }, { "name": "max", "value": "25" } ] },
    { "key": "title", "name": "Title", "type": "single_line_text_field", "required": true },
    { "key": "message", "name": "Message", "type": "rich_text_field", "required": true },
    { "key": "code", "name": "Reward code", "type": "single_line_text_field" },
    { "key": "motif", "name": "Motif", "type": "single_line_text_field",
      "validations": [ { "name": "choices", "value": "[\"wreath\",\"candle\",\"star\",\"gift\",\"tree\",\"bell\",\"snowflake\",\"stocking\",\"bauble\",\"candycane\"]" } ] },
    { "key": "image", "name": "Image", "type": "file_reference",
      "validations": [ { "name": "file_type_options", "value": "[\"Image\"]" } ] },
    { "key": "link_url", "name": "Link URL", "type": "url" },
    { "key": "link_label", "name": "Link label", "type": "single_line_text_field" },
    { "key": "grid_area", "name": "Grid area (desktop)", "type": "single_line_text_field" },
    { "key": "grid_area_mobile", "name": "Grid area (mobile)", "type": "single_line_text_field" }
  ]
}
```

- [ ] **Step 2: Create `advent_calendar.definition.json`**

```json
{
  "type": "advent_calendar",
  "name": "Advent Calendar",
  "displayNameKey": "heading",
  "access": { "storefront": "PUBLIC_READ" },
  "capabilities": { "publishable": { "enabled": true } },
  "fieldDefinitions": [
    { "key": "heading", "name": "Heading", "type": "single_line_text_field", "required": true },
    { "key": "subheading", "name": "Subheading", "type": "single_line_text_field" },
    { "key": "background_color", "name": "Background color", "type": "color" },
    { "key": "text_color", "name": "Text color", "type": "color" },
    { "key": "door_color", "name": "Door color", "type": "color" },
    { "key": "door_text_color", "name": "Door text color", "type": "color" },
    { "key": "accent_color", "name": "Accent color", "type": "color" },
    { "key": "show_snow", "name": "Show snow", "type": "boolean" },
    { "key": "start_date", "name": "Start date", "type": "date" },
    { "key": "days", "name": "Days", "type": "list.metaobject_reference", "required": true,
      "validations": [ { "name": "metaobject_definition", "value": "@ref:advent_calendar_day" } ] }
  ]
}
```

- [ ] **Step 3: Write the failing test**

`scripts/lib/definitions.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadDefinitions, DAY_FIELD_KEYS, CALENDAR_FIELD_KEYS } from './definitions.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'metaobjects');

test('day definition has the expected shape', () => {
  const { day } = loadDefinitions(dir);
  assert.equal(day.type, 'advent_calendar_day');
  assert.equal(day.access.storefront, 'PUBLIC_READ');
  assert.equal(day.capabilities.publishable.enabled, true);
  assert.deepEqual(day.fieldDefinitions.map((f) => f.key), DAY_FIELD_KEYS);
  const motif = day.fieldDefinitions.find((f) => f.key === 'motif');
  assert.match(motif.validations[0].value, /"wreath".*"candycane"/);
});

test('calendar definition references the day definition', () => {
  const { calendar } = loadDefinitions(dir);
  assert.equal(calendar.type, 'advent_calendar');
  assert.deepEqual(calendar.fieldDefinitions.map((f) => f.key), CALENDAR_FIELD_KEYS);
  const days = calendar.fieldDefinitions.find((f) => f.key === 'days');
  assert.equal(days.type, 'list.metaobject_reference');
  assert.equal(days.validations[0].value, '@ref:advent_calendar_day');
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/definitions.test.mjs`
Expected: FAIL — `Cannot find module './definitions.mjs'`.

- [ ] **Step 5: Write minimal implementation**

`scripts/lib/definitions.mjs`:
```js
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DAY_FIELD_KEYS = [
  'day', 'title', 'message', 'code', 'motif',
  'image', 'link_url', 'link_label', 'grid_area', 'grid_area_mobile',
];

export const CALENDAR_FIELD_KEYS = [
  'heading', 'subheading', 'background_color', 'text_color', 'door_color',
  'door_text_color', 'accent_color', 'show_snow', 'start_date', 'days',
];

export function loadDefinitions(dir) {
  const read = (name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
  return {
    day: read('advent_calendar_day.definition.json'),
    calendar: read('advent_calendar.definition.json'),
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/definitions.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add shopify-advent-calendar/metaobjects/ shopify-advent-calendar/scripts/lib/definitions.mjs shopify-advent-calendar/scripts/lib/definitions.test.mjs
git commit -m "feat(shopify-advent): metaobject definition files + loader"
```

---

### Task 3: `create-definitions.mjs`

**Files:**
- Create: `shopify-advent-calendar/scripts/lib/definition-input.mjs`
- Create: `shopify-advent-calendar/scripts/create-definitions.mjs`
- Test: `shopify-advent-calendar/scripts/lib/definition-input.test.mjs`

**Interfaces:**
- Consumes: `loadDefinitions` (Task 2), `createClient` / `requireEnv` (Task 1).
- Produces:
  - `toDefinitionInput(def: object, refIds: Record<string,string> = {}): object` — maps our JSON to a `MetaobjectDefinitionCreateInput`: copies `name`, `type`, `access`, `capabilities`, maps `fieldDefinitions[]` to `{ key, name, type, required, validations }`, and rewrites any validation `value` of the form `@ref:<type>` to `refIds[<type>]` (throws if missing).

- [ ] **Step 1: Write the failing test**

`scripts/lib/definition-input.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { toDefinitionInput } from './definition-input.mjs';

const day = {
  type: 'advent_calendar_day', name: 'Advent Calendar Day', displayNameKey: 'title',
  access: { storefront: 'PUBLIC_READ' }, capabilities: { publishable: { enabled: true } },
  fieldDefinitions: [
    { key: 'day', name: 'Day', type: 'number_integer', required: true,
      validations: [{ name: 'min', value: '1' }] },
    { key: 'title', name: 'Title', type: 'single_line_text_field', required: true },
  ],
};

test('maps a plain definition unchanged', () => {
  const input = toDefinitionInput(day);
  assert.equal(input.type, 'advent_calendar_day');
  assert.equal(input.access.storefront, 'PUBLIC_READ');
  assert.equal(input.fieldDefinitions[0].validations[0].value, '1');
  assert.equal(input.fieldDefinitions[1].required, false);
});

test('resolves @ref: validation values from refIds', () => {
  const cal = {
    type: 'advent_calendar', name: 'Advent Calendar',
    fieldDefinitions: [
      { key: 'days', name: 'Days', type: 'list.metaobject_reference', required: true,
        validations: [{ name: 'metaobject_definition', value: '@ref:advent_calendar_day' }] },
    ],
  };
  const input = toDefinitionInput(cal, { advent_calendar_day: 'gid://shopify/MetaobjectDefinition/99' });
  assert.equal(input.fieldDefinitions[0].validations[0].value, 'gid://shopify/MetaobjectDefinition/99');
});

test('throws when an @ref cannot be resolved', () => {
  const cal = { type: 'x', name: 'X', fieldDefinitions: [
    { key: 'days', name: 'D', type: 'list.metaobject_reference',
      validations: [{ name: 'metaobject_definition', value: '@ref:missing' }] },
  ] };
  assert.throws(() => toDefinitionInput(cal, {}), /missing/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/definition-input.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`scripts/lib/definition-input.mjs`:
```js
function resolveValidations(validations, refIds) {
  if (!Array.isArray(validations)) return [];
  return validations.map((v) => {
    if (typeof v.value === 'string' && v.value.startsWith('@ref:')) {
      const key = v.value.slice(5);
      if (!refIds[key]) throw new Error(`Cannot resolve @ref:${key} — create that definition first.`);
      return { name: v.name, value: refIds[key] };
    }
    return { name: v.name, value: v.value };
  });
}

export function toDefinitionInput(def, refIds = {}) {
  const input = {
    type: def.type,
    name: def.name,
    fieldDefinitions: (def.fieldDefinitions || []).map((f) => ({
      key: f.key,
      name: f.name,
      type: f.type,
      required: Boolean(f.required),
      validations: resolveValidations(f.validations, refIds),
    })),
  };
  if (def.access) input.access = def.access;
  if (def.capabilities) input.capabilities = def.capabilities;
  if (def.displayNameKey) input.displayNameKey = def.displayNameKey;
  return input;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/definition-input.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the CLI wrapper (no unit test — exercised manually against a store)**

`scripts/create-definitions.mjs`:
```js
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
```

- [ ] **Step 6: Verify the CLI is syntactically loadable**

Run: `cd shopify-advent-calendar && node --check scripts/create-definitions.mjs && node -e "process.env.SHOPIFY_STORE='';" && node scripts/create-definitions.mjs; echo "exit=$?"`
Expected: prints `Set SHOPIFY_STORE and SHOPIFY_ADMIN_TOKEN environment variables.` and `exit=1` (no store configured — proves wiring, no network call).

- [ ] **Step 7: Commit**

```bash
git add shopify-advent-calendar/scripts/lib/definition-input.mjs shopify-advent-calendar/scripts/lib/definition-input.test.mjs shopify-advent-calendar/scripts/create-definitions.mjs
git commit -m "feat(shopify-advent): create-definitions script"
```

---

### Task 4: Seed data files

**Files:**
- Create: `shopify-advent-calendar/metaobjects/seed/days/day-01.json` … `day-25.json`
- Create: `shopify-advent-calendar/metaobjects/seed/advent_calendar.json`
- Create: `shopify-advent-calendar/scripts/lib/seed-data.mjs`
- Test: `shopify-advent-calendar/scripts/lib/seed-data.test.mjs`

**Interfaces:**
- Produces:
  - `loadSeed(dir): { calendar: object, days: object[] }` — reads `advent_calendar.json` and `days/day-*.json` (sorted by filename).
  - `MOTIFS: string[]` — the 10 allowed motif keys.
  - `parseArea(str): { row, col, rowSpan, colSpan }` — parses a `grid_area` string; also used by the JS helper module (duplicated intentionally — different runtimes).

**Data source:** titles/messages/codes/motifs and both grid-area strings come verbatim from `advent-calendar-react/src/data/calendar.ts` and spec §13. Each `day-NN.json`:

```json
{
  "handle": "advent-day-01",
  "fields": {
    "day": "1",
    "title": "Bem-vindo ao Advento",
    "message": "<p>Vinte e cinco dias, vinte e cinco pequenas surpresas. Volta amanhã para abrir a porta seguinte.</p>",
    "motif": "wreath",
    "grid_area": "1 / 1 / span 2 / span 2",
    "grid_area_mobile": "1 / 1 / span 2 / span 2"
  }
}
```

- `message` wraps the React plain string in `<p>…</p>` (rich_text is stored as HTML).
- `code` present only for days 3, 5, 8, 10, 12, 15, 17, 20, 22, 24, 25 (values from `calendar.ts`).
- `motif`, `grid_area`, `grid_area_mobile` for all 25 from spec §13.
- No `image`, `link_url`, `link_label` in seed (optional; merchant adds later).

`advent_calendar.json`:
```json
{
  "handle": "advent-calendar-default",
  "fields": {
    "heading": "Calendário do Advento",
    "subheading": "Abre uma porta por dia até ao Natal",
    "background_color": "#1c1613",
    "text_color": "#f6ede0",
    "door_color": "#2a3d35",
    "door_text_color": "#cfe3d4",
    "accent_color": "#c9a24b",
    "show_snow": "true"
  }
}
```
(`days` is filled by the seed script from created GIDs; `start_date` intentionally omitted so December-of-current-year applies.)

- [ ] **Step 1: Write the failing test**

`scripts/lib/seed-data.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadSeed, MOTIFS, parseArea } from './seed-data.mjs';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'metaobjects', 'seed');

test('there are exactly 25 day files with unique days 1..25', () => {
  const { days } = loadSeed(dir);
  assert.equal(days.length, 25);
  const nums = days.map((d) => Number(d.fields.day)).sort((a, b) => a - b);
  assert.deepEqual(nums, Array.from({ length: 25 }, (_, i) => i + 1));
});

test('every day has a known motif and a well-formed grid area', () => {
  const { days } = loadSeed(dir);
  for (const d of days) {
    assert.ok(MOTIFS.includes(d.fields.motif), `bad motif in ${d.handle}`);
    for (const key of ['grid_area', 'grid_area_mobile']) {
      const a = parseArea(d.fields[key]);
      assert.ok(a.row >= 1 && a.col >= 1 && a.rowSpan >= 1 && a.colSpan >= 1, `${d.handle}.${key}`);
    }
  }
});

test('desktop default areas tile the 7x8 grid exactly', () => {
  const { days } = loadSeed(dir);
  const seen = new Map();
  for (const d of days) {
    const { row, col, rowSpan, colSpan } = parseArea(d.fields.grid_area);
    for (let r = row; r < row + rowSpan; r++) {
      for (let c = col; c < col + colSpan; c++) {
        const k = `${r},${c}`;
        assert.ok(!seen.has(k), `overlap at ${k} (${d.handle} vs ${seen.get(k)})`);
        seen.set(k, d.handle);
      }
    }
  }
  assert.equal(seen.size, 56);
});

test('parent seed has the five colors and heading', () => {
  const { calendar } = loadSeed(dir);
  assert.equal(calendar.fields.heading, 'Calendário do Advento');
  for (const k of ['background_color', 'text_color', 'door_color', 'door_text_color', 'accent_color']) {
    assert.match(calendar.fields[k], /^#[0-9a-f]{6}$/i);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/seed-data.test.mjs`
Expected: FAIL — module not found (then, after Step 3, FAIL on missing seed files until Step 4).

- [ ] **Step 3: Write `seed-data.mjs`**

```js
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const MOTIFS = [
  'wreath', 'candle', 'star', 'gift', 'tree',
  'bell', 'snowflake', 'stocking', 'bauble', 'candycane',
];

export function parseArea(str) {
  const p = String(str).split('/').map((s) => s.trim());
  const span = (s) => {
    const m = /span\s+(\d+)/.exec(s || '');
    return m ? Number(m[1]) : Number(s) || 1;
  };
  return {
    row: Number(p[0]) || 1,
    col: Number(p[1]) || 1,
    rowSpan: span(p[2]),
    colSpan: span(p[3]),
  };
}

export function loadSeed(dir) {
  const calendar = JSON.parse(readFileSync(join(dir, 'advent_calendar.json'), 'utf8'));
  const days = readdirSync(join(dir, 'days'))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, 'days', f), 'utf8')));
  return { calendar, days };
}
```

- [ ] **Step 4: Create the 26 seed JSON files**

Generate `days/day-01.json` … `day-25.json` using the table in spec §13 for `motif` / `grid_area` / `grid_area_mobile`, and `calendar.ts` for `title` / `message` / `code`. Create `advent_calendar.json` as shown above. (Mechanical transcription — no logic.)

- [ ] **Step 5: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/seed-data.test.mjs`
Expected: PASS (4 tests) — the tiling test proves the transcription is correct.

- [ ] **Step 6: Commit**

```bash
git add shopify-advent-calendar/metaobjects/seed/ shopify-advent-calendar/scripts/lib/seed-data.mjs shopify-advent-calendar/scripts/lib/seed-data.test.mjs
git commit -m "feat(shopify-advent): seed data for 25 days + parent entry"
```

---

### Task 5: `seed-entries.mjs`

**Files:**
- Create: `shopify-advent-calendar/scripts/lib/seed-input.mjs`
- Create: `shopify-advent-calendar/scripts/seed-entries.mjs`
- Test: `shopify-advent-calendar/scripts/lib/seed-input.test.mjs`

**Interfaces:**
- Consumes: `loadSeed` (Task 4), `createClient` / `requireEnv` (Task 1).
- Produces:
  - `toUpsertInput(entry: {handle, fields}, type: string): object` — returns `{ handle: { type, handle: entry.handle }, metaobject: { fields: [{key, value}], capabilities: { publishable: { status: 'ACTIVE' } } } }`.
  - `buildParentFields(baseFields: object, dayGids: string[]): {key,value}[]` — the parent's flat fields plus `{ key: 'days', value: JSON.stringify(dayGids) }`.

- [ ] **Step 1: Write the failing test**

`scripts/lib/seed-input.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { toUpsertInput, buildParentFields } from './seed-input.mjs';

test('toUpsertInput shapes a day entry', () => {
  const input = toUpsertInput({ handle: 'advent-day-03', fields: { day: '3', title: 'X' } }, 'advent_calendar_day');
  assert.deepEqual(input.handle, { type: 'advent_calendar_day', handle: 'advent-day-03' });
  assert.deepEqual(input.metaobject.fields, [
    { key: 'day', value: '3' }, { key: 'title', value: 'X' },
  ]);
  assert.equal(input.metaobject.capabilities.publishable.status, 'ACTIVE');
});

test('buildParentFields appends days as a JSON array of GIDs', () => {
  const fields = buildParentFields({ heading: 'H' }, ['gid://shopify/Metaobject/1', 'gid://shopify/Metaobject/2']);
  assert.deepEqual(fields.find((f) => f.key === 'heading'), { key: 'heading', value: 'H' });
  assert.equal(
    fields.find((f) => f.key === 'days').value,
    '["gid://shopify/Metaobject/1","gid://shopify/Metaobject/2"]',
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/seed-input.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `seed-input.mjs`**

```js
export function toUpsertInput(entry, type) {
  return {
    handle: { type, handle: entry.handle },
    metaobject: {
      fields: Object.entries(entry.fields).map(([key, value]) => ({ key, value: String(value) })),
      capabilities: { publishable: { status: 'ACTIVE' } },
    },
  };
}

export function buildParentFields(baseFields, dayGids) {
  const fields = Object.entries(baseFields).map(([key, value]) => ({ key, value: String(value) }));
  fields.push({ key: 'days', value: JSON.stringify(dayGids) });
  return fields;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/seed-input.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the CLI wrapper**

`scripts/seed-entries.mjs`:
```js
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
```

- [ ] **Step 6: Verify the CLI is loadable and env-guards**

Run: `cd shopify-advent-calendar && node --check scripts/seed-entries.mjs && node scripts/seed-entries.mjs; echo "exit=$?"`
Expected: prints the env error and `exit=1`.

- [ ] **Step 7: Commit**

```bash
git add shopify-advent-calendar/scripts/lib/seed-input.mjs shopify-advent-calendar/scripts/lib/seed-input.test.mjs shopify-advent-calendar/scripts/seed-entries.mjs
git commit -m "feat(shopify-advent): seed-entries script"
```

---

### Task 6: `advent-grid-defaults.liquid`

**Files:**
- Create: `shopify-advent-calendar/snippets/advent-grid-defaults.liquid`
- Test: `shopify-advent-calendar/scripts/lib/grid-defaults.test.mjs`

**Interfaces:**
- Produces: a snippet that `echo`s a `grid-area` string. Params: `day` (1–25), `mode` (`'desktop'`|`'mobile'`). Consumed by `advent-door.liquid` (Task 11).

- [ ] **Step 1: Write the failing structural test**

`scripts/lib/grid-defaults.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadSeed, parseArea } from './seed-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'snippets', 'advent-grid-defaults.liquid'), 'utf8');
const { days } = loadSeed(join(root, 'metaobjects', 'seed'));

test('snippet contains a when-branch for every day 1..25', () => {
  for (let d = 1; d <= 25; d++) {
    assert.match(src, new RegExp(`when ${d}\\b`), `missing when ${d}`);
  }
});

test('each seed grid_area string appears literally in the snippet', () => {
  for (const day of days) {
    assert.ok(src.includes(day.fields.grid_area), `desktop area for day ${day.fields.day} missing`);
    assert.ok(src.includes(day.fields.grid_area_mobile), `mobile area for day ${day.fields.day} missing`);
  }
});

test('every literal area in the snippet is well-formed', () => {
  const matches = src.match(/\d+ \/ \d+ \/ span \d+ \/ span \d+/g) || [];
  assert.ok(matches.length >= 40);
  for (const m of matches) {
    const a = parseArea(m);
    assert.ok(a.row >= 1 && a.col >= 1 && a.rowSpan >= 1 && a.colSpan >= 1);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/grid-defaults.test.mjs`
Expected: FAIL — snippet file not found.

- [ ] **Step 3: Write the snippet**

`snippets/advent-grid-defaults.liquid` — build mechanically from spec §13. Pattern (day 1 identical in both modes; day 2 shown as the branching pattern; repeat for 3–25):

```liquid
{%- comment -%}
  Default grid-area for an advent door.
  Params: day (1..25), mode ('desktop' | 'mobile')
{%- endcomment -%}
{%- liquid
  assign d = day | plus: 0
  assign out = '1 / 1 / span 1 / span 1'
  case d
    when 1
      assign out = '1 / 1 / span 2 / span 2'
    when 2
      if mode == 'mobile'
        assign out = '13 / 3 / span 1 / span 1'
      else
        assign out = '5 / 5 / span 1 / span 1'
      endif
    when 3
      if mode == 'mobile'
        assign out = '5 / 2 / span 2 / span 1'
      else
        assign out = '1 / 4 / span 2 / span 1'
      endif
    {%- comment -%} … days 4–25 from spec §13, same pattern … {%- endcomment -%}
  endcase
  echo out
-%}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/grid-defaults.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Lint**

Run: `cd shopify-advent-calendar && npx --yes @shopify/cli@latest theme check snippets/advent-grid-defaults.liquid`
Expected: no errors for this file (network install of CLI may take a minute).

- [ ] **Step 6: Commit**

```bash
git add shopify-advent-calendar/snippets/advent-grid-defaults.liquid shopify-advent-calendar/scripts/lib/grid-defaults.test.mjs
git commit -m "feat(shopify-advent): default grid layout snippet"
```

---

### Task 7: `advent-motif.liquid`

**Files:**
- Create: `shopify-advent-calendar/snippets/advent-motif.liquid`
- Test: `shopify-advent-calendar/scripts/lib/motif.test.mjs`

**Interfaces:**
- Produces: a snippet rendering an inline `<svg viewBox="0 0 100 100">`. Params: `name` (motif key), `class` (optional CSS class string). Unknown/blank `name` → `wreath`. Consumed by `advent-door.liquid` and `advent-overlay.liquid`.

- [ ] **Step 1: Write the failing structural test**

`scripts/lib/motif.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MOTIFS } from './seed-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'snippets', 'advent-motif.liquid'), 'utf8');

test('has a when-branch for all 10 motifs', () => {
  for (const m of MOTIFS) {
    assert.match(src, new RegExp(`when ['"]${m}['"]`), `missing ${m}`);
  }
});

test('falls back to wreath for unknown names', () => {
  assert.match(src, /assign\s+key\s*=\s*['"]wreath['"]/);
});

test('renders a single 100x100 svg and is aria-hidden', () => {
  assert.match(src, /viewBox=["']0 0 100 100["']/);
  assert.match(src, /aria-hidden=["']true["']/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/motif.test.mjs`
Expected: FAIL — file not found.

- [ ] **Step 3: Write the snippet**

Port every path from `advent-calendar-react/src/components/atoms/Motif/Motif.tsx`. Colors: `var(--motif-ink)`, `var(--motif-accent)`, `var(--motif-hi)` (set by CSS in Task 13).

```liquid
{%- comment -%}
  Inline motif icon. Params: name, class
{%- endcomment -%}
{%- liquid
  assign allowed = 'wreath,candle,star,gift,tree,bell,snowflake,stocking,bauble,candycane' | split: ','
  assign key = name | default: 'wreath'
  unless allowed contains key
    assign key = 'wreath'
  endunless
-%}
<svg viewBox="0 0 100 100" class="{{ class }}" role="img" aria-hidden="true" focusable="false">
  {%- case key -%}
    {%- when 'wreath' -%}
      <circle cx="50" cy="52" r="30" fill="none" stroke="var(--motif-ink)" stroke-width="12"/>
      <circle cx="50" cy="52" r="30" fill="none" stroke="var(--motif-hi)" stroke-width="3"/>
      <path d="M50 14l7 12h-14z" fill="var(--motif-accent)"/>
      <circle cx="38" cy="40" r="3" fill="var(--motif-accent)"/>
      <circle cx="64" cy="46" r="3" fill="var(--motif-accent)"/>
      <circle cx="46" cy="72" r="3" fill="var(--motif-accent)"/>
    {%- when 'candle' -%}
      <rect x="42" y="34" width="16" height="48" rx="3" fill="var(--motif-ink)"/>
      <rect x="42" y="34" width="5" height="48" fill="var(--motif-hi)"/>
      <rect x="34" y="80" width="32" height="8" rx="3" fill="var(--motif-accent)"/>
      <path d="M50 16c6 6 6 12 0 18-6-6-6-12 0-18z" fill="var(--motif-accent)"/>
      <path d="M50 20c3 4 3 8 0 12-3-4-3-8 0-12z" fill="var(--motif-hi)"/>
    {%- comment -%} … star, gift, tree, bell, snowflake, stocking, bauble, candycane — paths copied verbatim from Motif.tsx (translate JSX attrs: strokeWidth→stroke-width, strokeLinecap→stroke-linecap, strokeDasharray→stroke-dasharray) … {%- endcomment -%}
  {%- endcase -%}
</svg>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/motif.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Lint**

Run: `cd shopify-advent-calendar && npx --yes @shopify/cli@latest theme check snippets/advent-motif.liquid`
Expected: no errors for this file.

- [ ] **Step 6: Commit**

```bash
git add shopify-advent-calendar/snippets/advent-motif.liquid shopify-advent-calendar/scripts/lib/motif.test.mjs
git commit -m "feat(shopify-advent): inline motif snippet"
```

---

### Task 8: `advent-snow.liquid`

**Files:**
- Create: `shopify-advent-calendar/snippets/advent-snow.liquid`
- Test: `shopify-advent-calendar/scripts/lib/snow.test.mjs`

**Interfaces:**
- Produces: a snippet rendering a decorative snow layer (`<div class="advent__snow" aria-hidden="true">` with N flake spans). Param: `count` (default 40). CSS animation lives in Task 13. Consumed by the section (Task 10).

- [ ] **Step 1: Write the failing test**

`scripts/lib/snow.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'snippets', 'advent-snow.liquid'), 'utf8');

test('loops to build flake spans and is aria-hidden', () => {
  assert.match(src, /aria-hidden=["']true["']/);
  assert.match(src, /\(1\.\.[a-z_]+\)|\(1\.\.\d+\)/);
  assert.match(src, /advent__snow/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/snow.test.mjs`
Expected: FAIL — file not found.

- [ ] **Step 3: Write the snippet**

```liquid
{%- comment -%} Decorative snow. Param: count (default 40). {%- endcomment -%}
{%- assign flakes = count | default: 40 -%}
<div class="advent__snow" aria-hidden="true">
  {%- for i in (1..flakes) -%}
    <span class="advent__flake" style="--i: {{ i }}; --n: {{ flakes }};"></span>
  {%- endfor -%}
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/snow.test.mjs`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add shopify-advent-calendar/snippets/advent-snow.liquid shopify-advent-calendar/scripts/lib/snow.test.mjs
git commit -m "feat(shopify-advent): snow snippet"
```

---

### Task 9: JS helper module (pure, fully tested)

**Files:**
- Create: `shopify-advent-calendar/assets/advent-calendar.helpers.js`
- Test: `shopify-advent-calendar/assets/advent-calendar.helpers.test.mjs`

**Interfaces:**
- Produces a global `window.AdventHelpers` (and CommonJS `module.exports` when run under Node) with:
  - `parseDayParam(search: string): number | null` — `?day=N`, integer 1–25 or `null`.
  - `readOpened(storage, key): Set<number>` — parse JSON array; any throw or malformed → empty `Set`.
  - `writeOpened(storage, key, set: Set<number>): void` — `JSON.stringify([...set])`; swallow throws.
  - `parseArea(str: string): { row, col, rowSpan, colSpan }` — same rules as `seed-data.mjs`.
  - `buildCoverage(areas: {day:number,area:string}[], cols:number, rows:number): { covered: number, total: number, empties: string[], overlaps: {cell:string, days:number[]}[] }` — cells are `"r,c"` (1-indexed); cells outside the grid are ignored for `covered`/`empties` but still reported as overlaps if doubly claimed.

- [ ] **Step 1: Write the failing test**

`assets/advent-calendar.helpers.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const H = require('./advent-calendar.helpers.js');

test('parseDayParam', () => {
  assert.equal(H.parseDayParam('?day=12'), 12);
  assert.equal(H.parseDayParam('?day=0'), null);
  assert.equal(H.parseDayParam('?day=26'), null);
  assert.equal(H.parseDayParam('?day=x'), null);
  assert.equal(H.parseDayParam(''), null);
});

test('readOpened tolerates missing / malformed / throwing storage', () => {
  assert.deepEqual([...H.readOpened({ getItem: () => null }, 'k')], []);
  assert.deepEqual([...H.readOpened({ getItem: () => '{bad' }, 'k')], []);
  assert.deepEqual([...H.readOpened({ getItem: () => '[1,2,"x",3]' }, 'k')].sort(), [1, 2, 3]);
  assert.deepEqual([...H.readOpened({ getItem: () => { throw new Error('nope'); } }, 'k')], []);
});

test('writeOpened serializes and swallows throws', () => {
  let stored;
  H.writeOpened({ setItem: (k, v) => { stored = v; } }, 'k', new Set([3, 1, 2]));
  assert.deepEqual(JSON.parse(stored).sort(), [1, 2, 3]);
  assert.doesNotThrow(() => H.writeOpened({ setItem: () => { throw new Error('full'); } }, 'k', new Set([1])));
});

test('parseArea', () => {
  assert.deepEqual(H.parseArea('3 / 6 / span 2 / span 2'), { row: 3, col: 6, rowSpan: 2, colSpan: 2 });
  assert.deepEqual(H.parseArea('5 / 5 / span 1 / span 1'), { row: 5, col: 5, rowSpan: 1, colSpan: 1 });
});

test('buildCoverage detects a full valid tiling', () => {
  const areas = [
    { day: 1, area: '1 / 1 / span 1 / span 2' },
    { day: 2, area: '1 / 3 / span 1 / span 2' },
    { day: 3, area: '2 / 1 / span 1 / span 4' },
  ];
  const r = H.buildCoverage(areas, 4, 2);
  assert.equal(r.covered, 8);
  assert.equal(r.total, 8);
  assert.deepEqual(r.empties, []);
  assert.deepEqual(r.overlaps, []);
});

test('buildCoverage reports empties and overlaps', () => {
  const areas = [
    { day: 1, area: '1 / 1 / span 1 / span 2' },
    { day: 2, area: '1 / 2 / span 1 / span 2' }, // overlaps col 2
  ];
  const r = H.buildCoverage(areas, 3, 2); // 6 cells
  assert.ok(r.empties.includes('2,1'));
  assert.equal(r.overlaps[0].cell, '1,2');
  assert.deepEqual(r.overlaps[0].days.sort(), [1, 2]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test assets/advent-calendar.helpers.test.mjs`
Expected: FAIL — cannot find `./advent-calendar.helpers.js`.

- [ ] **Step 3: Write the implementation**

`assets/advent-calendar.helpers.js`:
```js
(function (root) {
  function parseDayParam(search) {
    var raw = new URLSearchParams(search || '').get('day');
    if (raw === null) return null;
    var v = Number(raw);
    return Number.isInteger(v) && v >= 1 && v <= 25 ? v : null;
  }

  function readOpened(storage, key) {
    var raw;
    try { raw = storage.getItem(key); } catch (e) { return new Set(); }
    if (!raw) return new Set();
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter(function (n) { return typeof n === 'number'; }));
      }
    } catch (e) { /* malformed */ }
    return new Set();
  }

  function writeOpened(storage, key, set) {
    try { storage.setItem(key, JSON.stringify([].concat(Array.from(set)))); } catch (e) { /* ignore */ }
  }

  function parseArea(str) {
    var p = String(str).split('/').map(function (s) { return s.trim(); });
    function span(s) {
      var m = /span\s+(\d+)/.exec(s || '');
      return m ? Number(m[1]) : (Number(s) || 1);
    }
    return { row: Number(p[0]) || 1, col: Number(p[1]) || 1, rowSpan: span(p[2]), colSpan: span(p[3]) };
  }

  function buildCoverage(areas, cols, rows) {
    var claims = {};
    areas.forEach(function (item) {
      var a = parseArea(item.area);
      for (var r = a.row; r < a.row + a.rowSpan; r++) {
        for (var c = a.col; c < a.col + a.colSpan; c++) {
          var k = r + ',' + c;
          (claims[k] = claims[k] || []).push(item.day);
        }
      }
    });
    var empties = [];
    var covered = 0;
    for (var r = 1; r <= rows; r++) {
      for (var c = 1; c <= cols; c++) {
        var k = r + ',' + c;
        if (claims[k] && claims[k].length) covered++;
        else empties.push(k);
      }
    }
    var overlaps = Object.keys(claims)
      .filter(function (k) { return claims[k].length > 1; })
      .map(function (k) { return { cell: k, days: claims[k].slice() }; });
    return { covered: covered, total: cols * rows, empties: empties, overlaps: overlaps };
  }

  var api = { parseDayParam: parseDayParam, readOpened: readOpened, writeOpened: writeOpened, parseArea: parseArea, buildCoverage: buildCoverage };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AdventHelpers = api;
})(typeof window !== 'undefined' ? window : null);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test assets/advent-calendar.helpers.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add shopify-advent-calendar/assets/advent-calendar.helpers.js shopify-advent-calendar/assets/advent-calendar.helpers.test.mjs
git commit -m "feat(shopify-advent): pure JS helpers with tests"
```

---

### Task 10: Section shell + schema + locales

**Files:**
- Create: `shopify-advent-calendar/sections/advent-calendar.liquid`
- Create: `shopify-advent-calendar/locales/en.default.schema.json`
- Test: `shopify-advent-calendar/scripts/lib/section.test.mjs`

**Interfaces:**
- Consumes: `advent-snow.liquid` (Task 8), `advent-door.liquid` (Task 11 — rendered inside the days loop; stub it as an empty file first so the section lints, Task 11 fills it), `advent-overlay.liquid` (Task 12 — same), `advent-calendar.helpers.js` + `advent-calendar.js` (Tasks 9/14) via `asset_url`.
- Produces:
  - A `.advent` wrapper carrying CSS vars `--advent-bg/-text/-door/-door-text/-accent/-cols/-rows/-cols-m/-rows-m/-gap` and `data-` attributes: `data-section-id`, `data-current-day`, `data-max-day="25"`, `data-guides="true|false"`.
  - Liquid variable `current_day` (integer) computed as in spec §8.1.
  - Liquid variable `calendar` = the resolved `advent_calendar` metaobject (via `section.settings.calendar_entry`, else `shop.metaobjects.advent_calendar[section.settings.calendar_handle]`).

- [ ] **Step 1: Write the failing structural test**

`scripts/lib/section.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'sections', 'advent-calendar.liquid'), 'utf8');
const schemaMatch = src.match(/{%-?\s*schema\s*-?%}([\s\S]*?){%-?\s*endschema\s*-?%}/);

test('has a valid JSON schema with the required settings', () => {
  assert.ok(schemaMatch, 'no schema block');
  const schema = JSON.parse(schemaMatch[1]);
  const ids = schema.settings.filter((s) => s.id).map((s) => s.id);
  for (const id of ['calendar_entry', 'calendar_handle', 'grid_columns', 'grid_rows',
    'grid_columns_mobile', 'grid_rows_mobile', 'grid_gap', 'layout_guides', 'preview_day',
    'bg_override', 'text_override', 'door_override', 'door_text_override', 'accent_override']) {
    assert.ok(ids.includes(id), `missing setting ${id}`);
  }
  const entry = schema.settings.find((s) => s.id === 'calendar_entry');
  assert.equal(entry.type, 'metaobject');
  assert.equal(entry.metaobject_type, 'advent_calendar');
  assert.equal(schema.settings.find((s) => s.id === 'grid_columns').default, 7);
  assert.equal(schema.settings.find((s) => s.id === 'grid_rows').default, 8);
  assert.ok(schema.presets && schema.presets.length >= 1);
});

test('computes current_day with the December guard and preview override', () => {
  assert.match(src, /preview_day/);
  assert.match(src, /date:\s*['"]%m['"]/);        // month guard
  assert.match(src, /start_date/);
  assert.match(src, /assign current_day/);
});

test('emits colour vars with the documented fallback chain and defaults', () => {
  for (const [setting, dflt] of [
    ['bg_override', '#1c1613'], ['text_override', '#f6ede0'], ['door_override', '#2a3d35'],
    ['door_text_override', '#cfe3d4'], ['accent_override', '#c9a24b'],
  ]) {
    assert.ok(src.includes(setting), `missing ${setting}`);
    assert.ok(src.includes(dflt), `missing default ${dflt}`);
  }
  assert.match(src, /--advent-cols:/);
  assert.match(src, /data-current-day=/);
  assert.match(src, /advent-calendar\.js/);
  assert.match(src, /advent-calendar\.helpers\.js/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/section.test.mjs`
Expected: FAIL — section file not found.

- [ ] **Step 3: Create empty stub snippets so the section lints**

Create `shopify-advent-calendar/snippets/advent-door.liquid` and `shopify-advent-calendar/snippets/advent-overlay.liquid` each containing only:
```liquid
{%- comment -%} filled in a later task {%- endcomment -%}
```

- [ ] **Step 4: Write the section**

`sections/advent-calendar.liquid`:
```liquid
{%- liquid
  assign calendar = section.settings.calendar_entry
  if calendar == blank and section.settings.calendar_handle != blank
    assign calendar = shop.metaobjects.advent_calendar[section.settings.calendar_handle]
  endif

  assign max_day = 25

  assign bg = section.settings.bg_override | default: calendar.background_color.value | default: '#1c1613'
  assign fg = section.settings.text_override | default: calendar.text_color.value | default: '#f6ede0'
  assign door = section.settings.door_override | default: calendar.door_color.value | default: '#2a3d35'
  assign door_fg = section.settings.door_text_override | default: calendar.door_text_color.value | default: '#cfe3d4'
  assign accent = section.settings.accent_override | default: calendar.accent_color.value | default: '#c9a24b'

  assign preview_day = section.settings.preview_day | plus: 0
  assign month = 'now' | date: '%m' | plus: 0
  assign now_ts = 'now' | date: '%s' | plus: 0
  assign current_day = 0

  if preview_day > 0
    assign current_day = preview_day
  elsif calendar.start_date.value == blank and month != 12
    assign current_day = 0
  else
    for n in (1..max_day)
      assign offset = n | minus: 1 | times: 86400
      if calendar.start_date.value != blank
        assign base = calendar.start_date.value | date: '%s' | plus: 0
        assign unlock_ts = base | plus: offset
      else
        assign yr = 'now' | date: '%Y'
        assign nn = n | prepend: '0' | slice: -2, 2
        assign unlock_ts = yr | append: '-12-' | append: nn | append: 'T00:00:00' | date: '%s' | plus: 0
      endif
      if now_ts >= unlock_ts
        assign current_day = n
      endif
    endfor
  endif

  assign show_snow = true
  if calendar.show_snow.value == false
    assign show_snow = false
  endif
  assign guides = section.settings.layout_guides
-%}
<script src="{{ 'advent-calendar.helpers.js' | asset_url }}" defer></script>
<script src="{{ 'advent-calendar.js' | asset_url }}" defer></script>
{{ 'advent-calendar.css' | asset_url | stylesheet_tag }}

<section
  class="advent"
  data-section-id="{{ section.id }}"
  data-current-day="{{ current_day }}"
  data-max-day="{{ max_day }}"
  data-guides="{% if guides %}true{% else %}false{% endif %}"
  style="
    --advent-bg: {{ bg }};
    --advent-text: {{ fg }};
    --advent-door: {{ door }};
    --advent-door-text: {{ door_fg }};
    --advent-accent: {{ accent }};
    --advent-cols: {{ section.settings.grid_columns }};
    --advent-rows: {{ section.settings.grid_rows }};
    --advent-cols-m: {{ section.settings.grid_columns_mobile }};
    --advent-rows-m: {{ section.settings.grid_rows_mobile }};
    --advent-gap: {{ section.settings.grid_gap }}px;
  "
>
  {%- if show_snow -%}{%- render 'advent-snow' -%}{%- endif -%}

  <header class="advent__header">
    <h2 class="advent__title">{{ calendar.heading.value | default: 'Advent calendar' }}</h2>
    {%- if calendar.subheading.value != blank -%}
      <p class="advent__subtitle">{{ calendar.subheading.value }}</p>
    {%- endif -%}
  </header>

  {%- if calendar == blank -%}
    <p class="advent__empty">{{ 'sections.advent_calendar.no_entry' | t }}</p>
  {%- else -%}
    <div class="advent__grid" role="list">
      {%- assign days = calendar.days.value | sort: 'day' -%}
      {%- for day_entry in days -%}
        {%- render 'advent-door', day_entry: day_entry, current_day: current_day -%}
      {%- endfor -%}
    </div>
    <div class="advent__guide-summary" hidden></div>
    {%- for day_entry in days -%}
      {%- render 'advent-overlay', day_entry: day_entry -%}
    {%- endfor -%}
  {%- endif -%}

  <div class="advent__portal" hidden></div>
</section>

{% schema %}
{
  "name": "Advent calendar",
  "tag": "section",
  "class": "advent-calendar-section",
  "enabled_on": { "templates": ["*"] },
  "settings": [
    { "type": "header", "content": "Content" },
    { "type": "metaobject", "id": "calendar_entry", "label": "Advent calendar", "metaobject_type": "advent_calendar" },
    { "type": "text", "id": "calendar_handle", "label": "…or entry handle (fallback)", "info": "Use if the picker above is unavailable on your theme version." },
    { "type": "header", "content": "Layout" },
    { "type": "range", "id": "grid_columns", "min": 3, "max": 12, "step": 1, "default": 7, "label": "Columns (desktop)" },
    { "type": "range", "id": "grid_rows", "min": 3, "max": 16, "step": 1, "default": 8, "label": "Rows (desktop)" },
    { "type": "range", "id": "grid_columns_mobile", "min": 2, "max": 8, "step": 1, "default": 4, "label": "Columns (mobile)" },
    { "type": "range", "id": "grid_rows_mobile", "min": 4, "max": 30, "step": 1, "default": 14, "label": "Rows (mobile)" },
    { "type": "range", "id": "grid_gap", "min": 0, "max": 24, "step": 1, "default": 8, "unit": "px", "label": "Gap" },
    { "type": "checkbox", "id": "layout_guides", "default": false, "label": "Show layout guides", "info": "Draws the grid and flags gaps/overlaps. Turn off in production." },
    { "type": "header", "content": "Behaviour" },
    { "type": "range", "id": "preview_day", "min": 0, "max": 25, "step": 1, "default": 0, "label": "Preview day", "info": "0 = use the real date." },
    { "type": "header", "content": "Style overrides (optional)" },
    { "type": "color", "id": "bg_override", "label": "Background" },
    { "type": "color", "id": "text_override", "label": "Text" },
    { "type": "color", "id": "door_override", "label": "Door" },
    { "type": "color", "id": "door_text_override", "label": "Door text" },
    { "type": "color", "id": "accent_override", "label": "Accent" }
  ],
  "presets": [{ "name": "Advent calendar" }]
}
{% endschema %}
```

- [ ] **Step 5: Write the locale file**

`locales/en.default.schema.json`:
```json
{
  "sections": {
    "advent_calendar": {
      "no_entry": "Select an Advent calendar entry in the section settings."
    }
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/section.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 7: Lint the section**

Run: `cd shopify-advent-calendar && npx --yes @shopify/cli@latest theme check sections/advent-calendar.liquid`
Expected: no errors (warnings about the stub snippets are acceptable at this point).

- [ ] **Step 8: Commit**

```bash
git add shopify-advent-calendar/sections/advent-calendar.liquid shopify-advent-calendar/locales/en.default.schema.json shopify-advent-calendar/snippets/advent-door.liquid shopify-advent-calendar/snippets/advent-overlay.liquid shopify-advent-calendar/scripts/lib/section.test.mjs
git commit -m "feat(shopify-advent): section shell, schema, locales"
```

---

### Task 11: `advent-door.liquid`

**Files:**
- Modify: `shopify-advent-calendar/snippets/advent-door.liquid` (replace the stub)
- Test: `shopify-advent-calendar/scripts/lib/door.test.mjs`

**Interfaces:**
- Consumes: `day_entry` (an `advent_calendar_day` metaobject), `current_day` (integer) — both from the section loop; `advent-grid-defaults.liquid` (Task 6); `advent-motif.liquid` (Task 7).
- Produces: a `<button class="advent__door" data-state="…" data-day="N" style="--area:…; --area-m:…">` with the number, motif face, and a `today` badge. `data-state` ∈ `locked | today | past` (JS promotes to `opened`). Aria label per state.

- [ ] **Step 1: Write the failing structural test**

`scripts/lib/door.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'snippets', 'advent-door.liquid'), 'utf8');

test('resolves grid area with override then default fallback for both modes', () => {
  assert.match(src, /day_entry\.grid_area\.value/);
  assert.match(src, /day_entry\.grid_area_mobile\.value/);
  assert.match(src, /render 'advent-grid-defaults'.*mode: 'desktop'/s);
  assert.match(src, /render 'advent-grid-defaults'.*mode: 'mobile'/s);
});

test('derives state from current_day', () => {
  assert.match(src, /current_day/);
  assert.match(src, /data-state=/);
  assert.match(src, /['"]today['"]/);
  assert.match(src, /['"]past['"]/);
  assert.match(src, /['"]locked['"]/);
});

test('is a button carrying day + area custom props + motif', () => {
  assert.match(src, /<button[^>]+class="advent__door"/);
  assert.match(src, /data-day="{{ *n *}}"|data-day="{{n}}"/);
  assert.match(src, /--area:/);
  assert.match(src, /--area-m:/);
  assert.match(src, /render 'advent-motif'/);
  assert.match(src, /aria-label/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/door.test.mjs`
Expected: FAIL — assertions unmet (stub file).

- [ ] **Step 3: Write the snippet**

```liquid
{%- comment -%}
  One advent door. Params: day_entry (advent_calendar_day), current_day (int)
{%- endcomment -%}
{%- liquid
  assign n = day_entry.day.value | plus: 0

  assign area = day_entry.grid_area.value
  if area == blank
    capture area
      render 'advent-grid-defaults', day: n, mode: 'desktop'
    endcapture
    assign area = area | strip
  endif

  assign area_m = day_entry.grid_area_mobile.value
  if area_m == blank
    capture area_m
      render 'advent-grid-defaults', day: n, mode: 'mobile'
    endcapture
    assign area_m = area_m | strip
  endif

  assign state = 'locked'
  if current_day > 0 and n < current_day
    assign state = 'past'
  elsif current_day > 0 and n == current_day
    assign state = 'today'
  endif

  assign motif = day_entry.motif.value | default: 'wreath'

  case state
    when 'today'
      assign aria = 'Dia ' | append: n | append: ', hoje'
    when 'past'
      assign aria = 'Dia ' | append: n | append: ', por abrir'
    else
      assign aria = 'Dia ' | append: n | append: ', por abrir mais tarde'
  endcase
-%}
<button
  type="button"
  class="advent__door"
  role="listitem"
  data-day="{{ n }}"
  data-state="{{ state }}"
  aria-label="{{ aria }}"
  style="--area: {{ area }}; --area-m: {{ area_m }};"
>
  <span class="advent__door-face" aria-hidden="true">
    <span class="advent__door-num">{{ n }}</span>
    <span class="advent__door-motif">{%- render 'advent-motif', name: motif, class: 'advent__motif' -%}</span>
    <span class="advent__door-check">✓</span>
  </span>
  {%- if state == 'today' -%}<span class="advent__door-badge" aria-hidden="true">hoje</span>{%- endif -%}
</button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/door.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Lint**

Run: `cd shopify-advent-calendar && npx --yes @shopify/cli@latest theme check snippets/advent-door.liquid`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add shopify-advent-calendar/snippets/advent-door.liquid shopify-advent-calendar/scripts/lib/door.test.mjs
git commit -m "feat(shopify-advent): door snippet with state + area resolution"
```

---

### Task 12: `advent-overlay.liquid`

**Files:**
- Modify: `shopify-advent-calendar/snippets/advent-overlay.liquid` (replace the stub)
- Test: `shopify-advent-calendar/scripts/lib/overlay.test.mjs`

**Interfaces:**
- Consumes: `day_entry` (from the section loop); `advent-motif.liquid`.
- Produces: a hidden `<template class="advent__tpl" data-day="N">` whose content the JS clones into `.advent__portal`. Contains: medallion number, `title`, rendered `message` (rich text HTML), optional `<img>` (from `image`), optional `code` block, optional CTA link (`link_url` + `link_label`).

- [ ] **Step 1: Write the failing structural test**

`scripts/lib/overlay.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = readFileSync(join(root, 'snippets', 'advent-overlay.liquid'), 'utf8');

test('is a per-day template keyed by day number', () => {
  assert.match(src, /<template[^>]+class="advent__tpl"[^>]+data-day="{{ *[a-z_]+ *}}"/);
});

test('outputs title, rich-text message, and conditional image / code / cta', () => {
  assert.match(src, /day_entry\.title\.value/);
  assert.match(src, /day_entry\.message\.value/);
  assert.match(src, /day_entry\.image/);
  assert.match(src, /day_entry\.code\.value != blank/);
  assert.match(src, /day_entry\.link_url\.value != blank/);
  assert.match(src, /day_entry\.link_label\.value/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/overlay.test.mjs`
Expected: FAIL — stub.

- [ ] **Step 3: Write the snippet**

```liquid
{%- comment -%}
  Hidden per-day overlay content. Param: day_entry (advent_calendar_day)
  Cloned into .advent__portal by advent-calendar.js
{%- endcomment -%}
{%- assign n = day_entry.day.value | plus: 0 -%}
<template class="advent__tpl" data-day="{{ n }}">
  <div class="advent__card-inner">
    <div class="advent__medallion" aria-hidden="true">{{ n }}</div>
    <h3 class="advent__card-title" data-overlay-title>{{ day_entry.title.value }}</h3>
    {%- if day_entry.image != blank -%}
      <img class="advent__card-image"
           src="{{ day_entry.image | image_url: width: 720 }}"
           alt="{{ day_entry.title.value | escape }}" loading="lazy" width="720">
    {%- endif -%}
    <div class="advent__card-message">{{ day_entry.message.value }}</div>
    {%- if day_entry.code.value != blank -%}
      <button type="button" class="advent__code" data-code="{{ day_entry.code.value | escape }}">
        <span class="advent__code-text">{{ day_entry.code.value }}</span>
        <span class="advent__code-hint">copiar</span>
      </button>
    {%- endif -%}
    {%- if day_entry.link_url.value != blank -%}
      <a class="advent__cta" href="{{ day_entry.link_url.value }}">
        {{ day_entry.link_label.value | default: 'Ver mais' }}
      </a>
    {%- endif -%}
  </div>
  <div class="advent__card-watermark" aria-hidden="true">
    {%- render 'advent-motif', name: day_entry.motif.value, class: 'advent__motif' -%}
  </div>
</template>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/overlay.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Lint**

Run: `cd shopify-advent-calendar && npx --yes @shopify/cli@latest theme check snippets/advent-overlay.liquid`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add shopify-advent-calendar/snippets/advent-overlay.liquid shopify-advent-calendar/scripts/lib/overlay.test.mjs
git commit -m "feat(shopify-advent): per-day overlay template snippet"
```

---

### Task 13: `advent-calendar.css`

**Files:**
- Create: `shopify-advent-calendar/assets/advent-calendar.css`
- Test: `shopify-advent-calendar/scripts/lib/css.test.mjs`

**Interfaces:**
- Consumes: the CSS vars set by the section wrapper (Task 10) and `data-state` on doors (Task 11).
- Produces: no JS interface. Classes used by `advent-calendar.js`: `.advent__portal`, `.advent__scrim`, `.advent__card`, `.advent__guide` (added at runtime — style them here).

- [ ] **Step 1: Write the failing structural test**

`scripts/lib/css.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const css = readFileSync(join(root, 'assets', 'advent-calendar.css'), 'utf8');

test('grid uses the section custom properties', () => {
  assert.match(css, /grid-template-columns:\s*repeat\(var\(--advent-cols\)/);
  assert.match(css, /grid-template-rows:\s*repeat\(var\(--advent-rows\)/);
  assert.match(css, /\.advent__door\s*{[^}]*grid-area:\s*var\(--area\)/s);
});

test('has a mobile breakpoint at 700px using the -m custom props', () => {
  assert.match(css, /@media[^{]*max-width:\s*700px/);
  assert.match(css, /var\(--advent-cols-m\)/);
});

test('maps motif vars and honours reduced motion', () => {
  assert.match(css, /--motif-ink:/);
  assert.match(css, /--motif-accent:/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('styles the four door states and the guide overlay', () => {
  for (const s of ['locked', 'today', 'past', 'opened']) {
    assert.match(css, new RegExp(`\\[data-state="${s}"\\]`), `no rule for ${s}`);
  }
  assert.match(css, /\.advent__guide/);
  assert.match(css, /\.advent__scrim/);
  assert.match(css, /\.advent__card/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/css.test.mjs`
Expected: FAIL — file not found.

- [ ] **Step 3: Write the CSS**

Cover, at minimum: `.advent` (background `var(--advent-bg)`, color `var(--advent-text)`, sets `--motif-ink: var(--advent-door-text)`, `--motif-accent: var(--advent-accent)`, `--motif-hi: rgba(255,255,255,.5)`); `.advent__grid` (grid from custom props, `aspect-ratio` or `min-height` so cells have height); `.advent__door` (`grid-area: var(--area)`, door color, radius, bevel shadow, `cursor: pointer`, focus ring using `--advent-accent`); `[data-state="locked"]` (dimmed, `cursor: default`); `[data-state="today"]` (accent glow, badge); `[data-state="past"]`; `[data-state="opened"]` (face rotated/'.advent__door-check' shown, motif hidden); `.advent__door-num`, `.advent__door-motif`, `.advent__door-check` (hidden unless opened), `.advent__door-badge`; `@keyframes advent-shake` + `.advent__door--shake`; snow `.advent__snow`/`.advent__flake` with `@keyframes advent-fall` positioned by `--i`/`--n`; overlay `.advent__portal`, `.advent__scrim` (fixed, backdrop, blur), `.advent__card` (centered, max-width, `var(--advent-door)` surface, `.advent__card-watermark` faint motif), `.advent__medallion`, `.advent__code`, `.advent__cta`; guide overlay `.advent__guide` (absolute grid lines), `.advent__guide-cell--empty` (dashed amber), `.advent__guide-cell--overlap` (red), `.advent__guide-summary` (fixed chip); mobile `@media (max-width:700px)` swapping to `-m` custom props; `@media (prefers-reduced-motion: reduce)` disabling `animation`/`transition` on flakes, shake, card.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/css.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add shopify-advent-calendar/assets/advent-calendar.css shopify-advent-calendar/scripts/lib/css.test.mjs
git commit -m "feat(shopify-advent): section stylesheet"
```

---

### Task 14: `advent-calendar.js` (DOM controller)

**Files:**
- Create: `shopify-advent-calendar/assets/advent-calendar.js`
- Test: `shopify-advent-calendar/scripts/lib/controller.test.mjs`

**Interfaces:**
- Consumes: `window.AdventHelpers` (Task 9); the section DOM from Task 10 (`.advent[data-section-id][data-current-day][data-guides]`, `.advent__door[data-day][data-state]`, `.advent__tpl[data-day]`, `.advent__portal`, `.advent__guide-summary`).
- Produces: no exported API (IIFE). Behaviour contract enforced by test via regex + a jsdom-free string check, and by manual QA (Task 15).

Behaviour:
1. On `DOMContentLoaded` and on `shopify:section:load`, initialise every `.advent` not already initialised (guard with a `data-advent-ready` attribute).
2. Persistence: key `advent-calendar:opened:<sectionId>`. On init, `readOpened`; for each door whose `data-state` is `past` or `today` and whose day is in the set, set `data-state="opened"`.
3. `?day=N`: if `AdventHelpers.parseDayParam(location.search)` returns `N`, set doors `<N` to `past` and `N` to `today` (unless already `opened`); mark `data-force-day`.
4. Door click: if `data-state="locked"` → add `.advent__door--shake` for 600ms (skip if `matchMedia('(prefers-reduced-motion: reduce)').matches`), return. Else → `open(day, doorEl)`, add day to opened set, `writeOpened`, set `data-state="opened"`.
5. `open(day, doorEl)`: clone `.advent__tpl[data-day=day]` content into `.advent__card` inside `.advent__portal`; unhide portal; build `.advent__scrim` + `.advent__card` if absent; FLIP from `doorEl.getBoundingClientRect()` to the card rect via `card.animate(...)` unless reduced motion; move focus to a close button; trap Tab within the card; `Escape` and scrim-pointer-down-then-click close; lock `document.body.style.overflow`; on close, reverse (fade), restore focus to `doorEl`, unlock scroll.
6. Copy button (`.advent__code`): on click, `navigator.clipboard.writeText(dataset.code)`, swap `.advent__code-hint` text to "copiado" for 2s (guard missing clipboard API).
7. If `data-guides="true"`: after layout, read every `.advent__door` computed `grid-area`, call `AdventHelpers.buildCoverage`, draw `.advent__guide` cells for empties/overlaps, write the summary chip text into `.advent__guide-summary` and unhide it. Re-run on `resize` (debounced) and `shopify:section:load`. Never runs when `data-guides="false"`.
8. `shopify:section:unload`: remove listeners, portal nodes, `data-advent-ready`.

- [ ] **Step 1: Write the failing structural test**

`scripts/lib/controller.test.mjs`:
```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const js = readFileSync(join(root, 'assets', 'advent-calendar.js'), 'utf8');

test('uses the helper module, not its own copies', () => {
  assert.match(js, /AdventHelpers/);
  assert.match(js, /parseDayParam/);
  assert.match(js, /readOpened/);
  assert.match(js, /writeOpened/);
  assert.match(js, /buildCoverage/);
});

test('wires Shopify theme editor lifecycle events', () => {
  assert.match(js, /shopify:section:load/);
  assert.match(js, /shopify:section:unload/);
  assert.match(js, /data-advent-ready|dataset\.adventReady/);
});

test('honours reduced motion and the guides flag', () => {
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /data-guides|dataset\.guides/);
});

test('overlay: FLIP, focus trap, escape, scroll lock', () => {
  assert.match(js, /getBoundingClientRect/);
  assert.match(js, /\.animate\(/);
  assert.match(js, /Escape/);
  assert.match(js, /overflow/);
  assert.match(js, /key === 'Tab'|key === "Tab"/);
});

test('storage key is namespaced by section id', () => {
  assert.match(js, /advent-calendar:opened:/);
});

test('is syntactically valid', async () => {
  await import('node:vm').then(({ Script }) => new Script(js));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd shopify-advent-calendar && node --test scripts/lib/controller.test.mjs`
Expected: FAIL — file not found.

- [ ] **Step 3: Write the controller**

Implement the behaviour list above as an IIFE. Skeleton (fill every branch — no TODOs):
```js
(function () {
  var H = window.AdventHelpers;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initAll() {
    document.querySelectorAll('.advent').forEach(initSection);
  }

  function initSection(root) {
    if (root.dataset.adventReady) return;
    root.dataset.adventReady = '1';
    var sectionId = root.dataset.sectionId;
    var storageKey = 'advent-calendar:opened:' + sectionId;
    var opened = H.readOpened(window.localStorage, storageKey);
    var doors = Array.prototype.slice.call(root.querySelectorAll('.advent__door'));

    doors.forEach(function (door) {
      var day = Number(door.dataset.day);
      if ((door.dataset.state === 'past' || door.dataset.state === 'today') && opened.has(day)) {
        door.dataset.state = 'opened';
      }
    });

    var forced = H.parseDayParam(location.search);
    if (forced) {
      doors.forEach(function (door) {
        var day = Number(door.dataset.day);
        if (door.dataset.state === 'opened') return;
        if (day < forced) door.dataset.state = 'past';
        else if (day === forced) door.dataset.state = 'today';
      });
      root.dataset.forceDay = String(forced);
    }

    doors.forEach(function (door) {
      door.addEventListener('click', function () { onDoorClick(root, door, opened, storageKey); });
    });

    var onKey = function (e) { if (e.key === 'Escape') closeOverlay(root); };
    document.addEventListener('keydown', onKey);
    root._adventCleanup = function () { document.removeEventListener('keydown', onKey); };

    if (root.dataset.guides === 'true') {
      renderGuides(root, doors);
      var onResize = debounce(function () { renderGuides(root, doors); }, 150);
      window.addEventListener('resize', onResize);
      var prev = root._adventCleanup;
      root._adventCleanup = function () { prev(); window.removeEventListener('resize', onResize); };
    }
  }

  function onDoorClick(root, door, opened, storageKey) {
    if (door.dataset.state === 'locked') {
      if (!reduce) {
        door.classList.add('advent__door--shake');
        setTimeout(function () { door.classList.remove('advent__door--shake'); }, 600);
      }
      return;
    }
    var day = Number(door.dataset.day);
    openOverlay(root, door, day);
    opened.add(day);
    H.writeOpened(window.localStorage, storageKey, opened);
    door.dataset.state = 'opened';
  }

  // openOverlay: build scrim+card if missing, clone template, FLIP, focus trap, scroll lock
  // closeOverlay: fade out, restore focus, unlock scroll
  // renderGuides: getComputedStyle(door).gridArea -> areas[], H.buildCoverage(areas, cols, rows), paint cells + summary
  // debounce: standard

  function debounce(fn, ms) {
    var t; return function () { clearTimeout(t); var a = arguments, c = this; t = setTimeout(function () { fn.apply(c, a); }, ms); };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  document.addEventListener('shopify:section:load', function (e) {
    var sec = e.target.querySelector('.advent') || (e.target.classList && e.target.classList.contains('advent') ? e.target : null);
    if (sec) initSection(sec);
  });
  document.addEventListener('shopify:section:unload', function (e) {
    var sec = e.target.querySelector ? e.target.querySelector('.advent') : null;
    if (sec && sec._adventCleanup) sec._adventCleanup();
  });
})();
```
Fill `openOverlay`, `closeOverlay`, `renderGuides` completely, following the behaviour list. Use `card.animate([{transform: 'translate(dx,dy) scale(sx,sy)', transformOrigin:'top left', opacity:.4},{transform:'none', opacity:1}], {duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)'})` guarded by `!reduce`. Focus trap: keydown on the card, `if (e.key === 'Tab')` cycle between first/last focusable.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd shopify-advent-calendar && node --test scripts/lib/controller.test.mjs`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the whole suite**

Run: `cd shopify-advent-calendar && node --test`
Expected: PASS — every `*.test.mjs` across `scripts/` and `assets/`.

- [ ] **Step 6: Commit**

```bash
git add shopify-advent-calendar/assets/advent-calendar.js shopify-advent-calendar/scripts/lib/controller.test.mjs
git commit -m "feat(shopify-advent): DOM controller — persistence, overlay, guides"
```

---

### Task 15: Integration doc, README, manual QA

**Files:**
- Create: `shopify-advent-calendar/docs/INTEGRATION.md`
- Create: `shopify-advent-calendar/README.md`

**Interfaces:** none (documentation). Closes spec §15 and §16.

- [ ] **Step 1: Write `INTEGRATION.md`**

Follow spec §15 outline exactly. Sections, in order:
1. Prerequisites — staff needs *Settings → Custom data* access; for scripts, a custom app with `write_metaobject_definitions`, `write_metaobjects`, `read_metaobjects` and an admin token.
2. Create definition `advent_calendar_day` by hand — a field-by-field table (key, Admin "type" label, validations) transcribed from `metaobjects/advent_calendar_day.definition.json`, with the exact `choices` list for `motif`.
3. Create definition `advent_calendar` by hand — table from the JSON; for `days` choose "Metaobject" list type and point it at *Advent Calendar Day*.
4. Turn on *Storefront access* (Web) for both definitions.
5. Create 25 day entries + the parent; fill `days` in order 1→25. Include the content table from `advent-calendar-react/src/data/calendar.ts`.
6. Script alternative — `cp .env.example .env`, set `SHOPIFY_STORE` / `SHOPIFY_ADMIN_TOKEN`, `npm run create-defs`, `npm run seed`.
7. Add the section — *Theme → Customize → Add section → Advent calendar*; pick the entry in **Advent calendar**; Save.
8. Layout — the `grid_area` syntax `"<row> / <col> / span <height> / span <width>"`; a 7×8 diagram; the spec §13 table (all 25, desktop + mobile); the "56 cells, no overlap" rule; how to use **Show layout guides**, **Preview day**, and `?day=N`.
9. Colours — precedence (section override → metaobject → default) and an AA-contrast note.
10. QA checklist — copy Step 2 below.
11. Known limitations — from spec §17 (metaobject setting availability + `calendar_handle` fallback; editing a metaobject needs a manual preview refresh; changing grid size can break the tiling; brief real-state flash before `?day=N`).

Also create `scripts/.env.example`:
```
SHOPIFY_STORE=your-store.myshopify.com
SHOPIFY_ADMIN_TOKEN=shpat_xxx
```

- [ ] **Step 2: Write the manual QA checklist into `INTEGRATION.md`**

```
## QA checklist (run against `shopify theme dev`)
- [ ] Preview day 1..25 walks locked → today → past; 0 restores real date.
- [ ] `?day=13` outside December unlocks doors 1–13 client-side.
- [ ] Opening a door: overlay animates from the door; focus lands on Close;
      Tab stays trapped; Escape and scrim click close; focus returns to the door.
- [ ] Reload after opening: the door is still "opened" (localStorage).
- [ ] `show_snow` off → no snow. prefers-reduced-motion → no snow/shake/FLIP.
- [ ] Layout guides on with a deliberately broken `grid_area` (one overlap,
      one gap) → both flagged; summary chip shows the counts.
- [ ] Two instances of the section on one page do not share opened state.
- [ ] A day with no image / no code / no link degrades cleanly.
- [ ] Rich-text message with bold + list + link renders as HTML.
- [ ] Mobile ≤700px uses the 4×14 grid.
- [ ] `npx @shopify/cli theme check` reports no errors.
```

- [ ] **Step 3: Write `README.md`**

Short: what this is (Shopify port of `advent-calendar-react/`), the two-metaobject model, `npm test` (Node unit + structural checks), `npm run check` (Theme Check), and a pointer to `docs/INTEGRATION.md` for install. Note the `metaobjects/`, `scripts/`, `docs/` folders are not consumed by Shopify.

- [ ] **Step 4: Full verification**

Run: `cd shopify-advent-calendar && node --test && npx --yes @shopify/cli@latest theme check`
Expected: all Node tests PASS; Theme Check reports 0 errors (offenses of severity "error"). Record any remaining warnings in the README's "known warnings" note if unavoidable.

- [ ] **Step 5: Manual QA against a dev store**

Run `shopify theme dev` from a host theme that includes this section (or push these files into a development theme), create the metaobjects via `npm run create-defs && npm run seed`, add the section, and walk the Step 2 checklist. Fix any failures in the relevant task's files before proceeding.

- [ ] **Step 6: Commit**

```bash
git add shopify-advent-calendar/docs/INTEGRATION.md shopify-advent-calendar/README.md shopify-advent-calendar/scripts/.env.example
git commit -m "docs(shopify-advent): integration guide, README, QA checklist"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| §1 objetivo, §3 mapa React→Shopify | all; README/Task 15 |
| §4 arquitetura de ficheiros | Task 1 (scaffold), each file in its task |
| §5.1 `advent_calendar_day` definition | Task 2; manual table Task 15 |
| §5.2 `advent_calendar` definition + `@ref` resolution | Task 2, Task 3 |
| §6.1 grid custom props + dimensions settings | Task 10 (schema + vars), Task 13 (CSS) |
| §6.2 area resolution chain (override → default) | Task 11; Task 6 (defaults map) |
| §6.3 tiling rules documented | Task 15 §8; enforced by Task 4 tiling test |
| §7 layout guides / validation | Task 9 (`buildCoverage`), Task 14 (render), Task 13 (styles), Task 10 (`data-guides`) |
| §8.1 server date gate + December guard + `start_date` | Task 10 (`current_day`) |
| §8.2 `?day=N` client override | Task 9 (`parseDayParam`), Task 14 |
| §9 persistence, section-scoped key, memory fallback | Task 9 (`readOpened`/`writeOpened`), Task 14 |
| §10 section schema (all settings, presets, `enabled_on`) | Task 10 |
| §11 motif snippet, 10 keys, `wreath` fallback, currentColor vars | Task 7; Task 13 (var mapping) |
| §12 animation scope (FLIP, shake, snow, shine; reduced-motion) | Task 13 (CSS), Task 14 (FLIP/shake), Task 8 (snow) |
| §13 default layout table (25 × desktop/mobile) | Task 4 (seed), Task 6 (snippet) — both assert against it |
| §14 delivery: definition JSON + 2 scripts + manual doc | Tasks 2, 3, 5, 15 |
| §15 INTEGRATION.md outline | Task 15 |
| §16 QA checklist | Task 15 Step 2 |
| §17 risks: `metaobject` setting fallback, rich_text, file_reference, date math, grid-size warning, flash | Task 10 (`calendar_handle` fallback), Task 12 (`image != blank`, `.value`), Task 15 §11 |
| §18 component boundaries | one file per unit across Tasks 6–14 |

No gaps found.

**2. Placeholder scan**

`advent-grid-defaults.liquid` (Task 6 Step 3) and `advent-motif.liquid` (Task 7 Step 3) use `{%- comment -%} … {%- endcomment -%}` markers for the repeated `when` branches instead of spelling out all 25 / all 10. This is deliberate: the full data is in spec §13 (referenced) and `Motif.tsx` (referenced by exact path), and each is a mechanical transcription guarded by a structural test that fails until every branch/area is present (Task 6 Step 1 asserts `when 1`…`when 25` and every literal seed area string; Task 7 Step 1 asserts all 10 motif keys). An executor cannot mark the task done without completing the transcription. Task 13 Step 3 (CSS) is prose, not code blocks, but enumerates every required selector/keyframe and is gated by `css.test.mjs` asserting the grid, breakpoint, motif vars, reduced-motion block, four `data-state` rules, and the guide/scrim/card classes. Acceptable — CSS has no single "correct" implementation, and the test pins the contract.

**3. Type consistency**

- `parseArea` return shape `{ row, col, rowSpan, colSpan }` — identical in `seed-data.mjs` (Task 4) and `advent-calendar.helpers.js` (Task 9); tests in both assert the same keys.
- `buildCoverage` return `{ covered, total, empties, overlaps:[{cell,days}] }` — defined Task 9, consumed Task 14 Step 3 (`renderGuides`), matches.
- `createClient(query, variables)` → `Promise<data>` — defined Task 1, used identically in Tasks 3 and 5.
- `toDefinitionInput(def, refIds)` — defined Task 3, used Task 3 CLI only.
- `toUpsertInput(entry, type)` / `buildParentFields(baseFields, dayGids)` — defined Task 5, used Task 5 CLI only.
- Metaobject field keys: `DAY_FIELD_KEYS` / `CALENDAR_FIELD_KEYS` (Task 2) match the definition JSON, the seed field names (Task 4), and every `day_entry.<key>.value` access in `advent-door.liquid` (Task 11: `day`, `motif`, `grid_area`, `grid_area_mobile`) and `advent-overlay.liquid` (Task 12: `day`, `title`, `message`, `image`, `code`, `link_url`, `link_label`, `motif`).
- Section wrapper contract: `data-section-id`, `data-current-day`, `data-max-day`, `data-guides`, `--advent-*` vars — emitted Task 10, read by Task 14 (`dataset.sectionId`, `dataset.guides`) and Task 13 (CSS vars). Consistent.
- Door contract: `.advent__door[data-day][data-state]`, `--area`, `--area-m` — emitted Task 11, read by Task 13 (CSS) and Task 14 (state promotion, `getComputedStyle().gridArea`). Consistent.
- Overlay contract: `.advent__tpl[data-day]` cloned into `.advent__portal` — emitted Tasks 10/12, consumed Task 14. Consistent.
- localStorage key string `advent-calendar:opened:<id>` — Task 9 tests generic, Task 14 builds it, spec §9 and Task 14 test both pin the `advent-calendar:opened:` prefix.

No inconsistencies found.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-09-shopify-advent-calendar.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
