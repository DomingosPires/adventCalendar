# Advent Calendar (React) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the 2022 jQuery advent calendar as a self-contained Vite + React + TypeScript SPA — same irregular tile grid and falling snow, modern CSS animations, opened-days persistence, accessibility, and an enforced ≥ 95 % test-coverage gate.

**Architecture:** A single-page React app organised by the Atomic Design pattern (`atoms → molecules → organisms → templates → pages`) under `src/components/`, with cross-cutting `hooks/`, `lib/`, `data/`, `styles/`, `assets/`. Pure logic (date→state, clipboard) lives in `lib/` and is unit-tested in isolation; hooks wrap `localStorage` and the current date; components are presentational and receive data + callbacks from a single `pages/CalendarPage`. Door state (`locked | today | past | opened`) is derived, never stored beyond the set of opened day numbers.

**Tech Stack:** Vite 5, React 18, TypeScript 5 (strict), Vitest 2 + React Testing Library + jsdom, `@vitest/coverage-v8`, ESLint 8 with `eslint-plugin-import` path zones, CSS Modules (no CSS framework), GitHub Actions CI.

**Spec:** `docs/superpowers/specs/2026-09-08-advent-calendar-react-design.md` — read it alongside this plan.

## Global Constraints

Every task's requirements implicitly include this section.

- **New project root:** `advent-calendar-react/` at the repository root. The old `adventCalendar/` folder is never modified.
- **Runtime dependencies:** only `react` and `react-dom`. No other runtime deps (no jQuery, zoomooz, Bootstrap, snowstorm, animation libs).
- **Pinned versions** (exact, in `package.json`; `npm install` may bump patch only):
  - `react` `18.3.1`, `react-dom` `18.3.1`
  - dev: `vite` `5.4.10`, `@vitejs/plugin-react` `4.3.3`, `typescript` `5.6.3`, `vitest` `2.1.5`, `@vitest/coverage-v8` `2.1.5`, `jsdom` `25.0.1`, `@testing-library/react` `16.0.1`, `@testing-library/dom` `10.4.0`, `@testing-library/jest-dom` `6.6.3`, `@testing-library/user-event` `14.5.2`, `eslint` `8.57.1`, `@typescript-eslint/parser` `8.13.0`, `@typescript-eslint/eslint-plugin` `8.13.0`, `eslint-plugin-import` `2.31.0`, `eslint-import-resolver-typescript` `3.6.3`, `eslint-plugin-react-hooks` `4.6.2`
- **Node:** 20 LTS (CI uses `actions/setup-node@v4` with `node-version: 20`).
- **Atomic import rule (one-way):** a component imports components only from strictly lower layers — atoms→(none), molecules→atoms, organisms→molecules+atoms, templates→organisms+molecules+atoms, pages→all lower. `hooks/ lib/ data/ styles/ assets/` are cross-cutting and importable anywhere. Enforced by `import/no-restricted-paths` (Task 1); a violation fails `npm run lint` and CI.
- **Coverage gate:** `vitest run --coverage` fails if `statements`, `branches`, `functions`, or `lines` < 95. Enforced from Task 3 onward (Task 1 config, Task 2 data is coverage-excluded). Every task from Task 3 on ends green on `npm run test:coverage`.
- **Component folder shape:** `src/components/<layer>/<Name>/` contains `<Name>.tsx`, `<Name>.module.css`, `<Name>.test.tsx`, `index.ts` (re-export only: `export * from './<Name>';`).
- **Copy language:** all user-facing text is Portuguese (pt-PT).
- **Day count:** fixed at 25.
- **Commit messages:** Conventional Commits (`feat:`, `test:`, `chore:`, `ci:`, `docs:`). Every commit message ends with these two trailer lines (omitted from the snippets below for brevity — always append them):

  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01PeVyQKL2dLufr8pYkoeomp
  ```
- **Commits are per task** unless a task says otherwise. Run `git add <listed files>` explicitly; never `git add -A`.

---

## File Structure

```
advent-calendar-react/
  index.html                         # Task 1
  package.json                       # Task 1
  tsconfig.json                      # Task 1
  tsconfig.node.json                 # Task 1
  vite.config.ts                     # Task 1  (Vite + Vitest + coverage config)
  .eslintrc.cjs                      # Task 1
  .gitignore                         # Task 1
  README.md                          # Task 18
  .github/workflows/ci.yml           # Task 1
  src/
    main.tsx                         # Task 1 (placeholder render) → Task 18 (real)
    vite-env.d.ts                    # Task 1
    test/setup.ts                    # Task 1
    styles/theme.css                 # Task 1
    data/calendar.ts                 # Task 2   — types + CALENDAR (25 entries)
    data/calendar.test.ts            # Task 2   — invariants
    lib/dayState.ts                  # Task 3   — getDayState
    lib/dayState.test.ts             # Task 3
    lib/clipboard.ts                 # Task 4   — copyText
    lib/clipboard.test.ts            # Task 4
    hooks/useOpenedDays.ts           # Task 5
    hooks/useOpenedDays.test.ts      # Task 5
    hooks/useAdventDay.ts            # Task 6   — computeAdventDay + hook
    hooks/useAdventDay.test.ts       # Task 6
    components/atoms/Button/         # Task 7
    components/atoms/Badge/          # Task 8
    components/atoms/DoorNumber/     # Task 9
    components/atoms/Snow/           # Task 10
    components/molecules/SiteHeader/ # Task 11
    components/molecules/CopyableCode/ # Task 12
    components/molecules/Door/       # Task 13
    components/organisms/CalendarGrid/ # Task 14
    components/organisms/DayDialog/  # Task 15
    components/templates/CalendarTemplate/ # Task 16
    components/pages/CalendarPage/   # Task 17
    assets/background.png gift1..5.png # Task 18 (copied from old project)
