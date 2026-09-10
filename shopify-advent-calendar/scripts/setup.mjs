// Interactive installer for the Advent Calendar on a Shopify store.
//   npm run setup
// Asks for the customisable bits (theme id, page title/handle, grid, metaobject
// handle), then runs: metaobject definitions -> 25 default entries -> theme
// files + page template -> storefront page -> (optional) publish the theme.
// Everything it does is idempotent, so a failed run can just be re-run.

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient, restClient, parseDotEnv } from './lib/admin.mjs';
import { slugify, parseGrid, DEFAULT_GRID } from './lib/theme-input.mjs';
import { run as runDefs } from './create-definitions.mjs';
import { run as runSeed } from './seed-entries.mjs';
import { run as runPushTheme } from './push-theme.mjs';
import { run as runCreatePage } from './create-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = join(ROOT, 'scripts', '.env');
const rl = createInterface({ input, output });

const yes = (answer, def = true) => {
  const a = String(answer).trim().toLowerCase();
  if (a === '') return def;
  return ['s', 'sim', 'y', 'yes'].includes(a);
};
const ask = (q, dflt) => rl.question(dflt ? `${q} [${dflt}]: ` : `${q}: `).then((a) => a.trim() || dflt || '');
const askYes = (q, def = true) => rl.question(`${q} [${def ? 'S/n' : 's/N'}] `).then((a) => yes(a, def));
const sub = (m) => console.log(`   ${m}`);

function banner() {
  console.log(`
┌────────────────────────────────────────────────────────────────────┐
│  Advent Calendar — setup                                            │
│                                                                    │
│  ANTES DE AVANÇAR: confirma que já criaste a custom app na loja e   │
│  puseste o Admin API token + domínio em  scripts/.env              │
│  (SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN).                              │
│                                                                    │
│  Se ainda não fizeste isso, lê primeiro:  docs/custom-app.pdf       │
│  — guia dedicado à criação e scopes da custom app.                  │
└────────────────────────────────────────────────────────────────────┘
`);
}

function readEnvFile() {
  try { return parseDotEnv(readFileSync(ENV_PATH, 'utf8')); } catch { return {}; }
}

async function resolveCredentials() {
  const fromFile = readEnvFile();
  let store = process.env.SHOPIFY_STORE || fromFile.SHOPIFY_STORE || '';
  let token = process.env.SHOPIFY_ADMIN_TOKEN || fromFile.SHOPIFY_ADMIN_TOKEN || '';

  if (store && token) {
    const masked = token.length > 8 ? `${token.slice(0, 6)}…${token.slice(-4)}` : '(set)';
    if (await askYes(`Usar as credenciais encontradas?  loja=${store}  token=${masked}`, true)) {
      return { store, token, fromEnvFile: true };
    }
    store = ''; token = '';
  }

  if (!store) {
    store = (await ask('Domínio da loja (ex: minha-loja.myshopify.com)'))
      .replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
  }
  if (!token) {
    console.log('   (o token vai aparecer no ecrã — limpa o terminal depois se for partilhado)');
    token = (await ask('Admin API access token (shpat_…)')).trim();
  }
  if (!store || !token) throw new Error('Faltam credenciais.');

  if (await askYes('Gravar estas credenciais em scripts/.env?', true)) {
    writeFileSync(ENV_PATH, `SHOPIFY_STORE=${store}\nSHOPIFY_ADMIN_TOKEN=${token}\n`);
    sub(`gravado em ${ENV_PATH}`);
  }
  return { store, token, fromEnvFile: false };
}

