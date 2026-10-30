import { useEffect, useRef, useState } from 'react';
import { LAKE_PHOTOS, LAKE_PHOTOS_EVENING } from '../data/lakePhotos';
import './comingSoon.css';

// The coming-soon page ("Corner Chip"), ported from design_handoff_coming_soon/reference.
// A 12-tile photo grid draws in, the logo and name build at centre, then Lake Lucerne opens
// full-screen while the lockup glides into a chip in the top-left corner; after that the
// twelve lakes cross-fade forever. No links, forms or buttons.
//
// Day and night (owner, 2026-10-27): from sunset to sunrise in Zurich the page shows each lake's
// evening photo instead of its day photo, and it changes over on its own if left open across
// either (a lake on screen keeps its photo until its turn ends). `?time=day` or `?time=night`
// forces one, for checking.
//
// One requestAnimationFrame loop drives everything from a clock. The lockup moves with
// transform and clip-path only: the centre and chip boxes are invisible "ghosts" measured
// once (again on resize, when fonts load and when either ghost changes size).

// Order matters: index 0 (Lucerne) is the lake that opens full-screen first.
const LAKES: [id: string, name: string][] = [
  ['lucerne', 'Lake Lucerne'],
  ['geneva', 'Lake Geneva'],
  ['zurich', 'Lake Zurich'],
  ['constance', 'Lake Constance'],
  ['neuchatel', 'Lake Neuchâtel'],
  ['lugano', 'Lake Lugano'],
  ['maggiore', 'Lake Maggiore'],
  ['thun', 'Lake Thun'],
  ['brienz', 'Lake Brienz'],
  ['zug', 'Lake Zug'],
  ['murten', 'Lake Murten'],
  ['biel', 'Lake Biel'],
];
// Where a photo is held when the screen crops its sides (phones): the part that must stay in view.
const FOCUS: Record<string, string> = {
  lucerne: '100% 50%', // the Chapel Bridge and the Water Tower
  'lucerne-dark': '20% 50%',
  'geneva-dark': '78% 50%', // Chillon
  'zug-dark': '22% 50%', // the people on the pier
};
const key = (id: string, night: boolean) => (night ? `${id}-dark` : id);
const focus = (id: string, night: boolean) => FOCUS[key(id, night)] ?? '50% 50%';
const credit = (id: string, night: boolean) => (night ? LAKE_PHOTOS_EVENING : LAKE_PHOTOS)[`lake-${id}`];

// Tiles use the lake cards' small photos; the full-screen layer uses the high-resolution set
// in public/lakes/full (same photos and credits), picked by the browser to fit the screen.
const photo = (id: string, night: boolean) => `${import.meta.env.BASE_URL}lakes/lake-${key(id, night)}.jpg`;
const FULL_WIDTHS = [1920, 2560, 3840];
const fullPhoto = (id: string, night: boolean, width: number) =>
  `${import.meta.env.BASE_URL}lakes/full/lake-${key(id, night)}-${width}.jpg`;
const fullSrcSet = (id: string, night: boolean) =>
  FULL_WIDTHS.map((w) => `${fullPhoto(id, night, w)} ${w}w`).join(', ');
// The photos cover the screen, so on a tall screen they are drawn as wide as 16/9 of its height:
// a phone gets the largest file instead of a small one stretched.
const FULL_SIZES = '(max-aspect-ratio: 16/9) 178vh, 100vw';

// Whether the sun is down in Zurich (below the horizon, refraction included), from the NOAA
// approximation of its position: good to a minute or two, which is all a photo change needs.
function isNightInZurich(date: Date): boolean {
  const forced = new URLSearchParams(window.location.search).get('time');
  if (forced === 'day' || forced === 'night') return forced === 'night';
  const rad = Math.PI / 180;
  const lat = 47.3769;
  const lon = 8.5417;
  const days = date.getTime() / 86400000 + 2440587.5 - 2451545.0; // since J2000
  const meanLon = (280.46 + 0.9856474 * days) % 360;
  const anomaly = ((357.528 + 0.9856003 * days) % 360) * rad;
  const eclLon = (meanLon + 1.915 * Math.sin(anomaly) + 0.02 * Math.sin(2 * anomaly)) * rad;
  const obliquity = (23.439 - 0.0000004 * days) * rad;
  const ra = Math.atan2(Math.cos(obliquity) * Math.sin(eclLon), Math.cos(eclLon));
  const dec = Math.asin(Math.sin(obliquity) * Math.sin(eclLon));
  const sidereal = ((280.46061837 + 360.98564736629 * days + lon) % 360) * rad;
  const hourAngle = sidereal - ra;
  const altitude = Math.asin(
    Math.sin(lat * rad) * Math.sin(dec) + Math.cos(lat * rad) * Math.cos(dec) * Math.cos(hourAngle),
  );
  return altitude < -0.833 * rad;
}

