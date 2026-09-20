import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Menu, Search, X } from 'lucide-react';
import { Link, matchPath, useLocation, useNavigate } from 'react-router';
import { DEFAULT_LAKE_ID, LAKES } from '../lakes';
import { searchPath } from '../routes';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo-mark.svg`;
const SEARCH_TO = searchPath(DEFAULT_LAKE_ID);

// Inert until those screens exist.
const WEB_INERT_ITEMS = ['Help'];
const MENU_INERT_ITEMS = ['Tickets', 'Account'];

type Section = 'home' | 'search' | 'schedules';

function useSection(pathname: string): { section: Section; lakeName: string | null } {
  if (pathname.startsWith('/schedules')) return { section: 'schedules', lakeName: 'Scheduled' };
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
  return (
    <div
      className={`hidden items-center justify-between px-5 py-3 md:flex ${
        overlay
          ? 'absolute inset-x-0 top-0 z-20 px-16 py-5'
          : 'border-b border-hairline bg-surface-page'
      }`}
    >
      <Link to="/" className="flex items-center gap-2.5 no-underline">
        <img src={LOGO_SRC} alt="" className="h-7 w-7 rounded-md" />
        <span className={`font-display text-lg font-medium leading-6 ${overlay ? 'text-white' : 'text-deep-lake'}`}>Lacus</span>
      </Link>
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
    </div>
  );
}

// Full-screen menu: same top bar as the other screens (close on the left, title in the middle,
// the app icon on the right), a search bar that is only a placeholder for now, then the pages.
function MenuOverlay({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // the page behind must not scroll
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const row = 'block border-b border-hairline py-4 font-display text-2xl font-medium no-underline';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="fixed inset-0 z-50 flex animate-[menu-in_180ms_ease-out] flex-col overflow-y-auto bg-surface-page text-deep-lake motion-reduce:animate-none"
    >
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-deep-lake"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
        <span className="font-display text-base font-medium text-deep-lake">Menu</span>
        <img src={LOGO_SRC} alt="Lacus" className="h-[26px] w-[26px] rounded-md" />
      </div>

      <div className="flex flex-col gap-6 px-5 pb-10 pt-4">
        {/* Placeholder: no search behind it yet. */}
        <div className="flex items-center gap-3 rounded-[12px] bg-surface-card px-4 py-3 shadow-card">
          <Search className="h-4 w-4 flex-shrink-0 text-stone-grey" strokeWidth={2} aria-hidden="true" />
          <input
            disabled
            placeholder="Search lakes and piers"
            aria-label="Search (coming soon)"
            className="w-full min-w-0 border-0 bg-transparent p-0 font-body text-base text-deep-lake outline-none placeholder:text-stone-grey"
          />
        </div>

        <nav aria-label="Menu" className="flex flex-col border-t border-hairline">
          <Link to="/" onClick={onClose} className={`${row} text-deep-lake`}>
            Home
          </Link>
          <Link to="/schedules" onClick={onClose} className={`${row} text-deep-lake`}>
            Schedules
          </Link>
          {MENU_INERT_ITEMS.map((item) => (
            <div key={item} className={`${row} flex items-baseline justify-between text-stone-grey`}>
              {item}
              <span className="font-body text-xs uppercase tracking-[0.06em]">Coming soon</span>
            </div>
          ))}
        </nav>
      </div>
    </div>,
    document.body,
  );
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-inherit"
      >
        <Menu className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      {open && <MenuOverlay onClose={() => setOpen(false)} />}
    </>
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
          <MobileMenu />
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

export function AppHeader() {
  const { pathname } = useLocation();
  const { section, lakeName } = useSection(pathname);
  return (
    <header>
      <WebNav section={section} />
      <MobileBar section={section} lakeName={lakeName} />
    </header>
  );
}
