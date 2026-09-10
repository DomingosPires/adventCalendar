# Shopify Advent Calendar — Design

**Data:** 2026-09-09
**Estado:** aprovado para planeamento
**Origem:** port do `advent-calendar-react/` para uma section de tema Shopify

---

## 1. Objetivo

Reproduzir o calendário do advento React (grelha de 25 portas em mosaico
irregular, neve, uma surpresa por dia, portas com gate por data, portas abertas
memorizadas) como **uma section clássica de tema Shopify**, com todo o conteúdo
e estilo geridos em **dois metaobjects**:

- `advent_calendar` — configuração global (títulos, cores, data de início, lista
  de dias). Uma entrada, escolhida na section.
- `advent_calendar_day` — um por dia (1–25): título, mensagem, código, motif,
  imagem, link, e override opcional de posição/tamanho na grelha.

Entrega: pasta `shopify-advent-calendar/` com a section, snippets, assets, mais
ficheiros de definição dos metaobjects, scripts de provisionamento e um
`INTEGRATION.md`.

### Nomes

O pedido usa `adventCalendar` / `adventCalendarDays`. Em Shopify o *type handle*
de um metaobject é snake_case e é assim que se acede em Liquid
(`shop.metaobjects.advent_calendar`). Usamos:

| Pedido | Type handle | Display name |
|---|---|---|
| `adventCalendar` | `advent_calendar` | Advent Calendar |
| `adventCalendarDays` | `advent_calendar_day` | Advent Calendar Day |

## 2. Não-objetivos (v1)

- App embutida / UI no Admin / editor drag-and-drop do mosaico.
- Theme app extension (app block) para distribuição a lojas terceiras.
- Persistência das portas abertas por cliente com login (cross-device).
- Paridade total com as animações framer-motion (ver §12).
- Testes automatizados de Liquid (não existe runner); QA é manual + Theme Check.

## 3. Mapa a partir do React

| React | Shopify |
|---|---|
| `data/calendar.ts` (25 objetos) | 25 entradas `advent_calendar_day` |
| `CalendarPage` `TITLE` / `SUBTITLE` | `advent_calendar.heading` / `.subheading` |
| `styles/theme.css` tokens de cor | campos `color` no `advent_calendar` → CSS vars |
| `Motif.tsx` (10 SVG inline) | `snippets/advent-motif.liquid` (`case` sobre a chave) |
| `useAdventDay` (`new Date()` + `?day=N`) | gate em Liquid por data + setting `preview_day` + `?day=N` client-side |
| `useOpenedDays` (localStorage) | `advent-calendar.js` + localStorage (chave scoped por section) |
| `DoorFocus` (portal, focus trap, framer-motion) | `snippets/advent-overlay.liquid` + `advent-calendar.js` (portal, focus trap, WAAPI) |
| grelha `gridArea` / `gridAreaMobile` por dia | mapa default em `advent-grid-defaults.liquid` + override por entrada |
| `Snow` | `snippets/advent-snow.liquid` (CSS), desligável, off sob reduced-motion |

## 4. Arquitetura de ficheiros

```
shopify-advent-calendar/
├── sections/
│   └── advent-calendar.liquid          # orquestra: lê metaobject, injeta CSS vars, itera dias
├── snippets/
│   ├── advent-door.liquid              # uma porta: resolve área, estado, motif, número
│   ├── advent-motif.liquid             # case sobre as 10 chaves → SVG inline (currentColor)
│   ├── advent-overlay.liquid           # template server-render do conteúdo de cada dia (hidden)
│   ├── advent-grid-defaults.liquid     # case day (1..25) + mode desktop|mobile → string grid-area
│   └── advent-snow.liquid              # camada de neve CSS
├── assets/
│   ├── advent-calendar.css
│   └── advent-calendar.js
├── locales/
│   └── en.default.schema.json          # traduções do schema da section
├── metaobjects/                        # CONVENÇÃO DO REPO — não é lido pelo Shopify
│   ├── advent_calendar.definition.json
│   ├── advent_calendar_day.definition.json
│   └── seed/
│       ├── advent_calendar.json
│       └── days/day-01.json … day-25.json
├── scripts/
│   ├── package.json
│   ├── create-definitions.mjs          # Admin GraphQL: cria as 2 definições
│   └── seed-entries.mjs                # cria as 25 entradas + a entrada-pai
└── docs/
    └── INTEGRATION.md
```

