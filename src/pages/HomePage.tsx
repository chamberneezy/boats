import { useNavigate } from 'react-router';
import { Button } from '../components/Button';
import { CtaBand } from '../components/CtaBand';
import { LakeCard } from '../components/LakeCard';
import { useDocumentTitle } from '../useDocumentTitle';
import { useFavorites } from '../useFavorites';
import { DEFAULT_LAKE_ID, LAKES } from '../lakes';
import { searchPath } from '../routes';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo-mark.svg`;

export function HomePage() {
  useDocumentTitle('Lacus — Switzerland’s lakes, on schedule');
  const navigate = useNavigate();
  const { favorites, toggle } = useFavorites();
  const goToSearch = () => navigate(searchPath(DEFAULT_LAKE_ID));

  const rows = [LAKES.slice(0, 4), LAKES.slice(4, 8), LAKES.slice(8, 12)];
  const bands = [
    { title: 'Reserve your Lake Lucerne crossing', body: 'Departs from Lucerne, Weggis, Vitznau and Flüelen.' },
    { title: 'Book ahead for peak departures', body: 'Cabins are heated. Light rain does not cancel a crossing.' },
  ];

  return (
    <>
      <main className="mx-auto max-w-[1440px]">
        <section className="flex flex-col gap-2.5 px-5 pb-5 md:flex-row md:items-center md:gap-16 md:px-16 md:py-[72px]">
          <div className="flex max-w-[560px] flex-1 flex-col gap-2.5 md:gap-5">
            <span className="hidden font-body text-xs uppercase tracking-[0.06em] text-alpine-sky md:block">
              Swiss lake crossings
            </span>
            <h1 className="m-0 font-display text-2xl font-semibold leading-[30px] text-deep-lake md:text-5xl md:leading-[56px]">
              Switzerland&apos;s lakes, on schedule.
            </h1>
            <p className="m-0 hidden font-body text-base text-deep-lake md:block">
              Timetables and reservations for lake crossings. Booking is open on Lake Lucerne. More lakes join soon.
            </p>
            <div className="hidden pt-2 md:block">
              <Button onClick={goToSearch}>Search sailings</Button>
            </div>
          </div>

          <div className="flex flex-1 justify-center">
            <div className="flex aspect-video w-full max-w-[600px] flex-col items-center justify-center gap-1 rounded-[14px] border-2 border-dashed border-alpine-sky/40 bg-surface-sunken md:aspect-[16/10] md:gap-2 md:rounded-[16px]">
              <span className="font-display text-xs font-medium text-alpine-sky md:text-sm">Animation placeholder</span>
              <span className="font-body text-[10px] text-stone-grey md:text-xs">
                <span className="md:hidden">750 × 420</span>
                <span className="hidden md:inline">Hero animation to be provided — 1600 × 1000</span>
              </span>
            </div>
          </div>

          <div className="md:hidden">
            <Button size="sm" fullWidth onClick={goToSearch}>
              Select your lake
            </Button>
          </div>
        </section>

        <section className="flex flex-col gap-5 px-5 pb-5 md:gap-8 md:px-16 md:pb-[72px]">
          <div>
            <h2 className="m-0 font-display text-lg font-medium text-deep-lake md:text-[28px]">Lakes we cover</h2>
            <p className="m-0 mt-1.5 hidden font-body text-sm text-stone-grey md:block">
              Reservations are open on Lake Lucerne. Other lakes are shown for reference and will open for booking soon.
            </p>
          </div>

          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="flex flex-col gap-5 md:gap-8">
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-6">
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
        </section>

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
