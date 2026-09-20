import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router';
import { AppHeader } from './components/AppHeader';
import { MenuPanel, MenuProvider } from './components/Menu';
import { useMenu } from './menu';
import { HomePage } from './pages/HomePage';
import { SchedulesPage } from './pages/SchedulesPage';
import { SearchPage } from './pages/SearchPage';
import { TripPage } from './pages/TripPage';

// New pages open at the top; going back or forward keeps the browser's own scroll position.
function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo({ top: 0 });
  }, [pathname, navigationType]);
  return null;
}

function Layout() {
  const { open } = useMenu();
  return (
    <>
      <MenuPanel />
      {/* An open menu pushes the page aside: on phones it slides fully out of view (the menu fills
          the screen), on desktop the page narrows by the drawer's 400px so nothing is covered. */}
      <div
        className={`relative min-h-screen bg-surface-page text-deep-lake transition-[margin,translate] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
          open ? 'translate-x-full md:translate-x-0 md:ml-[400px]' : ''
        }`}
      >
        <ScrollToTop />
        <AppHeader />
        <Outlet />
      </div>
    </>
  );
}

function App() {
  return (
    <MenuProvider>
      <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="/search/:lake" element={<SearchPage />} />
        <Route path="/trip/:lake" element={<TripPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      </Routes>
    </MenuProvider>
  );
}

export default App;