Nenhum ficheiro fora de `sections/`, `snippets/`, `assets/`, `locales/` é
consumido pelo Shopify. `metaobjects/`, `scripts/` e `docs/` são para o humano
que instala.

## 5. Modelo de dados (definições de metaobject)

Ambas as definições: `access.storefront = PUBLIC_READ` (para Liquid ler) e
`capabilities.publishable.enabled = true` (entradas draft/active).

### 5.1 `advent_calendar_day`

`displayNameKey = "title"`.

| key | type | required | validations | notas |
|---|---|---|---|---|
| `day` | `number_integer` | sim | `min:1`, `max:25` | fonte de verdade para ordenação e gate |
| `title` | `single_line_text_field` | sim | — | |
| `message` | `rich_text_field` | sim | — | React era texto simples; rich text permite formatação |
| `code` | `single_line_text_field` | não | — | código copiável (o "prémio") |
| `motif` | `single_line_text_field` | não | `choices: ["wreath","candle","star","gift","tree","bell","snowflake","stocking","bauble","candycane"]` | dropdown no Admin; vazio → `wreath` |
| `image` | `file_reference` | não | `file_type_options: ["Image"]` | imagem no overlay |
| `link_url` | `url` | não | — | CTA (contexto Shopify: produto/coleção) |
| `link_label` | `single_line_text_field` | não | — | texto do CTA; sem label → sem botão |
| `grid_area` | `single_line_text_field` | não | — | override desktop, sintaxe `linha / coluna / span A / span L`; vazio → default do dia |
| `grid_area_mobile` | `single_line_text_field` | não | — | override mobile; vazio → default do dia |

**Sem campo `size` separado.** O tamanho é os dois `span` dentro de `grid_area` —
uma só fonte de verdade, sem risco de dessincronizar. O preview mostra o "LxA"
derivado.

### 5.2 `advent_calendar`

`displayNameKey = "heading"`.

| key | type | required | notas |
|---|---|---|---|
| `heading` | `single_line_text_field` | sim | React: "Calendário do Advento" |
| `subheading` | `single_line_text_field` | não | React: "Abre uma porta por dia até ao Natal" |
| `background_color` | `color` | não | fundo da section; default `#1c1613` |
| `text_color` | `color` | não | texto geral; default `#f6ede0` |
| `door_color` | `color` | não | face da porta; default `#2a3d35` |
| `door_text_color` | `color` | não | número/ícone; default `#cfe3d4` |
| `accent_color` | `color` | não | brilho "hoje", medalha, shine; default `#c9a24b` |
| `show_snow` | `boolean` | não | default `true` |
| `start_date` | `date` | não | porta N abre em `start_date + (N-1) dias`. Vazio → dia N de dezembro do ano corrente (comportamento React) |
| `days` | `list.metaobject_reference` | sim | `validations: metaobject_definition → advent_calendar_day`. Ordem de fallback; a verdade é `day` |

Na `create-definitions.mjs` a definição `advent_calendar_day` é criada primeiro,
o seu ID é capturado e injetado na validação de `days`. O `.definition.json`
usa o placeholder `"@ref:advent_calendar_day"`.

## 6. Sistema de layout

### 6.1 Grelha

```css
.advent__grid {
  display: grid;
  grid-template-columns: repeat(var(--advent-cols), 1fr);
  grid-template-rows: repeat(var(--advent-rows), 1fr);
  gap: var(--advent-gap);
}
.advent__door { grid-area: var(--area); }
@media (max-width: 700px) {
  .advent__grid { grid-template-columns: repeat(var(--advent-cols-m), 1fr);
                  grid-template-rows: repeat(var(--advent-rows-m), 1fr); }
  .advent__door { grid-area: var(--area-m); }
}
```

`--advent-cols/rows/cols-m/rows-m/gap` vêm de **settings da section** (§10),
defaults **7×8** desktop e **4×14** mobile (valores do React; 56 células cada).

### 6.2 Resolução da área por porta (cadeia de 2 níveis)

Em `advent-door.liquid`, por dia:

1. Se `entry.grid_area` preenchido → usa tal e qual.
2. Senão → `{% render 'advent-grid-defaults', day: n, mode: 'desktop' %}`.

