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
