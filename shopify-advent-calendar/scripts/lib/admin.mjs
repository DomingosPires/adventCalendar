import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DEFAULT_VERSION = '2025-01';

/** Parse a minimal `.env` (`KEY=VALUE` lines; `#` comments and blanks
 *  ignored; surrounding single/double quotes stripped). Zero-dependency. */
export function parseDotEnv(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[m[1]] = value;
  }
  return out;
}

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
  // Load scripts/.env if present — real environment variables still win.
  const envPath = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  try {
    const parsed = parseDotEnv(readFileSync(envPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* no .env file — rely on real environment variables */
  }

  const store = process.env.SHOPIFY_STORE;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!store || !token) {
    throw new Error(
      'Set SHOPIFY_STORE and SHOPIFY_ADMIN_TOKEN — as environment variables, '
        + 'or in shopify-advent-calendar/scripts/.env (copy scripts/.env.example).',
    );
  }
  return { store, token };
}
