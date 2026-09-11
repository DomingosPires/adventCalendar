# Setup — passo a passo

Ordem para instalar o calendário do advento numa loja Shopify.

## 1. Ler primeiro

1. `docs/custom-app.pdf` — criar a custom app na Shopify, escolher os API
   scopes, colocar o token em `scripts/.env`. Sem isto nenhum script funciona.
2. `docs/quickstart.pdf` — guia passo-a-passo (instalação manual num tema
   existente + caminho via API/scripts). Inclui as 25 entradas de dia
   por defeito.
3. `docs/INTEGRATION.md` — referência completa: campos dos dois metaobjects,
   caminho script/API, sistema de grid layout, precedência de cores, settings
   da section, checklist de QA, §13 troubleshooting, limitações conhecidas.
   Consultar quando algo não bate certo.
4. `CHANGELOG.md` — o que mudou desde a última instalação.

## 2. Preparar o token

- Seguir `docs/custom-app.pdf` para criar a custom app e gerar o token.
- Copiar `scripts/.env.example` para `scripts/.env` e preencher com o token.

## 3. Validar localmente

A partir de `shopify-advent-calendar/`, com Node ≥ 18:

```
npm test          # unit tests (JS helpers + libs de provisioning + checks estruturais)
npm run check      # Theme Check — esperar 0 offenses de severidade "error"
```

## 4. Instalar na loja

Opção rápida — wizard interativo (definitions → 25 entries → ficheiros do
tema + template → página → publish opcional):

```
npm run setup                  # instala tudo, pergunta o que for preciso
npm run setup -- --dry-run     # mostra o plano sem tocar em nada
```

Opção por partes:

```
npm run create-defs                     # cria as definitions dos 2 metaobjects
npm run seed                            # semeia as 25 entradas de dia
npm run list-themes                     # lista os temas da loja
npm run push-theme -- <theme-id>        # envia os ficheiros do tema
npm run create-page                     # cria a página com a section
```

## 5. Desfazer (se necessário)

```
npm run teardown
```

Destrutivo e interativo — remove página, ficheiros do tema e/ou definitions
dos metaobjects (o que apaga todas as entradas). Cada parte é opt-in e pede
confirmação por escrito.
