// Reverse what setup.mjs / the provisioning scripts create, on a Shopify store.
//   npm run teardown
// DESTRUCTIVE. Each part is opt-in and confirmed. It can remove:
//   • the storefront page
//   • the calendar files + templates/page.advent-calendar.json from a theme
//     (it does NOT touch locales/en.default.json — one merged key can't be
//      un-merged safely; remove it by hand if you want)
//   • the two metaobject definitions — which deletes ALL their entries
//     (the 25 days + the parent)

import { createClient, restClient, isEntrypoint } from './lib/admin.mjs';
import { createPrompt, resolveCredentials } from './lib/prompt.mjs';

const sub = (m) => console.log(`   ${m}`);

const ASSET_KEYS = [
  'sections/advent-calendar.liquid',
  'snippets/advent-door.liquid',
  'snippets/advent-overlay.liquid',
  'snippets/advent-grid-defaults.liquid',
  'snippets/advent-motif.liquid',
  'snippets/advent-snow.liquid',
  'assets/advent-calendar.css',
  'assets/advent-calendar.helpers.js',
  'assets/advent-calendar.js',
  'templates/page.advent-calendar.json',
];

const DEF_DELETE = `
mutation DelDef($id: ID!) {
  metaobjectDefinitionDelete(id: $id) {
    deletedId
    userErrors { field message }
  }
}`;
const BY_TYPE = `query T($type:String!){ metaobjectDefinitionByType(type:$type){ id } }`;

async function removePage(p, req) {
  const handle = await p.ask('Handle da página a apagar', 'advent-calendar');
  const { pages } = await req('GET', '/pages.json?limit=250&fields=id,handle,title');
  const page = (pages || []).find((x) => x.handle === handle);
  if (!page) return sub(`nenhuma página com handle "${handle}" — nada a fazer`);
  if (!(await p.confirmWord(`Apagar a página "${page.title}" (/pages/${page.handle})?`, 'apagar'))) return sub('saltado');
  await req('DELETE', `/pages/${page.id}.json`);
  sub(`página ${page.id} apagada`);
}

async function removeThemeFiles(p, req) {
  const { themes } = await req('GET', '/themes.json?fields=id,name,role');
  console.log('\n   Temas:');
  for (const t of themes || []) console.log(`   ${String(t.id).padEnd(14)} ${String(t.role).padEnd(11)} ${t.name}`);
  console.log('');
  const raw = (await p.ask('Theme id de onde remover os ficheiros')).replace(/\D/g, '');
  const t = (themes || []).find((x) => String(x.id) === raw);
  if (!t) return sub('id não encontrado — saltado');
  if (!(await p.confirmWord(`Remover os ${ASSET_KEYS.length} ficheiros do calendário do tema "${t.name}"${t.role === 'main' ? ' (LIVE)' : ''}?`, 'remover'))) return sub('saltado');
  for (const key of ASSET_KEYS) {
    try {
      await req('DELETE', `/themes/${t.id}/assets.json?asset[key]=${encodeURIComponent(key)}`);
      sub(`- ${key}`);
    } catch {
      sub(`  (${key} não estava presente)`);
    }
  }
  sub('locales/en.default.json foi deixado intacto (remove a chave "sections.advent_calendar.no_entry" à mão se quiseres)');
}

async function removeDefinitions(p, gql) {
  console.log('   AVISO: apagar as definições apaga TAMBÉM as 25 entradas + a entrada-pai.');
  if (!(await p.confirmWord('Apagar as definições advent_calendar e advent_calendar_day?', 'apagar tudo'))) return sub('saltado');
  for (const type of ['advent_calendar', 'advent_calendar_day']) {
    const found = await gql(BY_TYPE, { type });
    const id = found.metaobjectDefinitionByType && found.metaobjectDefinitionByType.id;
    if (!id) { sub(`${type}: não existe`); continue; }
    const r = await gql(DEF_DELETE, { id });
    sub(`${type}: apagada (${r.metaobjectDefinitionDelete.deletedId})`);
  }
}

async function main(p) {
  console.log(`
┌────────────────────────────────────────────────────────────────────┐
│  Advent Calendar — teardown  (DESTRUTIVO)                           │
│  Remove a página, os ficheiros do tema e/ou as definições de        │
│  metaobject (e com elas todas as entradas). Cada parte é opcional   │
│  e pede confirmação escrita.                                        │
└────────────────────────────────────────────────────────────────────┘
`);
  console.log('Carrega Enter numa pergunta para aceitar o valor sugerido ("Enter = …").\n');
  if (!(await p.askYes('Continuar?', false))) return;

  const { store, token } = await resolveCredentials(p);
  const req = restClient({ store, token });
  const gql = createClient({ store, token });

  if (await p.askYes('Apagar a página do storefront?', false)) await removePage(p, req);
  if (await p.askYes('Remover os ficheiros do calendário de um tema?', false)) await removeThemeFiles(p, req);
  if (await p.askYes('Apagar as definições de metaobject (+ todas as entradas)?', false)) await removeDefinitions(p, gql);

  console.log('Feito.');
}

if (isEntrypoint(import.meta.url)) {
  const p = createPrompt();
  main(p)
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => p.close());
}
