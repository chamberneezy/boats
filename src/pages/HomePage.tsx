// Home (design handoff "Lacus hero web/README-Web-Home.md"): the 3D hero of Lake Lucerne, the
// three-feature stage, a live demo of each feature, and the directory of the twelve lakes. Every
// link leads into the search with the visitor's choice filled in.
import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { HOME_PHOTOS } from '../data/homePhotos';
import { LAKE_PHOTOS } from '../data/lakePhotos';
import { CruisesDemo } from '../home/CruisesDemo';
import { CRUISE_LAKES, useCruiseSets } from '../home/cruises';
import { HERO_SRC, LOGO_SRC } from '../home/data';
import { FeatureStage } from '../home/FeatureStage';
import { LakeDirectory } from '../home/LakeDirectory';
import { MapDemo } from '../home/MapDemo';
import { SearchDemo } from '../home/SearchDemo';
import '../home/home.css';
import { DEFAULT_LAKE_ID, LAKES } from '../lakes';
import { searchPath } from '../routes';
import { useDocumentTitle } from '../useDocumentTitle';

const CREDITS = [
  ...LAKES.filter((lake) => lake.id in LAKE_PHOTOS).map((lake) => ({ label: lake.name, photo: LAKE_PHOTOS[lake.id] })),
  ...Object.values(HOME_PHOTOS).map((photo) => ({ label: 'Cruises', photo })),
];

export function HomePage() {
  useDocumentTitle('Lacus — Every pier, every boat');
  const navigate = useNavigate();
  const cruiseSets = useCruiseSets();

  // Until the cruises have loaded, the lakes the teaser covers carry the tag; then the lakes that
  // really have an upcoming cruise.
  const cruiseLakeIds = useMemo(
    () => new Set(cruiseSets.length ? cruiseSets.map((set) => set.lakeId) : CRUISE_LAKES.map((lake) => lake.id)),
    [cruiseSets],
  );
  // The stage's fan of three: the next cruise of each of the first three lakes.
  const stageCruises = useMemo(() => cruiseSets.map((set) => set.items[0]).slice(0, 3), [cruiseSets]);

  // The hero draws a 3D scene every frame: stop it while it is scrolled out of view.
  const hero = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const frame = hero.current;
    if (!frame || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      const map = frame.contentWindow as (Window & { __heroPaused?: boolean }) | null;
      if (map) map.__heroPaused = !entry.isIntersecting;
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // The hero is a page of its own in a frame (same origin). Its "Explore Lacus" buttons open the
  // search; its logo links to Home, which is this page.
  const wireHero = (frame: HTMLIFrameElement) => {
    try {
      const doc = frame.contentDocument;
      if (!doc) return;
      doc.querySelectorAll('button.cta').forEach((button) => button.addEventListener('click', () => navigate(searchPath(DEFAULT_LAKE_ID))));
      doc.getElementById('brand')?.addEventListener('click', (event) => event.preventDefault());
    } catch {
      // A frame that cannot be reached keeps its own behaviour.
    }
  };

  return (
    <div className="hm">
      <div className="hm-hero">
        <iframe ref={hero} src={HERO_SRC} title="Lake Lucerne, its piers and boat routes" onLoad={(event) => wireHero(event.currentTarget)} />
      </div>

      <main>
        <div className="hm-wrap">
          <FeatureStage cruises={stageCruises} />
        </div>

        <div className="hm-dark">
          <div className="hm-wrap">
            <SearchDemo />
            <div className="hm-rule" />
            <MapDemo />
            <div className="hm-rule" />
            <CruisesDemo sets={cruiseSets} />
          </div>
        </div>

        <div className="hm-wrap">
          <LakeDirectory cruiseLakeIds={cruiseLakeIds} />

          <details className="hm-credits">
            <summary>Photo credits</summary>
            <ul>
              {CREDITS.map(({ label, photo }) => (
                <li key={photo.sourceUrl}>
                  {label}:{' '}
                  <a href={photo.sourceUrl} target="_blank" rel="noreferrer">
                    {photo.title}
                  </a>{' '}
                  by {photo.author},{' '}
                  <a href={photo.licenseUrl} target="_blank" rel="noreferrer">
                    {photo.license}
                  </a>
                  . Resized and cropped.
                </li>
              ))}
            </ul>
          </details>

          <footer className="hm-foot">
            <div>
              <img src={LOGO_SRC} alt="" />
              <span>Lacus · lake transit, Switzerland.</span>
            </div>
            <span>Photos: Wikimedia Commons contributors</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
