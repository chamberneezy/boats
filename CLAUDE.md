# CLAUDE.md - Swiss Lake Boat Schedule Web App

## Tech Stack
- Framework: Vite + React + TypeScript
- Styling: Tailwind CSS
- Icons: Lucide React (`lucide-react`)
- Data API: `https://transport.opendata.ch/v1`

## UI & Search Behavior
- Replace fixed dropdowns with **Autocomplete Search Inputs** for Origin and Destination.
- Query live piers dynamically via:
  `GET https://transport.opendata.ch/v1/locations?query={searchTerm}&type=station`
- Show preset quick-select buttons for popular Lake Lucerne piers (Luzern, Weggis, Vitznau, Bürgenstock) to quickly fill the search inputs.

## Design System (Swiss Marine Theme)
- Primary Accent (Deep Lake Blue): `#0B3C5D` (`bg-lake-dark`, `text-lake-dark`)
- Secondary Accent (Swiss Nautical Red): `#D93829` (`bg-lake-red`, `text-lake-red`)
- Background: `#F8FAFC` (`bg-slate-50`)
- Card Surface: `#FFFFFF` (`bg-white`)
- Primary Text: `#0F172A` (`text-slate-900`)
- Muted Text: `#64748B` (`text-slate-500`)
- Status Green (On Time): `#10B981` (`emerald-500`)

## Category Badges
- Motor Vessel (`BAT`): Sky pill badge (`bg-sky-100 text-sky-800`) with Ship icon.
- Paddle Steamer (`BAV`): Soft red pill badge (`bg-red-100 text-red-700`) with Anchor icon.

## API Filtering Rules
1. Connections endpoint: `GET /connections?from={fromId}&to={toId}&transportations[]=ship`
2. Filter connection sections strictly where `journey.category` equals `BAT` or `BAV`.
3. Stationboard endpoint: `GET /stationboard?id={stationId}&transportations[]=ship`