Idem para `grid_area_mobile` com `mode: 'mobile'`. O snippet de defaults é um
`case day` (1..25) com os valores exatos do `calendar.ts` (tabela §13). Override
é **por porta e total**: ou defines a string completa, ou deixas em branco.

### 6.3 Regras (documentadas no INTEGRATION.md)

- Sintaxe: `grid_area = "<linha> / <coluna> / span <altura> / span <largura>"`
  (linhas e colunas começam em 1).
- Para o mosaico "fechar" sem buracos nem sobreposições: soma das áreas das
  portas = colunas × linhas (25 portas = 56 células em 7×8).
- Mudar as dimensões da grelha nos settings obriga a re-equilibrar. O mais
  seguro: manter 7×8 e só trocar posições entre portas do mesmo tamanho.
- Buracos/sobreposições **não bloqueiam** o render — a section desenha na
  mesma, só com falhas visuais. O preview (§7) assinala-as.

## 7. Preview / validação de layout

Setting da section `layout_guides` (checkbox, default `false`). Ligado, no painel
de preview do customize, `advent-calendar.js`:

1. Lê `--advent-cols/rows` (e as mobile no breakpoint ativo) do computed style.
2. Desenha uma camada sobre a grelha com as linhas de célula e números de
   coluna (topo) e linha (lado).
3. Por cada `.advent__door` lê o `grid-area` resolvido via `getComputedStyle`,
   escreve na porta `Dia N · 1/5/span2/span1 · 1×2`, e marca as células que
   cobre num mapa de cobertura.
4. Depois do ciclo:
   - células cobertas 0× → contorno tracejado âmbar + lista no resumo;
   - células cobertas >1× → célula a vermelho + contorno vermelho nas portas em
     conflito;
   - chip-resumo fixo: `✅ 56/56 células · 0 sobreposições` ou os erros.
5. Re-corre em `shopify:section:load` e no `resize` (valida também mobile).

**Limitação assumida:** editar um metaobject não faz hot-reload do editor de
tema (é outro ecrã do Admin). Fluxo: merchant edita `grid_area` → volta ao
customize → atualiza o preview → vê a validação. Settings da section (dimensões,
`layout_guides`, cores espelhadas) fazem hot-reload normalmente.

Extra opcional: `?advent_layout_debug=1` no URL força as guias mesmo fora do
editor (gated a `request.design_mode` ou ao param), para sanity-check rápido.

## 8. Gate por data

### 8.1 Servidor (Liquid)

Por dia `n`:

```
today_ts  = 'now' | date: '%s'                         (epoch, hora da loja)
offset    = n | minus: 1 | times: 86400
if calendar.start_date presente:
    unlock_ts = calendar.start_date | date: '%s' | plus: offset
else:
    year      = 'now' | date: '%Y'
    unlock_ts = "{year}-12-{n zero-pad}T00:00:00" | date: '%s'
```

Estado da porta (`data-state`):

- `preview_day` (setting) > 0 → `n < preview_day` = `past`, `n == preview_day` =
  `today`, resto = `locked`.
- senão → `today_ts >= unlock_ts` e `n` é o maior nesse caso → `today`;
  `today_ts >= unlock_ts` mas não o maior → `past`; caso contrário `locked`.
- fora de dezembro sem `start_date` e sem `preview_day` → todas `locked`
  (paridade com `computeAdventDay` a devolver 0).

### 8.2 Cliente

`advent-calendar.js`:

- Lê `?day=N` (1–25). Se presente, relaxa o estado no cliente: portas `1..N-1`
  → `past`, `N` → `today`, marca `data-force-day`. (Só afeta o DOM; o HTML
  servido mantém o estado real — progressive enhancement. Alinha com a nota de
  memória "`?day=N` unlocks doors for testing".)
- Aplica localStorage: portas em `past`/`today` que estejam no set → `opened`.

## 9. Persistência

- Chave localStorage: `advent-calendar:opened:{section.id}` (scoped — várias
  instâncias na mesma página não colidem).
- Valor: JSON array de números. Parse defensivo (malformado → vazio).
- Fallback em memória se `localStorage` lançar (paridade com `useOpenedDays`).
- `markOpened(n)` no clique de uma porta abrível; idempotente.

## 10. Schema da section

