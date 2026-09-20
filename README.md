# Lacus — Lake Lucerne Boat Schedule

A boat schedule search app for Lake Lucerne (Vierwaldstättersee), built on the public
Swiss transport API.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- [lucide-react](https://lucide.dev/) icons
- Data: [transport.opendata.ch/v1](https://transport.opendata.ch/v1)

## Features

- Autocomplete origin/destination search across a verified list of Lake Lucerne piers
  (client-side, no network round-trip — see `src/piers.ts`)
- Quick-select chips for popular piers (Luzern, Weggis, Vitznau, Bürgenstock)
- Date/time picker with live connection search
- Schedule cards with a real-time journey progress timeline, motor-vessel/paddle-steamer
  category badges, and an expandable stop-by-stop itinerary
- Resilience: live API → 30-minute local cache → bundled fallback timetable, in that
  order, so the app still shows something useful if the upstream API is down or returns
  gaps

## Project structure

```
src/
  components/           UI components (search input, chips, schedule card, badges, brand assets)
  data/                 bundled fallback timetable JSON
  piers.ts              static list of verified Lake Lucerne boat piers
  scheduleCache.ts      localStorage-backed connection cache
  fallbackTimetable.ts  offline baseline schedule lookup
  types.ts, utils.ts    shared types & formatting helpers
  App.tsx, main.tsx, index.css
```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check, then production build
- `npm run lint` — oxlint
- `npm run preview` — preview a production build locally

## Deploy

Pushes to `main` build and deploy automatically to GitHub Pages via
`.github/workflows/deploy-pages.yml`.

## Design system & API rules

See `CLAUDE.md` for the color palette, typography, and API filtering rules this app
follows.
