// /lakes (owner, 2026-10-19): the twelve lakes in the usual order, each with its photo; a lake with a
// guide opens it, every lake opens its search. Guides are added lake by lake.
import { Link } from 'react-router';
import { guideForLake, guidePath } from '../guides/guides';
import { HOME_LAKES, lakePhoto, searchHref } from '../home/data';
import { useDocumentTitle } from '../useDocumentTitle';
import { useMetaDescription } from '../useMetaDescription';

export function LakesPage() {
  useDocumentTitle('Swiss lakes by boat: lake guides — Lacus');
  useMetaDescription('Boat trips on the twelve Swiss lakes: guides to each lake’s boats, piers, timetables, passes and special cruises, and a search for every trip.');

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-16 pt-2 md:px-16 md:pt-14">
      <div className="max-w-[760px]">
        <h1 className="m-0 font-display text-[30px] font-semibold leading-tight text-deep-lake md:text-[40px]">Swiss lakes by boat</h1>
        <p className="m-0 mt-2 font-body text-[15px] leading-6 text-deep-lake/80 md:text-[17px] md:leading-[26px]">
          Twelve lakes, about 240 piers. Each guide explains where the boats go, how long trips take, when they run and which passes are valid.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-10 md:gap-6 lg:grid-cols-3">
        {HOME_LAKES.map((lake) => {
          const guide = guideForLake(lake.id);
          return (
            <article key={lake.id} className="flex flex-col overflow-hidden rounded-[16px] bg-surface-card shadow-card">
              <div className="relative h-[160px] bg-deep-lake">
                <img src={lakePhoto(lake.id)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h2 className="m-0 font-display text-xl font-semibold text-deep-lake">{lake.name}</h2>
                  <div className="font-body text-[13px] text-stone-grey">{lake.localName}</div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  {guide ? (
                    <Link to={guidePath(guide.slug)} className="font-display text-[15px] font-medium text-alpine-sky no-underline">
                      Read the guide
                    </Link>
                  ) : (
                    <span className="font-body text-[13px] text-stone-grey">Guide coming soon</span>
                  )}
                  <Link to={searchHref(lake.id)} className="font-display text-[15px] font-medium text-deep-lake no-underline">
                    Search trips →
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
