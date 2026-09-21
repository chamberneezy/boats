# CLAUDE.md - Lacus: Swiss Lake Boat Schedule App

## Stack and workflow
- Vite + React + TypeScript, Tailwind v4 (tokens in `src/index.css` `@theme`), `lucide-react`, `react-router`.
- Fonts: Kanit (500/600: headings, buttons, times) and Karma (400/500: body). No others.
- Data API: `https://transport.opendata.ch/v1`.
- Do not push to GitHub, nor suggest commits, without being asked first.
- Do not suggest contacting SGV; SGV data comes from scraping their public pages (`scripts/scrape-sgv.mjs`).

## Search behaviour
- Origin and Destination are autocomplete inputs over the static verified pier list in `src/piers.ts` (no `/locations` call: it also returns trains and buses). Enter picks the first match, Escape closes. With nothing typed, popular piers are shown as presets.
- Riders see short place names ("Luzern", "Bürgenstock"), never official ones. `PierOption.name` is short, `fullName` official (still searchable). Use `pierLabel()` for API station names. Short names must stay unique.
- Picking an origin (tap, Enter, or typing an exact unambiguous name) focuses the empty Destination and opens its suggestions. "Meggen" is not auto-picked because "Meggenhorn" also starts with it.
- The control between the fields is a swap button (ArrowLeftRight), never a plain arrow, in the form and in the collapsed summary; in the summary it reverses the trip and searches again at once.
- Date and time is one tappable line; a transparent native `datetime-local` input covers it so the phone's picker opens (separate date/time boxes render badly on iOS Safari).
- After a search the form collapses; tapping the summary reopens the origin/destination tab.
- "Reserve" / "Buy" stay disabled until booking exists. Boat names, amenities and the map are not built: never show invented data for them.

## Data and status
- Riders must never see whether data is live, cached or fallback. Source goes only to `reportDataSource()` (`src/dataSourceMonitor.ts`).
- Schedule state is a coloured dot only (`StatusBadge`), no visible text: left of the category pill on cards, next to the route on the trip page. SGV boats give no real-time data (delay/prognosis empty, no cancellation flag), so every sailing shows green "on time" unless a delay is reported (`ASSUME_ON_TIME_WITHOUT_REALTIME` in `src/connections.ts`). Delayed/cancelled need a real source (manual override or scraped notices).
- The UI calls only `searchConnections` / `loadLaterConnections` (`src/connections.ts`). Fallback order: fresh cache (30 min) -> live -> stale cache -> bundled timetable (`src/data/fallbackTimetable.json`, only within its season) -> error.
- Endpoints: `/connections?from=&to=&transportations[]=ship` (keep only `journey.category` `BAT`/`BAV`) and `/stationboard?id=&transportations[]=ship` (Schedules). Fields: `section.departure.platform` = pier number, `journey.number` = line (3600), `journey.name` = zero-padded Kurs (`000029`), `delay` null = no real-time.
- Scraped SGV data (never hand-edit): `src/data/scraped/sgv-*.json` via `npm run scrape:sgv`. Only steamer (DS) assignments are published; motor-ship names are not.
- Planned backend: Firebase/GCP (GTFS ingestion, scheduled SGV scrape, monitoring).

## Routing (`src/routes.ts` holds every URL shape)
- `/` Home, `/schedules`, `/search/lake-lucerne`, `/search/lake-lucerne?from=&to=&date=&time=` (results), `/trip/lake-lucerne?from=&to=&dep=` (one sailing). The scheme is provisional; the owner will specify the final one.
- The URL is the source of truth for search state; each trip is its own history entry; back/forward restore results without refetching.
- GitHub Pages needs `public/404.html` plus the redirect script in `index.html`; remove both once hosting rewrites all paths to `index.html`.
- Schedules: Lake Lucerne uses real stationboard departures (one row per destination); other lakes use `src/data/sampleSchedules.ts`.

## Screens
- Home opens with `SplashHero` at every size: full-width, full-screen owner photo (edge to edge; the copy and nav line up with the centred 1440px page container; the zoom shrinks on screens wider than ~2100px so the 2576px photo is never enlarged past its real size), transparent header floating over it (white, soft top shade, scrolls away with it), shutter doors, hero headline, rule, tag line, then a "Select your lake" button that scrolls to the lakes. Motion is ported from the Lacus Splash v2 design (`src/splash/timeline.ts`); plays once per session, skipped for reduced motion.
- Menu (`src/components/Menu.tsx`; hamburger left of the logo on desktop, left on Home on phones): X on the left, "Menu" title, app icon on the right, a placeholder (disabled) search bar, then Home, Schedules, Tickets and Account ("Coming soon"). It slides in from the left and **pushes the page aside, never covering it**: phones, the menu fills the screen and the page slides fully out; desktop, a 400px drawer and the page narrows by 400px. Phones lock page scroll. Closes on X, Escape, the hamburger or navigation. State is in `src/menu.ts` (Layout in `App.tsx` reads it).
- The trip page's "Back to departures" link is desktop-only; phones use the header back arrow. On desktop the main column is wider than the map (58%, max 860px) and the trip card up to 780px.
- Lake order (`src/lakes.ts`), same on every screen size (`LakeGroups`): Lucerne, Geneva, Zurich first, then Switzerland Tourism regions: Central Switzerland (Zug), Bernese Oberland (Thun, Brienz), Jura & Three-Lakes (Neuchâtel, Biel, Murten), Eastern Switzerland (Constance), Ticino (Lugano, Maggiore). Regions are collapsed; their cards and photos render only when opened.

## Design system (Lacus; source: Lacus Mockups and Lacus Design System in Claude Design)
- Deep Lake `#16384A` (`deep-lake`): text, dark surfaces. Alpine Sky `#4A90A4` (`alpine-sky`): secondary text, eyebrows. Stone Grey `#8D9A9C` (`stone-grey`): muted text.
- Page `bg-surface-page` `#EDF3F4`; card `bg-surface-card` white with `shadow-card`; sunken `bg-surface-sunken` `#E2EBEC` for pills and placeholders; `border-hairline` dividers over card borders.
- Sunline Gold `#C99A4B` (`sunline-gold`) is the only CTA colour, white label, at most one CTA per screen; disabled `bg-cta-disabled`.
- Status dots (`bg-status-*`): on time `#3F8F5C`, delayed `#C9762E`, cancelled `#B5473F`; never a CTA colour. On time and delayed blink; cancelled does not.
- Radius 10–16px; no fully round buttons or inputs. Tabular numerals for times.
- Tone: calm, precise, sentence case, no exclamation marks or emoji. No decorative gradients (soft shadows behind text on photos are fine).
- Category pill (`CategoryPill`): neutral `bg-surface-sunken`; `BAT` (incl. electric) Ship icon "Motor vessel"; `BAV` Anchor icon "Paddle steamer". On phones cards show the icon only.

## Photography
- Lake card photos: `public/lakes/{lake-id}.jpg` (Wikimedia Commons, CC BY / CC BY-SA). Every photo needs a credit in `src/data/lakePhotos.ts` (shown under "Photo credits" on Home); use only licences that allow it. Cards fall back to a placeholder if a photo is missing.
- Splash photos `public/splash/hero.jpg` (portrait 966×1932) and `hero-desktop.jpg` (16:9 2576×1449, full native width) are the owner's own, no credit. Export new photos as JPEG without EXIF/GPS metadata.
