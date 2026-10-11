// "What Lacus does": three features on the left, a stage on the right that plays the active one.
// It moves on every 7 seconds; picking a feature shows it and restarts the count.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CruiseCard } from './cruises';
import { EXAMPLE_FROM, EXAMPLE_TO, homePhoto, lakePhotoLarge } from './data';
import { scrollToId, useInterval, useIsMobile, useOnScreen, useReducedMotion } from './hooks';
import { Availability, Field } from './parts';
import { STAGE_MAP_SECONDS, StageRelief } from './StageRelief';

const SECONDS = 7;
// The map plays three routes, so it stays on stage longer than the other two.
const secondsFor = (k: number) => (k === 1 ? STAGE_MAP_SECONDS : SECONDS);
const FEATURES = [
  { n: '01', title: 'Search a trip', desc: 'Choose a lake and two piers. The next trips appear with arrival times.', target: 'how-search', link: 'See how search works' },
  { n: '02', title: 'Tap piers on the map', desc: 'The first pier is the departure, the second the arrival. On the web, iOS and Android.', target: 'how-map', link: 'See the map' },
  { n: '03', title: 'Special cruises', desc: 'Themed evenings from each operator, by lake and date. In the app for iOS and Android.', target: 'how-cruises', link: 'See the cruises' },
];
const EXAMPLE_ROWS = [
  ['14:05', '15:02'],
  ['15:05', '16:02'],
  ['16:05', '17:02'],
];
const FROM = EXAMPLE_FROM.pier.name;
const TO = EXAMPLE_TO.pier.name;

