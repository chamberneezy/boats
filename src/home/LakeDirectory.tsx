// "Where Lacus runs": the twelve lakes, each a link into the search for that lake. On desktop a
// preview card beside the list follows the pointer; phones get the list alone.
import { useState } from 'react';
import { Link } from 'react-router';
import { LAKE_PHOTOS } from '../data/lakePhotos';
import { DEFAULT_LAKE_ID } from '../lakes';
import { HOME_LAKES, lakePhotoLarge, searchHref } from './data';
import { useIsMobile, useReducedMotion } from './hooks';

export function LakeDirectory({ cruiseLakeIds }: { cruiseLakeIds: Set<string> }) {
  const mobile = useIsMobile();
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(DEFAULT_LAKE_ID);
  // Photos are fetched for the lakes the pointer has been on, not all twelve at once.
  const [seen, setSeen] = useState(() => new Set([DEFAULT_LAKE_ID]));
  const current = HOME_LAKES.find((lake) => lake.id === hovered) ?? HOME_LAKES[0];

  const hover = (id: string) => {
    setHovered(id);
    setSeen((ids) => (ids.has(id) ? ids : new Set(ids).add(id)));
  };

  return (
    <section id="lakes" className="hm-dir">
      <div className="hm-dir-left">
        <div className="hm-dir-head">
          <span className="hm-eyebrow">Where Lacus runs</span>
          <h2 className="hm-dir-title">Twelve lakes. One search.</h2>
          <p className="hm-dir-lead">
            {mobile ? 'Select a lake to open the search with its piers ready.' : 'Every pier and every boat, lake by lake. Select one to open the search with its piers ready.'}
          </p>
        </div>
        <div className="hm-dir-list">
          {HOME_LAKES.map((lake) => {
            const on = !mobile && lake.id === hovered;
            return (
              <Link key={lake.id} to={searchHref(lake.id)} className="hm-dir-row" onMouseEnter={() => hover(lake.id)} onFocus={() => hover(lake.id)}>
                <div style={{ transform: `translateX(${on ? 6 : 0}px)` }}>
                  <span className="hm-dir-name">{lake.name}</span>
                  <span className="hm-dir-sub">
                    {mobile ? lake.localName : `${lake.localName} · ${lake.piers.slice(0, 2).map((p) => p.name).join(', ')} and more`}
                  </span>
                  {cruiseLakeIds.has(lake.id) && <span className="hm-dir-tag">Special cruises</span>}
                </div>
                <span
                  className="hm-arrow"
                  aria-hidden="true"
                  style={on ? { background: 'var(--color-deep-lake)', color: 'var(--color-chalk)' } : { background: 'var(--color-surface-sunken)', color: 'var(--color-deep-lake)' }}
                >
                  →
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {!mobile && (
        // Dressed like the search page's cruise showcase: the photo on top with the lake's name on it,
        // a Deep Lake band under it with the one way on, the search for that lake.
        <Link to={searchHref(current.id)} className="hm-prev" tabIndex={-1} aria-hidden="true">
          <div className="hm-prev-photo">
            {HOME_LAKES.filter((lake) => seen.has(lake.id) && lake.id in LAKE_PHOTOS).map((lake) => {
              const on = lake.id === current.id;
              return (
                <img
                  key={lake.id}
                  src={lakePhotoLarge(lake.id)}
                  alt=""
                  className="hm-prev-img"
                  style={{ opacity: on ? 1 : 0, transform: `scale(${on && !reduce ? 1.06 : 1})` }}
                />
              );
            })}
            <div className="hm-abs hm-prev-scrim" />
            <div key={current.id} className="hm-prev-title cruise-rise">
              {cruiseLakeIds.has(current.id) && <span className="hm-prev-tag">Special cruises</span>}
              <span className="hm-prev-name">{current.name}</span>
              <span className="hm-prev-local">{current.localName}</span>
            </div>
          </div>
          <div className="hm-prev-band">
            <span>Every pier, every boat on {current.name}.</span>
            <span className="hm-prev-go">
              Search trips <span aria-hidden="true">→</span>
            </span>
          </div>
        </Link>
      )}
    </section>
  );
}
