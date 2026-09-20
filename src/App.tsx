import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router';
import { AppHeader } from './components/AppHeader';
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
  return (
    <div className="min-h-screen bg-surface-page text-deep-lake">
      <ScrollToTop />
      <AppHeader />
      <Outlet />
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/schedules" element={<SchedulesPage />} />
        <Route path="/search/:lake" element={<SearchPage />} />
        <Route path="/trip/:lake" element={<TripPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
