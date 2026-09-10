# Advent Calendar — Integration guide

How to install this section into a Shopify store: create the two metaobject
definitions, add the 25 day entries + the parent entry, wire up the section, and
use the layout tools.

Two paths are described:

- **By hand** in the Admin — sections 2–5.
- **By script** — section 6 (`npm run create-defs && npm run seed`).

Either way, then do sections 7–9 and run the QA checklist (section 10).

---

## 1. Prerequisites

**To do it by hand (Admin UI):**

- A staff account with access to **Settings → Custom data** (to create and edit
  metaobject definitions and entries). On plans/roles where this is gated, ask
  the store owner to grant the *Custom data* permission.

**To use the provisioning scripts (`scripts/`):**

- **Node ≥ 18** (the scripts use native `fetch`, no dependencies).
- A **custom app** in the store (Settings → Apps and sales channels → *Develop
  apps* → Create an app) with these Admin API access scopes:
  - `write_metaobject_definitions`
  - `write_metaobjects`
  - `read_metaobjects`
- Install that app and copy its **Admin API access token** (`shpat_…`).
- The scripts target Admin API version **2025-01**.

**To add the section to a theme:**

- Access to **Online Store → Themes → Customize** for the target theme.

Both metaobject definitions are created with:

- **Storefront access = `PUBLIC_READ`** (so Liquid can read them — see section 4).
- **Publishable entries enabled** (entries can be draft or active).

---

## 2. Create definition `advent_calendar_day` by hand

**Settings → Custom data → Metaobjects → Add definition.**

- **Name:** `Advent Calendar Day`
- **Type (handle):** `advent_calendar_day` (Admin derives this from the name;
  confirm it is exactly `advent_calendar_day`).

Add the fields below (Add field → pick the type → set the key and validations).
The key must match exactly — Liquid reads `entry.<key>`.

| Field key | Name | Admin field type | Required | Validations |
|---|---|---|---|---|
| `day` | Day | Integer | **Yes** | Minimum value `1`, Maximum value `25` |
| `title` | Title | Single line text | **Yes** | — |
| `message` | Message | Rich text | **Yes** | — |
| `code` | Reward code | Single line text | No | — |
| `motif` | Motif | Single line text | No | **Limit to preset choices** (list below) |
| `image` | Image | File | No | Accepted file types: **Image** only |
| `link_url` | Link URL | URL | No | — |
| `link_label` | Link label | Single line text | No | — |
| `grid_area` | Grid area (desktop) | Single line text | No | — |
| `grid_area_mobile` | Grid area (mobile) | Single line text | No | — |

**`motif` preset choices** — add these ten values, exactly, in this order:

```
wreath
candle
star
gift
tree
bell
snowflake
stocking
bauble
candycane
```

An empty or unrecognised `motif` falls back to `wreath` at render time.

**Options for this definition:**

- Set **"Entries will appear in search results and can be referenced"** as needed,
  but crucially: under **Storefront access**, enable Web (see section 4).
- The entry's display name uses the `title` field.

There is deliberately **no `size` field** — the door's size is the two `span`
values inside `grid_area` (one source of truth).

---

## 3. Create definition `advent_calendar` by hand

**Settings → Custom data → Metaobjects → Add definition.**

- **Name:** `Advent Calendar`
- **Type (handle):** `advent_calendar`

| Field key | Name | Admin field type | Required | Notes |
|---|---|---|---|---|
| `heading` | Heading | Single line text | **Yes** | e.g. "Calendário do Advento" |
| `subheading` | Subheading | Single line text | No | e.g. "Abre uma porta por dia até ao Natal" |
| `background_color` | Background color | Color | No | Section background. Default if empty: `#1c1613` |
| `text_color` | Text color | Color | No | General text. Default: `#f6ede0` |
| `door_color` | Door color | Color | No | Door face. Default: `#2a3d35` |
| `door_text_color` | Door text color | Color | No | Number / icon. Default: `#cfe3d4` |
| `accent_color` | Accent color | Color | No | "Today" glow, medal, shine. Default: `#c9a24b` |
| `show_snow` | Show snow | True / false (boolean) | No | Default: `true` |
| `start_date` | Start date | Date | No | Door `N` opens on `start_date + (N-1)` days. Empty → day `N` of December in the current year. |
| `days` | Days | Metaobject list | **Yes** | Type: **Metaobject** (list), pointing at **Advent Calendar Day** |

For the **`days`** field:

1. Add field → choose **Metaobject** as the type.
2. Turn on **"List of entries"** (multiple values).
3. Under the reference validation, select the **Advent Calendar Day** definition.