```jsonc
{
  "name": "Advent calendar",
  "tag": "section",
  "class": "advent-calendar-section",
  "enabled_on": { "templates": ["*"] },
  "settings": [
    { "type": "header", "content": "Content" },
    { "type": "metaobject", "id": "calendar_entry", "label": "Advent calendar",
      "metaobject_type": "advent_calendar" },
    { "type": "text", "id": "calendar_handle", "label": "…or entry handle (fallback)",
      "info": "Usa isto se o seletor acima não aparecer na tua versão do tema." },

    { "type": "header", "content": "Layout" },
    { "type": "range", "id": "grid_columns",        "min": 3, "max": 12, "step": 1, "default": 7,  "label": "Columns (desktop)" },
    { "type": "range", "id": "grid_rows",           "min": 3, "max": 16, "step": 1, "default": 8,  "label": "Rows (desktop)" },
    { "type": "range", "id": "grid_columns_mobile", "min": 2, "max": 8,  "step": 1, "default": 4,  "label": "Columns (mobile)" },
    { "type": "range", "id": "grid_rows_mobile",    "min": 4, "max": 30, "step": 1, "default": 14, "label": "Rows (mobile)" },
    { "type": "range", "id": "grid_gap",            "min": 0, "max": 24, "step": 1, "default": 8,  "unit": "px", "label": "Gap" },
    { "type": "checkbox", "id": "layout_guides", "default": false, "label": "Show layout guides",
      "info": "Desenha a grelha e assinala buracos/sobreposições. Desliga em produção." },

    { "type": "header", "content": "Behaviour" },
    { "type": "range", "id": "preview_day", "min": 0, "max": 25, "step": 1, "default": 0,
      "label": "Preview day", "info": "0 = usar a data real." },

    { "type": "header", "content": "Style overrides (optional)" },
    { "type": "color", "id": "bg_override",        "label": "Background" },
    { "type": "color", "id": "text_override",      "label": "Text" },
    { "type": "color", "id": "door_override",      "label": "Door" },
    { "type": "color", "id": "door_text_override", "label": "Door text" },
    { "type": "color", "id": "accent_override",    "label": "Accent" }
  ],
  "presets": [{ "name": "Advent calendar" }]
}
```

As cores efetivas: `override da section` → senão `campo do metaobject` → senão
default hard-coded. Injetadas como CSS custom properties no wrapper `.advent`.

## 11. Motifs

`snippets/advent-motif.liquid`: `{% case motif %}` sobre as 10 chaves, cada uma
devolve o SVG inline portado do `Motif.tsx` (mesmos paths). `fill`/`stroke` usam
`currentColor` e variáveis (`--motif-ink`, `--motif-accent`, `--motif-hi`)
definidas a partir de `door_text_color` / `accent_color`. `aria-hidden="true"`,
`focusable="false"`. Chave desconhecida ou vazia → `wreath`.

## 12. Scope de animação

**v1 (incluído):**
- Portas: hover/press em CSS; estado `locked` → shake (`@keyframes`, respeitando
  reduced-motion); entrada da grelha com fade/slide escalonado por CSS.
- Overlay: FLIP a partir do rect da porta clicada via Web Animations API
  (`element.animate`), scrim a fade, scroll lock, focus trap, `Esc`/scrim fecham,
  devolve foco. Conteúdo entra em stagger por CSS (delays incrementais).
- Camada de "halo quente" + `shine` a atravessar a face — CSS barato, ligado.
- `prefers-reduced-motion`: sem FLIP (fade simples), sem shake, sem neve,
  sem shine.

**Stretch (fora do v1):** o blur-in do conteúdo, o leaf-glint, a medalha em
spring com stiffness alto, o glow de wraparound. Reimplementáveis depois em
CSS/WAAPI sem mudar a arquitetura.

## 13. Tabela de layout default (dos 25 dias)

`L×A` = largura×altura em células. Extraído de `advent-calendar-react/src/data/calendar.ts`.