const TITLE = 'Lacus — Coming soon';

// Timeline (seconds)
const M = 1.6; // logo cue
const F0 = 3.0; // grid -> full-screen Lucerne, lockup -> corner
const P = 4.5; // time each lake is on screen
const X = 1.2; // cross-fade length
const SETTLED = 4.2; // everything in final position

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const lerp = (p: number, q: number, k: number) => p + (q - p) * k;
const linear = (x: number) => x;
const outCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const inOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const outBack = (x: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

interface Measured {
  pA: DOMRect;
  mA: DOMRect;
  wA: DOMRect;
  fA: number;
  pB: DOMRect;
  mB: DOMRect;
  wB: DOMRect;
  fB: number;
}

export function ComingSoonPage() {
  const mainRef = useRef<HTMLElement>(null);
  // Day or night when the page opens: the first photos are already the right set.
  const [initialNight] = useState(() => isNightInZurich(new Date()));

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const q = <T extends Element>(sel: string) => main.querySelector<T>(sel)!;
    const grid = q<HTMLDivElement>('.cs-grid');
    const full = q<HTMLDivElement>('.cs-full');
    const dim = q<HTMLDivElement>('.cs-dim');
    const panelBg = q<HTMLDivElement>('.cs-panel-bg');
    const caption = q<HTMLDivElement>('.cs-caption');
    const capName = q<HTMLSpanElement>('.cs-caption-name');
    const capCredit = q<HTMLAnchorElement>('.cs-caption-credit');
    const g = {
      pA: q<HTMLDivElement>('.cs-panel'),
      mA: q<HTMLDivElement>('.cs-ghost-mark-a'),
      wA: q<HTMLDivElement>('.cs-ghost-word-a'),
      pB: q<HTMLDivElement>('.cs-chip'),
      mB: q<HTMLDivElement>('.cs-ghost-mark-b'),
      wB: q<HTMLDivElement>('.cs-ghost-word-b'),
    };
    const flyMark = q<SVGSVGElement>('.cs-fly-mark');
    const flyWord = q<HTMLHeadingElement>('.cs-fly-word');
    const tagline = q<HTMLParagraphElement>('.cs-tagline');
    const soon = q<HTMLParagraphElement>('.cs-soon');
    const crossV = q<SVGGElement>('[data-cs="cross-v"]');
    const crossH = q<SVGGElement>('[data-cs="cross-h"]');
    const wave1 = q<SVGPolylineElement>('[data-cs="wave-1"]');
    const wave2 = q<SVGPolylineElement>('[data-cs="wave-2"]');
    const tiles = Array.from(main.querySelectorAll<HTMLDivElement>('.cs-tile')).map((el) => ({
      el,
      clip: el.querySelector<HTMLDivElement>('.cs-clip')!,
      img: el.querySelector<HTMLImageElement>('img')!,
    }));
    const slides = Array.from(full.querySelectorAll<HTMLImageElement>('img'));

    // The page owns the whole screen while it is shown: no scrolling, its own title.
    const previousTitle = document.title;
    const previousOverflow = document.documentElement.style.overflow;
    document.title = TITLE;
    document.documentElement.style.overflow = 'hidden';

    // Each full-screen slide starts on the small photo the tiles already fetched, so there is
    // always a picture, and swaps to the large one once the browser has it.
    // Day or night, checked again every half minute; each slide remembers which photo it has.
    let night = initialNight;
    let checked = performance.now();
    const slideNight = slides.map(() => initialNight);
    const requested = new Set<string>();
    function load(j: number) {
      const n = slideNight[j];
      const id = LAKES[j][0];
      if (requested.has(key(id, n))) return;
      requested.add(key(id, n));
      const large = new Image();
      large.sizes = FULL_SIZES;
      large.srcset = fullSrcSet(id, n);
      large.src = fullPhoto(id, n, 1920);
      void large
        .decode()
        .then(() => {
          if (slideNight[j] !== n) return;
          slides[j].sizes = FULL_SIZES;
          slides[j].srcset = fullSrcSet(id, n);
        })
        .catch(() => {});
    }
    // A slide off screen takes the other photo set: the small photo at once, the large one as its turn comes.
    function retake(j: number) {
      const id = LAKES[j][0];
      slideNight[j] = night;
      slides[j].removeAttribute('srcset');
      slides[j].src = photo(id, night);
      slides[j].style.objectPosition = focus(id, night);
      slides[j].style.transformOrigin = focus(id, night);
      requested.delete(key(id, night));
    }

    let narrow = false;
    let m: Measured | null = null;
    let lastName = '';

    function layout() {
      narrow = window.innerWidth < window.innerHeight;
      const cols = narrow ? 3 : 4;
      grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      grid.style.gridTemplateRows = `repeat(${12 / cols}, minmax(0, 1fr))`;
    }

    function measure() {
      const r = (e: Element) => e.getBoundingClientRect();
      const mA = r(g.mA);
      const pA = r(g.pA);
      const mB = r(g.mB);
      // A zero width means the layout isn't ready; try again next frame.
      if (!mA.width || !pA.width || !mB.width) {
        m = null;
        return;
      }
      m = {
        pA,
        mA,
        wA: r(g.wA),
        fA: parseFloat(getComputedStyle(g.wA).fontSize),
        pB: r(g.pB),
        mB,
        wB: r(g.wB),
        fB: parseFloat(getComputedStyle(g.wB).fontSize),
      };
      Object.assign(flyMark.style, {
        left: `${m.mA.left}px`,
        top: `${m.mA.top}px`,
        width: `${m.mA.width}px`,
        height: `${m.mA.width}px`,
      });
      Object.assign(flyWord.style, {
        left: `${m.wA.left}px`,
        top: `${m.wA.top}px`,
        fontSize: `${m.fA}px`,
      });
    }

    function render(t: number) {
      const a = (s: number, e: number, ease = linear) => ease(clamp((t - s) / (e - s)));
      const cols = narrow ? 3 : 4;
      const bgIn = a(M - 0.2, M + 0.25, inOutCubic);

      // 1. Grid intro. Skipped once it is hidden behind the full-screen photo.
      if (t < SETTLED + 0.2) {
        tiles.forEach((tile, i) => {
          const k = Math.floor(i / cols) + (i % cols);
          const line = a(0.02 + k * 0.09, 0.4 + k * 0.09, outCubic);
          const fill = a(0.6 + k * 0.1, 1.05 + k * 0.1, outCubic);
          tile.el.style.boxShadow = `inset 0 0 0 2px rgba(74,144,164,${0.7 * line * (1 - fill)})`;
          tile.el.style.transform = `scale(${0.94 + 0.06 * line})`;
          tile.clip.style.clipPath = `inset(${(1 - fill) * 100}% 0 0 0)`;
          tile.img.style.transform = `translateY(${(1 - fill) * 12}%)`;
        });
        dim.style.opacity = String(0.12 * bgIn);
      }

      // 2. Full-screen lakes: opens from the centre at F0, then cross-fades forever.
      const open = a(F0, F0 + 1.0, inOutCubic);
      full.style.clipPath = `inset(${(1 - open) * 50}% round ${16 * (1 - open)}px)`;
      const cyc = Math.max(0, t - F0);
      const idx = Math.floor(cyc / P) % LAKES.length;
      const ph = cyc % P;
      const nxt = (idx + 1) % LAKES.length;
      const x = clamp((ph - (P - X)) / X);
      const xe = inOutCubic(x);
      if (performance.now() - checked > 30000) {
        checked = performance.now();
        const now = isNightInZurich(new Date());
        if (now !== night) {
          night = now;
          // The grid is hidden by now; it shows the new set should it ever be seen again.
          tiles.forEach((tile, i) => {
            tile.img.src = photo(LAKES[i][0], night);
            tile.img.style.objectPosition = focus(LAKES[i][0], night);
          });
        }
      }
      slides.forEach((_, j) => {
        const showing = j === idx || (j === nxt && x > 0);
        if (!showing && slideNight[j] !== night) retake(j);
      });
      // Fetch a lake's large photo only as its turn approaches: the one showing and the next two.
      for (const j of [idx, nxt, (idx + 2) % LAKES.length]) load(j);
      slides.forEach((img, j) => {
        let op = 0;
        let z = 0;
        let local = 0;
        if (j === idx) {
          op = 1;
          z = 1;
          local = ph + X;
        } else if (j === nxt && x > 0) {
          op = xe;
          z = 2;
          local = ph - (P - X);
        }
        img.style.opacity = String(op);
        img.style.zIndex = String(z);
        img.style.transform = `scale(${1 + (0.06 * local) / (P + X)})`;
      });

      // 3. Logo build
      const cross = a(M + 0.05, M + 0.35, outCubic);
      const waves = a(M + 0.15, M + 0.5, inOutCubic);
      const word = a(M + 0.35, M + 0.7, outCubic);
      const tag = a(M + 0.5, M + 0.85, outCubic);
      crossV.setAttribute('transform', `translate(300 214) scale(1 ${cross}) translate(-300 -214)`);
      crossH.setAttribute('transform', `translate(300 214) scale(${cross} 1) translate(-300 -214)`);
      wave1.setAttribute('stroke-dashoffset', String(1 - Math.min(1, waves * 1.4)));
      wave2.setAttribute('stroke-dashoffset', String(1 - clamp(waves * 1.4 - 0.4)));
      const fadeOut = 1 - a(F0 - 0.1, F0 + 0.3, outCubic);
      tagline.style.opacity = String(tag * fadeOut);
      tagline.style.transform = `translateY(${16 * (1 - tag)}px)`;
      soon.style.opacity = String(a(M + 0.8, M + 1.2, outCubic) * fadeOut);

      // 4. Lockup glides from the centre to the top-left chip. Transforms and clip-path only.
      if (m) {
        const mv = a(F0 + 0.1, F0 + 1.1, inOutCubic);
        const W = window.innerWidth;
        const H = window.innerHeight;
        const L = lerp(m.pA.left, m.pB.left, mv);
        const T = lerp(m.pA.top, m.pB.top, mv);
        const R = lerp(m.pA.right, m.pB.right, mv);
        const B = lerp(m.pA.bottom, m.pB.bottom, mv);
        panelBg.style.background = `rgba(22,56,74,${bgIn})`;
        panelBg.style.clipPath = `inset(${T}px ${W - R}px ${H - B}px ${L}px round 16px)`;
        const w = m.mA.width;
        const si = 0.6 + 0.4 * a(M - 0.05, M + 0.35, outBack);
        const sm = lerp(1, m.mB.width / w, mv);
        flyMark.style.opacity = String(a(M - 0.05, M + 0.12));
        flyMark.style.transform = `translate(${lerp(0, m.mB.left - m.mA.left, mv)}px, ${lerp(0, m.mB.top - m.mA.top, mv)}px) scale(${sm}) translate(${w / 2}px, ${w / 2}px) scale(${si}) translate(${-w / 2}px, ${-w / 2}px)`;
        flyWord.style.opacity = String(word);
        flyWord.style.transform = `translate(${lerp(0, m.wB.left - m.wA.left, mv)}px, ${lerp(0, m.wB.top - m.wA.top, mv) + 24 * (1 - word)}px) scale(${lerp(1, m.fB / m.fA, mv)})`;
      }

      // 5. Lake name caption: the text swaps at the middle of each cross-fade.
      caption.style.opacity = String(a(F0 + 0.8, F0 + 1.3, outCubic));
      const shown = xe > 0.5 ? nxt : idx;
      const [lakeId, name] = LAKES[shown];
      const label = `${name}${slideNight[shown] ? ' (evening)' : ''}`;
      if (label !== lastName) {
        capName.textContent = name;
        // The photo's credit, which its Creative Commons licence requires, linked to its source.
        const c = credit(lakeId, slideNight[shown]);
        capCredit.textContent = c ? `Photo: ${c.author}, ${c.license}` : '';
        capCredit.href = c?.sourceUrl ?? '';
        lastName = label;
      }
      capName.style.opacity = String(x > 0 ? Math.abs(xe - 0.5) * 2 : 1);
      capCredit.style.opacity = capName.style.opacity;
    }

    // Reduced motion: the settled final state, no animation and no cycling.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const now = () => (reduce ? SETTLED : (performance.now() - t0) / 1000);
    const refresh = () => {
      layout();
      measure();
      render(now());
    };

    let stopped = false;
    let frame = 0;
    layout();
    window.addEventListener('resize', refresh);
    const observer = new ResizeObserver(() => {
      measure();
      render(now());
    });
    observer.observe(g.pA);
    observer.observe(g.pB);
    void document.fonts.ready.then(() => {
      if (!stopped) refresh();
    });

    if (reduce) {
      frame = requestAnimationFrame(refresh);
    } else {
      const loop = () => {
        if (!m) measure();
        render(now());
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', refresh);
      document.title = previousTitle;
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [initialNight]);

  return (
    <main ref={mainRef} className="cs-main">
      <link
        rel="preload"
        as="image"
        href={fullPhoto('lucerne', initialNight, 1920)}
        imageSrcSet={fullSrcSet('lucerne', initialNight)}
        imageSizes={FULL_SIZES}
      />
      <div className="cs-grid" aria-hidden="true">
        {LAKES.map(([id]) => (
          <div key={id} className="cs-tile">
            <div className="cs-clip">
              <img
                src={photo(id, initialNight)}
                alt=""
                decoding="async"
                style={{ objectPosition: focus(id, initialNight) }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="cs-full" aria-hidden="true">
        {LAKES.map(([id]) => (
          <img
            key={id}
            src={photo(id, initialNight)}
            alt=""
            decoding="async"
            style={{ objectPosition: focus(id, initialNight), transformOrigin: focus(id, initialNight) }}
          />
        ))}
      </div>
      <div className="cs-dim" />
      <div className="cs-panel-bg" />

      <div className="cs-center">
        <div className="cs-panel">
          <div className="cs-ghost-mark-a" />
          <div className="cs-ghost-word-a" aria-hidden="true">
            Lacus
          </div>
          <p className="cs-tagline">Every boat, every lake.</p>
          <p className="cs-soon">Coming soon</p>
        </div>
      </div>
      <div className="cs-chip" aria-hidden="true">
        <div className="cs-ghost-mark-b" />
        <div className="cs-ghost-word-b">Lacus</div>
      </div>

      <svg className="cs-fly-mark" viewBox="0 0 600 600" role="img" aria-label="Lacus logo">
        <rect width="600" height="600" rx="130" ry="130" fill="#16384A" />
        <g data-cs="cross-v">
          <rect x="254" y="102" width="92" height="224" fill="#F2F0E9" />
        </g>
        <g data-cs="cross-h">
          <rect x="188" y="168" width="224" height="92" fill="#F2F0E9" />
        </g>
        <polyline
          data-cs="wave-1"
          points="85,404 300,499 515,404"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1}
          fill="none"
          stroke="#F2F0E9"
          strokeWidth={26}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          data-cs="wave-2"
          points="145,469 300,539 455,469"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1}
          fill="none"
          stroke="#F2F0E9"
          strokeWidth={20}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h1 className="cs-fly-word">Lacus</h1>

      <div className="cs-caption">
        <span className="cs-caption-name" aria-hidden="true">Lake Lucerne</span>
        <a className="cs-caption-credit" href={credit('lucerne', initialNight).sourceUrl} target="_blank" rel="noreferrer">
          Photo: {credit('lucerne', initialNight).author}, {credit('lucerne', initialNight).license}
        </a>
      </div>
    </main>
  );
}
