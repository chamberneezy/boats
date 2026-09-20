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
- Riders see short place names ("Luzern", "Bürgenstock"), never official station names ("Luzern Bahnhofquai"). `PierOption.name` is the short name, `fullName` the official one (still searchable). Use `pierLabel()` for any station name from the API. Short names must stay unique.
- Choosing an origin (tap, Enter, or typing an exact unambiguous name) moves focus to the empty Destination and opens its suggestions. A name that starts another pier ("Meggen" / "Meggenhorn") is not auto-picked.
- The date and time is one tappable line with a calendar icon; a transparent native `datetime-local` input lies over it so the phone's own picker opens (no separate date and time boxes: iOS Safari renders them unreliably). Tapping the collapsed summary after a search always reopens the origin/destination tab.
- The control between Origin and Destination is a swap button (ArrowLeftRight icon), not an arrow.
- With nothing typed, the popular piers (Luzern Bahnhofquai, Weggis, Vitznau, Kehrsiten-Bürgenstock, Brunnen) are shown as presets.
- Riders must **never** see whether data is live, cached or a fallback. No badges, banners or labels about the source.
  Source is reported only via `reportDataSource()` in `src/dataSourceMonitor.ts` (console for now, backend later).
- Schedule state is a coloured dot only (`StatusBadge`), shown left of the category pill on every card and next to the route on the trip page, never with visible text (screen readers still get the status): on time (green), delayed, cancelled. On time and delayed blink; cancelled does not.
  SGV boats provide **no** real-time data through the API (delay/prognosis always empty, no cancellation flag), so by product decision every sailing shows green on time unless a delay is reported (`ASSUME_ON_TIME_WITHOUT_REALTIME` in `src/connections.ts`). Delayed and cancelled need a real source (GTFS-RT or a manual override).
- "Reserve" / "Buy" are shown disabled until a booking system exists.
- Boat names, amenities (R / WC / accessible) and the map are not built yet; do not show invented data for them.

## Routing (react-router, `src/routes.ts` holds every URL shape)
- `/` Home, `/schedules` Schedules, `/search/lake-lucerne` search form, `/search/lake-lucerne?from=&to=&date=&time=` results, `/trip/lake-lucerne?from=&to=&dep=` one sailing.
- The URL is the source of truth for search state; each trip is its own history entry. Back/forward must restore results without a refetch.
- The URL scheme is provisional (pier ids, unix seconds); the owner will specify the final scheme.
- GitHub Pages needs `public/404.html` plus the redirect script in `index.html` for deep links. Remove both when hosting rewrites all paths to `index.html`.
- Schedules: Lake Lucerne shows real departures from the stationboard endpoint; other lakes use sample data from `src/data/sampleSchedules.ts` until real data exists.

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

## Home page (mobile splash and lake order)
- Every screen size gets `SplashHero` at the top of Home: a full-screen photo with a transparent header floating over its top edge (white nav/menu/search and logo, soft shade behind them; the header takes no height on Home and scrolls away with the splash), shutter doors opening, the hero headline, a rule, the tag line "Swiss lake crossings" and finally a "Select your lake" button that scrolls to the lakes. Phones use the portrait `public/splash/hero.jpg`, `md` and up the landscape `public/splash/hero-desktop.jpg` (both the owner's photos, via `<picture>`). Motion is ported from the Lacus Splash v2 design (`src/splash/timeline.ts`: scene timings and easing). Plays once per session and is skipped for reduced-motion. The old text hero and animation placeholder are gone.
- Render only the layout that applies (`useMediaQuery`), never both hidden with CSS, so unused photos are not created.
- Lake order everywhere (`src/lakes.ts`): three most popular first (Lucerne, Geneva, Zurich), then grouped by Switzerland Tourism region names: Central Switzerland (Zug), Bernese Oberland (Thun, Brienz), Jura & Three-Lakes (Neuchâtel, Biel, Murten), Eastern Switzerland (Constance), Ticino (Lugano, Maggiore). On phones the regions are collapsed groups whose cards and photos render only when opened.

## Photography
- Lake card photos live in `public/lakes/{lake-id}.jpg` (Wikimedia Commons, CC BY / CC BY-SA). Credits are in `src/data/lakePhotos.ts` and shown under "Photo credits" on Home. Every photo added must have a credit entry there; do not use a photo without a licence that allows it.
- Cards fall back to the placeholder box if a photo is missing.
- The splash photos `public/splash/hero.jpg` (portrait, about 900 × 1800) and `hero-desktop.jpg` (landscape 16:9, about 2200 × 1238) are the owner's own; no credit needed. Export new ones as JPEG without EXIF/GPS metadata.

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
