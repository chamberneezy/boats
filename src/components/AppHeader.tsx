import { useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Link, matchPath, useLocation, useNavigate } from 'react-router';
import { DEFAULT_LAKE_ID, LAKES } from '../lakes';
import { ACCOUNT_PATH, searchPath } from '../routes';
import { MenuButton } from './Menu';
import { useMenu } from '../menu';

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
            Search sailings
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
          <Link to={SEARCH_TO} aria-label="Search sailings" className="flex h-6 w-6 items-center justify-center text-white">
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
      <span className="font-display text-base font-medium text-deep-lake">{lakeName}</span>
      <img src={LOGO_SRC} alt="Lacus" className="h-[26px] w-[26px] rounded-md" />
    </div>
  );
}

// Home's bar. The page opens with the hero alone; once the visitor has scrolled past it this bar
// slides in, pinned to the top: the logo on the left (back to the top) and the menu on the right.
// Everything else is in the menu, so nothing competes with the hero.
export function HomeBar() {
  const { pathname } = useLocation();
  const { open } = useMenu();
  const isHome = pathname === '/';
  const [past, setPast] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const update = () => {
      const hero = document.querySelector('.hm-hero');
      setPast(hero ? hero.getBoundingClientRect().bottom < 72 : window.scrollY > 0);
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
      className={`fixed left-0 top-0 z-30 bg-surface-page/90 text-deep-lake backdrop-blur-md transition-[translate,opacity,visibility,right] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
        open ? 'right-0 md:right-[400px]' : 'right-0'
      } ${past ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-full opacity-0'}`}
    >
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between pl-5 pr-2.5 md:h-16 md:pl-16 md:pr-[54px]">
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
  // Home has no bar in the page: its 3D hero carries the logo and fills the first screen, and
  // HomeBar appears once the visitor has scrolled past it.
  if (section === 'home') return null;
  return (
    <header>
      <WebNav section={section} />
      <MobileBar section={section} lakeName={lakeName} />
    </header>
  );
}
