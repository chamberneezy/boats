// Lacus web: the relief map as a map. lacus-3d.js builds the terrain and hands over here
// (mountRelief's `interactive` option); this file adds what a rider does with it: move it, zoom
// it, see every pier of the lake, pick two, and see the way between them drawn over the water.
// It draws only when something changes. The host page talks to it through window.__map and
// hears from it by postMessage ({ type: 'lacus-map', event: 'ready' | 'pick', id }).

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const POLAR = 0.68; // the hero's resting tilt
const TURN = 0.18; // and its slight turn to the east

export function interactiveMap(ctx, opts = {}) {
  const { THREE, scene, camera, renderer, size, uniforms, toWorld, meta, mask, W, H, unit, HEX, labelsEl, chalk } = ctx;
  const el = renderer.domElement;
  const tmp = new THREE.Vector3();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // No copy shares this view, so none of the hero's dimming under its headline.
  uniforms.uRelief.value = 1; uniforms.uCalmK.value = 0; uniforms.uCalmEnd.value = -1; uniforms.uCalmY.value = -1; uniforms.uStage.value = 0;

  // ── camera: a point on the ground it looks at, and how far back it stands ──
  const halfW = 180, halfH = (H * unit) / 2;
  const bounds = { x: halfW * 0.72, z: halfH * 0.72 }; // the look-at point stays well inside the terrain
  const R_MIN = 70, R_MAX = 430;
  // Home shows the whole lake: further back in a panel that is narrower than three by two (a phone).
  const homeR = () => clamp(250 * Math.max(1, 1.5 / (size.w / Math.max(1, size.h))), R_MIN, R_MAX);
  const home = opts.home ?? { x: meta.center?.[0] ?? 0, z: (meta.center?.[2] ?? 0) + 8, get r() { return homeR(); } };
  const cam = { x: home.x, z: home.z, r: home.r, az: TURN };
  let dirty = true;
  const invalidate = () => { dirty = true; };
  function placeCamera() {
    cam.r = clamp(cam.r, R_MIN, R_MAX); cam.x = clamp(cam.x, -bounds.x, bounds.x); cam.z = clamp(cam.z, -bounds.z, bounds.z);
    camera.clearViewOffset();
    camera.position.set(cam.x + cam.r * Math.sin(POLAR) * Math.sin(cam.az), cam.r * Math.cos(POLAR), cam.z + cam.r * Math.sin(POLAR) * Math.cos(cam.az));
    camera.lookAt(cam.x, 0, cam.z); camera.updateMatrixWorld();
    uniforms.uCam.value.copy(camera.position);
    uniforms.uFogN.value = Math.max(300, cam.r * 1.5); uniforms.uFogF.value = Math.max(520, cam.r * 2.6);
    renderer.getDrawingBufferSize(uniforms.uRes.value);
  }
  // Model units under one screen pixel, at the point looked at: what a drag of one pixel moves.
  const perPixel = () => (2 * cam.r * Math.tan((20 * Math.PI) / 180)) / Math.max(1, size.h);
  function pan(dxPx, dyPx) {
    touched = true;
    const k = perPixel(), rightX = Math.cos(cam.az), rightZ = -Math.sin(cam.az), fwdX = Math.sin(cam.az), fwdZ = Math.cos(cam.az);
    cam.x -= dxPx * k * rightX + (dyPx * k * fwdX) / Math.cos(POLAR);
    cam.z -= dxPx * k * rightZ + (dyPx * k * fwdZ) / Math.cos(POLAR);
    invalidate();
  }
  // Zooming keeps the point under the pointer (or between the fingers) where it is.
  function zoom(factor, atX = size.w / 2, atY = size.h / 2) {
    const before = cam.r; cam.r = clamp(cam.r * factor, R_MIN, R_MAX);
    const k = 1 - cam.r / before; pan(-(atX - size.w / 2) * k * (before / cam.r), -(atY - size.h / 2) * k * (before / cam.r));
    invalidate();
  }

  // ── piers ──
  const piers = (meta.piers ?? []).filter((p) => !opts.only || opts.only.includes(p.id)).sort((a, b) => b.calls - a.calls).map((p, rank) => {
    const [x, z] = toWorld(p.x, p.y);
    const group = new THREE.Group();
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 3.6, 8), chalk); stem.position.y = 1.8;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 12), chalk); head.position.y = 3.9;
    group.add(stem, head); group.position.set(x, 0, z); scene.add(group);
    const label = document.createElement('div');
    label.style.cssText = 'position:absolute;left:0;top:0;display:flex;flex-direction:column;align-items:center;gap:3px;white-space:nowrap;will-change:transform,opacity;transition:opacity .25s ease;pointer-events:none';
    label.innerHTML = `<span data-tag style="font:600 10px/1.4 Kanit,sans-serif;letter-spacing:.04em;text-transform:uppercase;color:${HEX.lake};background:${HEX.chalk};border-radius:5px;padding:1px 6px;display:none"></span><span style="font:500 13px/1.3 Kanit,sans-serif;color:${HEX.chalk};text-shadow:0 1px 6px rgba(12,36,49,.95)">${p.name}</span>`;
    labelsEl.appendChild(label);
    return { ...p, rank, wx: x, wz: z, group, head, label, tag: label.querySelector('[data-tag]'), sx: 0, sy: 0 };
  });
  const byId = new Map(piers.map((p) => [p.id, p]));
  let from = null, to = null, pulse = null;

  // ── the way between two piers: through the water of the lake mask, on a half-size grid ──
  const G = 2, gw = Math.ceil(W / G), gh = Math.ceil(H / G), water = new Uint8Array(gw * gh), shore = new Uint8Array(gw * gh).fill(255);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) water[y * gw + x] = mask[(Math.min(H - 1, y * G) * W + Math.min(W - 1, x * G)) * 4] >= 128 ? 1 : 0;
  { let ring = []; for (let k = 0; k < water.length; k++) if (!water[k]) { shore[k] = 0; ring.push(k); }
    for (let d = 1; d <= 5 && ring.length; d++) { const next = []; for (const k of ring) { const x = k % gw, y = (k - x) / gw; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const j = ny * gw + nx; if (shore[j] > d) { shore[j] = d; next.push(j); } } } ring = next; } }
  const cost = new Float64Array(gw * gh), prev = new Int32Array(gw * gh), stamp = new Uint32Array(gw * gh);
  let round = 0, hk = new Float64Array(1 << 14), hc = new Int32Array(1 << 14), hn = 0;
  const push = (key, cell) => { if (hn === hk.length) { const k = new Float64Array(hn * 2), c = new Int32Array(hn * 2); k.set(hk); c.set(hc); hk = k; hc = c; } let i = hn++; while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= key) break; hk[i] = hk[p]; hc[i] = hc[p]; i = p; } hk[i] = key; hc[i] = cell; };
  const pop = () => { const cell = hc[0], key = hk[--hn], last = hc[hn]; let i = 0; for (;;) { let m = 2 * i + 1; if (m >= hn) break; if (m + 1 < hn && hk[m + 1] < hk[m]) m++; if (hk[m] >= key) break; hk[i] = hk[m]; hc[i] = hc[m]; i = m; } hk[i] = key; hc[i] = last; return cell; };
  const nearestWater = (px, py) => { const cx = Math.round(px / G), cy = Math.round(py / G); let best = -1, bd = 1e9; for (let y = Math.max(0, cy - 8); y <= Math.min(gh - 1, cy + 8); y++) for (let x = Math.max(0, cx - 8); x <= Math.min(gw - 1, cx + 8); x++) if (water[y * gw + x]) { const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; best = y * gw + x; } } return best; };
  function wayBetween(a, b) {
    const start = nearestWater(a.x, a.y), goal = nearestWater(b.x, b.y);
    if (start < 0 || goal < 0) return null;
    const tx = goal % gw, ty = (goal - tx) / gw;
    round++; hn = 0; stamp[start] = round; cost[start] = 0; prev[start] = -1; push(0, start);
    let found = start === goal;
    while (hn && !found) {
      const k = pop(); if (k === goal) { found = true; break; }
      const x = k % gw, y = (k - x) / gw;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
        const j = ny * gw + nx; if (!water[j]) continue;
        const near = Math.max(0, 5 - shore[j]) / 5, c = cost[k] + Math.hypot(dx, dy) * (1 + 4 * near * near);
        if (stamp[j] !== round || c < cost[j]) { stamp[j] = round; cost[j] = c; prev[j] = k; push(c + Math.hypot(tx - nx, ty - ny), j); }
      }
    }
    if (!found) return null;
    let cells = []; for (let k = goal; k >= 0; k = prev[k]) cells.push([(k % gw) * G, Math.floor(k / gw) * G]);
    cells.reverse();
    let pts = [[a.x, a.y], ...cells.filter((_, i) => i % 5 === 0 && i > 0 && i < cells.length - 1), [b.x, b.y]];
    for (let pass = 0; pass < 2 && pts.length > 2; pass++) { const out = [pts[0]]; for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; out.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25], [ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]); } out.push(pts.at(-1)); pts = out; }
    return pts;
  }

  // ── the chosen route: a chalk line over the water that draws itself, with a dot at its head ──
  const lineM = new THREE.MeshBasicMaterial({ color: HEX.chalk, toneMapped: false });
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.9, 20, 12), chalk); dot.visible = false; scene.add(dot);
  let line = null, curve = null, drawn = 0, drawFrom = 0;
  const SEGMENTS = 400, RADIAL = 8, DRAW_MS = 1200;
  function setRoute(a, b) {
    if (line) { scene.remove(line); line.geometry.dispose(); line = null; curve = null; }
    dot.visible = false;
    const way = a && b ? wayBetween(a, b) : null;
    if (way && way.length > 1) {
      curve = new THREE.CatmullRomCurve3(way.map(([px, py]) => { const [x, z] = toWorld(px, py); return new THREE.Vector3(x, 0.35, z); }), false, 'centripetal');
      line = new THREE.Mesh(new THREE.TubeGeometry(curve, SEGMENTS, 0.28, RADIAL, false), lineM);
      line.geometry.setDrawRange(0, 0); scene.add(line);
      drawn = reduce ? 1 : 0; drawFrom = performance.now();
    }
    invalidate();
  }

  function select(fromId, toId) {
    const a = byId.get(fromId) ?? null, b = byId.get(toId) ?? null;
    if (a === from && b === to) return;
    const routeChanged = !(a === from && b === to);
    from = a; to = b;
    for (const p of piers) { const chosen = p === from || p === to; p.head.scale.setScalar(chosen ? 1.7 : 1); p.tag.style.display = chosen ? '' : 'none'; p.tag.textContent = p === from ? 'From' : p === to ? 'To' : ''; }
    if (routeChanged) setRoute(from, to);
    invalidate();
  }

  // ── labels: busiest piers first, and none on top of another ──
  function layout() {
    const placed = [];
    const order = piers.slice().sort((p, q) => (q === from || q === to) - (p === from || p === to) || p.rank - q.rank);
    for (const p of order) {
      tmp.set(p.wx, 4.9, p.wz).project(camera);
      p.sx = ((tmp.x + 1) / 2) * size.w; p.sy = ((1 - tmp.y) / 2) * size.h;
      const chosen = p === from || p === to, w = p.label.offsetWidth || 60, h = p.label.offsetHeight || 18;
      const box = { l: p.sx - w / 2 - 4, r: p.sx + w / 2 + 4, t: p.sy - h - 6, b: p.sy - 2 };
      const off = tmp.z > 1 || box.r < 0 || box.l > size.w || box.b < 0 || box.t > size.h;
      const hit = placed.some((q) => box.l < q.r && box.r > q.l && box.t < q.b && box.b > q.t);
      const show = !off && (chosen || !hit);
      p.label.style.opacity = show ? 1 : 0;
      if (show) { placed.push(box); p.label.style.transform = `translate(${(p.sx - w / 2).toFixed(1)}px,${(p.sy - h - 4).toFixed(1)}px)`; }
      // The pin's own place on screen, for picking.
      tmp.set(p.wx, 3.9, p.wz).project(camera); p.hx = ((tmp.x + 1) / 2) * size.w; p.hy = ((1 - tmp.y) / 2) * size.h;
    }
  }

  // ── drawing: only when something changed ──
  let lastW = 0, lastH = 0, touched = false; // `touched`: the visitor has moved the map, so a resize no longer re-frames it
  function frame(now) {
    requestAnimationFrame(frame);
    if (window.__heroPaused) return;
    if (size.w !== lastW || size.h !== lastH) { if (!touched) cam.r = home.r; lastW = size.w; lastH = size.h; dirty = true; }
    let moving = false;
    if (line && drawn < 1) { drawn = Math.min(1, (now - drawFrom) / DRAW_MS); const e = drawn < 0.5 ? 2 * drawn * drawn : 1 - Math.pow(-2 * drawn + 2, 2) / 2; line.geometry.setDrawRange(0, Math.floor(SEGMENTS * e) * RADIAL * 6); const q = curve.getPointAt(Math.min(1, e)); dot.position.set(q.x, 0.9, q.z); dot.visible = drawn < 1; moving = true; }
    else if (line && drawn === 1 && line.geometry.drawRange.count === 0) { line.geometry.setDrawRange(0, Infinity); dirty = true; }
    if (pulse) { const u = (now % 1400) / 1400; pulse.head.scale.setScalar(1 + 0.9 * Math.sin(u * Math.PI)); moving = true; }
    if (!dirty && !moving) return;
    dirty = false; placeCamera(); layout(); renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  // ── moving the map ──
  // Mouse: drag moves, the wheel zooms while Ctrl or Cmd is held (a trackpad pinch arrives that way),
  // so an ordinary scroll still scrolls the page. Touch: two fingers move and pinch; one finger
  // scrolls the page, as on any map inside a page.
  el.style.touchAction = 'pan-y'; el.style.cursor = 'grab';
  const pointers = new Map(); let moved = 0, downAt = null, pinch = 0, mid = null;
  el.addEventListener('pointerdown', (e) => { pointers.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; downAt = [e.clientX, e.clientY]; if (e.pointerType === 'mouse') { el.setPointerCapture(e.pointerId); el.style.cursor = 'grabbing'; } pinch = 0; mid = null; });
  el.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) { hover(e); return; }
    const was = pointers.get(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]); moved += Math.abs(e.clientX - was[0]) + Math.abs(e.clientY - was[1]);
    const pts = [...pointers.values()];
    if (pts.length === 1 && e.pointerType === 'mouse') pan(e.clientX - was[0], e.clientY - was[1]);
    else if (pts.length === 2) {
      const d = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]), m = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2], box = el.getBoundingClientRect();
      if (pinch && mid) { pan(m[0] - mid[0], m[1] - mid[1]); zoom(pinch / d, m[0] - box.left, m[1] - box.top); }
      pinch = d; mid = m;
    }
  });
  const up = (e) => {
    const tap = pointers.has(e.pointerId) && moved < 8 && pointers.size === 1;
    pointers.delete(e.pointerId); pinch = 0; mid = null; el.style.cursor = 'grab';
    if (tap && e.type === 'pointerup') { const p = pinAt(e); if (p) window.parent.postMessage({ type: 'lacus-map', event: 'pick', id: p.id }, location.origin); }
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const box = el.getBoundingClientRect(); zoom(Math.exp(e.deltaY * 0.01), e.clientX - box.left, e.clientY - box.top); }, { passive: false });
  // Two fingers on the map must not also scroll or zoom the page.
  el.addEventListener('touchmove', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  el.addEventListener('dblclick', (e) => { const box = el.getBoundingClientRect(); glide({ r: cam.r * 0.6 }, e.clientX - box.left, e.clientY - box.top); });
  function pinAt(e) {
    const box = el.getBoundingClientRect(), x = e.clientX - box.left, y = e.clientY - box.top; let best = null, bd = 30 * 30;
    for (const p of piers) { const d = Math.min((p.hx - x) ** 2 + (p.hy - y) ** 2, (p.sx - x) ** 2 + (p.sy - 12 - y) ** 2); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  function hover(e) { if (e.pointerType === 'mouse') el.style.cursor = pinAt(e) ? 'pointer' : 'grab'; }

  // A short eased move of the camera (the zoom buttons, a double click, coming home).
  let glideId = 0;
  function glide(target, atX, atY) {
    const id = ++glideId, start = { ...cam }, end = { x: target.x ?? cam.x, z: target.z ?? cam.z, r: clamp(target.r ?? cam.r, R_MIN, R_MAX) }, t0 = performance.now();
    if (reduce) { if (atX != null && target.x == null) zoom(end.r / cam.r, atX, atY); else Object.assign(cam, end); invalidate(); return; }
    const step = (now) => {
      if (id !== glideId) return;
      const u = Math.min(1, (now - t0) / 350), e = 1 - Math.pow(1 - u, 3), r = start.r + (end.r - start.r) * e;
      if (atX != null && target.x == null) zoom(r / cam.r, atX, atY); else { cam.x = start.x + (end.x - start.x) * e; cam.z = start.z + (end.z - start.z) * e; cam.r = r; }
      invalidate(); if (u < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  window.__map = {
    select,
    pulse: (id) => { if (pulse) pulse.head.scale.setScalar(pulse === from || pulse === to ? 1.7 : 1); pulse = byId.get(id) ?? null; invalidate(); },
    zoomBy: (factor) => glide({ r: cam.r * factor }, size.w / 2, size.h / 2),
    home: () => glide({ x: home.x, z: home.z, r: home.r }),
    piers: () => piers.map((p) => ({ id: p.id, name: p.name })),
    view: () => ({ ...cam }),
  };
  window.parent.postMessage({ type: 'lacus-map', event: 'ready', piers: window.__map.piers() }, location.origin);
}
