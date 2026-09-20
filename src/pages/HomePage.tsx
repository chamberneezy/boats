import { useNavigate } from 'react-router';
import { CtaBand } from '../components/CtaBand';
import { LakeCard } from '../components/LakeCard';
import { LakeGroups } from '../components/LakeGroups';
import { SplashHero } from '../components/SplashHero';
import { LAKE_PHOTOS } from '../data/lakePhotos';
import { useDocumentTitle } from '../useDocumentTitle';
import { useFavorites } from '../useFavorites';
import { useMediaQuery } from '../useMediaQuery';
import { DEFAULT_LAKE_ID, LAKES } from '../lakes';
import { searchPath } from '../routes';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo-mark.svg`;

export function HomePage() {
  useDocumentTitle('Lacus — Switzerland’s lakes, on schedule');
  const navigate = useNavigate();
  const { favorites, toggle } = useFavorites();
  const isWide = useMediaQuery('(min-width: 768px)');
  const goToSearch = () => navigate(searchPath(DEFAULT_LAKE_ID));
  const showLakes = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('lakes')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  };

  const rows = [LAKES.slice(0, 4), LAKES.slice(4, 8), LAKES.slice(8, 12)];
  const bands = [
    { title: 'Reserve your Lake Lucerne crossing', body: 'Departs from Lucerne, Weggis, Vitznau and Flüelen.' },
    { title: 'Book ahead for peak departures', body: 'Cabins are heated. Light rain does not cancel a crossing.' },
  ];

  return (
    <>
      <main className="mx-auto max-w-[1440px]">
        <SplashHero onSelectLake={showLakes} />

        <section id="lakes" className="flex flex-col gap-5 px-5 pb-5 pt-8 md:gap-8 md:px-16 md:pb-[72px] md:pt-20">
          <div>
            <h2 className="m-0 font-display text-lg font-medium text-deep-lake md:text-[28px]">Lakes we cover</h2>
            <p className="m-0 mt-1.5 hidden font-body text-sm text-stone-grey md:block">
              Reservations are open on Lake Lucerne. Other lakes are shown for reference and will open for booking soon.
            </p>
          </div>

          {!isWide && (
            /* Phones: popular lakes, then the rest folded behind their language region. */
            <div className="flex flex-col gap-5">
              <LakeGroups favorites={favorites} onToggleFavorite={toggle} />
              <CtaBand {...bands[0]} buttonLabel="Search sailings" onClick={goToSearch} />
            </div>
          )}

          {isWide && (
            /* Web: the full grid in the same order, with a call to action between rows. */
          <div className="flex flex-col gap-8">
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} className="flex flex-col gap-8">
                <div className="grid grid-cols-2 gap-6">
                  {row.map((lake) => (
                    <LakeCard
                      key={lake.id}
                      lake={lake}
                      isFavorite={favorites.includes(lake.id)}
                      onToggleFavorite={() => toggle(lake.id)}
                    />
                  ))}
                </div>
                {bands[rowIdx] && <CtaBand {...bands[rowIdx]} buttonLabel="Search sailings" onClick={goToSearch} />}
              </div>
            ))}
          </div>
          )}
        </section>

        <details className="px-5 pb-8 md:px-16 md:pb-10">
          <summary className="cursor-pointer font-body text-[13px] text-stone-grey">Photo credits</summary>
          <ul className="m-0 mt-3 list-none space-y-1.5 p-0 font-body text-xs text-stone-grey">
            {LAKES.filter((lake) => lake.id in LAKE_PHOTOS)
              .map((lake) => ({ label: lake.name, photo: LAKE_PHOTOS[lake.id] }))
              .map(({ label, photo }) => {
              return (
                <li key={label}>
                  {label}:{' '}
                  <a href={photo.sourceUrl} target="_blank" rel="noreferrer" className="text-alpine-sky">
                    {photo.title}
                  </a>{' '}
                  by {photo.author},{' '}
                  <a href={photo.licenseUrl} target="_blank" rel="noreferrer" className="text-alpine-sky">
                    {photo.license}
                  </a>
                  . Resized and cropped.
                </li>
              );
            })}
          </ul>
        </details>

        <footer className="hidden items-center justify-between border-t border-hairline px-16 py-6 md:flex">
          <div className="flex items-center gap-2">
            <img src={LOGO_SRC} alt="" className="h-[22px] w-[22px] rounded-[5px]" />
            <span className="font-body text-[13px] text-stone-grey">Lacus — lake transit, Switzerland.</span>
          </div>
          <span className="font-body text-[13px] text-stone-grey">Lake Lucerne · more lakes soon</span>
        </footer>
      </main>
    </>
  );
}