The display name for a calendar entry uses the `heading` field.

The `days` list is the fallback ordering only — the true order is each day's
`day` number, which the section sorts on.

---

## 4. Turn on Storefront access (Web) for both definitions

For each definition (`advent_calendar_day` and `advent_calendar`):

1. Open the definition in **Settings → Custom data → Metaobjects**.
2. In the definition's options, find **Storefront access** (a.k.a. "Access" →
   "Storefronts").
3. Enable **Web** — this is what makes `shop.metaobjects.advent_calendar…`
   readable from Liquid. Internally this is `access.storefront = PUBLIC_READ`.

Without this, the section renders nothing (the metaobject reads back blank).

---

## 5. Create the 25 day entries + the parent

### 5.1 The 25 day entries

**Settings → Custom data → Metaobjects → Advent Calendar Day → Add entry**, once
per day. Set `day` to the number, then fill the rest from the table below
(content ported from `advent-calendar-react/src/data/calendar.ts`). Set each
entry's status to **Active** (not draft).

Leave `grid_area` / `grid_area_mobile` **empty** to use the built-in default
layout (section 8). Only fill them to override a specific door.

| Day | Motif | Title | Code | Message |
|---:|---|---|---|---|
| 1 | wreath | Bem-vindo ao Advento | — | Vinte e cinco dias, vinte e cinco pequenas surpresas. Volta amanhã para abrir a porta seguinte. |
| 2 | star | Uma citação para hoje | — | "O maior presente que podes dar a alguém é o teu tempo." Oferece um bocadinho do teu hoje. |
| 3 | candycane | Playlist de Inverno | ADVENTO-03 | Usa o código como nome de uma playlist partilhada e adiciona a primeira música. |
| 4 | gift | Gesto simples | — | Manda mensagem a alguém com quem não falas há algum tempo. |
| 5 | candle | Receita rápida | COZINHA-05 | Chocolate quente: leite, cacau, um quadrado de chocolate negro e uma pitada de canela. |
| 6 | snowflake | Pausa de dez minutos | — | Fecha os olhos e respira fundo dez vezes. É a tua porta de hoje. |
| 7 | bauble | Desafio de gratidão | — | Escreve três coisas boas que te aconteceram esta semana. |
| 8 | gift | Código secreto | ADVENTO-08 | Copia o código e guarda-o. No dia 25 vais precisar dele. |
| 9 | candle | Luz das velas | — | Acende uma vela ao jantar hoje. Muda tudo. |
| 10 | candle | Maratona de leitura | LEITURA-10 | Escolhe um livro curto e lê-o até ao fim do mês. |
| 11 | bell | Chamada surpresa | — | Liga a um avô, a uma avó, ou a quem faça esse papel na tua vida. |
| 12 | star | Estrela de papel | ADVENTO-12 | Procura "estrela de papel 3D" e faz uma para o topo da árvore. |
| 13 | bauble | Dia de doçura | — | Prova um doce de Natal que nunca tenhas experimentado. |
| 14 | snowflake | Carta ao futuro | — | Escreve uma nota para leres no dia 1 de janeiro. |
| 15 | bauble | Metade do caminho | ADVENTO-15 | Já abriste quinze portas. Copia o código e celebra com quem estás. |
| 16 | tree | Caminhada ao frio | — | Vinte minutos lá fora, mesmo que esteja cinzento. |
| 17 | stocking | Cinema em casa | FILME-17 | Clássico de Natal, luzes apagadas, telemóvel na outra sala. |
| 18 | tree | Arruma um cantinho | — | Escolhe uma gaveta e deixa-a melhor do que estava. |
| 19 | bell | Elogio anónimo | — | Deixa um elogio sincero a alguém, sem assinar. |
| 20 | stocking | Conta uma história | ADVENTO-20 | Pergunta a alguém mais velho como era o Natal quando tinha a tua idade. |
| 21 | snowflake | Solstício de Inverno | — | A noite mais longa do ano. A partir de amanhã os dias voltam a crescer. |
| 22 | gift | Embrulha à mão | PRENDA-22 | Um presente, papel simples, fio de cozinha e um raminho verde. |
| 23 | bell | Mesa posta | — | Ajuda a preparar a mesa da consoada, nem que seja só a dobrar guardanapos. |
| 24 | candle | Véspera | ADVENTO-24 | Última porta antes do Natal. Copia o código e respira: chegaste. |
| 25 | tree | Feliz Natal | ADVENTO-08-12-15-20-24 | Juntaste os códigos secretos. Aqui fica o teu prémio: um dia inteiro sem pressa nenhuma. |

