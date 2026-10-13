import { useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Link, matchPath, useLocation, useNavigate } from 'react-router';
import { DEFAULT_LAKE_ID, LAKES } from '../lakes';
import { ACCOUNT_PATH, searchPath } from '../routes';
import { MenuButton } from './Menu';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo-mark.svg`;
const SEARCH_TO = searchPath(DEFAULT_LAKE_ID);

// Inert until that screen exists.
const WEB_INERT_ITEMS = ['Help'];

type Section = 'home' | 'search' | 'schedules' | 'account';

function useSection(pathname: string): { section: Section; lakeName: string | null } {
  if (pathname.startsWith('/schedules')) return { section: 'schedules', lakeName: 'Scheduled' };
  if (pathname.startsWith(ACCOUNT_PATH)) return { section: 'account', lakeName: 'Account' };
  const lakeId = (matchPath('/search/:lake', pathname) ?? matchPath('/trip/:lake', pathname))?.params.lake;
  if (!lakeId) return { section: 'home', lakeName: null };
  return { section: 'search', lakeName: LAKES.find((lake) => lake.id === lakeId)?.name ?? null };
}

function WebNav({ section }: { section: Section }) {
  // On Home the bar is transparent and lies over the splash photo, so it takes no height
  // and its text is white; on every other page it is the solid page-coloured bar.
  const overlay = section === 'home';
  const linkClass = (active: boolean) =>
    `font-display text-[15px] font-medium no-underline ${
      overlay ? (active ? 'text-white' : 'text-white/75') : active ? 'text-deep-lake' : 'text-stone-grey'
    }`;
  const content = (
    <>
      <Link to="/" className={`flex items-center gap-2.5 no-underline ${overlay ? 'text-white' : 'text-deep-lake'}`}>
        <img src={LOGO_SRC} alt="" className="h-7 w-7 rounded-md" />
        <span className="font-display text-lg font-medium leading-6 text-inherit">Lacus</span>
      </Link>
      {/* The menu button ends the bar on the right, the side its drawer opens on. */}
      <div className={`flex items-center gap-6 ${overlay ? 'text-white' : 'text-deep-lake'}`}>
        <nav className="flex gap-6" aria-label="Main">
          <Link to="/" aria-current={section === 'home' ? 'page' : undefined} className={linkClass(section === 'home')}>
            Home
          </Link>
          <Link to={SEARCH_TO} aria-current={section === 'search' ? 'page' : undefined} className={linkClass(section === 'search')}>
            Search trips
          </Link>
          <Link to="/schedules" aria-current={section === 'schedules' ? 'page' : undefined} className={linkClass(section === 'schedules')}>
            Timetables
          </Link>
          {WEB_INERT_ITEMS.map((item) => (
            <span key={item} className={`font-display text-[15px] font-medium ${overlay ? 'text-white/75' : 'text-stone-grey'}`}>
              {item}
            </span>
          ))}
        </nav>
        <MenuButton />
      </div>
    </>
  );

  // Over the splash the content lines up with the page container (so it matches the hero copy on
  // wide screens); on other pages it is the full-width solid bar.
  return overlay ? (
    <div className="absolute inset-x-0 top-0 z-20 hidden md:block">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-16 py-5">{content}</div>
    </div>
  ) : (
    <div className="hidden items-center justify-between border-b border-hairline bg-surface-page px-5 py-3 md:flex">
      {content}
    </div>
  );
}

function MobileBar({ section, lakeName }: { section: Section; lakeName: string | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isTrip = location.pathname.startsWith('/trip/');

  // From a trip, back means the page you came from; a direct visit falls back to the search page.
  function goBack() {
    if (location.key !== 'default') navigate(-1);
    else navigate(SEARCH_TO);
  }

  if (section === 'home') {
    // Transparent and laid over the splash photo, so it takes no height of its own.
    return (
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 pb-3 pt-4 text-white md:hidden">
        <div className="flex items-center gap-3.5">
          <MenuButton />
          <Link to={SEARCH_TO} aria-label="Search trips" className="flex h-6 w-6 items-center justify-center text-white">
            <Search className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display text-[17px] font-medium">Lacus</span>
          <img src={LOGO_SRC} alt="" className="h-[26px] w-[26px] rounded-md" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4 md:hidden">
      {isTrip ? (
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-deep-lake"
        >
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </button>
      ) : (
        <Link to="/" aria-label="Home" className="flex h-6 w-6 items-center justify-center text-deep-lake">
          <ArrowLeft className="h-5 w-5" strokeWidth={2} />
        </Link>
      )}
      {/* The search page names its lake in its own heading (a picker), so the bar does not repeat it. */}
      <span className="font-display text-base font-medium text-deep-lake">{section === 'search' && !isTrip ? '' : lakeName}</span>
      <img src={LOGO_SRC} alt="Lacus" className="h-[26px] w-[26px] rounded-md" />
    </div>
  );
}

// Home's bar, phones only (owner, 2026-10-12). The hero carries the logo and the menu button; once
// the visitor has scrolled past it this bar takes over, in the page's own Deep Lake: logo on the
// left (back to the top), menu on the right. It is away while the page moves down and comes back
// when it moves up, so it never lies on what is being read. Desktop has no bar on Home.
export function HomeBar() {
  const { pathname } = useLocation();
  const isHome = pathname === '/';
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    let last = window.scrollY;
    const update = () => {
      const y = window.scrollY;
      const hero = document.querySelector('.hm-hero');
      const past = hero ? hero.getBoundingClientRect().bottom < 0 : y > 0;
      // A few pixels of slack, so a resting thumb does not flick it in and out.
      if (!past) setShown(false);
      else if (y < last - 6) setShown(true);
      else if (y > last + 6) setShown(false);
      if (Math.abs(y - last) > 6) last = y;
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [isHome]);

  if (!isHome) return null;
  const toTop = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };
  return (
    <div
      className={`fixed inset-x-0 top-0 z-30 bg-deep-lake/90 text-chalk backdrop-blur-md transition-[translate,opacity,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:hidden ${
        shown ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-full opacity-0'
      }`}
    >
      <div className="flex h-14 items-center justify-between pl-5 pr-[9px]">
        <button type="button" onClick={toTop} aria-label="Lacus, back to the top" className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-inherit">
          <img src={LOGO_SRC} alt="" className="h-7 w-7 rounded-md" />
          <span className="font-display text-lg font-medium leading-6">Lacus</span>
        </button>
        <MenuButton large />
      </div>
    </div>
  );
}

export function AppHeader() {
  const { pathname } = useLocation();
  const { section, lakeName } = useSection(pathname);
  // Home has no bar in the page: its 3D hero carries the logo and the menu button and fills the
  // first screen; on phones HomeBar takes over once the visitor has scrolled past it.
  if (section === 'home') return null;
  return (
    <header>
      <WebNav section={section} />
      <MobileBar section={section} lakeName={lakeName} />
    </header>
  );
}