```

---

## Task 1: Project scaffold, tooling, CI

**Files:**
- Create: `advent-calendar-react/package.json`
- Create: `advent-calendar-react/tsconfig.json`, `advent-calendar-react/tsconfig.node.json`
- Create: `advent-calendar-react/vite.config.ts`
- Create: `advent-calendar-react/.eslintrc.cjs`
- Create: `advent-calendar-react/.gitignore`
- Create: `advent-calendar-react/index.html`
- Create: `advent-calendar-react/src/main.tsx`, `advent-calendar-react/src/vite-env.d.ts`
- Create: `advent-calendar-react/src/test/setup.ts`
- Create: `advent-calendar-react/src/styles/theme.css`
- Create: `advent-calendar-react/src/smoke.test.ts`
- Create: `advent-calendar-react/.github/workflows/ci.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: npm scripts `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:run`, `test:coverage`. Vitest globals (`test`, `expect`, `vi`, `describe`, `beforeEach`, `afterEach`) available without import. CSS Modules resolve in tests with `classNameStrategy: 'non-scoped'` (so `styles.foo === 'foo'`). Setup file provides `matchMedia`, a canvas 2D stub, and an `HTMLDialogElement` polyfill.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "advent-calendar-react",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --max-warnings 0",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@testing-library/dom": "10.4.0",
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/react": "16.0.1",
    "@testing-library/user-event": "14.5.2",
    "@types/react": "18.3.12",
    "@types/react-dom": "18.3.1",
    "@typescript-eslint/eslint-plugin": "8.13.0",
    "@typescript-eslint/parser": "8.13.0",
    "@vitejs/plugin-react": "4.3.3",
    "@vitest/coverage-v8": "2.1.5",
    "eslint": "8.57.1",
    "eslint-import-resolver-typescript": "3.6.3",
    "eslint-plugin-import": "2.31.0",
    "eslint-plugin-react-hooks": "4.6.2",
    "jsdom": "25.0.1",
    "typescript": "5.6.3",
    "vite": "5.4.10",
    "vitest": "2.1.5"
  }
}
```

- [ ] **Step 2: Create the config files**

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

`tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts"]
}
```

`vite.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/index.ts',
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/data/**',
      ],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});
```

`.eslintrc.cjs`:

```cjs
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'react-hooks', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ],
  settings: {
    'import/resolver': { typescript: { project: './tsconfig.json' } },
  },
  rules: {
    'import/no-restricted-paths': ['error', {
      zones: [
        { target: './src/components/atoms', from: './src/components', except: ['./atoms'] },
        { target: './src/components/molecules', from: './src/components', except: ['./atoms', './molecules'] },
        { target: './src/components/organisms', from: './src/components', except: ['./atoms', './molecules', './organisms'] },
        { target: './src/components/templates', from: './src/components', except: ['./atoms', './molecules', './organisms', './templates'] },
        { target: './src/components/pages', from: './src/components', except: ['./atoms', './molecules', './organisms', './templates', './pages'] },
      ],
    }],
  },
  ignorePatterns: ['dist', 'coverage', 'vite.config.ts', '.eslintrc.cjs'],
};
```

`.gitignore`:

```
node_modules
dist
coverage
*.local
.DS_Store
```

- [ ] **Step 3: Create app entry, env types, theme, and test setup**

`index.html`:

```html
<!doctype html>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Calendário do Advento</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />
```

`src/main.tsx` (placeholder — replaced in Task 18):

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <p>Calendário do Advento</p>
  </StrictMode>,
);
```

`src/styles/theme.css`:

```css
:root {
  color-scheme: light;
  --bg-page: #1a0d0b;
  --color-red: #b42f25;
  --color-red-dark: #7d2019;
  --color-cream: #f6ede0;
  --color-white: #ffffff;
  --color-ink: #2b1a17;
  --door-border: 2px dashed rgba(255, 255, 255, 0.8);
  --radius: 8px;
  --shadow-door: 0 6px 18px rgba(0, 0, 0, 0.35);
  --font-display: "Avenir Next", "Segoe UI", system-ui, sans-serif;
  --font-body: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 40px;
  --glow-today: 0 0 0 3px rgba(255, 255, 255, 0.9), 0 0 24px 4px rgba(255, 216, 122, 0.75);
}

* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg-page);
  color: var(--color-cream);
  font-family: var(--font-body);
}
```

`src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = (() => ({
    clearRect: () => {},
    fillRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    setTransform: () => {},
    save: () => {},
    restore: () => {},
    fillStyle: '',
  })) as unknown as HTMLCanvasElement['getContext'];
}

if (
  typeof HTMLDialogElement !== 'undefined' &&
  !HTMLDialogElement.prototype.showModal
) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, returnValue?: string) {
    this.open = false;
    this.removeAttribute('open');
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.dispatchEvent(new Event('close'));
  };
}
```

`src/smoke.test.ts`:

```ts
test('tooling runs', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 4: Create the CI workflow**

`.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
jobs:
  verify:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: advent-calendar-react
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: advent-calendar-react/package-lock.json
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:coverage
      - run: npm run build
```

- [ ] **Step 5: Install and verify**

Run (from `advent-calendar-react/`):

```bash
npm install
npm run lint
npm run typecheck
npm run test:run
npm run build
```

Expected: `npm install` writes `package-lock.json`; `lint` passes (no files to flag); `typecheck` passes; `test:run` shows `1 passed`; `build` writes `dist/index.html`.
Note: `npm run test:coverage` is expected to FAIL the threshold here (no covered code yet). That is fine until Task 3; do not run it as an acceptance check for this task.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/package.json advent-calendar-react/package-lock.json \
  advent-calendar-react/tsconfig.json advent-calendar-react/tsconfig.node.json \
  advent-calendar-react/vite.config.ts advent-calendar-react/.eslintrc.cjs \
  advent-calendar-react/.gitignore advent-calendar-react/index.html \
  advent-calendar-react/src/main.tsx advent-calendar-react/src/vite-env.d.ts \
  advent-calendar-react/src/test/setup.ts advent-calendar-react/src/styles/theme.css \
  advent-calendar-react/src/smoke.test.ts advent-calendar-react/.github/workflows/ci.yml
git commit -m "chore: scaffold Vite + React + TS project with Vitest coverage gate and CI"
```

---

## Task 2: Calendar data model + content

**Files:**
- Create: `advent-calendar-react/src/data/calendar.ts`
- Test: `advent-calendar-react/src/data/calendar.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type DoorSize = '1x1' | '1x2' | '2x1' | '2x2'`
  - `type GiftImage = 'gift1' | 'gift2' | 'gift3' | 'gift4' | 'gift5'`
  - `interface CalendarDay { day: number; title: string; message: string; code?: string; image: GiftImage; size: DoorSize; gridArea: string; gridAreaMobile: string; }`
  - `const CALENDAR: CalendarDay[]` — length 25, `day` values 1..25.

- [ ] **Step 1: Write the failing test**

`src/data/calendar.test.ts`:

```ts
import { CALENDAR, type GiftImage } from './calendar';

const IMAGES: GiftImage[] = ['gift1', 'gift2', 'gift3', 'gift4', 'gift5'];

test('has exactly 25 entries', () => {
  expect(CALENDAR).toHaveLength(25);
});

test('day values are the unique set 1..25', () => {
  const days = CALENDAR.map((d) => d.day).sort((a, b) => a - b);
  expect(days).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
});

test('every entry has a known image and non-empty grid areas', () => {
  for (const d of CALENDAR) {
    expect(IMAGES).toContain(d.image);
    expect(d.gridArea.trim().length).toBeGreaterThan(0);
    expect(d.gridAreaMobile.trim().length).toBeGreaterThan(0);
    expect(d.title.trim().length).toBeGreaterThan(0);
    expect(d.message.trim().length).toBeGreaterThan(0);
  }
});

test('every size is one of the four allowed values', () => {
  for (const d of CALENDAR) {
    expect(['1x1', '1x2', '2x1', '2x2']).toContain(d.size);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/data/calendar.test.ts`
Expected: FAIL — cannot resolve `./calendar`.

- [ ] **Step 3: Write the data module**

`src/data/calendar.ts`:

```ts
export type DoorSize = '1x1' | '1x2' | '2x1' | '2x2';
export type GiftImage = 'gift1' | 'gift2' | 'gift3' | 'gift4' | 'gift5';

export interface CalendarDay {
  day: number;
  title: string;
  message: string;
  code?: string;
  image: GiftImage;
  size: DoorSize;
  gridArea: string;
  gridAreaMobile: string;
}

export const CALENDAR: CalendarDay[] = [
  { day: 1, title: 'Bem-vindo ao Advento', message: 'Vinte e cinco dias, vinte e cinco pequenas surpresas. Volta amanhã para abrir a porta seguinte.', image: 'gift1', size: '2x2', gridArea: '1 / 1 / span 2 / span 2', gridAreaMobile: '1 / 1 / span 2 / span 2' },
  { day: 2, title: 'Uma citação para hoje', message: '"O maior presente que podes dar a alguém é o teu tempo." Oferece um bocadinho do teu hoje.', image: 'gift2', size: '1x1', gridArea: '6 / 2 / span 1 / span 1', gridAreaMobile: '6 / 1 / span 2 / span 2' },
  { day: 3, title: 'Playlist de Inverno', code: 'ADVENTO-03', message: 'Usa o código como nome de uma playlist partilhada e adiciona a primeira música.', image: 'gift2', size: '2x2', gridArea: '8 / 2 / span 2 / span 2', gridAreaMobile: '8 / 4 / span 2 / span 2' },
  { day: 4, title: 'Gesto simples', message: 'Manda mensagem a alguém com quem não falas há algum tempo.', image: 'gift3', size: '2x2', gridArea: '5 / 6 / span 2 / span 2', gridAreaMobile: '11 / 1 / span 2 / span 2' },
  { day: 5, title: 'Receita rápida', code: 'COZINHA-05', message: 'Chocolate quente: leite, cacau, um quadrado de chocolate negro e uma pitada de canela.', image: 'gift5', size: '2x1', gridArea: '2 / 3 / span 2 / span 1', gridAreaMobile: '2 / 3 / span 2 / span 1' },
  { day: 6, title: 'Pausa de dez minutos', message: 'Fecha os olhos e respira fundo dez vezes. É a tua porta de hoje.', image: 'gift4', size: '1x2', gridArea: '4 / 2 / span 1 / span 2', gridAreaMobile: '4 / 2 / span 1 / span 2' },
  { day: 7, title: 'Desafio de gratidão', message: 'Escreve três coisas boas que te aconteceram esta semana.', image: 'gift5', size: '1x1', gridArea: '4 / 1 / span 1 / span 1', gridAreaMobile: '4 / 1 / span 1 / span 1' },
  { day: 8, title: 'Código secreto', code: 'ADVENTO-08', message: 'Copia o código e guarda-o. No dia 25 vais precisar dele.', image: 'gift2', size: '1x1', gridArea: '3 / 6 / span 1 / span 2', gridAreaMobile: '9 / 1 / span 1 / span 2' },
  { day: 9, title: 'Luz das velas', message: 'Acende uma vela ao jantar hoje. Muda tudo.', image: 'gift2', size: '1x2', gridArea: '1 / 3 / span 1 / span 2', gridAreaMobile: '1 / 3 / span 1 / span 2' },
  { day: 10, title: 'Maratona de leitura', code: 'LEITURA-10', message: 'Escolhe um livro curto e lê-o até ao fim do mês.', image: 'gift5', size: '2x1', gridArea: '8 / 1 / span 2 / span 1', gridAreaMobile: '12 / 4 / span 1 / span 2' },
  { day: 11, title: 'Chamada surpresa', message: 'Liga a um avô, a uma avó, ou a quem faça esse papel na tua vida.', image: 'gift2', size: '2x1', gridArea: '7 / 6 / span 2 / span 1', gridAreaMobile: '8 / 3 / span 2 / span 1' },
  { day: 12, title: 'Estrela de papel', code: 'ADVENTO-12', message: 'Procura "estrela de papel 3D" e faz uma para o topo da árvore.', image: 'gift5', size: '1x2', gridArea: '6 / 4 / span 1 / span 2', gridAreaMobile: '6 / 4 / span 1 / span 2' },
  { day: 13, title: 'Dia de doçura', message: 'Prova um doce de Natal que nunca tenhas experimentado.', image: 'gift3', size: '1x2', gridArea: '1 / 6 / span 2 / span 2', gridAreaMobile: '8 / 1 / span 1 / span 2' },
  { day: 14, title: 'Carta ao futuro', message: 'Escreve uma nota para leres no dia 1 de janeiro.', image: 'gift5', size: '1x2', gridArea: '9 / 5 / span 1 / span 2', gridAreaMobile: '10 / 2 / span 1 / span 2' },
  { day: 15, title: 'Metade do caminho', code: 'ADVENTO-15', message: 'Já abriste quinze portas. Copia o código e celebra com quem estás.', image: 'gift4', size: '1x1', gridArea: '9 / 4 / span 1 / span 1', gridAreaMobile: '7 / 5 / span 1 / span 1' },
  { day: 16, title: 'Caminhada ao frio', message: 'Vinte minutos lá fora, mesmo que esteja cinzento.', image: 'gift4', size: '2x2', gridArea: '2 / 4 / span 2 / span 2', gridAreaMobile: '2 / 4 / span 2 / span 2' },
  { day: 17, title: 'Cinema em casa', code: 'FILME-17', message: 'Clássico de Natal, luzes apagadas, telemóvel na outra sala.', image: 'gift3', size: '2x1', gridArea: '5 / 3 / span 2 / span 1', gridAreaMobile: '5 / 3 / span 2 / span 1' },
  { day: 18, title: 'Arruma um cantinho', message: 'Escolhe uma gaveta e deixa-a melhor do que estava.', image: 'gift3', size: '1x1', gridArea: '1 / 5 / span 1 / span 1', gridAreaMobile: '1 / 5 / span 1 / span 1' },
  { day: 19, title: 'Elogio anónimo', message: 'Deixa um elogio sincero a alguém, sem assinar.', image: 'gift4', size: '1x1', gridArea: '4 / 6 / span 1 / span 1', gridAreaMobile: '10 / 1 / span 1 / span 1' },
  { day: 20, title: 'Conta uma história', code: 'ADVENTO-20', message: 'Pergunta a alguém mais velho como era o Natal quando tinha a tua idade.', image: 'gift5', size: '1x2', gridArea: '7 / 2 / span 1 / span 2', gridAreaMobile: '7 / 3 / span 1 / span 2' },
  { day: 21, title: 'Solstício de Inverno', message: 'A noite mais longa do ano. A partir de amanhã os dias voltam a crescer.', image: 'gift1', size: '2x2', gridArea: '7 / 4 / span 2 / span 2', gridAreaMobile: '10 / 4 / span 2 / span 2' },
  { day: 22, title: 'Embrulha à mão', code: 'PRENDA-22', message: 'Um presente, papel simples, fio de cozinha e um raminho verde.', image: 'gift1', size: '1x2', gridArea: '3 / 1 / span 1 / span 2', gridAreaMobile: '3 / 1 / span 1 / span 2' },
  { day: 23, title: 'Mesa posta', message: 'Ajuda a preparar a mesa da consoada, nem que seja só a dobrar guardanapos.', image: 'gift1', size: '2x1', gridArea: '6 / 1 / span 2 / span 1', gridAreaMobile: '11 / 3 / span 2 / span 1' },
  { day: 24, title: 'Véspera', code: 'ADVENTO-24', message: 'Última porta antes do Natal. Copia o código e respira: chegaste.', image: 'gift2', size: '1x2', gridArea: '5 / 1 / span 1 / span 2', gridAreaMobile: '5 / 1 / span 1 / span 2' },
  { day: 25, title: 'Feliz Natal', code: 'ADVENTO-08-12-15-20-24', message: 'Juntaste os códigos secretos. Aqui fica o teu prémio: um dia inteiro sem pressa nenhuma.', image: 'gift4', size: '2x2', gridArea: '4 / 4 / span 2 / span 2', gridAreaMobile: '4 / 4 / span 2 / span 2' },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/data/calendar.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add advent-calendar-react/src/data/calendar.ts advent-calendar-react/src/data/calendar.test.ts
git commit -m "feat: add calendar data model and 25-day content"
```

---

## Task 3: `lib/dayState` — derive door state

**Files:**
- Create: `advent-calendar-react/src/lib/dayState.ts`
- Test: `advent-calendar-react/src/lib/dayState.test.ts`

**Interfaces:**
- Consumes: nothing (pure; does not import `data/`).
- Produces:
  - `type DayState = 'locked' | 'today' | 'past' | 'opened'`
  - `function getDayState(day: number, today: number, openedDays: ReadonlySet<number>): DayState` — `today` is the effective advent day (0 = outside the season).

- [ ] **Step 1: Write the failing test**

`src/lib/dayState.test.ts`:

```ts
import { getDayState } from './dayState';

const none = new Set<number>();

test('current day with nothing opened is "today"', () => {
  expect(getDayState(5, 5, none)).toBe('today');
});

test('earlier day with nothing opened is "past"', () => {
  expect(getDayState(3, 5, none)).toBe('past');
});

test('later day is "locked"', () => {
  expect(getDayState(9, 5, none)).toBe('locked');
});

test('every day is "locked" before the season (today = 0)', () => {
  expect(getDayState(1, 0, none)).toBe('locked');
  expect(getDayState(25, 0, none)).toBe('locked');
});

test('an opened day is "opened" even if it is today', () => {
  expect(getDayState(5, 5, new Set([5]))).toBe('opened');
});

test('an opened day is "opened" even if it is in the past', () => {
  expect(getDayState(3, 5, new Set([3]))).toBe('opened');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/dayState.test.ts`
Expected: FAIL — cannot resolve `./dayState`.

- [ ] **Step 3: Write the implementation**

`src/lib/dayState.ts`:

```ts
export type DayState = 'locked' | 'today' | 'past' | 'opened';

export function getDayState(
  day: number,
  today: number,
  openedDays: ReadonlySet<number>,
): DayState {
  if (openedDays.has(day)) return 'opened';
  if (today > 0 && day === today) return 'today';
  if (today > 0 && day < today) return 'past';
  return 'locked';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/dayState.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS — all four metrics ≥ 95 %. (Covered code so far: `dayState.ts` at 100 %.)

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/lib/dayState.ts advent-calendar-react/src/lib/dayState.test.ts
git commit -m "feat: add getDayState door-state derivation"
```

---

## Task 4: `lib/clipboard` — copy with fallback

**Files:**
- Create: `advent-calendar-react/src/lib/clipboard.ts`
- Test: `advent-calendar-react/src/lib/clipboard.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `function copyText(text: string): Promise<boolean>` — tries `navigator.clipboard.writeText`, falls back to a hidden `<textarea>` + `document.execCommand('copy')`, returns whether either path succeeded, never throws.

- [ ] **Step 1: Write the failing test**

`src/lib/clipboard.test.ts`:

```ts
import { copyText } from './clipboard';

const originalClipboard = navigator.clipboard;
const originalExec = document.execCommand;

afterEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: originalClipboard,
    configurable: true,
  });
  document.execCommand = originalExec;
});

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
}

test('uses navigator.clipboard.writeText when it resolves', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  setClipboard({ writeText });
  await expect(copyText('ABC')).resolves.toBe(true);
  expect(writeText).toHaveBeenCalledWith('ABC');
});

test('falls back to execCommand when writeText rejects', async () => {
  setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
  document.execCommand = vi.fn().mockReturnValue(true);
  await expect(copyText('ABC')).resolves.toBe(true);
  expect(document.execCommand).toHaveBeenCalledWith('copy');
});

test('returns false when no path works', async () => {
  setClipboard(undefined);
  document.execCommand = vi.fn().mockReturnValue(false);
  await expect(copyText('ABC')).resolves.toBe(false);
});

test('never throws even if execCommand throws', async () => {
  setClipboard(undefined);
  document.execCommand = vi.fn(() => {
    throw new Error('boom');
  });
  await expect(copyText('ABC')).resolves.toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/clipboard.test.ts`
Expected: FAIL — cannot resolve `./clipboard`.

- [ ] **Step 3: Write the implementation**

`src/lib/clipboard.ts`:

```ts
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/clipboard.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS — all metrics ≥ 95 %.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/lib/clipboard.ts advent-calendar-react/src/lib/clipboard.test.ts
git commit -m "feat: add copyText clipboard helper with execCommand fallback"
```

---

## Task 5: `hooks/useOpenedDays` — persisted opened set

**Files:**
- Create: `advent-calendar-react/src/hooks/useOpenedDays.ts`
- Test: `advent-calendar-react/src/hooks/useOpenedDays.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `function useOpenedDays(): { openedDays: ReadonlySet<number>; markOpened: (day: number) => void }`. Backed by `localStorage` key `advent-calendar:opened` (JSON array of numbers). All storage access is `try/catch`; on a `getItem` throw it uses a module-level in-memory `Set` fallback; malformed or missing JSON is treated as empty. `markOpened` is idempotent.

- [ ] **Step 1: Write the failing test**

`src/hooks/useOpenedDays.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';
import { useOpenedDays } from './useOpenedDays';

const KEY = 'advent-calendar:opened';

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

test('starts empty when storage is empty', () => {
  const { result } = renderHook(() => useOpenedDays());
  expect([...result.current.openedDays]).toEqual([]);
});

test('markOpened records a day and persists it', () => {
  const { result } = renderHook(() => useOpenedDays());
  act(() => result.current.markOpened(4));
  expect([...result.current.openedDays]).toEqual([4]);
  expect(JSON.parse(window.localStorage.getItem(KEY) as string)).toEqual([4]);
});

test('a fresh hook restores the persisted set', () => {
  window.localStorage.setItem(KEY, JSON.stringify([2, 7]));
  const { result } = renderHook(() => useOpenedDays());
  expect([...result.current.openedDays].sort((a, b) => a - b)).toEqual([2, 7]);
});

test('markOpened is idempotent', () => {
  const { result } = renderHook(() => useOpenedDays());
  act(() => result.current.markOpened(4));
  const first = result.current.openedDays;
  act(() => result.current.markOpened(4));
  expect(result.current.openedDays).toBe(first);
});

test('malformed JSON in storage is treated as empty', () => {
  window.localStorage.setItem(KEY, '{not json');
  const { result } = renderHook(() => useOpenedDays());
  expect([...result.current.openedDays]).toEqual([]);
});

test('still records opens in memory when setItem throws', () => {
  const { result } = renderHook(() => useOpenedDays());
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  act(() => result.current.markOpened(9));
  expect([...result.current.openedDays]).toEqual([9]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/hooks/useOpenedDays.test.ts`
Expected: FAIL — cannot resolve `./useOpenedDays`.

- [ ] **Step 3: Write the implementation**

`src/hooks/useOpenedDays.ts`:

```ts
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'advent-calendar:opened';

let memoryFallback = new Set<number>();

function readOpenedDays(): Set<number> {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return new Set(memoryFallback);
  }
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((n): n is number => typeof n === 'number'));
    }
  } catch {
    // malformed — treat as empty
  }
  return new Set();
}

function writeOpenedDays(days: Set<number>): void {
  memoryFallback = new Set(days);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...days]));
  } catch {
    // in-memory fallback already updated
  }
}

export function useOpenedDays(): {
  openedDays: ReadonlySet<number>;
  markOpened: (day: number) => void;
} {
  const [openedDays, setOpenedDays] = useState<Set<number>>(readOpenedDays);

  const markOpened = useCallback((day: number) => {
    setOpenedDays((prev) => {
      if (prev.has(day)) return prev;
      const next = new Set(prev);
      next.add(day);
      writeOpenedDays(next);
      return next;
    });
  }, []);

  return { openedDays, markOpened };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/hooks/useOpenedDays.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS — all metrics ≥ 95 %.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/hooks/useOpenedDays.ts advent-calendar-react/src/hooks/useOpenedDays.test.ts
git commit -m "feat: add useOpenedDays hook with localStorage persistence"
```

---

## Task 6: `hooks/useAdventDay` — effective current day

**Files:**
- Create: `advent-calendar-react/src/hooks/useAdventDay.ts`
- Test: `advent-calendar-react/src/hooks/useAdventDay.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `function computeAdventDay(now: Date, search: string): number` — pure. `?day=N` (integer 1..25) in `search` wins; else if `now` is in December returns `min(now.getDate(), 25)`; else `0`.
  - `function useAdventDay(): number` — computes once on mount from `new Date()` and `window.location.search`.

- [ ] **Step 1: Write the failing test**

`src/hooks/useAdventDay.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { computeAdventDay, useAdventDay } from './useAdventDay';

test('returns the day of month in December', () => {
  expect(computeAdventDay(new Date(2026, 11, 10), '')).toBe(10);
});

test('clamps to 25 late in December', () => {
  expect(computeAdventDay(new Date(2026, 11, 30), '')).toBe(25);
});

test('returns 0 outside December', () => {
  expect(computeAdventDay(new Date(2026, 5, 15), '')).toBe(0);
});

test('?day= override wins, even outside December', () => {
  expect(computeAdventDay(new Date(2026, 5, 15), '?day=10')).toBe(10);
});

test('out-of-range or non-integer override is ignored', () => {
  expect(computeAdventDay(new Date(2026, 11, 10), '?day=99')).toBe(10);
  expect(computeAdventDay(new Date(2026, 11, 10), '?day=abc')).toBe(10);
  expect(computeAdventDay(new Date(2026, 11, 10), '?day=0')).toBe(10);
});

test('useAdventDay reads the system clock once', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 11, 5));
  try {
    const { result } = renderHook(() => useAdventDay());
    expect(result.current).toBe(5);
  } finally {
    vi.useRealTimers();
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/hooks/useAdventDay.test.ts`
Expected: FAIL — cannot resolve `./useAdventDay`.

- [ ] **Step 3: Write the implementation**

`src/hooks/useAdventDay.ts`:

```ts
import { useState } from 'react';

const MAX_DAY = 25;
const DECEMBER = 11;

function parseOverride(search: string): number | null {
  const raw = new URLSearchParams(search).get('day');
  if (raw === null) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > MAX_DAY) return null;
  return value;
}

export function computeAdventDay(now: Date, search: string): number {
  const override = parseOverride(search);
  if (override !== null) return override;
  if (now.getMonth() !== DECEMBER) return 0;
  return Math.min(now.getDate(), MAX_DAY);
}

export function useAdventDay(): number {
  const [day] = useState(() =>
    computeAdventDay(new Date(), window.location.search),
  );
  return day;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/hooks/useAdventDay.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS — all metrics ≥ 95 %.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/hooks/useAdventDay.ts advent-calendar-react/src/hooks/useAdventDay.test.ts
git commit -m "feat: add useAdventDay / computeAdventDay with ?day= demo override"
```

---

## Task 7: `atoms/Button`

**Files:**
- Create: `advent-calendar-react/src/components/atoms/Button/Button.tsx`
- Create: `advent-calendar-react/src/components/atoms/Button/Button.module.css`
- Create: `advent-calendar-react/src/components/atoms/Button/index.ts`
- Test: `advent-calendar-react/src/components/atoms/Button/Button.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type ButtonVariant = 'solid' | 'ghost'`
  - `interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: ButtonVariant }`
  - `const Button` — `forwardRef<HTMLButtonElement, ButtonProps>`; default `type="button"`, default `variant="solid"`; merges `className`; spreads the rest.

- [ ] **Step 1: Write the failing test**

`src/components/atoms/Button/Button.test.tsx`:

```tsx
import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

test('renders children and defaults to type="button"', () => {
  render(<Button>Copiar</Button>);
  const btn = screen.getByRole('button', { name: 'Copiar' });
  expect(btn).toHaveAttribute('type', 'button');
  expect(btn).toHaveClass('button', 'solid');
});

test('applies the ghost variant class', () => {
  render(<Button variant="ghost">X</Button>);
  expect(screen.getByRole('button')).toHaveClass('ghost');
});

test('forwards ref and onClick', () => {
  const ref = createRef<HTMLButtonElement>();
  const onClick = vi.fn();
  render(<Button ref={ref} onClick={onClick}>Go</Button>);
  fireEvent.click(screen.getByRole('button'));
  expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('keeps a caller-supplied className and type', () => {
  render(<Button className="extra" type="submit">S</Button>);
  const btn = screen.getByRole('button');
  expect(btn).toHaveClass('extra');
  expect(btn).toHaveAttribute('type', 'submit');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/atoms/Button`
Expected: FAIL — cannot resolve `./Button`.

- [ ] **Step 3: Write the component**

`src/components/atoms/Button/Button.tsx`:

```tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'solid' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'solid', type = 'button', className, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={[styles.button, styles[variant], className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  ),
);

Button.displayName = 'Button';
```

`src/components/atoms/Button/Button.module.css`:

```css
.button {
  font: inherit;
  cursor: pointer;
  border: 0;
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-3);
  line-height: 1;
}

.solid {
  background: var(--color-red);
  color: var(--color-white);
}

.ghost {
  background: transparent;
  color: currentColor;
  padding: var(--space-1) var(--space-2);
}

.button:focus-visible {
  outline: 2px solid var(--color-white);
  outline-offset: 2px;
}
```

`src/components/atoms/Button/index.ts`:

```ts
export * from './Button';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/atoms/Button`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS — all metrics ≥ 95 %.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/components/atoms/Button
git commit -m "feat: add Button atom"
```

---

## Task 8: `atoms/Badge`

**Files:**
- Create: `advent-calendar-react/src/components/atoms/Badge/Badge.tsx`
- Create: `advent-calendar-react/src/components/atoms/Badge/Badge.module.css`
- Create: `advent-calendar-react/src/components/atoms/Badge/index.ts`
- Test: `advent-calendar-react/src/components/atoms/Badge/Badge.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type BadgeVariant = 'today' | 'opened' | 'available'`
  - `interface BadgeProps { variant: BadgeVariant }`
  - `function Badge(props: BadgeProps)` — a `<span>` with `data-variant` and text: `today` → "Hoje", `opened` → "✓ Aberto", `available` → "Abrir".

- [ ] **Step 1: Write the failing test**

`src/components/atoms/Badge/Badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

test('today badge shows "Hoje"', () => {
  render(<Badge variant="today" />);
  const el = screen.getByText('Hoje');
  expect(el).toHaveAttribute('data-variant', 'today');
  expect(el).toHaveClass('badge', 'today');
});

test('opened badge shows a check and "Aberto"', () => {
  render(<Badge variant="opened" />);
  expect(screen.getByText(/Aberto/)).toHaveAttribute('data-variant', 'opened');
  expect(screen.getByText(/^✓/)).toBeInTheDocument();
});

test('available badge shows "Abrir"', () => {
  render(<Badge variant="available" />);
  expect(screen.getByText('Abrir')).toHaveAttribute('data-variant', 'available');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/atoms/Badge`
Expected: FAIL — cannot resolve `./Badge`.

- [ ] **Step 3: Write the component**

`src/components/atoms/Badge/Badge.tsx`:

```tsx
import styles from './Badge.module.css';

export type BadgeVariant = 'today' | 'opened' | 'available';

const LABEL: Record<BadgeVariant, string> = {
  today: 'Hoje',
  opened: '✓ Aberto',
  available: 'Abrir',
};

export interface BadgeProps {
  variant: BadgeVariant;
}

export function Badge({ variant }: BadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[variant]}`}
      data-variant={variant}
    >
      {LABEL[variant]}
    </span>
  );
}
```

`src/components/atoms/Badge/Badge.module.css`:

```css
.badge {
  position: absolute;
  top: var(--space-1);
  left: var(--space-1);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--color-white);
  color: var(--color-red-dark);
  pointer-events: none;
}

.today {
  background: #ffd87a;
  color: var(--color-ink);
}

.available {
  background: rgba(255, 255, 255, 0.85);
}

.opened {
  background: rgba(255, 255, 255, 0.7);
}
```

`src/components/atoms/Badge/index.ts`:

```ts
export * from './Badge';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/atoms/Badge`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/components/atoms/Badge
git commit -m "feat: add Badge atom"
```

---

## Task 9: `atoms/DoorNumber`

**Files:**
- Create: `advent-calendar-react/src/components/atoms/DoorNumber/DoorNumber.tsx`
- Create: `advent-calendar-react/src/components/atoms/DoorNumber/DoorNumber.module.css`
- Create: `advent-calendar-react/src/components/atoms/DoorNumber/index.ts`
- Test: `advent-calendar-react/src/components/atoms/DoorNumber/DoorNumber.test.tsx`

**Interfaces:**
- Consumes: `DoorSize` from `data/calendar` (type-only; `data/` is cross-cutting).
- Produces: `interface DoorNumberProps { value: number; size: DoorSize }`; `function DoorNumber(props)` — a `<span class="number size-<size>">{value}</span>`.

- [ ] **Step 1: Write the failing test**

`src/components/atoms/DoorNumber/DoorNumber.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { DoorNumber } from './DoorNumber';

test('renders the day number', () => {
  render(<DoorNumber value={7} size="1x1" />);
  expect(screen.getByText('7')).toHaveClass('number');
});

test('adds a size-specific class', () => {
  render(<DoorNumber value={16} size="2x2" />);
  expect(screen.getByText('16')).toHaveClass('size-2x2');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/atoms/DoorNumber`
Expected: FAIL — cannot resolve `./DoorNumber`.

- [ ] **Step 3: Write the component**

`src/components/atoms/DoorNumber/DoorNumber.tsx`:

```tsx
import type { DoorSize } from '../../../data/calendar';
import styles from './DoorNumber.module.css';

export interface DoorNumberProps {
  value: number;
  size: DoorSize;
}

export function DoorNumber({ value, size }: DoorNumberProps) {
  return (
    <span className={`${styles.number} ${styles[`size-${size}`]}`}>{value}</span>
  );
}
```

`src/components/atoms/DoorNumber/DoorNumber.module.css`:

```css
.number {
  position: absolute;
  right: var(--space-2);
  bottom: var(--space-1);
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--color-white);
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  line-height: 1;
}

.size-1x1 { font-size: 1.1rem; }
.size-1x2 { font-size: 1.3rem; }
.size-2x1 { font-size: 1.6rem; }
.size-2x2 { font-size: 2.2rem; }
```

`src/components/atoms/DoorNumber/index.ts`:

```ts
export * from './DoorNumber';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/atoms/DoorNumber`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/components/atoms/DoorNumber
git commit -m "feat: add DoorNumber atom"
```

---

## Task 10: `atoms/Snow`

**Files:**
- Create: `advent-calendar-react/src/components/atoms/Snow/Snow.tsx`
- Create: `advent-calendar-react/src/components/atoms/Snow/Snow.module.css`
- Create: `advent-calendar-react/src/components/atoms/Snow/index.ts`
- Test: `advent-calendar-react/src/components/atoms/Snow/Snow.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `function Snow()` — renders `<canvas class="snow" aria-hidden="true" />`. On mount (only when `matchMedia('(prefers-reduced-motion: reduce)')` does **not** match) it starts a `requestAnimationFrame` loop, listens on `window` `resize` and `document` `visibilitychange` (pausing while `document.hidden`), and on unmount cancels the frame and removes both listeners.

- [ ] **Step 1: Write the failing test**

`src/components/atoms/Snow/Snow.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { Snow } from './Snow';

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
}

test('renders an aria-hidden canvas', () => {
  mockReducedMotion(false);
  const { container } = render(<Snow />);
  const canvas = container.querySelector('canvas');
  expect(canvas).toBeInTheDocument();
  expect(canvas).toHaveAttribute('aria-hidden', 'true');
});

test('starts an animation frame when motion is allowed', () => {
  mockReducedMotion(false);
  render(<Snow />);
  expect(requestAnimationFrame).toHaveBeenCalled();
});

test('does not start a loop when prefers-reduced-motion is set', () => {
  mockReducedMotion(true);
  render(<Snow />);
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});

test('cancels the frame on unmount', () => {
  mockReducedMotion(false);
  const { unmount } = render(<Snow />);
  unmount();
  expect(cancelAnimationFrame).toHaveBeenCalled();
});

test('pauses on visibilitychange when the tab is hidden', () => {
  mockReducedMotion(false);
  render(<Snow />);
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
  expect(cancelAnimationFrame).toHaveBeenCalled();
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/atoms/Snow`
Expected: FAIL — cannot resolve `./Snow`.

- [ ] **Step 3: Write the component**

`src/components/atoms/Snow/Snow.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import styles from './Snow.module.css';

interface Flake {
  x: number;
  y: number;
  r: number;
  speedY: number;
  drift: number;
  phase: number;
}

const FLAKE_COUNT = 70;

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function Snow() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let flakes: Flake[] = [];
    let frame = 0;
    let running = true;

    const seed = () => {
      flakes = Array.from({ length: FLAKE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: 1 + Math.random() * 2.5,
        speedY: 0.3 + Math.random() * 0.8,
        drift: 0.4 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (const f of flakes) {
        f.y += f.speedY;
        f.phase += 0.01;
        f.x += Math.sin(f.phase) * f.drift * 0.5;
        if (f.y - f.r > height) {
          f.y = -f.r;
          f.x = Math.random() * width;
        }
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = window.requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        window.cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        frame = window.requestAnimationFrame(tick);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    frame = window.requestAnimationFrame(tick);

    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.snow} aria-hidden="true" />;
}
```

`src/components/atoms/Snow/Snow.module.css`:

```css
.snow {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
```

`src/components/atoms/Snow/index.ts`:

```ts
export * from './Snow';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/atoms/Snow`
Expected: PASS (5 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS. If the `tick` loop body reports uncovered lines, add a test that calls one real `requestAnimationFrame` callback: capture the callback via the mock (`vi.mocked(requestAnimationFrame).mock.calls[0][0]`) and invoke it once, then assert `ctx` methods ran (spy through the canvas stub).

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/components/atoms/Snow
git commit -m "feat: add Snow atom (canvas snowfall, reduced-motion aware)"
```

---

## Task 11: `molecules/SiteHeader`

**Files:**
- Create: `advent-calendar-react/src/components/molecules/SiteHeader/SiteHeader.tsx`
- Create: `advent-calendar-react/src/components/molecules/SiteHeader/SiteHeader.module.css`
- Create: `advent-calendar-react/src/components/molecules/SiteHeader/index.ts`
- Test: `advent-calendar-react/src/components/molecules/SiteHeader/SiteHeader.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `interface SiteHeaderProps { title: string; subtitle: string }`; `function SiteHeader(props)` — `<header>` with an `<h1>` (title) and a `<p>` (subtitle).

- [ ] **Step 1: Write the failing test**

`src/components/molecules/SiteHeader/SiteHeader.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { SiteHeader } from './SiteHeader';

test('renders the title as a level-1 heading and the subtitle', () => {
  render(<SiteHeader title="Calendário do Advento" subtitle="Abre uma porta por dia" />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Calendário do Advento',
  );
  expect(screen.getByText('Abre uma porta por dia')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/molecules/SiteHeader`
Expected: FAIL — cannot resolve `./SiteHeader`.

- [ ] **Step 3: Write the component**

`src/components/molecules/SiteHeader/SiteHeader.tsx`:

```tsx
import styles from './SiteHeader.module.css';

export interface SiteHeaderProps {
  title: string;
  subtitle: string;
}

export function SiteHeader({ title, subtitle }: SiteHeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
    </header>
  );
}
```

`src/components/molecules/SiteHeader/SiteHeader.module.css`:

```css
.header {
  text-align: center;
  padding: var(--space-5) var(--space-3) var(--space-3);
  color: var(--color-white);
}

.title {
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  margin: 0 0 var(--space-2);
}

.subtitle {
  font-style: italic;
  font-size: clamp(1rem, 2.5vw, 1.25rem);
  margin: 0;
}
```

`src/components/molecules/SiteHeader/index.ts`:

```ts
export * from './SiteHeader';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/molecules/SiteHeader`
Expected: PASS (1 test).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/components/molecules/SiteHeader
git commit -m "feat: add SiteHeader molecule"
```

---

## Task 12: `molecules/CopyableCode`

**Files:**
- Create: `advent-calendar-react/src/components/molecules/CopyableCode/CopyableCode.tsx`
- Create: `advent-calendar-react/src/components/molecules/CopyableCode/CopyableCode.module.css`
- Create: `advent-calendar-react/src/components/molecules/CopyableCode/index.ts`
- Test: `advent-calendar-react/src/components/molecules/CopyableCode/CopyableCode.test.tsx`

**Interfaces:**
- Consumes: `Button` from `atoms/Button`; `copyText` from `lib/clipboard`.
- Produces: `interface CopyableCodeProps { code: string }`; `function CopyableCode(props)` — shows the code in a `<span>`, a "Copiar" `Button`; on click calls `copyText(code)`; on success shows a `role="status"` "Copiado" for 2 s; on failure shows `role="status"` "Não foi possível copiar" and selects the code text via `document.createRange` + `window.getSelection`.

- [ ] **Step 1: Write the failing test**

`src/components/molecules/CopyableCode/CopyableCode.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CopyableCode } from './CopyableCode';
import { copyText } from '../../../lib/clipboard';

vi.mock('../../../lib/clipboard', () => ({ copyText: vi.fn() }));
const mockCopyText = vi.mocked(copyText);

beforeEach(() => {
  mockCopyText.mockReset();
});

test('renders the code', () => {
  render(<CopyableCode code="ADVENTO-03" />);
  expect(screen.getByText('ADVENTO-03')).toBeInTheDocument();
});

test('shows "Copiado" on success, then clears it', async () => {
  vi.useFakeTimers();
  mockCopyText.mockResolvedValue(true);
  render(<CopyableCode code="ADVENTO-03" />);
  fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
  await vi.waitFor(() => expect(mockCopyText).toHaveBeenCalledWith('ADVENTO-03'));
  expect(await screen.findByRole('status')).toHaveTextContent('Copiado');
  await vi.advanceTimersByTimeAsync(2000);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  vi.useRealTimers();
});

test('shows an error message and selects the code on failure', async () => {
  mockCopyText.mockResolvedValue(false);
  const createRange = vi.spyOn(document, 'createRange');
  render(<CopyableCode code="ADVENTO-03" />);
  fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
  await waitFor(() =>
    expect(screen.getByRole('status')).toHaveTextContent('Não foi possível copiar'),
  );
  expect(createRange).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/molecules/CopyableCode`
Expected: FAIL — cannot resolve `./CopyableCode`.

- [ ] **Step 3: Write the component**

`src/components/molecules/CopyableCode/CopyableCode.tsx`:

```tsx
import { useRef, useState } from 'react';
import { Button } from '../../atoms/Button';
import { copyText } from '../../../lib/clipboard';
import styles from './CopyableCode.module.css';

type Status = 'idle' | 'copied' | 'error';

export interface CopyableCodeProps {
  code: string;
}

export function CopyableCode({ code }: CopyableCodeProps) {
  const [status, setStatus] = useState<Status>('idle');
  const codeRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleCopy = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const ok = await copyText(code);
    if (ok) {
      setStatus('copied');
      timeoutRef.current = setTimeout(() => setStatus('idle'), 2000);
      return;
    }
    setStatus('error');
    const node = codeRef.current;
    if (node) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  return (
    <div className={styles.wrap}>
      <span ref={codeRef} className={styles.code}>
        {code}
      </span>
      <Button variant="ghost" onClick={handleCopy}>
        Copiar
      </Button>
      {status === 'copied' && (
        <span role="status" className={styles.copied}>
          Copiado
        </span>
      )}
      {status === 'error' && (
        <span role="status" className={styles.error}>
          Não foi possível copiar
        </span>
      )}
    </div>
  );
}
```

`src/components/molecules/CopyableCode/CopyableCode.module.css`:

```css
.wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: center;
}

.code {
  font-family: var(--font-display);
  font-weight: 700;
  background: var(--color-white);
  color: var(--color-red-dark);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius);
  letter-spacing: 0.04em;
}

.copied,
.error {
  font-size: 0.8rem;
}

.error {
  color: #ffd0cc;
}
```

`src/components/molecules/CopyableCode/index.ts`:

```ts
export * from './CopyableCode';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/molecules/CopyableCode`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/components/molecules/CopyableCode
git commit -m "feat: add CopyableCode molecule"
```

---

## Task 13: `molecules/Door`

**Files:**
- Create: `advent-calendar-react/src/components/molecules/Door/Door.tsx`
- Create: `advent-calendar-react/src/components/molecules/Door/Door.module.css`
- Create: `advent-calendar-react/src/components/molecules/Door/index.ts`
- Test: `advent-calendar-react/src/components/molecules/Door/Door.test.tsx`

**Interfaces:**
- Consumes: `Badge` from `atoms/Badge`, `DoorNumber` from `atoms/DoorNumber`; types `CalendarDay` from `data/calendar`, `DayState` from `lib/dayState`.
- Produces: `interface DoorProps { day: CalendarDay; state: DayState; onOpen: (day: number) => void }`; `function Door(props)` — a `<button>` grid child. `data-state={state}`; `aria-label` per state (see below); sets CSS custom props `--grid-area` / `--grid-area-mobile` from the day; image class `img-<image>`; renders `DoorNumber` always and a `Badge` for non-`locked` states (`today`→`today`, `past`→`available`, `opened`→`opened`). Click behaviour: `locked` → toggle a `shake` class (skipped under reduced motion), never calls `onOpen`; any other state → `onOpen(day.day)`.

aria-labels: `locked` → `"Dia N, ainda fechado"`; `today` → `"Dia N, hoje — abrir"`; `past` → `"Dia N, por abrir"`; `opened` → `"Dia N, aberto"`.

- [ ] **Step 1: Write the failing test**

`src/components/molecules/Door/Door.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Door } from './Door';
import type { CalendarDay } from '../../../data/calendar';

const day: CalendarDay = {
  day: 5,
  title: 'Receita rápida',
  message: 'Chocolate quente.',
  code: 'COZINHA-05',
  image: 'gift5',
  size: '2x1',
  gridArea: '2 / 3 / span 2 / span 1',
  gridAreaMobile: '2 / 3 / span 2 / span 1',
};

function mockReducedMotion(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
    matches, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
}

afterEach(() => vi.restoreAllMocks());

test.each([
  ['locked', 'Dia 5, ainda fechado'],
  ['today', 'Dia 5, hoje — abrir'],
  ['past', 'Dia 5, por abrir'],
  ['opened', 'Dia 5, aberto'],
] as const)('state %s has data-state and aria-label', (state, label) => {
  render(<Door day={day} state={state} onOpen={vi.fn()} />);
  const btn = screen.getByRole('button');
  expect(btn).toHaveAttribute('data-state', state);
  expect(btn).toHaveAccessibleName(label);
});

test('locked shows no badge; today/past/opened show their badge', () => {
  const { rerender } = render(<Door day={day} state="locked" onOpen={vi.fn()} />);
  expect(screen.queryByText(/Hoje|Abrir|Aberto/)).not.toBeInTheDocument();
  rerender(<Door day={day} state="today" onOpen={vi.fn()} />);
  expect(screen.getByText('Hoje')).toBeInTheDocument();
  rerender(<Door day={day} state="past" onOpen={vi.fn()} />);
  expect(screen.getByText('Abrir')).toBeInTheDocument();
  rerender(<Door day={day} state="opened" onOpen={vi.fn()} />);
  expect(screen.getByText(/Aberto/)).toBeInTheDocument();
});

test('clicking a locked door shakes and does not call onOpen', () => {
  mockReducedMotion(false);
  const onOpen = vi.fn();
  render(<Door day={day} state="locked" onOpen={onOpen} />);
  const btn = screen.getByRole('button');
  fireEvent.click(btn);
  expect(btn).toHaveClass('shake');
  expect(onOpen).not.toHaveBeenCalled();
  fireEvent.animationEnd(btn);
  expect(btn).not.toHaveClass('shake');
});

test('locked door under reduced motion does not add the shake class', () => {
  mockReducedMotion(true);
  render(<Door day={day} state="locked" onOpen={vi.fn()} />);
  const btn = screen.getByRole('button');
  fireEvent.click(btn);
  expect(btn).not.toHaveClass('shake');
});

test.each(['today', 'past', 'opened'] as const)(
  'clicking a %s door calls onOpen with the day number',
  (state) => {
    const onOpen = vi.fn();
    render(<Door day={day} state={state} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(5);
  },
);

test('exposes the grid-area custom properties', () => {
  render(<Door day={day} state="today" onOpen={vi.fn()} />);
  const btn = screen.getByRole('button');
  expect(btn.style.getPropertyValue('--grid-area')).toBe('2 / 3 / span 2 / span 1');
  expect(btn.style.getPropertyValue('--grid-area-mobile')).toBe('2 / 3 / span 2 / span 1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/molecules/Door`
Expected: FAIL — cannot resolve `./Door`.

- [ ] **Step 3: Write the component**

`src/components/molecules/Door/Door.tsx`:

```tsx
import { useState, type CSSProperties } from 'react';
import { Badge, type BadgeVariant } from '../../atoms/Badge';
import { DoorNumber } from '../../atoms/DoorNumber';
import type { CalendarDay } from '../../../data/calendar';
import type { DayState } from '../../../lib/dayState';
import styles from './Door.module.css';

const ARIA_LABEL: Record<DayState, (n: number) => string> = {
  locked: (n) => `Dia ${n}, ainda fechado`,
  today: (n) => `Dia ${n}, hoje — abrir`,
  past: (n) => `Dia ${n}, por abrir`,
  opened: (n) => `Dia ${n}, aberto`,
};

const BADGE_FOR_STATE: Partial<Record<DayState, BadgeVariant>> = {
  today: 'today',
  past: 'available',
  opened: 'opened',
};

function reducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export interface DoorProps {
  day: CalendarDay;
  state: DayState;
  onOpen: (day: number) => void;
}

export function Door({ day, state, onOpen }: DoorProps) {
  const [shaking, setShaking] = useState(false);
  const badge = BADGE_FOR_STATE[state];

  const handleClick = () => {
    if (state === 'locked') {
      if (!reducedMotion()) setShaking(true);
      return;
    }
    onOpen(day.day);
  };

  const style = {
    '--grid-area': day.gridArea,
    '--grid-area-mobile': day.gridAreaMobile,
  } as CSSProperties;

  return (
    <button
      type="button"
      data-state={state}
      aria-label={ARIA_LABEL[state](day.day)}
      style={style}
      className={[
        styles.door,
        styles[`img-${day.image}`],
        state === 'opened' ? styles.ajar : '',
        shaking ? styles.shake : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={handleClick}
      onAnimationEnd={() => setShaking(false)}
    >
      <span className={styles.panel} aria-hidden="true" />
      <DoorNumber value={day.day} size={day.size} />
      {badge && <Badge variant={badge} />}
    </button>
  );
}
```

`src/components/molecules/Door/Door.module.css`:

```css
.door {
  position: relative;
  grid-area: var(--grid-area-mobile);
  margin: 4px;
  padding: 0;
  border: 0;
  min-width: 0;
  background: transparent;
  cursor: pointer;
  perspective: 600px;
}

@media (min-width: 769px) {
  .door {
    grid-area: var(--grid-area);
  }
}

.panel {
  position: absolute;
  inset: 0;
  border: var(--door-border);
  border-radius: var(--radius);
  background-size: cover;
  background-position: center;
  box-shadow: var(--shadow-door);
  transform-origin: bottom left;
  transition: transform 0.5s ease-in-out;
}

.img-gift1 .panel { background-image: url('../../../assets/gift1.png'); }
.img-gift2 .panel { background-image: url('../../../assets/gift2.png'); }
.img-gift3 .panel { background-image: url('../../../assets/gift3.png'); }
.img-gift4 .panel { background-image: url('../../../assets/gift4.png'); }
.img-gift5 .panel { background-image: url('../../../assets/gift5.png'); }

.door[data-state='locked'] .panel { filter: grayscale(0.6) brightness(0.7); }

.door[data-state='today'] .panel { box-shadow: var(--glow-today); }
.door[data-state='today'] { animation: pulse 2s ease-in-out infinite; }

.door:hover .panel { transform: rotateY(24deg); }
.door:focus-visible .panel { transform: rotateY(24deg); }

.ajar .panel { transform: rotateY(72deg); filter: brightness(0.8); }

.shake { animation: shake 0.5s; }

@keyframes shake {
  10% { transform: translate(-1px, -2px) rotate(-1deg); }
  30% { transform: translate(3px, 2px) rotate(0deg); }
  50% { transform: translate(-1px, 2px) rotate(-1deg); }
  70% { transform: translate(3px, 1px) rotate(-1deg); }
  90% { transform: translate(1px, 2px) rotate(0deg); }
}

@keyframes pulse {
  50% { transform: scale(1.03); }
}

@media (prefers-reduced-motion: reduce) {
  .panel,
  .door[data-state='today'],
  .shake {
    animation: none;
    transition: none;
  }
  .door:hover .panel,
  .door:focus-visible .panel { transform: none; }
}
```

`src/components/molecules/Door/index.ts`:

```ts
export * from './Door';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/molecules/Door`
Expected: PASS (all cases).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/components/molecules/Door
git commit -m "feat: add Door molecule with four visual states"
```

---

## Task 14: `organisms/CalendarGrid`

**Files:**
- Create: `advent-calendar-react/src/components/organisms/CalendarGrid/CalendarGrid.tsx`
- Create: `advent-calendar-react/src/components/organisms/CalendarGrid/CalendarGrid.module.css`
- Create: `advent-calendar-react/src/components/organisms/CalendarGrid/index.ts`
- Test: `advent-calendar-react/src/components/organisms/CalendarGrid/CalendarGrid.test.tsx`

**Interfaces:**
- Consumes: `Door` from `molecules/Door`; types `CalendarDay` from `data/calendar`, `DayState` from `lib/dayState`.
- Produces:
  - `interface CalendarGridItem { day: CalendarDay; state: DayState }`
  - `interface CalendarGridProps { items: CalendarGridItem[]; onOpen: (day: number) => void }`
  - `function CalendarGrid(props)` — a `<div class="grid">` with one `<Door>` per item (`key={day.day}`), forwarding `onOpen`.

- [ ] **Step 1: Write the failing test**

`src/components/organisms/CalendarGrid/CalendarGrid.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarGrid, type CalendarGridItem } from './CalendarGrid';
import { CALENDAR } from '../../../data/calendar';
import { getDayState } from '../../../lib/dayState';

const items: CalendarGridItem[] = CALENDAR.map((day) => ({
  day,
  state: getDayState(day.day, 5, new Set()),
}));

test('renders one door per calendar day', () => {
  render(<CalendarGrid items={items} onOpen={vi.fn()} />);
  expect(screen.getAllByRole('button')).toHaveLength(25);
});

test('forwards onOpen with the clicked day number', () => {
  const onOpen = vi.fn();
  render(<CalendarGrid items={items} onOpen={onOpen} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dia 5, hoje — abrir' }));
  expect(onOpen).toHaveBeenCalledWith(5);
});

test('applies the grid class', () => {
  const { container } = render(<CalendarGrid items={items} onOpen={vi.fn()} />);
  expect(container.firstChild).toHaveClass('grid');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/organisms/CalendarGrid`
Expected: FAIL — cannot resolve `./CalendarGrid`.

- [ ] **Step 3: Write the component**

`src/components/organisms/CalendarGrid/CalendarGrid.tsx`:

```tsx
import { Door } from '../../molecules/Door';
import type { CalendarDay } from '../../../data/calendar';
import type { DayState } from '../../../lib/dayState';
import styles from './CalendarGrid.module.css';

export interface CalendarGridItem {
  day: CalendarDay;
  state: DayState;
}

export interface CalendarGridProps {
  items: CalendarGridItem[];
  onOpen: (day: number) => void;
}

export function CalendarGrid({ items, onOpen }: CalendarGridProps) {
  return (
    <div className={styles.grid}>
      {items.map(({ day, state }) => (
        <Door key={day.day} day={day} state={state} onOpen={onOpen} />
      ))}
    </div>
  );
}
```

`src/components/organisms/CalendarGrid/CalendarGrid.module.css`:

```css
.grid {
  display: grid;
  justify-content: center;
  align-content: center;
  gap: 2px;
  padding: var(--space-4) 0 var(--space-5);
  grid-template-columns: repeat(5, minmax(48px, 64px));
  grid-template-rows: repeat(12, minmax(48px, 64px));
}

@media (min-width: 769px) {
  .grid {
    grid-template-columns: repeat(6, minmax(80px, 110px));
    grid-template-rows: repeat(9, 100px);
  }
}
```

`src/components/organisms/CalendarGrid/index.ts`:

```ts
export * from './CalendarGrid';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/organisms/CalendarGrid`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/components/organisms/CalendarGrid
git commit -m "feat: add CalendarGrid organism"
```

---

## Task 15: `organisms/DayDialog`

**Files:**
- Create: `advent-calendar-react/src/components/organisms/DayDialog/DayDialog.tsx`
- Create: `advent-calendar-react/src/components/organisms/DayDialog/DayDialog.module.css`
- Create: `advent-calendar-react/src/components/organisms/DayDialog/index.ts`
- Test: `advent-calendar-react/src/components/organisms/DayDialog/DayDialog.test.tsx`

**Interfaces:**
- Consumes: `Button` from `atoms/Button`, `CopyableCode` from `molecules/CopyableCode`; type `CalendarDay` from `data/calendar`.
- Produces: `interface DayDialogProps { day: CalendarDay | null; onClose: () => void }`; `function DayDialog(props)` — a native `<dialog>`. When `day` becomes non-null it calls `showModal()`; when `day` becomes null it calls `close()`. Renders the day number, `title` (as `<h2 id="day-dialog-title">`), `message`, `CopyableCode` when `day.code` is set, and a "Fechar" `Button`. `cancel` (Esc) and `close` events, backdrop click, and "Fechar" all invoke `onClose`. Body class includes `size-<size>`.

- [ ] **Step 1: Write the failing test**

`src/components/organisms/DayDialog/DayDialog.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { DayDialog } from './DayDialog';
import type { CalendarDay } from '../../../data/calendar';

const withCode: CalendarDay = {
  day: 5, title: 'Receita rápida', message: 'Chocolate quente.',
  code: 'COZINHA-05', image: 'gift5', size: '2x1',
  gridArea: 'a', gridAreaMobile: 'a',
};
const noCode: CalendarDay = { ...withCode, day: 6, title: 'Pausa', code: undefined };

test('opens the dialog and shows title + message when day is set', () => {
  const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
  render(<DayDialog day={withCode} onClose={vi.fn()} />);
  expect(showModal).toHaveBeenCalled();
  expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Receita rápida');
  expect(screen.getByText('Chocolate quente.')).toBeInTheDocument();
});

test('renders CopyableCode only when the day has a code', () => {
  const { rerender } = render(<DayDialog day={withCode} onClose={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Copiar' })).toBeInTheDocument();
  rerender(<DayDialog day={noCode} onClose={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Copiar' })).not.toBeInTheDocument();
});

test('calls close() when day goes back to null', () => {
  const close = vi.spyOn(HTMLDialogElement.prototype, 'close');
  const { rerender } = render(<DayDialog day={withCode} onClose={vi.fn()} />);
  rerender(<DayDialog day={null} onClose={vi.fn()} />);
  expect(close).toHaveBeenCalled();
});

test('"Fechar" button calls onClose', () => {
  const onClose = vi.fn();
  render(<DayDialog day={withCode} onClose={onClose} />);
  fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('the cancel (Esc) event calls onClose', () => {
  const onClose = vi.fn();
  const { container } = render(<DayDialog day={withCode} onClose={onClose} />);
  fireEvent(container.querySelector('dialog') as HTMLDialogElement, new Event('cancel'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a backdrop click (on the dialog element itself) calls onClose', () => {
  const onClose = vi.fn();
  const { container } = render(<DayDialog day={withCode} onClose={onClose} />);
  fireEvent.click(container.querySelector('dialog') as HTMLDialogElement);
  expect(onClose).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/organisms/DayDialog`
Expected: FAIL — cannot resolve `./DayDialog`.

- [ ] **Step 3: Write the component**

`src/components/organisms/DayDialog/DayDialog.tsx`:

```tsx
import { useEffect, useRef, type MouseEvent } from 'react';
import { Button } from '../../atoms/Button';
import { CopyableCode } from '../../molecules/CopyableCode';
import type { CalendarDay } from '../../../data/calendar';
import styles from './DayDialog.module.css';

export interface DayDialogProps {
  day: CalendarDay | null;
  onClose: () => void;
}

export function DayDialog({ day, onClose }: DayDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (day && !dialog.open) dialog.showModal();
    if (!day && dialog.open) dialog.close();
  }, [day]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    const handleClose = () => onClose();
    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  const handleBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      onClick={handleBackdrop}
      aria-labelledby="day-dialog-title"
    >
      {day && (
        <div className={`${styles.body} ${styles[`size-${day.size}`]}`}>
          <p className={styles.day}>{day.day}</p>
          <h2 id="day-dialog-title" className={styles.title}>
            {day.title}
          </h2>
          <p className={styles.message}>{day.message}</p>
          {day.code && <CopyableCode code={day.code} />}
          <Button variant="ghost" className={styles.close} onClick={onClose}>
            Fechar
          </Button>
        </div>
      )}
    </dialog>
  );
}
```

`src/components/organisms/DayDialog/DayDialog.module.css`:

```css
.dialog {
  border: 0;
  border-radius: var(--radius);
  padding: 0;
  max-width: min(90vw, 420px);
  background: var(--color-red);
  color: var(--color-white);
}

.dialog::backdrop {
  background: rgba(0, 0, 0, 0.55);
}

.body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  text-align: center;
}

.day {
  font-family: var(--font-display);
  font-size: 2.5rem;
  margin: 0;
}

.title {
  margin: 0;
  font-size: 1.4rem;
}

.message {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
}

.size-1x1 .title { font-size: 1.2rem; }
.size-2x2 .day { font-size: 3rem; }

.close {
  margin-top: var(--space-2);
}
```

`src/components/organisms/DayDialog/index.ts`:

```ts
export * from './DayDialog';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/organisms/DayDialog`
Expected: PASS (6 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/components/organisms/DayDialog
git commit -m "feat: add DayDialog organism using the native dialog element"
```

---

## Task 16: `templates/CalendarTemplate`

**Files:**
- Create: `advent-calendar-react/src/components/templates/CalendarTemplate/CalendarTemplate.tsx`
- Create: `advent-calendar-react/src/components/templates/CalendarTemplate/CalendarTemplate.module.css`
- Create: `advent-calendar-react/src/components/templates/CalendarTemplate/index.ts`
- Test: `advent-calendar-react/src/components/templates/CalendarTemplate/CalendarTemplate.test.tsx`

**Interfaces:**
- Consumes: `Snow` from `atoms/Snow`.
- Produces: `interface CalendarTemplateProps { header: ReactNode; grid: ReactNode; dialog: ReactNode }`; `function CalendarTemplate(props)` — a page wrapper with a decorative background layer, `<Snow />`, a `<main>` holding `header` then `grid`, and `dialog` last. No hooks, no data.

- [ ] **Step 1: Write the failing test**

`src/components/templates/CalendarTemplate/CalendarTemplate.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { CalendarTemplate } from './CalendarTemplate';

beforeEach(() => {
  vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
    matches: true, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
});
afterEach(() => vi.restoreAllMocks());

test('renders the header, grid and dialog slots plus the snow canvas', () => {
  const { container } = render(
    <CalendarTemplate
      header={<div data-testid="header" />}
      grid={<div data-testid="grid" />}
      dialog={<div data-testid="dialog" />}
    />,
  );
  expect(screen.getByTestId('header')).toBeInTheDocument();
  expect(screen.getByTestId('grid')).toBeInTheDocument();
  expect(screen.getByTestId('dialog')).toBeInTheDocument();
  expect(container.querySelector('canvas')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/templates/CalendarTemplate`
Expected: FAIL — cannot resolve `./CalendarTemplate`.

- [ ] **Step 3: Write the component**

`src/components/templates/CalendarTemplate/CalendarTemplate.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Snow } from '../../atoms/Snow';
import styles from './CalendarTemplate.module.css';

export interface CalendarTemplateProps {
  header: ReactNode;
  grid: ReactNode;
  dialog: ReactNode;
}

export function CalendarTemplate({ header, grid, dialog }: CalendarTemplateProps) {
  return (
    <div className={styles.page}>
      <div className={styles.background} aria-hidden="true" />
      <Snow />
      <main className={styles.content}>
        {header}
        {grid}
      </main>
      {dialog}
    </div>
  );
}
```

`src/components/templates/CalendarTemplate/CalendarTemplate.module.css`:

```css
.page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.background {
  position: fixed;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, #3a1512, var(--bg-page) 70%),
    url('../../../assets/background.png') center / cover no-repeat;
  z-index: 0;
}

.content {
  position: relative;
  z-index: 2;
}
```

`src/components/templates/CalendarTemplate/index.ts`:

```ts
export * from './CalendarTemplate';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/templates/CalendarTemplate`
Expected: PASS (1 test).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/components/templates/CalendarTemplate
git commit -m "feat: add CalendarTemplate layout"
```

---

## Task 17: `pages/CalendarPage`

**Files:**
- Create: `advent-calendar-react/src/components/pages/CalendarPage/CalendarPage.tsx`
- Create: `advent-calendar-react/src/components/pages/CalendarPage/index.ts`
- Test: `advent-calendar-react/src/components/pages/CalendarPage/CalendarPage.test.tsx`

**Interfaces:**
- Consumes: `CalendarTemplate` (templates), `SiteHeader` (molecules), `CalendarGrid` + `CalendarGridItem` (organisms), `DayDialog` (organisms); `CALENDAR` + `CalendarDay` from `data/calendar`; `getDayState` from `lib/dayState`; `useAdventDay` from `hooks/useAdventDay`; `useOpenedDays` from `hooks/useOpenedDays`.
- Produces: `function CalendarPage()` — the app root component. Derives per-day `DayState` from `useAdventDay()` + `useOpenedDays()`. On `onOpen(dayNumber)`: looks the day up in `CALENDAR`, calls `markOpened(dayNumber)`, sets it as the dialog's `selectedDay`. Dialog `onClose` clears `selectedDay`.

- [ ] **Step 1: Write the failing test**

`src/components/pages/CalendarPage/CalendarPage.test.tsx`:

```tsx
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CalendarPage } from './CalendarPage';

const originalSearch = window.location.search;

function setSearch(search: string) {
  window.history.replaceState({}, '', `${window.location.pathname}${search}`);
}

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({
    matches: true, media: q, onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as MediaQueryList);
});

afterEach(() => {
  setSearch(originalSearch);
  vi.restoreAllMocks();
});

test('renders the 25 doors with the header', () => {
  setSearch('?day=5');
  render(<CalendarPage />);
  expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  expect(screen.getAllByRole('button')).toHaveLength(25);
});

test('opening today\'s door shows its content and marks it opened', () => {
  setSearch('?day=5');
  render(<CalendarPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Dia 5, hoje — abrir' }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByRole('heading', { level: 2 })).toHaveTextContent(
    'Receita rápida',
  );
  expect(screen.getByRole('button', { name: 'Dia 5, aberto' })).toBeInTheDocument();
});

test('a locked door does not open the dialog', () => {
  setSearch('?day=5');
  render(<CalendarPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Dia 20, ainda fechado' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/pages/CalendarPage`
Expected: FAIL — cannot resolve `./CalendarPage`.

- [ ] **Step 3: Write the component**

`src/components/pages/CalendarPage/CalendarPage.tsx`:

```tsx
import { useMemo, useState } from 'react';
import { CalendarTemplate } from '../../templates/CalendarTemplate';
import { SiteHeader } from '../../molecules/SiteHeader';
import { CalendarGrid, type CalendarGridItem } from '../../organisms/CalendarGrid';
import { DayDialog } from '../../organisms/DayDialog';
import { CALENDAR, type CalendarDay } from '../../../data/calendar';
import { getDayState } from '../../../lib/dayState';
import { useAdventDay } from '../../../hooks/useAdventDay';
import { useOpenedDays } from '../../../hooks/useOpenedDays';

const TITLE = 'Calendário do Advento';
const SUBTITLE = 'Abre uma porta por dia até ao Natal';

export function CalendarPage() {
  const today = useAdventDay();
  const { openedDays, markOpened } = useOpenedDays();
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  const items = useMemo<CalendarGridItem[]>(
    () =>
      CALENDAR.map((day) => ({
        day,
        state: getDayState(day.day, today, openedDays),
      })),
    [today, openedDays],
  );

  const handleOpen = (dayNumber: number) => {
    const dayData = CALENDAR.find((entry) => entry.day === dayNumber);
    if (!dayData) return;
    markOpened(dayNumber);
    setSelectedDay(dayData);
  };

  return (
    <CalendarTemplate
      header={<SiteHeader title={TITLE} subtitle={SUBTITLE} />}
      grid={<CalendarGrid items={items} onOpen={handleOpen} />}
      dialog={
        <DayDialog day={selectedDay} onClose={() => setSelectedDay(null)} />
      }
    />
  );
}
```

`src/components/pages/CalendarPage/index.ts`:

```ts
export * from './CalendarPage';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/pages/CalendarPage`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the coverage gate**

Run: `npm run test:coverage`
Expected: PASS — every `src/**/*.{ts,tsx}` file (outside the excludes) at ≥ 95 %.

- [ ] **Step 6: Commit**

```bash
git add advent-calendar-react/src/components/pages/CalendarPage
git commit -m "feat: add CalendarPage wiring hooks, data and components"
```

---

## Task 18: Integration — assets, real entry point, README, full verification

**Files:**
- Create: `advent-calendar-react/src/assets/background.png`, `gift1.png`, `gift2.png`, `gift3.png`, `gift4.png`, `gift5.png` (copied from the old project)
- Modify: `advent-calendar-react/src/main.tsx`
- Create: `advent-calendar-react/README.md`

**Interfaces:**
- Consumes: `CalendarPage` from `components/pages/CalendarPage`.
- Produces: a runnable, buildable app.

- [ ] **Step 1: Copy the image assets**

Run (from the repo root; `bash`):

```bash
mkdir -p advent-calendar-react/src/assets
cp "adventCalendar/calendario advento/photos/background.png" advent-calendar-react/src/assets/background.png
cp "adventCalendar/calendario advento/photos/gift_1.png" advent-calendar-react/src/assets/gift1.png
cp "adventCalendar/calendario advento/photos/gift_2.png" advent-calendar-react/src/assets/gift2.png
cp "adventCalendar/calendario advento/photos/gift_3.png" advent-calendar-react/src/assets/gift3.png
cp "adventCalendar/calendario advento/photos/gift_4.png" advent-calendar-react/src/assets/gift4.png
cp "adventCalendar/calendario advento/photos/gift_5.png" advent-calendar-react/src/assets/gift5.png
```

Expected: six files under `advent-calendar-react/src/assets/`.

- [ ] **Step 2: Replace the placeholder entry point**

`advent-calendar-react/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CalendarPage } from './components/pages/CalendarPage';
import './styles/theme.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <CalendarPage />
  </StrictMode>,
);
```

- [ ] **Step 3: Write the README**

`advent-calendar-react/README.md`:

```markdown
# Advent Calendar (React)

