import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { MenuContext, useMenu } from '../menu';

const LOGO_SRC = `${import.meta.env.BASE_URL}logo-mark.svg`;

// Inert until those screens exist.
const MENU_INERT_ITEMS = ['Tickets', 'Account'];

// The menu slides in from the left and pushes the page aside, never covering it. Phones: it fills
// the whole screen and the page slides fully out of view. Desktop: a 400px drawer, and Layout
// narrows the page by the same 400px.
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
      className={`fixed inset-y-0 left-0 z-50 flex w-full flex-col overflow-y-auto bg-surface-page text-deep-lake transition-[translate,visibility] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none md:w-[400px] md:shadow-card ${
        open ? 'visible translate-x-0' : 'invisible -translate-x-full'
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
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
        <span className="font-display text-base font-medium text-deep-lake">Menu</span>
        <img src={LOGO_SRC} alt="Lacus" className="h-[26px] w-[26px] rounded-md" />
      </div>

      <div className="flex flex-col gap-6 px-5 pb-10 pt-4 md:px-8">
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
          <Link to="/" onClick={close} className={`${row} text-deep-lake`}>
            Home
          </Link>
          <Link to="/schedules" onClick={close} className={`${row} text-deep-lake`}>
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
    </div>
  );
}

// The hamburger. Its colour is inherited so it suits the bar it sits in; it also closes the menu.
export function MenuButton() {
  const { open, setOpen } = useMenu();
  return (
    <button
      type="button"
      aria-label="Menu"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className="flex h-6 w-6 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-inherit"
    >
      <Menu className="h-[18px] w-[18px]" strokeWidth={2} />
    </button>
  );
}
