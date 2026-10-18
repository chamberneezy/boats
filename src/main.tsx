import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { DATA_BASE_URL, getTimetable } from './timetable/client.ts'
import { refreshDirectory } from './directory.ts'

// Lakes and piers: the copy kept on the device, then the newest published one, in the background.
void refreshDirectory(DATA_BASE_URL)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Have the timetable ready before the first search.
void getTimetable()
