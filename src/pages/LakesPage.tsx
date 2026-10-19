// /lakes (owner, 2026-10-19, option A of three mockups): a Deep Lake header, then the lakes as photo
// cards in the order riders use them, not the directory's: the three most used large, then
// Constance, Maggiore and Lugano leading the other nine. A card is the lake's English name and its
// guide (no local name or region; the name will follow the language once the site has others). A
// card opens the guide, never the search: the guide has the ways into the search.
import { Link } from 'react-router';
import { guideForLake, guidePath } from '../guides/guides';
import { lakePhoto, lakePhotoLarge } from '../home/data';
import { LAKES } from '../lakes';
import { useDocumentTitle } from '../useDocumentTitle';
import { useMetaDescription } from '../useMetaDescription';

const MOST_USED = ['lake-lucerne', 'lake-geneva', 'lake-zurich'];
const THEN = ['lake-constance', 'lake-maggiore', 'lake-lugano', 'lake-zug', 'lake-thun', 'lake-brienz', 'lake-neuchatel', 'lake-biel', 'lake-murten'];

function LakeCard({ lakeId, large }: { lakeId: string; large: boolean }) {
  const lake = LAKES.find((item) => item.id === lakeId);
  if (!lake) return null;
  const guide = guideForLake(lakeId);
  const body = (
    <>
      <img
        src={large ? lakePhotoLarge(lakeId) : lakePhoto(lakeId)}
        alt=""
        loading={large ? 'eager' : 'lazy'}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-deep-lake/90 via-deep-lake/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5 md:p-6">
        <h2 className={`m-0 font-display font-semibold leading-tight text-chalk ${large ? 'text-[28px] md:text-[34px]' : 'text-[22px] md:text-[24px]'}`}>
          {lake.name}
        </h2>
        {guide ? (
          <span className="font-display text-[15px] font-medium text-chalk">Read the guide →</span>
        ) : (
          <span className="font-display text-[14px] font-medium text-chalk/70">Guide coming soon</span>
        )}
      </div>
    </>
  );
  const box = `group relative block overflow-hidden rounded-[16px] bg-deep-lake shadow-card ${large ? 'h-[300px] md:h-[440px]' : 'h-[190px] md:h-[240px]'}`;
  return guide ? (
    <Link to={guidePath(guide.slug)} className={`${box} no-underline`} aria-label={`${lake.name}: read the guide`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

export function LakesPage() {
  useDocumentTitle('Swiss lakes by boat: lake guides — Lacus');
  useMetaDescription('Boat trips on the twelve Swiss lakes: guides to each lake’s boats, piers, timetables, passes and special cruises, and a search for every trip.');

  return (
    <main className="pb-16">
      <div className="bg-deep-lake text-chalk">
        <div className="mx-auto max-w-[1440px] px-5 pb-10 pt-10 md:px-16 md:pb-14 md:pt-[72px]">
          <span className="font-body text-[12px] uppercase tracking-[0.08em] text-alpine-sky md:text-[13px]">Lake guides</span>
          <h1 className="m-0 mt-3 font-display text-[34px] font-semibold leading-[40px] md:text-[56px] md:leading-[62px]">Swiss lakes by boat</h1>
          <p className="m-0 mt-4 max-w-[640px] font-body text-[15px] leading-[22px] text-chalk/80 md:text-[18px] md:leading-[28px]">
            Where the boats go, how long trips take, when they run and which passes are valid, lake by lake. Then find your trip in one search.
          </p>
          <dl className="m-0 mt-8 flex gap-8 md:gap-10">
            {[
              ['12', 'Lakes'],
              ['~240', 'Piers'],
              ['1', 'Search for all'],
            ].map(([value, label]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="font-body text-[12px] uppercase tracking-[0.04em] text-chalk/70 md:text-[13px]">{label}</dt>
                <dd className="m-0 font-display text-[24px] font-semibold md:text-[32px]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-5 md:px-16">
        <div className="mt-8 grid grid-cols-1 gap-4 md:mt-14 md:grid-cols-3 md:gap-6">
          {MOST_USED.map((id) => (
            <LakeCard key={id} lakeId={id} large />
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:mt-6 md:grid-cols-3 md:gap-6">
          {THEN.map((id) => (
            <LakeCard key={id} lakeId={id} large={false} />
          ))}
        </div>
      </div>
    </main>
  );
}
