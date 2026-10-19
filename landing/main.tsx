import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { ComingSoonPage } from '../src/pages/ComingSoonPage.tsx';

// lacusapp.ch until launch (owner, 2026-10-19): the coming-soon page alone, nothing else of the app.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ComingSoonPage />
  </StrictMode>,
);