| Dia | Motif | L×A | `grid_area` (desktop) | `grid_area_mobile` |
|---:|---|---|---|---|
| 1 | wreath | 2×2 | `1 / 1 / span 2 / span 2` | `1 / 1 / span 2 / span 2` |
| 2 | star | 1×1 | `5 / 5 / span 1 / span 1` | `13 / 3 / span 1 / span 1` |
| 3 | candycane | 1×2 | `1 / 4 / span 2 / span 1` | `5 / 2 / span 2 / span 1` |
| 4 | gift | 2×2 | `3 / 6 / span 2 / span 2` | `7 / 1 / span 2 / span 2` |
| 5 | candle | 2×1 | `3 / 3 / span 1 / span 2` | `5 / 3 / span 1 / span 2` |
| 6 | snowflake | 2×1 | `5 / 1 / span 1 / span 2` | `6 / 3 / span 1 / span 2` |
| 7 | bauble | 1×1 | `6 / 5 / span 1 / span 1` | `13 / 4 / span 1 / span 1` |
| 8 | gift | 1×1 | `8 / 4 / span 1 / span 1` | `14 / 3 / span 1 / span 1` |
| 9 | candle | 1×2 | `1 / 3 / span 2 / span 1` | `5 / 1 / span 2 / span 1` |
| 10 | candle | 2×1 | `5 / 6 / span 1 / span 2` | `9 / 3 / span 1 / span 2` |
| 11 | bell | 2×1 | `6 / 3 / span 1 / span 2` | `10 / 3 / span 1 / span 2` |
| 12 | star | 1×2 | `1 / 5 / span 2 / span 1` | `9 / 1 / span 2 / span 1` |
| 13 | bauble | 2×2 | `6 / 1 / span 2 / span 2` | `1 / 3 / span 2 / span 2` |
| 14 | snowflake | 1×2 | `7 / 3 / span 2 / span 1` | `11 / 2 / span 2 / span 1` |
| 15 | bauble | 1×1 | `8 / 5 / span 1 / span 1` | `14 / 4 / span 1 / span 1` |
| 16 | tree | 2×2 | `1 / 6 / span 2 / span 2` | `3 / 1 / span 2 / span 2` |
| 17 | stocking | 2×1 | `6 / 6 / span 1 / span 2` | `11 / 3 / span 1 / span 2` |
| 18 | tree | 1×1 | `3 / 5 / span 1 / span 1` | `14 / 1 / span 1 / span 1` |
| 19 | bell | 1×1 | `4 / 5 / span 1 / span 1` | `14 / 2 / span 1 / span 1` |
| 20 | stocking | 2×1 | `8 / 1 / span 1 / span 2` | `12 / 3 / span 1 / span 2` |
| 21 | snowflake | 2×2 | `7 / 6 / span 2 / span 2` | `7 / 3 / span 2 / span 2` |
| 22 | gift | 1×2 | `3 / 1 / span 2 / span 1` | `9 / 2 / span 2 / span 1` |
| 23 | bell | 2×1 | `7 / 4 / span 1 / span 2` | `13 / 1 / span 1 / span 2` |
| 24 | candle | 1×2 | `3 / 2 / span 2 / span 1` | `11 / 1 / span 2 / span 1` |
| 25 | tree | 2×2 | `4 / 3 / span 2 / span 2` | `3 / 3 / span 2 / span 2` |

## 14. Entrega dos metaobjects

Quatro artefactos complementares:

1. **`metaobjects/*.definition.json`** — schema legível, fonte de verdade do
   design. Forma própria (não é payload GraphQL direto); os scripts transformam.
2. **`scripts/create-definitions.mjs`** — Node ≥18, `fetch` nativo, sem deps.
   Lê env `SHOPIFY_STORE` (`x.myshopify.com`) e `SHOPIFY_ADMIN_TOKEN`. Corre
   `metaobjectDefinitionCreate` para `advent_calendar_day`, captura o ID, depois
   para `advent_calendar` resolvendo `@ref:advent_calendar_day`. Apanha erro
   `TAKEN` e faz skip (idempotente).
3. **`scripts/seed-entries.mjs`** — lê `seed/days/*.json`, `metaobjectUpsert`
   (por handle `advent-day-01`…) para os 25, depois `metaobjectUpsert` da
   entrada-pai `advent-calendar-default` com `days` a referenciar os GIDs.
4. **`docs/INTEGRATION.md`** — caminho 100% manual em alternativa aos scripts.

`scripts/package.json`: `{ "type": "module", "private": true }`. API version
alvo: `2025-01` (a confirmar na instalação).

## 15. Estrutura do INTEGRATION.md

1. Pré-requisitos (permissões de staff: *Custom data*; ou app com scope
   `write_metaobject_definitions`, `write_metaobjects` para os scripts).
2. Criar a definição `advent_calendar_day` no Admin — tabela de campos §5.1 com
   *field type* e validações, passo a passo.