async function main() {
  banner();
  if (!(await askYes('Já tens a custom app criada e o .env preenchido. Continuar?', false))) {
    console.log('Ok — lê docs/custom-app.pdf e volta a correr  npm run setup');
    return;
  }

  const { store, token } = await resolveCredentials();
  const gql = createClient({ store, token });
  const req = restClient({ store, token });

  // sanity check the credentials / scopes
  try {
    const shop = await req('GET', '/shop.json?fields=name,myshopify_domain');
    sub(`ligado a: ${shop.shop.name} (${shop.shop.myshopify_domain})`);
  } catch (e) {
    throw new Error(`Não consegui autenticar (${e.message}). Verifica o token e os scopes — docs/custom-app.pdf.`);
  }

  const doDefs = await askYes('1) Criar as definições de metaobject?', true);
  const doSeed = await askYes('2) Criar as 25 entradas default?', true);
  const doTheme = await askYes('3) Subir os ficheiros do calendário para um tema?', true);
  const doPage = await askYes('4) Criar a página no storefront?', true);

  let calendarHandle = 'advent-calendar-default';
  if (doTheme || doPage) {
    calendarHandle = await ask('Handle do metaobject-pai', 'advent-calendar-default');
  }

  let themeId = null;
  let themeName = '';
  let grid = { ...DEFAULT_GRID };
  if (doTheme) {
    const { themes } = await req('GET', '/themes.json?fields=id,name,role');
    console.log('\n   Temas:');
    for (const t of themes || []) console.log(`   ${String(t.id).padEnd(14)} ${String(t.role).padEnd(11)} ${t.name}`);
    console.log('');
    while (themeId === null) {
      const raw = (await ask('Theme id para receber os ficheiros')).replace(/\D/g, '');
      const t = (themes || []).find((x) => String(x.id) === raw);
      if (!t) { sub('id não encontrado — tenta outra vez'); continue; }
      if (t.role === 'main' && !(await askYes(`É o tema LIVE (${t.name}). Continuar mesmo assim?`, false))) continue;
      themeId = t.id; themeName = t.name;
    }
    grid = parseGrid(await ask('Grelha  colunas/linhas/mobile-col/mobile-lin/gap', '7/8/4/14/8'));
  }

  let pageTitle = 'Advent Calendar';
  let pageHandle = 'advent-calendar';
  if (doPage) {
    pageTitle = await ask('Título da página', 'Advent Calendar');
    pageHandle = await ask('Handle da página', slugify(pageTitle));
  }

  let doPublish = false;
  if (doTheme) doPublish = await askYes('5) Publicar o tema no fim (fica live)?', false);

  console.log(`
   ── Resumo ─────────────────────────────────────────
   Loja ................ ${store}
   Definições .......... ${doDefs ? 'sim' : 'não'}
   25 entradas ......... ${doSeed ? 'sim' : 'não'}
   Ficheiros no tema ... ${doTheme ? `${themeId} (${themeName})` : 'não'}
   Grelha ............. ${doTheme ? `${grid.columns}/${grid.rows}/${grid.columnsMobile}/${grid.rowsMobile}/${grid.gap}` : '—'}
   Página ............. ${doPage ? `"${pageTitle}"  /pages/${pageHandle}` : 'não'}
   Metaobject handle .. ${calendarHandle}
   Publicar tema ...... ${doPublish ? 'SIM (fica live)' : 'não'}
   ───────────────────────────────────────────────────
`);
  if (!(await askYes('Avançar?', false))) { console.log('Cancelado.'); return; }

  const step = async (label, fn) => {
    process.stdout.write(`▸ ${label}\n`);
    try { await fn(); console.log(`✓ ${label}\n`); }
    catch (e) {
      console.error(`✗ ${label}: ${e.message}`);
      console.error('  Corrige e volta a correr  npm run setup  (tudo é idempotente).');
      process.exit(1);
    }
  };

  let pageUrl = null;
  if (doDefs) await step('Definições de metaobject', () => runDefs({ client: gql, dir: join(ROOT, 'metaobjects'), log: sub }));
  if (doSeed) await step('25 entradas + entrada-pai', () => runSeed({ client: gql, dir: join(ROOT, 'metaobjects', 'seed'), log: sub }));
  if (doTheme) await step('Ficheiros + template no tema', () => runPushTheme({ req, themeId, rootDir: ROOT, calendarHandle, grid, log: sub }));
  if (doPage) await step('Página no storefront', async () => {
    const r = await runCreatePage({ req, store, title: pageTitle, handle: pageHandle, log: sub });
    pageUrl = r.url;
  });
  if (doPublish) {
    if (await askYes(`PUBLICAR o tema "${themeName}" agora? Substitui o tema live.`, false)) {
      await step('Publicar tema', () => req('PUT', `/themes/${themeId}.json`, { theme: { id: themeId, role: 'main' } }));
    } else {
      console.log('Publicação saltada.');
    }
  }

  console.log('Feito.');
  if (pageUrl) console.log(`Página: ${pageUrl}`);
  if (doTheme && !doPublish) console.log(`Pré-visualiza o tema ${themeId} (${themeName}) para veres o calendário; publica quando estiver bem.`);
}

main()
  .catch((err) => { console.error(err.message); process.exitCode = 1; })
  .finally(() => rl.close());