export function FeatureStage({ cruises }: { cruises: CruiseCard[] }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [round, setRound] = useState(0); // restarts the timer when a feature is picked
  const reduce = useReducedMotion();
  const mobile = useIsMobile();
  // Starts once a good part of the section is in view, not when its top edge peeks under the hero.
  const playing = useOnScreen(ref, 0.3) && !reduce;
  // Coming back on screen starts the active feature's seven seconds again, bar and timer together.
  useEffect(() => {
    if (playing) setRound((r) => r + 1);
  }, [playing]);
  useInterval(() => setActive((i) => (i + 1) % FEATURES.length), secondsFor(active) * 1000, playing, `${active}-${round}`);

  // An element of feature `k` fades in and rises after `delay` seconds once that feature is on.
  const enter = (k: number, delay: number, from = 'translateY(24px)', to = 'translateY(0)'): CSSProperties => {
    const on = active === k;
    const wait = on && !reduce ? delay : 0;
    return {
      opacity: on ? 1 : 0,
      transform: on ? to : from,
      transition: `opacity .6s ease ${wait}s, transform .9s cubic-bezier(.2,.7,.2,1) ${wait}s`,
    };
  };
  const layer = (k: number): CSSProperties => ({ pointerEvents: active === k ? 'auto' : 'none' });
  const zoom = (k: number) => (active === k && !reduce ? 1.08 : 1);

  // The fan: left, right, then the middle card on top.
  const offset = mobile ? 96 : 230;
  const drop = mobile ? 50 : 60;
  const lift = mobile ? 18 : 24;
  const fan = [
    { card: cruises[0], style: enter(2, 0.2, `translate(0,${drop}px) rotate(0deg)`, `translate(${-offset}px,${lift}px) rotate(-8deg)`) },
    { card: cruises[2], style: enter(2, 0.6, `translate(0,${drop}px) rotate(0deg)`, `translate(${offset}px,${lift}px) rotate(8deg)`) },
    { card: cruises[1], style: enter(2, 0.4, `translate(0,${drop}px)`, 'translate(0,-6px)') },
  ];

  return (
    <section className="hm-fs" ref={ref}>
      <div className="hm-fs-head">
        <div>
          <span className="hm-eyebrow">What Lacus does</span>
          <h2 className="hm-fs-title">Search it. Point at it. Book the evening.</h2>
        </div>
        <p className="hm-fs-lead hm-desktop-only">Three ways onto the lakes. Each one runs below on example data, ready to try.</p>
      </div>

      <div className="hm-fs-body">
        <div className="hm-fs-list">
          {FEATURES.map((feature, k) => {
            const on = active === k;
            return (
              <div
                key={feature.n}
                className="hm-fs-item"
                onClick={() => {
                  setActive(k);
                  setRound((r) => r + 1);
                }}
              >
                <div className="hm-fs-row">
                  <span className="hm-fs-n" style={{ color: on ? 'var(--color-alpine-sky)' : 'var(--color-stone-grey)' }}>
                    {feature.n}
                  </span>
                  <span className="hm-fs-t" style={{ color: on ? 'var(--color-deep-lake)' : 'var(--color-stone-grey)' }}>
                    {feature.title}
                  </span>
                </div>
                <div className="hm-fs-desc" style={{ maxHeight: on ? 160 : 0, opacity: on ? 1 : 0 }} aria-hidden={!on}>
                  <p>{feature.desc}</p>
                  <a
                    className="hm-fs-link"
                    href={`#${feature.target}`}
                    tabIndex={on ? 0 : -1}
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToId(feature.target);
                    }}
                  >
                    <span>{feature.link}</span>
                    <i aria-hidden="true">↓</i>
                  </a>
                </div>
                <div className="hm-fs-bar">
                  {/* Keyed so each turn on stage, and each pick, fills from empty again. */}
                  <div
                    key={`${active}-${round}`}
                    className={on && playing ? 'hm-fs-fill' : undefined}
                    style={{ width: on && !playing ? '100%' : undefined, animationDuration: `${secondsFor(k)}s` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="hm-stage" aria-hidden="true">
          {/* Backdrops: a Lake Lucerne photo for search, the dark map, Bregenz harbour for cruises. */}
          <div className="hm-abs" style={{ opacity: active === 0 ? 1 : 0, transition: 'opacity .9s ease' }}>
            <img className="hm-bg" src={lakePhotoLarge('lake-lucerne')} alt="" style={{ transform: `scale(${zoom(0)})` }} />
            <div className="hm-abs" style={{ background: 'rgba(22,56,74,0.5)' }} />
          </div>
          <div className="hm-abs" style={{ background: 'var(--hm-card-dark)', opacity: active === 1 ? 1 : 0, transition: 'opacity .9s ease' }} />
          <div className="hm-abs" style={{ opacity: active === 2 ? 1 : 0, transition: 'opacity .9s ease' }}>
            <img className="hm-bg" src={homePhoto('place-bregenz-evening')} alt="" loading="lazy" style={{ transform: `scale(${zoom(2)})` }} />
            <div className="hm-abs" style={{ background: 'rgba(22,56,74,0.55)' }} />
          </div>

          {/* 01: the search card fills in, the button appears, three trips follow. */}
          <div className="hm-st-search" style={layer(0)}>
            <div className="hm-card" style={enter(0, 0.1)}>
              <div className="hm-fields">
                <Field label="Lake" value="Lake Lucerne" valueStyle={enter(0, 0.5, 'translateX(-10px)', 'translateX(0)')} />
              </div>
              <div className="hm-hair" />
              <div className="hm-fields">
                <Field label="From" value={FROM} valueStyle={enter(0, 0.9, 'translateX(-10px)', 'translateX(0)')} />
                <div className="hm-vhair" />
                <Field label="To" value={TO} valueStyle={enter(0, 1.3, 'translateX(-10px)', 'translateX(0)')} />
              </div>
            </div>
            <div className="hm-st-btn" style={enter(0, 1.7, 'scale(.92)', 'scale(1)')}>
              Search trips
            </div>
            {EXAMPLE_ROWS.map(([depart, arrive], i) => (
              <div key={depart} className="hm-st-row" style={enter(0, 2.2 + i * 0.2)}>
                <span>{depart}</span>
                <span>
                  {FROM} → {TO}
                </span>
                <span>Arrives {arrive} · 57 min</span>
              </div>
            ))}
          </div>

          {/* 02: the hero's relief map, playing three routes pier by pier. */}
          <div className="hm-abs" style={{ ...layer(1), opacity: active === 1 ? 1 : 0, transition: 'opacity .9s ease' }}>
            <StageRelief active={active === 1} playing={playing} still={reduce} />
          </div>

          {/* 03: three cruise cards fan out from a stack. */}
          <div className="hm-abs" style={layer(2)}>
            {fan.map(({ card, style }) =>
              card ? (
                <div key={card.key} className="hm-fan" style={style}>
                  <img src={card.img} alt="" loading="lazy" />
                  <div>
                    <span className="hm-fan-meta">
                      {card.day} · {card.lake}
                    </span>
                    <span className="hm-fan-title">{card.title}</span>
                    <div className="hm-fan-foot">
                      <span style={{ color: card.soldOut ? 'var(--color-stone-grey)' : 'var(--color-deep-lake)' }}>{card.price}</span>
                      <Availability soldOut={card.soldOut} />
                    </div>
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