A React rewrite of a 2022 jQuery advent calendar: an irregular grid of 25
doors, falling snow, and a small surprise behind each day. Doors are gated by
the current date — today's door is highlighted, past doors can still be opened,
future doors only rattle. Opened days are remembered in `localStorage`.

## Develop

```bash
npm install
npm run dev
```

Add `?day=12` to the URL to preview a specific day outside December.

## Test

```bash
npm run test          # watch
npm run test:coverage # single run, fails under 95% coverage
npm run lint
npm run typecheck
```

## Build & deploy

```bash
npm run build   # -> dist/
```

`vite.config.ts` sets `base: './'`, so `dist/` works from any sub-path.

- **GitHub Pages:** publish the `dist/` folder (e.g. with `actions/deploy-pages`).
- **Vercel:** framework preset "Vite", build `npm run build`, output `dist`.

## Structure

Atomic Design under `src/components/` (`atoms → molecules → organisms →
templates → pages`); cross-cutting `hooks/`, `lib/`, `data/`, `styles/`,
`assets/`. Components import only from lower layers — enforced by ESLint
(`import/no-restricted-paths`).
```

- [ ] **Step 4: Full verification**

Run (from `advent-calendar-react/`):

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run preview
```

Expected: `lint`, `typecheck` clean; `test:coverage` passes with all four metrics ≥ 95 %; `build` writes `dist/`; `preview` serves it. Open the preview URL with `?day=8`: door 8 is highlighted ("Hoje" badge), doors 1–7 show the "Abrir" badge, doors 9–25 are greyed. Click door 8 → dialog opens with the day-8 content and a "Copiar" button; the code copies. Reload → door 8 now shows "Aberto". Click door 20 → it rattles, no dialog.

