import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Close, Menu } from '../icons/lacus';
import { Link, useLocation } from 'react-router';
import { MenuContext, useMenu } from '../menu';
import { DEFAULT_LAKE_ID } from '../lakes';
import { searchPath } from '../routes';
import { SiteSearch } from './SiteSearch';
import { StoreBadges } from './StoreBadges';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo-mark.svg`;

// Only what the site has (owner, 2026-10-21): no inert "coming soon" rows, no Account (the apps need
// none) and no Tickets (Lacus sells nothing; tickets come from each lake's operator).

// The menu pushes the page aside, never covering it, from the right, where its button is. Phones: it
// fills the whole screen and the page slides fully out of view to the left. Desktop: a 400px drawer,
// and Layout narrows the page by the same 400px.
export function MenuProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  return <MenuContext.Provider value={{ open, setOpen }}>{children}</MenuContext.Provider>;
}

export function MenuPanel() {
  const { open, setOpen } = useMenu();
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    // On phones the sheet covers the page, which must not scroll behind it; on desktop the page stays usable.
    const isPhone = !window.matchMedia('(min-width: 768px)').matches;
    const previousOverflow = document.body.style.overflow;
    if (isPhone) document.body.style.overflow = 'hidden';
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, setOpen]);

  const row = 'block border-b border-hairline py-4 font-display text-2xl font-medium no-underline';

  return (
    <div
      role="dialog"
      aria-modal={open}
      aria-label="Menu"
      aria-hidden={!open}
      className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col overflow-y-auto bg-surface-page text-deep-lake transition-[translate,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:w-[400px] md:shadow-card ${
        open ? 'visible translate-x-0' : 'invisible translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4 md:px-8 md:pt-6">
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close menu"
          className="flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-deep-lake"
        >
          <Close className="h-6 w-6" />
        </button>
        <span className="font-display text-base font-medium text-deep-lake">Menu</span>
        <img src={LOGO_SRC} alt="Lacus" className="h-[26px] w-[26px] rounded-md" />
      </div>

      <div className="flex flex-col gap-6 px-5 pb-10 pt-4 md:px-8">
        <SiteSearch open={open} onNavigate={close} />

        <nav aria-label="Menu" className="flex flex-col border-t border-hairline">
          <Link to="/" onClick={close} className={`${row} text-deep-lake`}>
            Home
          </Link>
          <Link to={searchPath(DEFAULT_LAKE_ID)} onClick={close} className={`${row} text-deep-lake`}>
            Search trips
          </Link>
          <Link to="/lakes" onClick={close} className={`${row} text-deep-lake`}>
            Lakes
          </Link>
          <Link to="/schedules" onClick={close} className={`${row} text-deep-lake`}>
            Timetables
          </Link>
        </nav>

        <section aria-label="The Lacus app" className="rounded-2xl bg-surface-card p-5 shadow-card">
          <h2 className="m-0 font-display text-lg font-medium text-deep-lake">Lacus for iPhone and Android</h2>
          <p className="mb-4 mt-1 font-body text-[15px] leading-6 text-alpine-sky">
            Free, with no account. Pick your piers on a 3D map of the lake, see every lake's special cruises
            and get a reminder before your boat leaves.
          </p>
          <StoreBadges />
        </section>
      </div>
    </div>
  );
}

// The hamburger. Its colour is inherited so it suits the bar it sits in; it also closes the menu.
// `large` is the 44px version for a bar where it is the only control.
export function MenuButton({ large = false }: { large?: boolean }) {
  const { open, setOpen } = useMenu();
  return (
    <button
      type="button"
      aria-label="Menu"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={`flex cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-inherit ${large ? 'h-11 w-11' : 'h-6 w-6'}`}
    >
      <Menu className={large ? 'h-6 w-6' : 'h-5 w-5'} />
    </button>
  );
}
