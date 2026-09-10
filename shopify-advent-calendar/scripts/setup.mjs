// Interactive installer for the Advent Calendar on a Shopify store.
//   npm run setup            run it
//   npm run setup -- --dry-run   ask everything, then print the plan without touching the store
// Asks for the customisable bits (theme id, page title/handle, grid, metaobject
// handle), then runs: metaobject definitions -> 25 default entries -> theme
// files + page template -> storefront page -> (optional) publish the theme.
// Everything it does is idempotent, so a failed run can just be re-run.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient, restClient, isEntrypoint } from './lib/admin.mjs';
import { createPrompt, resolveCredentials } from './lib/prompt.mjs';
import { slugify, parseGrid, DEFAULT_GRID } from './lib/theme-input.mjs';
import { run as runDefs } from './create-definitions.mjs';
import { run as runSeed } from './seed-entries.mjs';
import { run as runPushTheme } from './push-theme.mjs';
import { run as runCreatePage } from './create-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.slice(2).includes('--dry-run');
const sub = (m) => console.log(`   ${m}`);

function banner() {
  console.log(`
┌────────────────────────────────────────────────────────────────────┐
│  Advent Calendar — setup${DRY ? '  (DRY RUN — nada é enviado)' : ''}
│
│  ANTES DE AVANÇAR: confirma que já criaste a custom app na loja e
│  puseste o Admin API token + domínio em  scripts/.env
│  (SHOPIFY_STORE, SHOPIFY_ADMIN_TOKEN).
│
│  Se ainda não fizeste isso, lê primeiro:  docs/custom-app.pdf
└────────────────────────────────────────────────────────────────────┘
`);
}

async function main(p) {
  banner();
  console.log('Carrega Enter numa pergunta para aceitar o valor sugerido (o que vem a seguir a "Enter =").\n');
  if (!(await p.askYes('Já tens a custom app criada e o .env preenchido. Continuar?', false))) {
    console.log('Ok — lê docs/custom-app.pdf e volta a correr  npm run setup');
    return;
  }

  const { store, token } = await resolveCredentials(p);
  const gql = createClient({ store, token });
  const req = restClient({ store, token });

  try {
    const shop = await req('GET', '/shop.json?fields=name,myshopify_domain');
    sub(`ligado a: ${shop.shop.name} (${shop.shop.myshopify_domain})`);
  } catch (e) {
    throw new Error(`Não consegui autenticar (${e.message}). Verifica o token e os scopes — docs/custom-app.pdf.`);
  }

  const doDefs = await p.askYes('1) Criar as definições de metaobject?', true);
  const doSeed = await p.askYes('2) Criar as 25 entradas default?', true);
  const doTheme = await p.askYes('3) Subir os ficheiros do calendário para um tema?', true);
  const doPage = await p.askYes('4) Criar a página no storefront?', true);

  let calendarHandle = 'advent-calendar-default';
  if (doTheme || doPage) calendarHandle = await p.ask('Handle do metaobject-pai', 'advent-calendar-default');

  let themeId = null;
  let themeName = '';
  let grid = { ...DEFAULT_GRID };
  if (doTheme) {
    const { themes } = await req('GET', '/themes.json?fields=id,name,role');
    console.log('\n   Temas:');
    for (const t of themes || []) console.log(`   ${String(t.id).padEnd(14)} ${String(t.role).padEnd(11)} ${t.name}`);
    console.log('');
    while (themeId === null) {
      const raw = (await p.ask('Theme id para receber os ficheiros')).replace(/\D/g, '');
      const t = (themes || []).find((x) => String(x.id) === raw);
      if (!t) { sub('id não encontrado — tenta outra vez'); continue; }
      if (t.role === 'main') {
        sub(`"${t.name}" é o tema PUBLICADO — os ficheiros vão para o storefront de imediato, sem rede.`);
        sub('O recomendado é usar um tema duplicado / unpublished.');
        if (!(await p.askYes('Continuar mesmo no tema live?', false))) continue;
      }
      themeId = t.id; themeName = t.name;
    }
    grid = parseGrid(await p.ask('Grelha  colunas/linhas/mobile-col/mobile-lin/gap', '7/8/4/14/8'));
  }

  let pageTitle = 'Advent Calendar';
  let pageHandle = 'advent-calendar';
  if (doPage) {
    pageTitle = await p.ask('Título da página', 'Advent Calendar');
    pageHandle = await p.ask('Handle da página', slugify(pageTitle));
  }

  let doPublish = false;
  if (doTheme) doPublish = await p.askYes('5) Publicar o tema no fim (fica live)?', false);

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

  if (DRY) {
    console.log('DRY RUN — passos que seriam executados:');
    if (doDefs) console.log('  • criar/confirmar as 2 definições de metaobject');
    if (doSeed) console.log('  • upsert das 25 entradas + a entrada-pai');
    if (doTheme) console.log(`  • upload de 9 ficheiros + templates/page.advent-calendar.json para o tema ${themeId}, e merge do locale`);
    if (doPage) console.log(`  • criar/atualizar a página /pages/${pageHandle}`);
    if (doPublish) console.log(`  • publicar o tema ${themeId}`);
    console.log('\nNada foi enviado. Corre sem --dry-run para executar.');
    return;
  }

  if (!(await p.askYes('Avançar?', false))) { console.log('Cancelado.'); return; }

  const step = async (label, fn) => {
    console.log(`▸ ${label}`);
    try { await fn(); console.log(`✓ ${label}\n`); }
    catch (e) {
      console.error(`✗ ${label}: ${e.message}`);
      console.error('  Corrige e volta a correr  npm run setup  (tudo é idempotente).');
      process.exit(1);
    }
  };

  let pageUrl = null;
  let parentEntryId = null;
  if (doDefs) await step('Definições de metaobject', () => runDefs({ client: gql, dir: join(ROOT, 'metaobjects'), log: sub }));
  if (doSeed) await step('25 entradas + entrada-pai', async () => {
    const r = await runSeed({ client: gql, dir: join(ROOT, 'metaobjects', 'seed'), log: sub });
    parentEntryId = r.parentId;
  });
  if (doTheme) await step('Ficheiros + template no tema', () => runPushTheme({ req, themeId, rootDir: ROOT, calendarHandle, calendarEntryId: parentEntryId, grid, log: sub }));
  if (doPage) await step('Página no storefront', async () => {
    const r = await runCreatePage({ req, store, title: pageTitle, handle: pageHandle, log: sub });
    pageUrl = r.url;
  });
  if (doPublish) {
    if (await p.askYes(`PUBLICAR o tema "${themeName}" agora? Substitui o tema live.`, false)) {
      await step('Publicar tema', () => req('PUT', `/themes/${themeId}.json`, { theme: { id: themeId, role: 'main' } }));
    } else {
      console.log('Publicação saltada.');
    }
  }

  console.log('Feito.');
  if (pageUrl) console.log(`Página: ${pageUrl}`);
  if (doTheme && !doPublish) console.log(`Pré-visualiza o tema ${themeId} (${themeName}) para veres o calendário; publica quando estiver bem.`);
}

if (isEntrypoint(import.meta.url)) {
  const p = createPrompt();
  main(p)
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => p.close());
}
