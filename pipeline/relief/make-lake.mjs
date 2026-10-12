// Builds the three data files the 3D relief map needs for one lake (the website's hero and the
// apps): <lake>.json, <lake>-dem.png and <lake>-mask.png.
//
//   node pipeline/relief/make-lake.mjs <lake> [--out <dir>]
//
// The recipe is the one the first lake (Lucerne, made in Claude Design) was built with, confirmed
// by rebuilding it: see README.md beside this file. Lakes are configured in lakes.json.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from './png.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, '.cache');
const USER_AGENT = 'lacus-relief-tool/1.0';
const TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const MARGIN = 150; // pixels of land kept around the lake's outline, on every side
const MAX_WIDTH = 1600; // the zoom is the highest at which the picture is no wider than this
const ATTRIBUTION = 'Elevation: Mapzen Terrain Tiles (AWS Open Data; SRTM, EU-DEM et al.). Lakes: © OpenStreetMap contributors (ODbL).';

const [lakeId, ...rest] = process.argv.slice(2);
const outDir = rest[0] === '--out' ? rest[1] : join(HERE, 'out');
const lakes = JSON.parse(readFileSync(join(HERE, 'lakes.json'), 'utf8'));
const lake = lakes[lakeId];
if (!lake) { console.error(`Usage: node pipeline/relief/make-lake.mjs <${Object.keys(lakes).join('|')}> [--out <dir>]`); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function cached(name, load) {
  const file = join(CACHE, name);
  if (existsSync(file)) return readFileSync(file);
  mkdirSync(dirname(file), { recursive: true });
  const data = await load();
  writeFileSync(file, data);
  return data;
}
async function download(url, headers = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers }, signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) { lastError = error; await sleep(1500 * attempt); }
  }
  throw lastError;
}

// Web Mercator pixel grid at zoom z: 256 * 2^z pixels across the world.
const grid = (z) => 256 * 2 ** z;
const lonToX = (lon, z) => ((lon + 180) / 360) * grid(z);
const latToY = (lat, z) => { const s = Math.sin((lat * Math.PI) / 180); return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * grid(z); };

// A water body's outline from OpenStreetMap, as loose line segments in longitude and latitude.
// Even-odd filling needs no assembled rings: islands (inner ways) cut themselves out.
async function outline({ type, id }) {
  const json = JSON.parse(await cached(`osm/${type}-${id}.json`, () => download(`https://www.openstreetmap.org/api/0.6/${type}/${id}/full.json`, { Accept: 'application/json' })));
  const nodes = new Map(), ways = new Map();
  for (const e of json.elements) { if (e.type === 'node') nodes.set(e.id, [e.lon, e.lat]); if (e.type === 'way') ways.set(e.id, e.nodes); }
  const root = json.elements.find((e) => e.type === type && e.id === id);
  const wayIds = type === 'way' ? [id] : root.members.filter((m) => m.type === 'way' && (m.role === 'outer' || m.role === 'inner' || m.role === '')).map((m) => m.ref);
  const segments = [];
  for (const wayId of wayIds) { const pts = (ways.get(wayId) ?? []).map((n) => nodes.get(n)); for (let i = 1; i < pts.length; i++) segments.push([pts[i - 1], pts[i]]); }
  return { name: root.tags?.name ?? `${type} ${id}`, segments };
}

const main = await outline(lake.osm);
const lons = main.segments.flatMap(([a, b]) => [a[0], b[0]]), lats = main.segments.flatMap(([a, b]) => [a[1], b[1]]);
const box = { west: Math.min(...lons), east: Math.max(...lons), south: Math.min(...lats), north: Math.max(...lats) };

// The frame: the outline's box plus the margin, on whole pixels.
let z = lake.zoom ?? 12;
const margin = lake.margin ?? MARGIN;
const frame = () => {
  const x0 = Math.floor(lonToX(box.west, z) - margin), y0 = Math.floor(latToY(box.north, z) - margin);
  return { x0, y0, W: Math.ceil(lonToX(box.east, z) + margin) - x0, H: Math.ceil(latToY(box.south, z) + margin) - y0 };
};
if (lake.zoom == null) while (frame().W > MAX_WIDTH && z > 8) z--;
const { x0, y0, W, H } = frame();
// Metres per pixel at the middle of the frame.
const midLat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y0 + H / 2)) / grid(z)))) * 180) / Math.PI;
const mpp = (40075016.686 * Math.cos((midLat * Math.PI) / 180)) / grid(z);
console.log(`${lakeId}: ${main.name}, zoom ${z}, ${W} x ${H} px at ${mpp.toFixed(1)} m/px`);

