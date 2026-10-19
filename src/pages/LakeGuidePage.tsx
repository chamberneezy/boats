// A lake guide, /lakes/<slug> (owner, 2026-10-19): the lake's photo with the title, one gold
// "Search trips" into that lake's search, then the guide's text in the site's type, each popular
// trip a link into its search, and a search card at the end. On desktop the lake's 3D relief and
// its cruise showcase (the search page's own pieces) stay beside the text; phones get the text alone.
// Web only.
import { useEffect, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { CruiseTeaser } from '../components/CruiseTeaser';
import { LakeMapPanel } from '../components/LakeMapPanel';
import { LAKE_PHOTOS } from '../data/lakePhotos';
import { guideBySlug, LAKES_PATH } from '../guides/guides';
import { GuideBody } from '../guides/GuideBody';
import { guideFaq, parseGuide } from '../guides/markdown';
import { lakePhotoLarge } from '../home/data';
import { LAKES } from '../lakes';
import { searchPath } from '../routes';
import { useDocumentTitle } from '../useDocumentTitle';
import { useMetaDescription } from '../useMetaDescription';

export function LakeGuidePage() {
  const { slug } = useParams();
  const guide = guideBySlug(slug);
  const blocks = useMemo(() => (guide ? parseGuide(guide.markdown) : []), [guide]);
  useDocumentTitle(guide?.title ?? 'Lakes — Lacus');
  useMetaDescription(guide?.description ?? null);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  if (!guide) return <Navigate to={LAKES_PATH} replace />;

  const [title, ...rest] = blocks;
  const lakeName = LAKES.find((lake) => lake.id === guide.lakeId)?.name ?? '';
  const photo = LAKE_PHOTOS[guide.lakeId];
  const faq = guideFaq(blocks);
  const faqJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  });

  return (
    <main className="pb-16">
      <div className="relative h-[300px] overflow-hidden bg-deep-lake md:h-[420px]">
        <img src={lakePhotoLarge(guide.lakeId)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-deep-lake/90 via-deep-lake/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto max-w-[1440px] px-5 pb-6 md:px-16 md:pb-10">
          <Link to={LAKES_PATH} className="font-body text-[13px] uppercase tracking-[0.08em] text-chalk/80 no-underline">
            Lake guides
          </Link>
          <h1 className="m-0 mt-2 max-w-[860px] font-display text-[30px] font-semibold leading-[36px] text-chalk md:text-[52px] md:leading-[60px]">
            {title?.lines[0]}
          </h1>
        </div>
        {photo && (
          <a
            href={photo.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute right-3 top-3 font-body text-[11px] text-chalk/80 no-underline [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]"
          >
            Photo: {photo.author}, {photo.license}
          </a>
        )}
      </div>

      <div className="mx-auto flex max-w-[1440px] gap-12 px-5 md:px-16">
        <div className="min-w-0 max-w-[760px] flex-1">
          <div className="mt-6 flex flex-col gap-3 rounded-[16px] bg-surface-card p-5 shadow-card md:mt-10 md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="font-display text-lg font-medium text-deep-lake">Plan your trip</div>
              <div className="font-body text-sm text-stone-grey">Every pier and every boat on the lake, for the day you choose.</div>
            </div>
            <Link
              to={searchPath(guide.lakeId)}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-[10px] bg-sunline-gold px-6 font-display text-[15px] font-medium text-white no-underline"
            >
              Search trips
            </Link>
          </div>

          <GuideBody blocks={rest} lakeId={guide.lakeId} />

          <div className="mt-12 flex flex-col gap-3 rounded-[16px] bg-deep-lake p-5 text-chalk shadow-card md:flex-row md:items-center md:justify-between md:p-6">
            <div>
              <div className="font-display text-lg font-medium">Find your trip on {lakeName}</div>
              <div className="font-body text-sm text-chalk/80">Any two piers, any date in the timetable, with the boat that runs it.</div>
            </div>
            <Link
              to={searchPath(guide.lakeId)}
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-[10px] border border-chalk/40 px-6 font-display text-[15px] font-medium text-chalk no-underline"
            >
              Search trips
            </Link>
          </div>
        </div>

        {/* Desktop: what Lacus shows of this lake, beside the text while it is read. */}
        <aside className="hidden w-[420px] shrink-0 self-stretch pt-10 lg:block">
          <LakeMapPanel lakeId={guide.lakeId} lakeName={lakeName} className="flex" />
          {/* The cruises stay in view down the rest of the guide (the map alone is about a screen tall). */}
          <div className="sticky top-6">
            <CruiseTeaser lakeId={guide.lakeId} lakeName={lakeName} compact />
          </div>
        </aside>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJson }} />
    </main>
  );
}