`message` is a rich-text field. By hand, just type the text straight into the
Admin rich-text editor — plain paragraphs are fine; bold / lists / links render
as HTML in the overlay. (The rich-text AST JSON format is only relevant to
`npm run seed`, which builds it for you from the plain text in the seed files.)

### 5.2 The parent entry

**Settings → Custom data → Metaobjects → Advent Calendar → Add entry.**

- Fill `heading` (required) and any of `subheading`, the colour fields,
  `show_snow`, `start_date`.
- In **`days`**, add all 25 day entries **in order 1 → 25**.
- Set status to **Active**.

This is the entry you pick in the section settings (section 7).

---

## 6. Script alternative

From `shopify-advent-calendar/` (Node ≥ 18):

```sh
cp scripts/.env.example scripts/.env
# edit scripts/.env:
#   SHOPIFY_STORE=your-store.myshopify.com
#   SHOPIFY_ADMIN_TOKEN=shpat_...      (from the custom app, section 1)

npm run create-defs   # creates advent_calendar_day, then advent_calendar
npm run seed          # upserts the 25 day entries + the parent entry
```

Notes:

- `create-definitions.mjs` creates `advent_calendar_day` first, captures its ID,
  and injects it into the `days` reference validation on `advent_calendar`
  (the `.definition.json` carries the placeholder `@ref:advent_calendar_day`).
- Both scripts are **idempotent** — if a definition already exists it is skipped;
  entries are upserted by handle (`advent-day-01` … `advent-day-25`, and
  `advent-calendar-default` for the parent).
- You still need to do sections 4 (storefront access is set by the definition
  JSON, but verify it) and 7 (add the section, pick the entry).
- Admin API version: **2025-01** (adjust in `scripts/lib/admin.mjs` if your
  store needs a different version).

---

## 7. Add the section

1. **Online Store → Themes → Customize** on the target theme.
2. On a template (or the theme footer/any area that accepts sections), **Add
   section → "Advent calendar"**.
3. In the section settings, under **Content**, set **Advent calendar** to the
   parent entry you created (the `advent_calendar` entry).
   - If your theme version does not show the metaobject picker, use the
     **"…or entry handle (fallback)"** text field instead and type the entry's
     handle (e.g. `advent-calendar-default`). See section 11.
4. **Save.**

---

## 8. Layout

### 8.1 `grid_area` syntax

Each door is placed with a CSS `grid-area` string:

```
"<row> / <col> / span <height> / span <width>"
```

- `row`, `col` — 1-based start position (row 1 / column 1 is top-left).
- `span <height>` — how many rows tall.
- `span <width>` — how many columns wide.

Example: `1 / 5 / span 2 / span 1` → starts at row 1, column 5, is 2 rows tall
and 1 column wide (a `1×2` door — width × height).

Resolution per door: if the day entry's `grid_area` is filled it is used
verbatim; otherwise the built-in default for that day number is used. Same for
`grid_area_mobile`. Override is **all-or-nothing per door** — set the whole
string or leave it blank.

### 8.2 The desktop grid (7 × 8)

Default desktop grid: **7 columns × 8 rows = 56 cells**. The 25 default doors
tile it with no gaps and no overlaps (the sum of the door footprints is 56):

```
        c1   c2   c3   c4   c5   c6   c7
 r1   [  1    1    9    3   12   16   16  ]
 r2   [  1    1    9    3   12   16   16  ]
 r3   [ 22   24    5    5   18    4    4  ]
 r4   [ 22   24   25   25   19    4    4  ]
 r5   [  6    6   25   25    2   10   10  ]
 r6   [ 13   13   11   11    7   17   17  ]
 r7   [ 13   13   14   23   23   21   21  ]
 r8   [ 20   20   14    8   15   21   21  ]
```

Mobile (≤ 700px) default grid: **4 columns × 14 rows = 56 cells**.

### 8.3 The 56-cell / no-overlap rule

For the mosaic to "close" with no holes and no overlaps:

> sum of all door footprints (height × width) = columns × rows

25 doors = 56 cells in a 7 × 8 desktop grid, and 56 cells in a 4 × 14 mobile
grid.

Holes and overlaps **do not block rendering** — the section still draws, just
with visual gaps or stacked doors. The layout guides (below) flag them.

If you change the grid dimensions in the section settings you must re-balance
the whole layout. Safest approach: keep 7 × 8 and only swap positions between
doors of the **same size**.

