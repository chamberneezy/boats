import { ArrowLeft, Search } from 'lucide-react';
import { Link, matchPath, useLocation, useNavigate } from 'react-router';
import { DEFAULT_LAKE_ID, LAKES } from '../lakes';
import { searchPath } from '../routes';
import { MenuButton } from './Menu';
import { useMenu } from '../menu';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo-mark.svg`;
const SEARCH_TO = searchPath(DEFAULT_LAKE_ID);

// Inert until that screen exists.
const WEB_INERT_ITEMS = ['Help'];

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
  // While the menu is open the drawer shows the X and the logo itself, so the pushed page must not
  // repeat them beside it: the left group fades out (its space is kept, so the links don't move).
  const { open: menuOpen } = useMenu();
  const content = (
    <>
      <div
        className={`flex items-center gap-4 transition-[opacity,visibility] duration-300 motion-reduce:transition-none ${
          overlay ? 'text-white' : 'text-deep-lake'
        } ${menuOpen ? 'invisible opacity-0' : ''}`}
      >
        <MenuButton />
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <img src={LOGO_SRC} alt="" className="h-7 w-7 rounded-md" />
          <span className="font-display text-lg font-medium leading-6 text-inherit">Lacus</span>
        </Link>
      </div>
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
