// Lacus 3D hero scenes — three real-time WebGL loops sharing one terrain kit.
import * as THREE from 'three';

const HEX = { lake: '#16384A', sky: '#4A90A4', mist: '#EDF3F4', stone: '#8D9A9C', chalk: '#F2F0E9', cardDark: '#1D4459', deep: '#0F2A38', forest: '#2B5059', forest2: '#33606A', rock: '#7E8D91', rockDark: '#5F7176', shore: '#B7C2C1' };
const col = h => new THREE.Color(h);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const ease = u => u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const win = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

// ── noise ──
function hash(x, y, s) { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 982451653); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
function vnoise(x, y, s) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
function ridged(x, y, s, oct = 5) { let sum = 0, amp = 0.55, f = 1, prev = 1; for (let i = 0; i < oct; i++) { let n = 1 - Math.abs(vnoise(x * f, y * f, s + i) * 2 - 1); n *= n; sum += n * amp * prev; prev = n; f *= 2.03; amp *= 0.5; } return sum; }
function rng(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

// ── paths ──
function closedLoop(N, fx) { const p = []; for (let i = 0; i < N; i++) p.push(fx((i / N) * Math.PI * 2)); return p; }
function distFn(...paths) {
  const xs = [], zs = []; paths.forEach(p => p.forEach(q => { xs.push(q[0]); zs.push(q[1]); }));
  const X = Float32Array.from(xs), Z = Float32Array.from(zs), n = X.length;
  return (x, z) => { let m = 1e9; for (let i = 0; i < n; i++) { const dx = X[i] - x, dz = Z[i] - z, d = dx * dx + dz * dz; if (d < m) m = d; } return Math.sqrt(m); };
}
function pathAt(pts, u, closed) {
  const n = pts.length; const f = closed ? (((u % 1) + 1) % 1) * n : clamp(u, 0, 1) * (n - 1);
  const i = Math.floor(f), k = f - i; const a = pts[i % n], b = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
  const tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
  return { x: lerp(a[0], b[0], k), z: lerp(a[1], b[1], k), tx: tx / tl, tz: tz / tl };
}
function pathLen(pts, closed) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (closed) L += Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]); return L; }

