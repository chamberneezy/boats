const NAV_ITEMS = ['Home', 'Search sailings', 'Timetables', 'Help'];
const ACTIVE_ITEM = 'Search sailings';
const LOGO_SRC = `${import.meta.env.BASE_URL}logo-mark.svg`;

// Web: Lacus NavBar. Mobile: compact bar with the lake name and the mark.
export function AppHeader() {
  return (
    <header>
      <div className="hidden items-center justify-between border-b border-hairline bg-surface-page px-5 py-3 md:flex">
        <div className="flex items-center gap-2.5">
          <img src={LOGO_SRC} alt="Lacus" className="h-7 w-7 rounded-md" />
          <span className="font-display text-lg font-medium leading-6 text-deep-lake">Lacus</span>
        </div>
        <nav className="flex gap-6">
          {NAV_ITEMS.map((item) => (
            <span
              key={item}
              aria-current={item === ACTIVE_ITEM ? 'page' : undefined}
              className={`font-display text-[15px] font-medium ${item === ACTIVE_ITEM ? 'text-deep-lake' : 'text-stone-grey'}`}
            >
              {item}
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center justify-between px-5 pb-2 pt-4 md:hidden">
        <span className="font-display text-base font-medium text-deep-lake">Lake Lucerne</span>
        <img src={LOGO_SRC} alt="Lacus" className="h-[26px] w-[26px] rounded-md" />
      </div>
    </header>
  );
}