3. Criar a definição `advent_calendar` — tabela §5.2, incl. ligar `days` à
   definição de dias.
4. Ligar *Storefront access* nas duas definições.
5. Criar as 25 entradas de dia (tabela de conteúdo exemplo do React) + a
   entrada-pai; preencher `days` pela ordem 1→25.
6. Alternativa por script: `.env`, `npm run create-defs`, `npm run seed`.
7. Adicionar a section: *Theme → Customize → Add section → Advent calendar*;
   escolher a entrada `advent_calendar` no setting; publicar.
8. Layout: sintaxe do `grid_area`, diagrama da grelha 7×8, tabela §13,
   regra das 56 células, uso do `layout_guides`, `preview_day` e `?day=N`.
9. Cores: precedência override→metaobject→default; nota de contraste/AA.
10. Checklist de QA (§16). Theme Check.
11. Limitações conhecidas (§17).

## 16. QA manual

- `preview_day` 1..25 percorre os estados; `0` volta ao real.
- `?day=13` fora de dezembro destranca 1–13 no cliente.
- Abrir uma porta: overlay anima do sítio da porta, foco vai para "Fechar",
  `Tab` fica preso, `Esc` e clique no scrim fecham, foco volta à porta.
- Reabrir depois de recarregar: porta continua `opened` (localStorage).
- `show_snow` off → sem neve. `prefers-reduced-motion` → sem neve/shake/FLIP.
- `layout_guides` on com um `grid_area` inválido (sobreposição e buraco) →
  ambos assinalados; chip mostra a contagem.
- Duas instâncias da section na mesma página não partilham estado.
- Sem imagem / sem `code` / sem `link_label` → overlay degrada sem buracos.
- `rich_text` com bold/lista/link renderiza como HTML.
- Mobile ≤700px usa a grelha 4×14.
- Theme Check sem erros.

## 17. Riscos e questões em aberto

- **Setting `type: "metaobject"`** — GA desde 2024 mas depende da versão do
  tema/Shopify. Mitigação: setting `calendar_handle` de texto + leitura via
  `shop.metaobjects['advent_calendar'][handle]`.
- **Render de `rich_text_field` de metaobject em Liquid** — `{{ field.value }}`
  devolve HTML; confirmar na instalação, com fallback `| metafield_tag`.
- **`file_reference` de imagem** — pode vir como `MediaImage` ou `GenericFile`;
  guardar com `{% if entry.image %}` e testar `image_url`.
- **Math de datas em Liquid** para o default de dezembro entre timezones —
  granularidade de dia torna-o tolerante; validar na loja alvo.
- **Mudar dimensões da grelha** parte a tessellation dos defaults — o preview
  avisa, não impede; documentado.
- **HTML inicial mostra estado real** antes do JS aplicar `?day=N` — flash
  aceitável (progressive enhancement).
- **App Store / multi-loja** — fora do scope; migração para app block é um
  redesign à parte.

## 18. Componentes e fronteiras

| Unidade | Faz | Depende de |
|---|---|---|
| `sections/advent-calendar.liquid` | lê metaobject (por setting ou handle), resolve cores, itera `days` ordenados por `day`, injeta CSS vars e config `data-*` para o JS | snippets abaixo, schema |
| `snippets/advent-door.liquid` | resolve `grid_area`(+mobile), calcula `data-state`, renderiza face/número/motif/badge | `advent-grid-defaults`, `advent-motif` |
| `snippets/advent-grid-defaults.liquid` | `case day` × `mode` → string `grid-area` | — |
| `snippets/advent-motif.liquid` | `case motif` → SVG inline | — |
| `snippets/advent-overlay.liquid` | markup server-render (hidden) do conteúdo de cada dia | `advent-motif` |
| `snippets/advent-snow.liquid` | camada de neve CSS | — |
| `assets/advent-calendar.js` | localStorage, `?day=N`, abrir/fechar overlay + FLIP + focus trap, guias de layout, re-init em eventos do editor | `data-*` da section, `<template>` do overlay |
| `assets/advent-calendar.css` | grelha, portas, overlay, neve, guias, reduced-motion | CSS vars da section |
| `scripts/create-definitions.mjs` | cria as 2 definições via Admin GraphQL | env, `*.definition.json` |
| `scripts/seed-entries.mjs` | cria/upserta as 26 entradas | env, `seed/**` |