// ── builders ──
function terrainGeo(size, seg, hFn, warp) {
  const g = new THREE.PlaneGeometry(size, size, seg, seg); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), z = p.getZ(i);
    if (warp) { const w = warp(x, z); x = w[0]; z = w[1]; p.setX(i, x); p.setZ(i, z); }
    p.setY(i, hFn(x, z));
  }
  return g;
}
function facetColors(g, colorFn) {
  const ng = g.toNonIndexed(); ng.computeVertexNormals();
  const p = ng.attributes.position, n = ng.attributes.normal, c = new Float32Array(p.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i += 3) {
    const h = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    tmp.set(colorFn(h, n.getY(i), x, z));
    for (let k = 0; k < 3; k++) { c[(i + k) * 3] = tmp.r; c[(i + k) * 3 + 1] = tmp.g; c[(i + k) * 3 + 2] = tmp.b; }
  }
  ng.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return ng;
}
function alpineColor(scale) {
  return (h, ny, x, z) => {
    const j = vnoise(x * 0.15 / scale, z * 0.15 / scale, 9);
    if (h < -0.3 * scale) return HEX.cardDark;
    if (h < 1.4 * scale) return HEX.stone;
    if (ny < 0.52) return h > 40 * scale ? HEX.rock : HEX.rockDark;
    if (h < (18 + j * 8) * scale) return j > 0.55 ? HEX.forest2 : HEX.forest;
    if (h < (40 + j * 10) * scale) return HEX.rock;
    return ny > 0.6 ? HEX.chalk : '#A3AFB2';
  };
}
function waterMaterial(color, amp, freq) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.14, metalness: 0.05, flatShading: true, transparent: true, opacity: 0.93 });
  const u = { uPhase: { value: 0 }, uAmp: { value: amp }, uFreq: { value: freq } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = 'uniform float uPhase; uniform float uAmp; uniform float uFreq;\n' + sh.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = vec3(position);
      transformed.y += uAmp * (sin(position.x*0.35*uFreq + uPhase*8.0)*0.5 + sin(position.z*0.43*uFreq - uPhase*7.0)*0.4 + sin((position.x-position.z)*0.23*uFreq + uPhase*5.0)*0.35);`);
  };
  m.userData.u = u; return m;
}
function envFrom(renderer, top, horizon, bottom) {
  const s = new THREE.Scene(), g = new THREE.SphereGeometry(50, 32, 16), p = g.attributes.position, c = [];
  const ct = col(top), ch = col(horizon), cb = col(bottom);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 50; const k = y > 0 ? ch.clone().lerp(ct, Math.pow(y, 0.6)) : ch.clone().lerp(cb, Math.pow(-y, 0.5)); c.push(k.r, k.g, k.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  s.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const sun = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' })); sun.position.set(-30, 22, -25); s.add(sun);
  return new THREE.PMREMGenerator(renderer).fromScene(s, 0.02).texture;
}
function boat() {
  const g = new THREE.Group();
  const hullM = new THREE.MeshStandardMaterial({ color: HEX.lake, roughness: 0.5, flatShading: true });
  const chalkM = new THREE.MeshStandardMaterial({ color: HEX.chalk, roughness: 0.6 });
  const s = new THREE.Shape();
  s.moveTo(-1.5, -0.45); s.lineTo(1.0, -0.45); s.quadraticCurveTo(1.6, -0.3, 1.9, 0); s.quadraticCurveTo(1.6, 0.3, 1.0, 0.45); s.lineTo(-1.5, 0.45); s.quadraticCurveTo(-1.62, 0, -1.5, -0.45);
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.42, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }), hullM);
  hull.rotation.x = -Math.PI / 2; hull.position.y = -0.18;
  const stripe = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }), chalkM); stripe.rotation.x = -Math.PI / 2; stripe.position.y = 0.2; stripe.scale.set(1.02, 1.02, 1);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.42, 0.74), chalkM); cabin.position.set(-0.2, 0.47, 0);
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.12, 0.78), hullM); band.position.set(-0.2, 0.52, 0);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.62), chalkM); deck.position.set(-0.3, 0.83, 0);
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.42, 16), hullM); funnel.position.set(-0.2, 1.17, 0);
  [hull, stripe, cabin, band, deck, funnel].forEach(m => { m.castShadow = true; g.add(m); });
  return g;
}
function wake(n, color) {
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2); geo.rotateY(Math.PI / 4);
  const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75, depthWrite: false }), n);
  m.frustumCulled = false; return m;
}
const _d = new THREE.Object3D();
function placeWake(mesh, pts, closed, u, L, scale, y) {
  const n = mesh.count, du = (0.32 * scale) / L;
  for (let i = 0; i < n; i++) {
    const q = pathAt(pts, u - (i + 2) * du, closed), side = i % 2 ? 1 : -1, spread = (0.25 + i * 0.045) * scale;
    _d.position.set(q.x - q.tz * side * spread, y, q.z + q.tx * side * spread);
    const s = Math.max(0.001, (1 - i / n) * 0.55 * scale); _d.scale.set(s, 1, s); _d.updateMatrix(); mesh.setMatrixAt(i, _d.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
function clouds(count, seed, spread, y, size) {
  const r = rng(seed), grp = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, flatShading: true });
  for (let c = 0; c < count; c++) {
    const cl = new THREE.Group(), puffs = 4 + Math.floor(r() * 3);
    for (let i = 0; i < puffs; i++) { const s = size * (0.5 + r() * 0.6); const p = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), m); p.position.set((i - puffs / 2) * size * 0.7, r() * size * 0.3, (r() - 0.5) * size * 0.6); p.scale.y = 0.62; p.castShadow = true; cl.add(p); }
    cl.userData = { x0: (r() - 0.5) * spread, z: (r() - 0.5) * spread, y: y + r() * size * 2 };
    grp.add(cl);
  }
  return grp;
}

function setup(container, bg, shift) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = col(bg);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 2000);
  const size = { w: 1, h: 1 };
  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1; size.w = w; size.h = h;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    applyOffset();
  };
  const applyOffset = () => { const w = size.w, h = size.h; if (shift && w > 900) camera.setViewOffset(w, h, -w * shift, 0, w, h); else camera.clearViewOffset(); camera.updateProjectionMatrix(); };
  const setShift = v => { if (Math.abs(v - shift) < 1e-4) return; shift = v; applyOffset(); };
  new ResizeObserver(resize).observe(container); resize();
  return { renderer, scene, camera, size, setShift };
}
function run(P, frame, render, warp = s => s) {
  // Lacus web: `warp` maps real seconds to the timeline's own seconds (opts.introSeconds / opts.routeSeconds).
  const t0 = performance.now();
  window.__heroRender = t => { frame(t % P, (t % P) / P); render(); };
  // Lacus web: a host page sets window.__heroPaused while the map is off screen, so nothing is drawn then.
  const tick = () => { if (window.__heroPaused) { requestAnimationFrame(tick); return; } const t = window.__heroT != null ? window.__heroT % P : warp((performance.now() - t0) / 1000) % P; frame(t, t / P); render(); requestAnimationFrame(tick); };
  tick();
}

// ═════════ B — Relief map (real Lake Lucerne: Mapzen terrain tiles + OSM lake outlines) ═════════
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
function pixels(img) { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; }
export async function mountRelief(container, labelsEl, opts = {}) {
  const P = 26, base = opts.data || 'data/';
  const [meta, demImg, maskImg] = await Promise.all([fetch(base + 'lucerne.json').then(r => r.json()), loadImg(base + (opts.dem || 'lucerne-dem.png')), loadImg(base + 'lucerne-mask.png')]);
  const baseShift = opts.shift ?? 0.2;
  const { renderer, scene, camera, size, setShift } = setup(container, HEX.lake, baseShift);
  const W = meta.W, H = meta.H, WORLD = 360, s = WORLD / W, unitM = meta.mpp / s, EX = opts.exaggeration ?? 1.25;
  const dem = pixels(demImg), msk = pixels(maskImg);
  // Lacus web: the terrain image may be a whole-number fraction of the map's size (opts.dem, e.g. the half-size file
  // phones load). DS is that factor; each of its pixels is the average of a DS x DS block, centred on that block.
  const DW = demImg.width, DH = demImg.height, DS = Math.max(1, Math.round(W / DW));
  const elev = (px, py) => { px = clamp((px - (DS - 1) / 2) / DS, 0, DW - 1.001); py = clamp((py - (DS - 1) / 2) / DS, 0, DH - 1.001); const x = Math.floor(px), y = Math.floor(py), fx = px - x, fy = py - y;
    const e = (i, j) => { const k = ((j * DW) + i) * 4; return dem[k] * 256 + dem[k + 1] + dem[k + 2] / 256 - 32768; };
    return lerp(lerp(e(x, y), e(x + 1, y), fx), lerp(e(x, y + 1), e(x + 1, y + 1), fx), fy); };
  const toWorld = (px, py) => [(px - W / 2) * s, (py - H / 2) * s];
  const EDGE = 26;
  const hB = (x, z) => {
    const px = x / s + W / 2, py = z / s + H / 2;
    const edge = smooth(0, EDGE, Math.min(px, py, W - 1 - px, H - 1 - py));
    return Math.max(((elev(px, py) - meta.lakeLevel) / unitM) * EX, 0) * edge;
  };
  const tg = new THREE.PlaneGeometry(WORLD, H * s, 440, Math.round(440 * H / W)); tg.rotateX(-Math.PI / 2);
  { const p = tg.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hB(p.getX(i), p.getZ(i))); }
  tg.computeVertexNormals();
  const blurC = document.createElement('canvas'); blurC.width = W; blurC.height = H; { const g = blurC.getContext('2d'); g.filter = 'blur(2.5px)'; g.drawImage(maskImg, 0, 0); }
  const maskTex = new THREE.CanvasTexture(blurC); maskTex.needsUpdate = true; maskTex.minFilter = THREE.LinearMipmapLinearFilter; maskTex.magFilter = THREE.LinearFilter; maskTex.anisotropy = 8;
  const v3 = h => { const c = col(h); c.convertLinearToSRGB(); return new THREE.Vector3(c.r, c.g, c.b); };
  const stepU = (100 / unitM) * EX;
  const uniforms = { uBase: { value: v3('#1D4459') }, uLine: { value: v3(HEX.chalk) }, uFog: { value: v3(HEX.lake) }, uWater: { value: v3('#0C2431') }, uStep: { value: stepU }, uRelief: { value: 1 }, uCam: { value: new THREE.Vector3() }, uMask: { value: maskTex }, uUseMask: { value: 1 }, uRes: { value: new THREE.Vector2(1, 1) }, uCalmEnd: { value: 0.45 }, uCalmK: { value: 1 }, uCalmY: { value: 0.2 }, uStage: { value: 0 }, uFogN: { value: 380 }, uFogF: { value: 640 } };
  const tmat = new THREE.ShaderMaterial({ uniforms,
    vertexShader: `uniform float uRelief; varying vec3 vW; varying vec3 vN; varying float vH; varying vec2 vUv;
      void main(){ vUv = uv; vec3 p = position; vH = p.y; p.y *= uRelief; vec4 w = modelMatrix*vec4(p,1.0); vW = w.xyz;
      vN = normalize(vec3(normal.x*uRelief, normal.y, normal.z*uRelief)); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uBase; uniform vec3 uLine; uniform vec3 uFog; uniform vec3 uWater; uniform float uStep; uniform vec3 uCam; uniform sampler2D uMask; uniform float uUseMask; uniform vec2 uRes; uniform float uCalmEnd; uniform float uCalmK; uniform float uCalmY; uniform float uStage; uniform float uFogN; uniform float uFogF;
      varying vec3 vW; varying vec3 vN; varying float vH; varying vec2 vUv;
      void main(){
        float diff = clamp(dot(normalize(vN), normalize(vec3(-0.55,0.75,-0.35))), 0.0, 1.0);
        float calmX = uCalmK * (1.0 - smoothstep(uCalmEnd - 0.12, uCalmEnd + 0.14, gl_FragCoord.x / uRes.x));
        float calmY = 0.9 * (1.0 - smoothstep(uCalmY - 0.05, uCalmY + 0.12, gl_FragCoord.y / uRes.y));
        float calm = mix(calmX, calmY, uStage);
        vec3 c = uBase * mix(0.62 + 0.75*diff, 0.78 + 0.2*diff, calm);
        float h = vH / uStep; float f = abs(fract(h - 0.5) - 0.5) / max(fwidth(h), 1e-4); float line = 1.0 - min(f, 1.0);
        float hm = vH / (uStep*5.0); float fm = abs(fract(hm - 0.5) - 0.5) / max(fwidth(hm), 1e-4); float major = 1.0 - min(fm*0.8, 1.0);
        float m = uUseMask > 0.5 ? texture2D(uMask, vUv).r : 0.0;
        float aa = max(fwidth(m), 1e-3);
        float water = smoothstep(0.5 - aa, 0.5 + aa, m);
        float shoreW = smoothstep(0.5 - aa*1.2, 0.5, m) * (1.0 - smoothstep(0.5, 0.5 + aa*1.2, m));
        float land = (1.0 - water) * step(0.35, vH);
        c = mix(c, uLine, land * clamp(line*0.3 + major*0.5, 0.0, 0.85) * (1.0 - calm*0.85));
        c = mix(c, uWater, water);
        float shore = 1.0 - smoothstep(0.0, 0.09, abs(m - 0.5));
        c = mix(c, uLine, max(shore, shoreW) * 0.8 * uUseMask * (1.0 - calm*0.6));
        float eb = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y)); float edgeF = uUseMask > 0.5 ? smoothstep(0.0, 0.07, eb) : 0.0;
        vec3 flat0 = uBase * mix(0.62 + 0.75*0.75, 0.78 + 0.2*0.75, calm); c = mix(flat0, c, edgeF);
        float d = distance(uCam, vW); c = mix(c, uFog, smoothstep(uFogN, uFogF, d));
        gl_FragColor = vec4(c, 1.0);
      }` });
  tmat.toneMapped = false;
  scene.add(new THREE.Mesh(tg, tmat));
  const skirtMat = tmat.clone(); skirtMat.uniforms = { ...uniforms, uUseMask: { value: 0 } };
  const skirt = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000).rotateX(-Math.PI / 2), skirtMat); skirt.position.y = -2; scene.add(skirt);
  const LBL = { Luzern: 'c', Weggis: 'c', Vitznau: 'c', Gersau: 'l', Brunnen: 'r', 'Flüelen': 'l', 'Küssnacht': 'c', Hertenstein: 'r', Hergiswil: 'l', Stansstad: 'r', Alpnachstad: 'b', Beckenried: 'b', Treib: 'l', 'Rütli': 'r', Bauen: 'l' };
  const chalkB = new THREE.MeshBasicMaterial({ color: HEX.chalk, toneMapped: false });
  const netM = new THREE.MeshBasicMaterial({ color: HEX.stone, transparent: true, opacity: 0, toneMapped: false });
  const TS = 600, RS = 8;
  const routes = meta.routes.map(r => {
    const rc = new THREE.CatmullRomCurve3(r.pts.map(([px, py]) => { const [x, z] = toWorld(px, py); return new THREE.Vector3(x, 0.45, z); }), false, 'centripetal');
    scene.add(new THREE.Mesh(new THREE.TubeGeometry(rc, TS, 0.22, 6, false), netM));
    const tube = new THREE.TubeGeometry(rc, TS, 0.5, RS, false), tubeM = new THREE.MeshBasicMaterial({ color: HEX.chalk, transparent: true, toneMapped: false });
    const ghost = new THREE.TubeGeometry(rc, TS, 0.3, 6, false), ghostM = new THREE.MeshBasicMaterial({ color: HEX.stone, transparent: true, toneMapped: false });
    scene.add(new THREE.Mesh(ghost, ghostM), new THREE.Mesh(tube, tubeM));
    const samples = rc.getSpacedPoints(1500);
    const stops = r.stops.map(p => {
      const [x, z] = toWorld(p.x, p.y); let bi = 0, bd = 1e9; samples.forEach((q, i) => { const d = (q.x - x) ** 2 + (q.z - z) ** 2; if (d < bd) { bd = d; bi = i; } });
      const g = new THREE.Group(); const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 7, 8), chalkB); stem.position.y = 3.5;
      const isEnd = p === r.stops[0] || p === r.stops[r.stops.length - 1];
      const head = new THREE.Mesh(new THREE.SphereGeometry(isEnd ? 1.7 : 1.0, 20, 12), chalkB); head.position.y = 7.4; g.add(stem, head);
      if (isEnd) { const ringE = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.7, 40).rotateX(-Math.PI / 2), chalkB); ringE.position.y = 0.5; g.add(ringE); } g.position.set(x, 0, z); g.visible = false; scene.add(g);
      const el = document.createElement('div'); el.style.cssText = 'position:absolute;left:0;top:0;display:flex;gap:10px;align-items:baseline;white-space:nowrap;opacity:0;will-change:transform,opacity';
      el.className = isEnd ? 'end' : 'mid'; el.innerHTML = `<span style="font-family:Kanit,sans-serif;font-weight:${isEnd ? 600 : 500};font-size:${isEnd ? 22 : 18}px;color:${HEX.chalk}">${p.name}</span><span style="font-family:Kanit,sans-serif;font-weight:500;font-size:17px;color:${HEX.stone};font-variant-numeric:tabular-nums">${p.time}</span>`;
      labelsEl.appendChild(el);
      return { ...p, wx: x, wz: z, u: bi / 1500, pin: g, el, isEnd };
    });
    const cx = stops.reduce((a, p) => a + p.wx, 0) / stops.length, cz = stops.reduce((a, p) => a + p.wz, 0) / stops.length;
    const ext = Math.max(...stops.map(p => Math.hypot(p.wx - cx, p.wz - cz)));
    const a0 = stops[0], a1 = stops[stops.length - 1]; let dx = a1.wx - a0.wx, dz = a1.wz - a0.wz; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    const pts = rc.getSpacedPoints(200); let lo = 1e9, hi = -1e9, wlo = 1e9, whi = -1e9;
    pts.forEach(q => { const a = q.x * dx + q.z * dz, b = -q.x * dz + q.z * dx; lo = Math.min(lo, a); hi = Math.max(hi, a); wlo = Math.min(wlo, b); whi = Math.max(whi, b); });
    const am = (lo + hi) / 2, bm = (wlo + whi) / 2, Lr = hi - lo, Wr = whi - wlo;
    const mob = { az: Math.atan2(dx, dz), x: am * dx - bm * dz, z: am * dz + bm * dx, dx, dz, R: clamp(Math.max(2.05 * Lr, 3.7 * Wr + 50, 200), 200, 760) };
    return { name: r.name, rc, tube, tubeM, ghost, ghostM, stops, len: rc.getLength(), cx, cz, ext, mob };
  });
  const maxLen = Math.max(...routes.map(r => r.len));
  const vessel = new THREE.Group(); const vb = new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 12), chalkB);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.4, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: HEX.chalk, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  vessel.add(vb, ring); scene.add(vessel);
  const title = opts.titleEl || null;
  const calmEl = opts.calmEl || null, barEl = opts.barEl || null, lakeEl = opts.lakeEl || null; let calmEnd = 0.45, calmK = 1, calmY = 0.2, lastW = 0, lastH = 0;
  const C0 = opts.center || [10, 0, 6], center = new THREE.Vector3(...C0), tmp = new THREE.Vector3(), look = new THREE.Vector3();
  const INTRO = 6, SL = 10, CYCLE = SL * routes.length, MPOLAR = 0.5;
  // Lacus web (owner, 2026-10-11): the wide-screen camera can come closer (opts.zoom, a number or a function of the
  // viewport's aspect ratio) and follow each route more (opts.follow, 0..1), so the map fills a wide hero.
  // opts.zoomIntro is the zoom while the headline copy shares the screen (the first route), before the bar takes over.
  // When the routes are played faster than designed (opts.routeSeconds), the camera's moves between them are given
  // proportionally more of the timeline (TK), so they stay gentle instead of snapping.
  const TK = clamp(SL / (opts.routeSeconds ?? SL), 1, 2.5);
  const ZOOM = opts.zoom ?? 1, ZOOM0 = opts.zoomIntro ?? ZOOM, FOLLOW = opts.follow ?? 0.18, zoomOf = (z, a) => typeof z === 'function' ? z(a) : z;
  const fitCam = new THREE.PerspectiveCamera(40, 1, 0.5, 4000), fv = new THREE.Vector3();
  routes.forEach(r => { r.fitPts = r.rc.getSpacedPoints(80).map(p => new THREE.Vector3(p.x, 0.5, p.z)).concat(r.stops.map(p => new THREE.Vector3(p.wx, 9.6, p.wz))); });
  const placeCam = (cam, x, z, az, polar, Rr) => { cam.position.set(x + Rr * Math.sin(polar) * Math.sin(az), Rr * Math.cos(polar), z + Rr * Math.sin(polar) * Math.cos(az)); cam.lookAt(x, 0, z); cam.updateMatrixWorld(); };
  const bbox = (cam, pts) => { let l = 1e9, r = -1e9, t = 1e9, b = -1e9; pts.forEach(p => { fv.copy(p).project(cam); const x = (fv.x + 1) / 2 * size.w, y = (1 - fv.y) / 2 * size.h; l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }); return { l, r, t, b }; };
  function fitMobile(rt) {
    const tEl = opts.titleEl, bEl = opts.barEl; const top = (tEl ? tEl.offsetTop + 22 : 70) + 44, bot = (bEl ? bEl.offsetTop : size.h - 140) - 28, sl = 40, sr = size.w - 40;
    fitCam.aspect = size.w / size.h; fitCam.updateProjectionMatrix();
    const az = rt.mob.az, fx = -Math.sin(az), fz = -Math.cos(az), rx = -fz, rz = fx;
    let x = rt.mob.x, z = rt.mob.z, Rr = 400;
    for (let pass = 0; pass < 4; pass++) {
      let lo = 80, hi = 3000;
      for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; placeCam(fitCam, x, z, az, MPOLAR, m); const bb = bbox(fitCam, rt.fitPts); (bb.l >= sl && bb.r <= sr && bb.t >= top && bb.b <= bot) ? (hi = m) : (lo = m); }
      Rr = Math.max(hi, 300); placeCam(fitCam, x, z, az, MPOLAR, Rr); const bb = bbox(fitCam, rt.fitPts);
      const wpp = 2 * Rr * Math.tan(20 * Math.PI / 180) / size.h, dy = ((top + bot) / 2 - (bb.t + bb.b) / 2) * wpp / Math.cos(MPOLAR), dx = ((sl + sr) / 2 - (bb.l + bb.r) / 2) * wpp;
      x += fx * dy - rx * dx; z += fz * dy - rz * dx;
    }
    return { x, z, R: Rr };
  }
  let fitKey = '';
  run(1e9, t => {
    if (size.w !== lastW || size.h !== lastH) { lastH = size.h; if (barEl) calmY = clamp(1 - (barEl.offsetTop - 28) / size.h, 0.08, 0.55);
      lastW = size.w; const wide = size.w > 900; calmK = 1; calmEnd = calmEl && wide ? clamp(calmEl.getBoundingClientRect().right / size.w, 0.2, 0.7) : 1; if (!wide) calmK = 0.55; renderer.getDrawingBufferSize(uniforms.uRes.value); }
    uniforms.uCalmEnd.value = calmEnd; uniforms.uCalmK.value = calmK; uniforms.uCalmY.value = calmY;
    const T2 = INTRO + SL, stage = barEl ? ease(win(t, T2 - 0.8 * TK, T2 + 1.4 * TK)) : 0;
    const mobile = size.w < 700 && size.h > size.w * 1.1, M = mobile ? 1 : 0;
    uniforms.uStage.value = mobile ? 1 : stage; setShift(baseShift * (1 - stage));
    if (mobile && calmEl && barEl) { uniforms.uCalmY.value = clamp(1 - (barEl.offsetTop - 20) / size.h, 0.08, 0.5); }
    if (calmEl && barEl) {
      const e1 = mobile ? 1 : ease(win(t, T2 - 1.0 * TK, T2 + 0.2 * TK)), e2 = mobile ? ease(win(t, 0.6, 1.8)) : ease(win(t, T2 + 0.1 * TK, T2 + 1.3 * TK));
      calmEl.style.opacity = 1 - e1; calmEl.style.transform = mobile ? `translateY(${e1 * 40}px)` : `translateY(calc(-50% + ${e1 * 56}px))`; calmEl.style.pointerEvents = e1 > 0.5 ? 'none' : '';
      barEl.style.opacity = e2; barEl.style.transform = `translateY(${(1 - e2) * 28}px)`; barEl.style.pointerEvents = e2 > 0.5 ? '' : 'none';
      if (lakeEl) { lakeEl.style.opacity = e2; lakeEl.style.transform = `translateY(${(1 - e2) * -12}px)`; }
    }
    const rise = ease(win(t, 1.5, INTRO));
    uniforms.uRelief.value = lerp(0.015, 1, rise);
    const ORD = M ? [1, 3, 2, 4] : [0, 1, 2, 3, 4], nO = ORD.length;
    const lt = Math.max(0, t - INTRO), slot = Math.floor(lt / SL), ri = ORD[slot % nO], local = lt - slot * SL, live = t >= INTRO;
    const cur = routes[ri], prev = routes[ORD[(slot + nO - 1) % nO]], first = routes[ORD[0]];
    const mv = slot === 0 ? 1 : ease(win(local, 0, 2 * TK));
    if (M && fitKey !== size.w + 'x' + size.h) { fitKey = size.w + 'x' + size.h; routes.forEach(r => { r.fit = fitMobile(r); }); }
    const pm = prev.mob, cm = cur.mob; let dAz = cm.az - pm.az; dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
    const mAz = pm.az + dAz * mv, RM = lerp(pm.R, cm.R, mv), mdx = Math.sin(mAz), mdz = Math.cos(mAz);
    const mX = lerp(pm.x, cm.x, mv) + mdx * 0.075 * RM, mZ = lerp(pm.z, cm.z, mv) + mdz * 0.075 * RM;
    const fk = FOLLOW * rise, aspect = size.w / size.h, zoomNow = lerp(zoomOf(ZOOM0, aspect), zoomOf(ZOOM, aspect), barEl ? stage : 1);
    const f0 = first.fit, pf = prev.fit, cf = cur.fit;
    const tx = M ? (live ? lerp(pf.x, cf.x, mv) : f0.x) : lerp(center.x, lerp(prev.cx, cur.cx, mv), fk), tz = M ? (live ? lerp(pf.z, cf.z, mv) : f0.z) : lerp(center.z, lerp(prev.cz, cur.cz, mv), fk);
    const RF = M ? (live ? lerp(pf.R, cf.R, mv) : f0.R) : 0;
    const polar = lerp(0.02, M ? MPOLAR : 0.68, rise), az = M ? (slot === 0 || !live ? first.mob.az : mAz) + Math.sin((lt / CYCLE) * Math.PI * 2) * 0.012 * rise : lerp(0, 0.18, rise) + Math.sin((lt / CYCLE) * Math.PI * 2) * 0.06 * rise, R = lerp(M ? RF * 1.25 : 500, M ? RF : 430, rise) * (1 - (M ? 0 : 0.06) * stage) / (M ? 1 : zoomNow);
    uniforms.uFogN.value = Math.max(380, R * 0.95); uniforms.uFogF.value = Math.max(640, R * 1.6);
    camera.position.set(tx + R * Math.sin(polar) * Math.sin(az), R * Math.cos(polar), tz + R * Math.sin(polar) * Math.cos(az));
    look.set(tx + stage * 4 * (1 - M), 0, tz + (lerp(0, 18, rise) + stage * 12) * (1 - M)); camera.lookAt(look);
    uniforms.uCam.value.copy(camera.position);
    netM.opacity = 0.35 * ease(win(t, INTRO - 1, INTRO + 1));
    const sailDur = clamp(6.2 * cur.len / maxLen, 3, 6.2);
    const draw = ease(win(local, 0.2, 1.8)), sail = ease(win(local, 1.2, 1.2 + sailDur)), fade = 1 - win(local, SL - 1.2, SL - 0.3);
    routes.forEach((r, k) => {
      const on = live && k === ri;
      r.ghostM.opacity = on ? 0.7 * fade : 0; r.tubeM.opacity = on ? fade : 0;
      r.ghost.setDrawRange(0, on ? Math.floor(TS * draw) * 6 * 6 : 0); r.tube.setDrawRange(0, on ? Math.floor(TS * sail) * RS * 6 : 0);
      r.stops.forEach(st => {
        const at = 0.2 + 1.6 * st.u, kk = on ? ease(win(local, at, at + 0.5)) * fade : 0;
        st.pin.visible = kk > 0.01; st.pin.scale.set(1, Math.max(0.001, kk), 1); st.el.style.opacity = kk;
        if (kk > 0.01) {
          tmp.set(st.wx, 9.6, st.wz).project(camera);
          st.el.lastChild.style.color = sail >= st.u - 0.005 && local > 1.2 ? HEX.chalk : HEX.stone;
          const mode = LBL[st.name] || 'c', lw = st.el.offsetWidth || 120, px = (tmp.x + 1) / 2 * size.w, py = (1 - tmp.y) / 2 * size.h + (mode === 'c' ? 0 : mode === 'b' ? 64 : 20);
          const lx = clamp(mode === 'l' ? px - lw - 20 : mode === 'r' ? px + 20 : mode === 'b' ? px - lw * 0.3 : px - lw / 2, 8, size.w - lw - 8);
          st.el.style.transform = `translate(${lx}px,${py}px) translateY(-100%) translateY(${(1 - kk) * 10}px)`;
        }
      });
    });
    if (title) { const tk = live ? ease(win(local, 0, 0.6)) * fade : 0; if (title.textContent !== cur.name) title.textContent = cur.name; title.style.opacity = tk; }
    const q = cur.rc.getPointAt(sail), vOn = live ? clamp(win(local, 1.0, 1.4) * fade, 0, 1) : 0;
    vessel.position.set(q.x, 1.2, q.z); vessel.scale.setScalar(Math.max(0.001, vOn));
    const pulse = (t % 1.6) / 1.6; ring.scale.setScalar(1 + pulse * 2.2); ring.material.opacity = (1 - pulse) * 0.8;
  }, () => renderer.render(scene, camera), s => { const i = opts.introSeconds ?? INTRO, r = opts.routeSeconds ?? SL; return s < i ? s * INTRO / i : INTRO + (s - i) * SL / r; });
}
