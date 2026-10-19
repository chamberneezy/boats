// The guide's text in the site's type: Kanit headings, Karma body, tables as white cards with
// hairlines, questions that open and close as on Home, credited photos. A table whose first two
// columns are From and To gets a "Search" on each row: that trip in the search, for now.
import { Link } from 'react-router';
import { HOME_PHOTOS } from '../data/homePhotos';
import { homePhoto, searchHref } from '../home/data';
import { searchPath } from '../routes';
import { searchPiers, isExactPierName } from '../piers';
import type { PierOption } from '../types';
import { inline, tableRows, type GuideBlock } from './markdown';

/** A pier of the lake by the name the guide uses ("Küssnacht am Rigi", "Gersau (car ferry)"). */
function pierNamed(lakeId: string, text: string): PierOption | undefined {
  // The name as written first ("Môtier (Vully)"), then without a note in brackets ("(car ferry)").
  const exact = searchPiers(lakeId, text.trim()).find((pier) => isExactPierName(pier, text));
  if (exact) return exact;
  const name = text.replace(/\s*\(.*\)\s*$/, '').trim();
  const candidates = searchPiers(lakeId, name.split(/[\s-]/)[0]);
  return (
    candidates.find((pier) => isExactPierName(pier, name)) ??
    candidates.find((pier) => name.startsWith(`${pier.name} `)) ??
    searchPiers(lakeId, name).find((pier) => isExactPierName(pier, name))
  );
}

const TH = 'border-b border-hairline px-4 py-3 text-left align-bottom font-display text-[13px] font-medium text-stone-grey';
const BODY = 'm-0 font-body text-[16px] leading-[26px] text-deep-lake md:text-[17px] md:leading-[27px]';

/** "Find your trip": into the lake's search, in the text (`[[search]]`) and at the guide's end. */
export function GuideSearchCard({ lakeId, lakeName }: { lakeId: string; lakeName: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-[16px] bg-deep-lake p-5 text-chalk shadow-card md:flex-row md:items-center md:justify-between md:p-6">
      <div>
        <div className="font-display text-lg font-medium">Find your trip on {lakeName}</div>
        <div className="font-body text-sm text-chalk/80">Any two piers, any date in the timetable, with the boat that runs it.</div>
      </div>
      <Link
        to={searchPath(lakeId)}
        className="inline-flex h-11 shrink-0 items-center justify-center rounded-[10px] border border-chalk/40 px-6 font-display text-[15px] font-medium text-chalk no-underline"
      >
        Search trips
      </Link>
    </div>
  );
}

export function GuideBody({ blocks, lakeId, lakeName }: { blocks: GuideBlock[]; lakeId: string; lakeName: string }) {
  return (
    <div className="mt-8 flex flex-col gap-5 md:mt-10">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'h2':
            return (
              <h2 key={i} className="m-0 mt-8 font-display text-[24px] font-semibold leading-[30px] text-deep-lake md:mt-12 md:text-[30px] md:leading-[36px]">
                {block.lines[0]}
              </h2>
            );
          case 'p':
            return (
              <p key={i} className={BODY}>
                {inline(block.lines[0])}
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className={`${BODY} flex list-disc flex-col gap-1.5 pl-5 marker:text-alpine-sky`}>
                {block.lines.map((line, j) => (
                  <li key={j}>{inline(line)}</li>
                ))}
              </ul>
            );
          case 'search':
            return <GuideSearchCard key={i} lakeId={lakeId} lakeName={lakeName} />;
          case 'img': {
            const [key, alt] = block.lines;
            const credit = HOME_PHOTOS[key];
            return (
              <figure key={i} className="m-0 overflow-hidden rounded-[16px] bg-deep-lake shadow-card">
                <img src={homePhoto(key)} alt={alt} loading="lazy" className="block aspect-[16/9] w-full object-cover" />
                {credit && (
                  <figcaption className="bg-surface-card px-4 py-2 font-body text-[12px] text-stone-grey">
                    {alt}. Photo:{' '}
                    <a href={credit.sourceUrl} target="_blank" rel="noreferrer" className="text-inherit">
                      {credit.author}
                    </a>
                    , {credit.license}
                  </figcaption>
                )}
              </figure>
            );
          }
          case 'table': {
            const { head, rows } = tableRows(block.lines);
            if (head?.[0] === 'From' && head?.[1] === 'To') return <TripTable key={i} lakeId={lakeId} head={head} rows={rows} />;
            return (
              <div key={i} className="overflow-x-auto rounded-[14px] bg-surface-card shadow-card">
                <table className="w-full border-collapse font-body text-[14px] leading-5 text-deep-lake md:text-[15px]">
                  {head && (
                    <thead>
                      <tr>
                        {head.map((cell, j) => (
                          <th key={j} className={TH}>
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {rows.map((row, j) => (
                      <tr key={j} className="border-b border-hairline last:border-0">
                        {row.map((cell, k) => (
                          <td key={k} className={`px-4 py-3 align-top tabular-nums ${k === 0 ? 'font-display font-medium' : ''}`}>
                            {inline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          case 'faq':
            return (
              <details key={i} className="group border-b border-hairline">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-display text-[17px] font-medium text-deep-lake [&::-webkit-details-marker]:hidden">
                  {block.lines[0]}
                  <span aria-hidden="true" className="font-display text-[22px] leading-none text-alpine-sky transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className={`${BODY} pb-4 text-deep-lake/80`}>{inline(block.lines[1])}</p>
              </details>
            );
          case 'hr':
            return <hr key={i} className="my-4 border-0 border-t border-hairline" />;
          default:
            return null;
        }
      })}
    </div>
  );
}

// Popular trips (columns From, To, fastest, most boats, then boats per day): one row a trip, the trip
// itself a link into its search for now, the usual time with the fastest under it when it differs.
function TripTable({ lakeId, head, rows }: { lakeId: string; head: string[]; rows: string[][] }) {
  const counts = head.slice(4);
  const short = (label: string) => label.replace(/^Boats per day,\s*/i, '').replace(/^./, (c) => c.toUpperCase());
  return (
    <div className="overflow-hidden rounded-[14px] bg-surface-card shadow-card">
      <table className="w-full border-collapse font-body text-[14px] leading-5 text-deep-lake md:text-[15px]">
        <thead>
          <tr>
            <th className={TH}>Trip</th>
            <th className={TH}>Time</th>
            {counts.map((label) => (
              <th key={label} className={`${TH} text-right`}>
                <span className="hidden md:inline">Boats a day, </span>
                {short(label).toLowerCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([fromName, toName, fastest, usual, ...perDay], j) => {
            const from = pierNamed(lakeId, fromName);
            const to = pierNamed(lakeId, toName);
            const trip = (
              <>
                {fromName} → {toName}
              </>
            );
            return (
              <tr key={j} className="border-b border-hairline last:border-0">
                <td className="px-3 py-3 align-top font-display font-medium md:px-4">
                  {from && to ? (
                    <Link to={searchHref(lakeId, from, to)} className="text-deep-lake no-underline hover:text-alpine-sky">
                      {trip} <span className="text-alpine-sky">›</span>
                    </Link>
                  ) : (
                    trip
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-3 align-top tabular-nums md:px-4">
                  {usual.replace(/^about /, '')}
                  {fastest !== usual && <div className="text-[12px] text-stone-grey">fastest {fastest.replace(/^about /, '')}</div>}
                </td>
                {perDay.map((count, k) => (
                  <td key={k} className="px-3 py-3 text-right align-top tabular-nums md:px-4">
                    {count}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