// 1. Elevation: the tiles' own pixels, stitched and cropped, unchanged (height = R*256 + G + B/256 - 32768 m).
const dem = Buffer.alloc(W * H * 3);
for (let ty = Math.floor(y0 / 256); ty <= Math.floor((y0 + H - 1) / 256); ty++) {
  for (let tx = Math.floor(x0 / 256); tx <= Math.floor((x0 + W - 1) / 256); tx++) {
    const tile = decodePng(await cached(`tiles/${z}-${tx}-${ty}.png`, () => download(`${TILES}/${z}/${tx}/${ty}.png`)));
    for (let py = 0; py < 256; py++) {
      const y = ty * 256 + py - y0;
      if (y < 0 || y >= H) continue;
      for (let px = 0; px < 256; px++) {
        const x = tx * 256 + px - x0;
        if (x < 0 || x >= W) continue;
        tile.data.copy(dem, (y * W + x) * 3, (py * 256 + px) * tile.channels, (py * 256 + px) * tile.channels + 3);
      }
    }
  }
}
const height = (x, y) => { const k = (y * W + x) * 3; return dem[k] * 256 + dem[k + 1] + dem[k + 2] / 256 - 32768; };

// 2. Water mask: the lake and the other lakes in the frame, drawn at double size and averaged down
//    (five grey levels). Rivers are left out, so they do not cut channels through the towns.
const S = 2, big = new Uint8Array(W * S * H * S);
const bodies = [main, ...(await Promise.all((lake.alsoWater ?? []).map(outline)))];
for (const body of bodies) {
  const fill = new Uint8Array(W * S * H * S);
  const edges = body.segments.map(([a, b]) => [(lonToX(a[0], z) - x0) * S, (latToY(a[1], z) - y0) * S, (lonToX(b[0], z) - x0) * S, (latToY(b[1], z) - y0) * S]).filter(([, ya, , yb]) => ya !== yb);
  for (let row = 0; row < H * S; row++) {
    const yc = row + 0.5, xs = [];
    for (const [xa, ya, xb, yb] of edges) if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) xs.push(xa + ((yc - ya) / (yb - ya)) * (xb - xa));
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.ceil(xs[i] - 0.5)); x <= Math.min(W * S - 1, Math.floor(xs[i + 1] - 0.5)); x++) fill[row * W * S + x] = 1;
  }
  for (let i = 0; i < fill.length; i++) if (fill[i]) big[i] = 1;
}
const mask = Buffer.alloc(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const n = big[2 * y * W * S + 2 * x] + big[2 * y * W * S + 2 * x + 1] + big[(2 * y + 1) * W * S + 2 * x] + big[(2 * y + 1) * W * S + 2 * x + 1];
  mask[y * W + x] = Math.round((n * 255) / 4);
}

// The lake's level: the commonest height on its water, unless the official one is configured.
let lakeLevel = lake.lakeLevel;
let elevMin = Infinity, elevMax = -Infinity;
const mainFill = new Map();
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const e = height(x, y);
  elevMin = Math.min(elevMin, e); elevMax = Math.max(elevMax, e);
  if (mask[y * W + x] === 255) { const k = Math.round(e); mainFill.set(k, (mainFill.get(k) ?? 0) + 1); }
}
if (lakeLevel == null) lakeLevel = [...mainFill.entries()].sort((a, b) => b[1] - a[1])[0][0];

// 3. Example routes, from the lake's own timetable package: real trips, with the piers they call
//    at and their times. Each is drawn as a path through the water (never over land), kept off
//    the shore and smoothed. Piers on rivers, outside the water mask, are left out.
const DATA = 'https://storage.googleapis.com/lacus-data';
const WATER = 128, REACH = 10, MAX_ROUTES = 5, MAX_NAMED = 6;
const isWater = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[y * W + x] >= WATER;
// How far each water pixel is from land (capped), so paths can keep to open water.
const SHORE = 8, off = new Uint8Array(W * H).fill(255);
{ let ring = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!isWater(x, y)) { off[y * W + x] = 0; ring.push(y * W + x); }
  for (let d = 1; d <= SHORE && ring.length; d++) { const next = []; for (const k of ring) { const x = k % W, y = (k - x) / W; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (off[j] > d) { off[j] = d; next.push(j); } } } ring = next; } }
