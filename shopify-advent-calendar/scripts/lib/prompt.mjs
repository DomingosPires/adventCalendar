// Shared interactive-prompt helpers for setup.mjs / teardown.mjs.

import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseDotEnv } from './admin.mjs';

const ENV_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '.env');

/** Pure yes/no reader — blank answer returns `def`. Accepts s/sim/y/yes. */
export function yes(answer, def = true) {
  const a = String(answer).trim().toLowerCase();
  if (a === '') return def;
  return ['s', 'sim', 'y', 'yes'].includes(a);
}

export function createPrompt() {
  const rl = createInterface({ input, output });
  return {
    ask: (q, dflt) => rl.question(dflt ? `${q} [${dflt}]: ` : `${q}: `).then((a) => a.trim() || dflt || ''),
    askYes: (q, def = true) => rl.question(`${q} [${def ? 'S/n' : 's/N'}] `).then((a) => yes(a, def)),
    confirmWord: (q, word) => rl.question(`${q}\n  (escreve "${word}" para confirmar) `).then((a) => a.trim().toLowerCase() === String(word).toLowerCase()),
    close: () => rl.close(),
  };
}

export function readEnvFile(path = ENV_PATH) {
  try { return parseDotEnv(readFileSync(path, 'utf8')); } catch { return {}; }
}

/** Resolve SHOPIFY_STORE / SHOPIFY_ADMIN_TOKEN from env → scripts/.env → prompts. */
export async function resolveCredentials({ ask, askYes }, { envPath = ENV_PATH } = {}) {
  const fromFile = readEnvFile(envPath);
  let store = process.env.SHOPIFY_STORE || fromFile.SHOPIFY_STORE || '';
  let token = process.env.SHOPIFY_ADMIN_TOKEN || fromFile.SHOPIFY_ADMIN_TOKEN || '';

  if (store && token) {
    const masked = token.length > 8 ? `${token.slice(0, 6)}…${token.slice(-4)}` : '(set)';
    if (await askYes(`Usar as credenciais encontradas?  loja=${store}  token=${masked}`, true)) {
      return { store, token };
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
    writeFileSync(envPath, `SHOPIFY_STORE=${store}\nSHOPIFY_ADMIN_TOKEN=${token}\n`);
    console.log(`   gravado em ${envPath}`);
  }
  return { store, token };
}
