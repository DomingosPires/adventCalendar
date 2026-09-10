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