const snap = (px, py) => { let best = null, bd = REACH * REACH; for (let y = Math.max(0, Math.round(py) - REACH); y <= Math.min(H - 1, Math.round(py) + REACH); y++) for (let x = Math.max(0, Math.round(px) - REACH); x <= Math.min(W - 1, Math.round(px) + REACH); x++) { if (!isWater(x, y)) continue; const d = (x - px) ** 2 + (y - py) ** 2; if (d < bd) { bd = d; best = [x, y]; } } return best; };

// Shortest way through the water (A*), dearer near the shore so it keeps to open water. Its
// working arrays are shared between calls and reset by a stamp, since a lake is millions of cells.
// (64-bit costs: with 32-bit ones, rounding makes equal paths look cheaper for ever.)
const cost = new Float64Array(W * H), from = new Int32Array(W * H), stamp = new Uint32Array(W * H);
let round = 0, heapKey = new Float64Array(1 << 16), heapCell = new Int32Array(1 << 16), heapSize = 0;
function heapPush(key, cell) {
  if (heapSize === heapKey.length) { const k = new Float64Array(heapSize * 2), c = new Int32Array(heapSize * 2); k.set(heapKey); c.set(heapCell); heapKey = k; heapCell = c; }
  let i = heapSize++;
  while (i > 0) { const p = (i - 1) >> 1; if (heapKey[p] <= key) break; heapKey[i] = heapKey[p]; heapCell[i] = heapCell[p]; i = p; }
  heapKey[i] = key; heapCell[i] = cell;
}
function heapPop() {
  const cell = heapCell[0], key = heapKey[--heapSize], last = heapCell[heapSize];
  let i = 0;
  for (;;) { let m = 2 * i + 1; if (m >= heapSize) break; if (m + 1 < heapSize && heapKey[m + 1] < heapKey[m]) m++; if (heapKey[m] >= key) break; heapKey[i] = heapKey[m]; heapCell[i] = heapCell[m]; i = m; }
  heapKey[i] = key; heapCell[i] = last;
  return cell;
}
function waterPath([sx, sy], [tx, ty]) {
  const start = sy * W + sx, goal = ty * W + tx;
  round++; heapSize = 0;
  const seen = (k) => stamp[k] === round;
  stamp[start] = round; cost[start] = 0; from[start] = -1; heapPush(0, start);
  let found = start === goal;
  while (heapSize && !found) {
    const k = heapPop();
    if (k === goal) { found = true; break; }
    const x = k % W, y = (k - x) / W;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!isWater(nx, ny)) continue;
      const j = ny * W + nx, near = Math.max(0, SHORE - off[j]) / SHORE;
      const c = cost[k] + Math.hypot(dx, dy) * (1 + 4 * near * near);
      if (!seen(j) || c < cost[j]) { stamp[j] = round; cost[j] = c; from[j] = k; heapPush(c + Math.hypot(tx - nx, ty - ny), j); }
    }
  }
  if (!found) return null;
  const cells = []; for (let k = goal; k >= 0; k = from[k]) cells.push([k % W, Math.floor(k / W)]);
  return cells.reverse();
}
function smooth(cells) {
  let pts = cells.filter((_, i) => i % 10 === 0 || i === cells.length - 1);
  for (let pass = 0; pass < 2 && pts.length > 2; pass++) { const out = [pts[0]]; for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]); } out.push(pts.at(-1)); pts = out; }
  return pts.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
}

