/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL the per-lake data packages are served from (e.g. a CDN/bucket root).
   * When unset, `src/timetable/client.ts` falls back to the site-relative `/data` path.
   */
  readonly VITE_DATA_BASE_URL?: string;
  /**
   * Firebase web config for accounts (`src/account/auth.ts`). Public values, not secrets.
   * When unset, accounts are off and the menu shows Account as "Coming soon".
   */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Comma-separated sign-in providers switched on in Firebase, e.g. `google.com,apple.com`. */
  readonly VITE_AUTH_PROVIDERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