- [ ] **Step 5: Commit**

```bash
git add advent-calendar-react/src/assets advent-calendar-react/src/main.tsx advent-calendar-react/README.md
git commit -m "feat: wire real entry point, add assets and README"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| Vite + React 18 + TS, no legacy libs | 1 |
| Atomic Design layering + folder shape | 1 (ESLint zones), 7–17 |
| One-way import rule enforced | 1 (`import/no-restricted-paths`) |
| Coverage ≥ 95 % gate | 1 (config), 3–17 (checked each task), 18 (final) |
| CI workflow (typecheck, lint, coverage, build) | 1 |
| Data model `CalendarDay` + 25 days, grid areas ported | 2 |
| `getDayState` (locked/today/past/opened, today=0, opened wins) | 3 |
| `clipboard.copyText` with `execCommand` fallback, never throws | 4 |
| `useOpenedDays` — localStorage, in-memory fallback, malformed JSON, idempotent | 5 |
| `useAdventDay` / `computeAdventDay` — December clamp, off-season 0, `?day=` override | 6 |
| atoms: Button, Badge, DoorNumber, Snow | 7, 8, 9, 10 |
| Snow — canvas rAF, reduced-motion, visibility pause, cleanup | 10 |
| molecules: SiteHeader, CopyableCode, Door | 11, 12, 13 |
| Door — 4 states, aria-labels, shake (reduced-motion aware), badges, flip via CSS | 13 |
| organisms: CalendarGrid (25 doors), DayDialog (native `<dialog>`, code pill, close paths) | 14, 15 |
| templates: CalendarTemplate (background, Snow, slots) | 16 |
| pages: CalendarPage (hooks + data + dialog state) | 17 |
| Styling — `theme.css` tokens, CSS Modules, grid templates ported, 769px breakpoint | 1 (theme), 13/14 (grid + door CSS) |
| Error handling table (localStorage, clipboard, `?day=`, non-December, image load) | 4, 5, 6, 13 (img `alt` via background image is decorative; number+badge carry meaning) |
| `data/calendar.test.ts` invariant (25 unique days) | 2 |
| Deployment — `base`, README for Pages/Vercel | 1 (`base`), 18 (README) |
| Old project untouched | All (new folder only; Task 18 only *reads* old assets) |

Gap check: the spec's optional "deploy workflow to GitHub Pages" is explicitly a non-first-plan follow-up in the spec — intentionally omitted here.

**2. Placeholder scan:** No `TBD`/`TODO`/"add error handling"/"similar to Task N". Every code step has literal content. Snow's Step 5 gives an explicit fallback test recipe rather than a vague instruction.

**3. Type consistency:**
- `DayState` union defined in Task 3, imported unchanged in Tasks 13, 14.
- `CalendarDay` / `DoorSize` / `GiftImage` defined in Task 2, imported in Tasks 9, 13, 14, 15, 17.
- `getDayState(day, today, openedDays)` signature identical in Tasks 3, 14, 17.
- `CalendarGridItem { day, state }` defined in Task 14, imported in Task 17.
- `Badge` `variant` values `today | opened | available` — Task 8 defines; Task 13 maps `past → 'available'`, `opened → 'opened'`, `today → 'today'` (consistent).
- `copyText` returns `Promise<boolean>` — Task 4 defines, Tasks 12 uses.
- `useOpenedDays()` return shape `{ openedDays, markOpened }` — Task 5 defines, Task 17 uses.
- `computeAdventDay(now, search)` / `useAdventDay()` — Task 6 defines, Task 17 uses `useAdventDay`.
- Component prop interface names (`ButtonProps`, `BadgeProps`, `DoorNumberProps`, `DoorProps`, `CalendarGridProps`, `DayDialogProps`, `CalendarTemplateProps`, `SiteHeaderProps`, `CopyableCodeProps`) are each declared once and re-exported via `index.ts`.

No inconsistencies found.