const routes = [], piers = [];
if (lake.lakeId) {
  const manifest = JSON.parse(await download(`${DATA}/${lake.lakeId}/manifest.json`));
  const pkg = JSON.parse(await download(`${DATA}/${lake.lakeId}/${manifest.timetable.path}`));
  const at = pkg.stops.map((stop) => snap(lonToX(stop.lon, z) - x0, latToY(stop.lat, z) - y0));
  const calls = new Array(pkg.stops.length).fill(0);
  const patterns = new Map(); // stop sequence -> its trips
  for (const trip of pkg.trips) {
    let seq = trip.stops.filter((call, i) => i === 0 || call[0] !== trip.stops[i - 1][0]);
    for (const call of seq) calls[call[0]]++;
    // A round trip is shown one way: out to the pier furthest from where it starts.
    const first = at[seq[0][0]];
    if (first && seq.length > 2 && seq[0][0] === seq.at(-1)[0]) { let far = 1, fd = -1; seq.forEach((call, i) => { const q = at[call[0]]; if (q) { const d = Math.hypot(q[0] - first[0], q[1] - first[1]); if (d > fd) { fd = d; far = i; } } }); seq = seq.slice(0, far + 1); }
    // Keep the longest run of piers that are on the lake itself.
    let best = [], run = [];
    for (const call of seq) { if (at[call[0]]) run.push(call); else { if (run.length > best.length) best = run; run = []; } }
    if (run.length > best.length) best = run;
    if (best.length < 2 || new Set(best.map((c) => c[0])).size !== best.length) continue;
    const key = best.map((c) => c[0]).join('>');
    if (!patterns.has(key)) patterns.set(key, []);
    patterns.get(key).push(best);
  }
  // Every pier on the lake itself, with how many trips call there (busier piers are named first).
  pkg.stops.forEach((stop, i) => { if (at[i]) piers.push({ id: stop.id, name: stop.shortName, x: at[i][0], y: at[i][1], calls: calls[i] }); });
  const span = (seq) => seq.slice(1).reduce((sum, c, i) => sum + Math.hypot(at[c[0]][0] - at[seq[i][0]][0], at[c[0]][1] - at[seq[i][0]][1]), 0);
  let pool = [...patterns.values()].map((trips) => ({ trips, seq: trips[0], span: span(trips[0]) }));
  const chosen = [], seen = new Set();
  const wanted = (lake.routes ?? []).map(([a, b]) => pool.filter((p) => pkg.stops[p.seq[0][0]].id === a && pkg.stops[p.seq.at(-1)[0]].id === b).sort((p, q) => q.trips.length - p.trips.length)[0]).filter(Boolean);
  for (const p of wanted) { chosen.push(p); p.seq.forEach((c) => seen.add(c[0])); }
  // Otherwise: the longest regular trip first, then the trips that add the most piers not yet shown.
  while (!lake.routes && chosen.length < MAX_ROUTES) {
    const regular = pool.filter((p) => !chosen.includes(p) && p.trips.length >= 2);
    const gain = (p) => p.seq.filter((c) => !seen.has(c[0])).length;
    const next = chosen.length === 0 ? regular.sort((p, q) => q.span - p.span)[0] : regular.filter((p) => gain(p) >= 1).sort((p, q) => gain(q) - gain(p) || q.trips.length - p.trips.length)[0];
    if (!next) break;
    chosen.push(next); next.seq.forEach((c) => seen.add(c[0]));
  }
  const clock = (sec) => `${String(Math.floor(sec / 3600) % 24).padStart(2, '0')}:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}`;
  for (const { trips, seq } of chosen) {
    // A daytime run of this trip, for the times shown.
    const trip = trips.slice().sort((a, b) => Math.abs(a[0][2] - 11 * 3600) - Math.abs(b[0][2] - 11 * 3600))[0];
    const legs = []; let ok = true;
    for (let i = 0; i + 1 < trip.length; i++) { const leg = waterPath(at[trip[i][0]], at[trip[i + 1][0]]); if (!leg) { ok = false; break; } legs.push(i ? leg.slice(1) : leg); }
    if (!ok) { console.log(`  skipped ${pkg.stops[seq[0][0]].shortName} → ${pkg.stops[seq.at(-1)[0]].shortName}: no way through the water`); continue; }
    // Name the two ends and the busiest piers in between.
    const inner = trip.slice(1, -1).map((c, i) => ({ c, i })).sort((a, b) => calls[b.c[0]] - calls[a.c[0]]).slice(0, MAX_NAMED - 2).sort((a, b) => a.i - b.i).map((v) => v.c);
    const named = [trip[0], ...inner, trip.at(-1)];
    routes.push({ name: `${pkg.stops[trip[0][0]].shortName} → ${pkg.stops[trip.at(-1)[0]].shortName}`, pts: smooth(legs.flat()),
      stops: named.map((c, i) => ({ id: pkg.stops[c[0]].id, name: pkg.stops[c[0]].shortName, time: clock(i === named.length - 1 ? c[1] : c[2]), x: at[c[0]][0], y: at[c[0]][1] })) });
  }
  console.log(`  routes: ${routes.map((r) => `${r.name} (${r.stops.length} piers named)`).join('; ') || 'none'}`);
}

