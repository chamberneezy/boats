# CLAUDE.md - Lacus: Swiss Lake Boat Schedule App

## Tech Stack
- Framework: Vite + React + TypeScript
- Styling: Tailwind CSS (v4, tokens in `src/index.css` `@theme`)
- Icons: Lucide React (`lucide-react`)
- Fonts: Kanit (500/600, headings, buttons, times) and Karma (400/500, body). No other families.
- Data API: `https://transport.opendata.ch/v1`

## Workflow
- do not push to GitHub, nor suggest commits without me asking first
- Do not suggest contacting SGV; SGV data comes from scraping their public pages (`scripts/scrape-sgv.mjs`).

## UI & Search Behavior
- Origin and Destination are **Autocomplete Search Inputs**: type to filter, Enter picks the first match, Escape closes.
- Suggestions filter the static list of verified Lake Lucerne boat piers in `src/piers.ts`. They do **not** call `/locations` (it returns trains, buses and cable cars too).
- With nothing typed, the popular piers (Luzern Bahnhofquai, Weggis, Vitznau, Kehrsiten-Bürgenstock, Brunnen) are shown as presets.
- Riders must **never** see whether data is live, cached or a fallback. No badges, banners or labels about the source.
  Source is reported only via `reportDataSource()` in `src/dataSourceMonitor.ts` (console for now, backend later).
- Schedule state is a coloured dot only (`StatusBadge`): on time, delayed, cancelled. No real-time data means **no dot**, never an assumed "on time". Stale-cache and bundled-timetable results carry no status.
- "Reserve" / "Buy" are shown disabled until a booking system exists.
- Boat names, amenities (R / WC / accessible) and the map are not built yet; do not show invented data for them.

## Design System (Lacus)
Source of truth: the Lacus Mockups and Lacus Design System projects in Claude Design. Tokens live in `src/index.css`.
- Deep Lake `#16384A` (`text-deep-lake`, `bg-deep-lake`): primary text, dark surfaces, end-of-route dot
- Alpine Sky `#4A90A4` (`text-alpine-sky`): secondary text, eyebrows, back links
- Stone Grey `#8D9A9C` (`text-stone-grey`): muted text, placeholders
- Glacier Mist `#EDF3F4` (`bg-surface-page`): page background
- Card `#FFFFFF` (`bg-surface-card`) with `shadow-card`; sunken surface `#E2EBEC` (`bg-surface-sunken`) for pills and placeholders
- Hairlines: `border-hairline` (Alpine Sky at 28%); prefer dividers over card borders
- Sunline Gold `#C99A4B` (`bg-sunline-gold`, pressed `#B4863A`): the **only** CTA colour, white label, at most one CTA per screen. Disabled: `bg-cta-disabled`
- Status dots: on time `#3F8F5C`, delayed `#C9762E`, cancelled `#B5473F` (`bg-status-*`). Never used as a CTA colour. On time and delayed blink; cancelled does not.
- Radius 10–16px on cards, buttons and inputs; no fully round buttons or inputs. Times use tabular numerals.
- Tone: calm, precise, no exclamation marks, no emoji, sentence case, no gradients.

## Category Badges
- One neutral pill for both types: `bg-surface-sunken text-deep-lake`, Kanit 500 (`CategoryPill`).
- Motor Vessel (`BAT`, includes electric): Ship icon, label "Motor vessel".
- Paddle Steamer (`BAV`): Anchor icon, label "Paddle steamer".
- On phones the pill inside result cards shows the icon only; the label stays for screen readers.

## API Filtering Rules
1. Connections endpoint: `GET /connections?from={fromId}&to={toId}&transportations[]=ship`
2. Filter connection sections strictly where `journey.category` equals `BAT` or `BAV`.
3. Stationboard endpoint (not used yet): `GET /stationboard?id={stationId}&transportations[]=ship`
4. Useful fields: `section.departure.platform` is the pier number, `journey.number` the line (e.g. 3600), `journey.name` the zero-padded Kurs number (e.g. `000029`). `delay` is `null` when there is no real-time data.

## Data Layer
- The UI calls only `searchConnections` / `loadLaterConnections` in `src/connections.ts`.
- Fallback order: fresh cache (30 min) -> live API -> stale cache -> bundled timetable (`src/data/fallbackTimetable.json`, valid only inside its stated season) -> error.
- Scraped SGV data (machine-owned, never hand-edit): `src/data/scraped/sgv-fleet.json` and `sgv-assignments.json`, refreshed with `npm run scrape:sgv`. Only steamer (DS) assignments are published; motor-ship names per Kurs are not available.
- Planned backend: Firebase/GCP (GTFS timetable ingestion, GTFS-RT live overlay, scheduled SGV scrape, monitoring).
