/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL the per-lake data packages are served from (e.g. a CDN/bucket root).
   * When unset, `src/timetable/client.ts` falls back to the site-relative `/data` path.
   */
  readonly VITE_DATA_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
