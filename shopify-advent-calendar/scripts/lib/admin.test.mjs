import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adminEndpoint, parseGraphQLResponse, createClient, parseDotEnv, restClient,
} from './admin.mjs';

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

test('parseDotEnv reads KEY=VALUE, skips comments/blanks, strips quotes', () => {
  const parsed = parseDotEnv([
    '# a comment',
    '',
    'SHOPIFY_STORE=demo.myshopify.com',
    '  SHOPIFY_ADMIN_TOKEN = "shpat_abc123"  ',
    "QUOTED='single'",
    'not a valid line',
    'EMPTY=',
  ].join('\n'));
  assert.deepEqual(parsed, {
    SHOPIFY_STORE: 'demo.myshopify.com',
    SHOPIFY_ADMIN_TOKEN: 'shpat_abc123',
    QUOTED: 'single',
    EMPTY: '',
  });
});

test('restClient issues the REST call and returns parsed JSON', async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, status: 201, text: async () => JSON.stringify({ page: { id: 9, handle: 'advent-calendar' } }) };
  };
  const req = restClient({ store: 'demo.myshopify.com', token: 't', fetchImpl: fakeFetch });
  const data = await req('POST', '/pages.json', { page: { title: 'X' } });
  assert.equal(data.page.id, 9);
  assert.equal(calls[0].url, 'https://demo.myshopify.com/admin/api/2025-01/pages.json');
  assert.equal(calls[0].opts.method, 'POST');
  assert.equal(calls[0].opts.headers['X-Shopify-Access-Token'], 't');
  assert.equal(JSON.parse(calls[0].opts.body).page.title, 'X');
});

test('restClient throws on a non-ok response with the error body', async () => {
  const fakeFetch = async () => ({
    ok: false, status: 422,
    text: async () => JSON.stringify({ errors: { handle: ['has already been taken'] } }),
  });
  const req = restClient({ store: 's', token: 't', fetchImpl: fakeFetch });
  await assert.rejects(() => req('POST', '/pages.json', {}), /has already been taken/);
});

test('restClient sends no body on GET', async () => {
  let seen;
  const fakeFetch = async (url, opts) => { seen = opts; return { ok: true, status: 200, text: async () => '{"themes":[]}' }; };
  const req = restClient({ store: 's', token: 't', fetchImpl: fakeFetch });
  await req('GET', '/themes.json');
  assert.equal(seen.body, undefined);
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