// Which side of its pin a pier's name sits on, unless configured: away from the middle of its route.
const labels = {};
for (const route of routes) { const cx = route.stops.reduce((t, p) => t + p.x, 0) / route.stops.length, cy = route.stops.reduce((t, p) => t + p.y, 0) / route.stops.length;
  for (const p of route.stops) if (!(p.name in labels)) { const dx = p.x - cx, dy = p.y - cy; labels[p.name] = Math.abs(dx) > Math.abs(dy) * 1.4 ? (dx < 0 ? 'l' : 'r') : dy > 0 ? 'b' : 'c'; } }

// The half-size elevation image phones load: 2 x 2 blocks averaged as heights (never per colour
// channel, which would corrupt them), re-encoded the same way.
const hw = Math.ceil(W / 2), hh = Math.ceil(H / 2), half = Buffer.alloc(hw * hh * 3);
for (let j = 0; j < hh; j++) for (let i = 0; i < hw; i++) {
  const at2 = (x, y) => height(Math.min(x, W - 1), Math.min(y, H - 1)) + 32768;
  const q = Math.round(((at2(2 * i, 2 * j) + at2(2 * i + 1, 2 * j) + at2(2 * i, 2 * j + 1) + at2(2 * i + 1, 2 * j + 1)) / 4) * 256);
  half[(j * hw + i) * 3] = (q >> 16) & 255; half[(j * hw + i) * 3 + 1] = (q >> 8) & 255; half[(j * hw + i) * 3 + 2] = q & 255;
}

// Where the camera looks by default: the middle of the lake's own water, in model units.
let sumX = 0, sumY = 0, count = 0;
{ const edges = main.segments.map(([a, b]) => [lonToX(a[0], z) - x0, latToY(a[1], z) - y0, lonToX(b[0], z) - x0, latToY(b[1], z) - y0]).filter(([, ya, , yb]) => ya !== yb);
  for (let row = 0; row < H; row += 4) { const yc = row + 0.5, xs = []; for (const [xa, ya, xb, yb] of edges) if ((ya <= yc && yb > yc) || (yb <= yc && ya > yc)) xs.push(xa + ((yc - ya) / (yb - ya)) * (xb - xa)); xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) { const a = Math.max(0, xs[i]), b = Math.min(W, xs[i + 1]); if (b > a) { sumX += ((a + b) / 2) * (b - a); sumY += row * (b - a); count += b - a; } } } }
const unit = 360 / W, center = lake.center ?? [Math.round((sumX / count - W / 2) * unit), 0, Math.round((sumY / count - H / 2) * unit)];

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, `${lakeId}-dem-half.png`), encodePng({ width: hw, height: hh, channels: 3, data: half }));
writeFileSync(join(outDir, `${lakeId}-dem.png`), encodePng({ width: W, height: H, channels: 3, data: dem }));
writeFileSync(join(outDir, `${lakeId}-mask.png`), encodePng({ width: W, height: H, channels: 1, data: mask }));
// The model is always 360 units wide; a lake that is taller in proportion than Lucerne is viewed from further back.
const distance = lake.distance ?? Math.max(1, Math.round((H / W / (1127 / 1310)) * 100) / 100);
const meta = { z, x0, y0, W, H, mpp, elevMin, elevMax, lakeLevel, attribution: ATTRIBUTION, name: lake.name, ...(distance !== 1 ? { distance } : {}),
  ...(lake.exaggeration != null ? { exaggeration: lake.exaggeration } : {}), center, labels: { ...labels, ...(lake.labels ?? {}) }, routes: lake.keepRoutes ? JSON.parse(readFileSync(lake.keepRoutes, 'utf8')).routes : routes, piers };
writeFileSync(join(outDir, `${lakeId}.json`), JSON.stringify(meta));
console.log(`wrote ${outDir}/${lakeId}{.json,-dem.png,-mask.png}; lake level ${lakeLevel} m, heights ${elevMin.toFixed(0)} to ${elevMax.toFixed(0)} m, water from ${bodies.map((b) => b.name).join(', ')}`);