### 8.4 Default layout table (all 25 days)

`W×H` = width × height in cells. Source: `advent-calendar-react/src/data/calendar.ts`.

| Day | Motif | W×H | `grid_area` (desktop) | `grid_area_mobile` |
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

### 8.5 Tools for checking the layout

**Show layout guides** (section setting `layout_guides`, checkbox, default off):
in the theme editor preview, turns on an overlay that draws the grid cell lines,
labels each door with its resolved `grid-area` and size, and:

- outlines cells covered **0×** (holes) with a dashed amber border;
- fills cells covered **more than once** (overlaps) in red and outlines the
  conflicting doors in red;
- shows a fixed summary chip: `✅ 56/56 cells · 0 overlaps`, or the error counts.

It re-runs on `shopify:section:load` and on window resize (so it also validates
the mobile grid). **Turn it off in production.**

**Preview day** (section setting `preview_day`, range 0–25, default 0): forces
the "current day". `1..25` walks the doors through locked → today → past; `0`
returns to the real date gate.

**`?day=N`** (URL query param, 1–25): a client-side override for testing outside
December. With `?day=13`, doors `1..12` become `past` and door `13` becomes
`today` in the browser only — the server-rendered HTML keeps the real state
(progressive enhancement), so there is a brief flash of the real state before
the JS applies the override.

Editing a metaobject entry does **not** hot-reload the theme editor (it is a
different Admin screen). Workflow: edit `grid_area` → return to Customize →
refresh the preview → read the guides. Section settings (dimensions,
`layout_guides`, mirrored colours, `preview_day`) hot-reload normally.

---

## 9. Colours

Five colour roles: **background, text, door, door text, accent**. Each is
resolved with this precedence:

1. **Section style override** (the *Style overrides (optional)* settings on the
   section) — if set, wins.
2. else the **metaobject field** on the `advent_calendar` entry
   (`background_color`, `text_color`, `door_color`, `door_text_color`,
   `accent_color`).
3. else a **hard-coded default**:

   | Role | Default |
   |---|---|
   | Background | `#1c1613` |
   | Text | `#f6ede0` |
   | Door | `#2a3d35` |
   | Door text | `#cfe3d4` |
   | Accent | `#c9a24b` |

The effective values are injected as CSS custom properties on the section
wrapper.

**Contrast:** check that **text on background** and **door text on door** meet
**WCAG AA** (4.5:1 for body text, 3:1 for large text and UI). The defaults pass;
if you change colours, re-check with a contrast checker. The accent colour is
used for glows and highlights — keep it distinguishable from both the door and
the background.

---

## 10. QA checklist (run against `shopify theme dev`)
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

Steps that need a running store (`shopify theme dev` + provisioned metaobjects)
are for the operator to perform after install — there are no store credentials
in the build environment. `npm test` and `npm run check` run offline and gate
the code contract.

---

## 11. Known limitations

- **`metaobject` section setting availability.** The `type: "metaobject"` setting
  ("Advent calendar" picker) is GA but depends on the theme/Shopify version. If
  the picker does not appear, use the **"…or entry handle (fallback)"** text
  setting (`calendar_handle`) and type the entry handle; the section then reads
  it via `shop.metaobjects['advent_calendar'][handle]`.
- **Editing a metaobject needs a manual preview refresh.** Metaobject edits are a
  separate Admin screen and do not hot-reload the theme editor. Edit → go back to
  Customize → refresh the preview.
- **Changing the grid dimensions can break the tiling.** The default layout is
  balanced for 7 × 8 desktop / 4 × 14 mobile. Changing columns/rows in the
  settings leaves holes or overlaps until you re-balance every door. The layout
  guides warn; they do not prevent it.
- **Brief real-state flash before `?day=N` applies.** The server renders the real
  date gate; the `?day=N` override is client-side, so there is a short flash of
  the real state on load. Acceptable progressive enhancement.
- **The image uses `image_tag`.** The `image` field must point at a real image
  file (a `MediaImage`); a missing or non-image reference simply renders no
  image.
- **`npm run seed` rich-text format.** The seed script wraps each day's plain-text
  `message` in the documented Shopify rich-text AST schema
  (`root` → `paragraph` → `text`). Confirm it against a dev store on the first run.
- **`localStorage` is per-browser.** Opened doors are remembered per browser
  (key `advent-calendar:opened:{section.id}`), not per logged-in customer — no
  cross-device sync. If `localStorage` throws, an in-memory fallback is used for
  the session.
