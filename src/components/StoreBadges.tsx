import { STORE_URLS } from '../home/data';

function Badge({ small, big, url }: { small: string; big: string; url: string | null }) {
  const className = 'flex flex-col rounded-[12px] bg-deep-lake px-4 py-2.5 text-chalk no-underline';
  const content = (
    <>
      <span className="font-body text-[11px] leading-4">{small}</span>
      <span className="font-display text-[17px] font-semibold leading-5">{big}</span>
    </>
  );
  return url ? (
    <a className={className} href={url} target="_blank" rel="noopener noreferrer">
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  );
}

/** The two store badges. They are links once the apps are in the stores (STORE_URLS). */
export function StoreBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`flex gap-2.5 ${className}`}>
      <Badge small="Download on the" big="App Store" url={STORE_URLS.ios} />
      <Badge small="Get it on" big="Google Play" url={STORE_URLS.android} />
    </div>
  );
}
