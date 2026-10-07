// Lacus accounts: sign-in with an emailed link or a provider (Google or Apple),
// through Firebase Auth. No passwords.
//
// Privacy rules (owner's): an account is a random id plus an email address, nothing else. Saved
// trips, reminders and location stay on the device and are never tied to the account. Nothing
// here sends analytics; only firebase/app and firebase/auth are loaded, and only once a page
// needs them (dynamic import), so every other page's bundle is unchanged.
//
// Accounts are on only when the Firebase config is present (VITE_FIREBASE_*: .env.development
// today), so the live site keeps showing Account as "Coming soon" until accounts are released.

import type { Auth } from 'firebase/auth';

const CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const ACCOUNTS_ENABLED = Boolean(CONFIG.apiKey && CONFIG.authDomain && CONFIG.projectId && CONFIG.appId);

// The address a sign-in link was sent to, kept on this device only until the link is opened, so
// the rider doesn't have to type it twice. Removed as soon as sign-in completes.
const PENDING_EMAIL_KEY = 'lacus.pendingSignInEmail';

export type AccountState =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; email: string | null };

let state: AccountState = { status: 'loading' };
const listeners = new Set<() => void>();

function setState(next: AccountState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export function subscribeAccount(listener: () => void): () => void {
  listeners.add(listener);
  void loadAuth();
  return () => listeners.delete(listener);
}

export const getAccountState = (): AccountState => state;

type AuthModule = typeof import('firebase/auth');
let loading: Promise<{ auth: Auth; mod: AuthModule }> | null = null;

function loadAuth() {
  loading ??= Promise.all([import('firebase/app'), import('firebase/auth')]).then(([app, mod]) => {
    const auth = mod.initializeAuth(app.initializeApp(CONFIG), {
      persistence: [mod.indexedDBLocalPersistence, mod.browserLocalPersistence],
      popupRedirectResolver: mod.browserPopupRedirectResolver,
    });
    auth.languageCode = 'en';
    mod.onAuthStateChanged(auth, (user) =>
      setState(user ? { status: 'signed-in', email: user.email } : { status: 'signed-out' }),
    );
    return { auth, mod };
  });
  return loading;
}

function readPendingEmail(): string | null {
  try {
    return localStorage.getItem(PENDING_EMAIL_KEY);
  } catch {
    return null;
  }
}

function writePendingEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(PENDING_EMAIL_KEY, email);
    else localStorage.removeItem(PENDING_EMAIL_KEY);
  } catch {
    // Private mode or blocked storage: the rider is asked for the address again when the link opens.
  }
}

// Where the emailed link lands: this site's Account page.
const accountUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}account`;

export async function sendSignInLink(email: string): Promise<void> {
  const { auth, mod } = await loadAuth();
  await mod.sendSignInLinkToEmail(auth, email, { url: accountUrl(), handleCodeInApp: true });
  writePendingEmail(email);
}

export async function isSignInLink(href: string): Promise<boolean> {
  const { auth, mod } = await loadAuth();
  return mod.isSignInWithEmailLink(auth, href);
}

// The address the link was sent to, when it was sent from this device.
export const pendingSignInEmail = readPendingEmail;

export async function completeSignInLink(href: string, email: string): Promise<void> {
  const { auth, mod } = await loadAuth();
  const { user } = await mod.signInWithEmailLink(auth, email, href);
  writePendingEmail(null);
  await forgetNameAndPhoto(user);
}

// Lacus keeps no name or photo. Google and Apple hand them over at sign-in, and Firebase stores them
// on the account (top level and per provider). The SDK's updateProfile can't remove them: it sends
// nulls, which the server ignores. Firebase's accounts:update with deleteAttribute does remove both,
// in both places. Runs after every sign-in, so an account never keeps them (iOS does the same).
async function forgetNameAndPhoto(user: import('firebase/auth').User): Promise<void> {
  if (!user.displayName && !user.photoURL && user.providerData.every((p) => !p.displayName && !p.photoURL)) return;
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${CONFIG.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: await user.getIdToken(), deleteAttribute: ['DISPLAY_NAME', 'PHOTO_URL'] }),
  });
  if (!response.ok) throw new Error(`Couldn't remove the name and photo (${response.status})`);
  await user.reload();
}

// Sign-in providers, in the order the buttons show. A provider only gets a button once it is
// switched on in Firebase (Authentication > Sign-in method) and listed in VITE_AUTH_PROVIDERS, so a
// rider never meets a button that fails.
export type ProviderId = 'google.com' | 'apple.com';
export const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: 'google.com', label: 'Google' },
  { id: 'apple.com', label: 'Apple' },
];
const ENABLED_PROVIDERS = new Set((import.meta.env.VITE_AUTH_PROVIDERS ?? '').split(',').map((id) => id.trim()));
export const enabledProviders = () => PROVIDERS.filter((provider) => ENABLED_PROVIDERS.has(provider.id));

export async function signInWithProvider(id: ProviderId): Promise<void> {
  const { auth, mod } = await loadAuth();
  let provider;
  if (id === 'google.com') {
    provider = new mod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
  } else {
    // Apple: ask for the email only, never the name.
    provider = new mod.OAuthProvider(id);
    provider.addScope('email');
  }
  const { user } = await mod.signInWithPopup(auth, provider);
  await forgetNameAndPhoto(user);
}

export async function signOut(): Promise<void> {
  const { auth, mod } = await loadAuth();
  await mod.signOut(auth);
}

// Deletes the account itself. Firebase only allows this shortly after a sign-in; otherwise it
// throws auth/requires-recent-login and the rider signs in again first.
export async function deleteAccount(): Promise<void> {
  const { auth } = await loadAuth();
  if (auth.currentUser) await auth.currentUser.delete();
}

// Calm, rider-facing text for a failed auth call. Null means "say nothing" (the rider cancelled).
export function authErrorMessage(error: unknown): string | null {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return 'That email address doesn’t look right.';
    case 'auth/invalid-action-code':
    case 'auth/expired-action-code':
      return 'This sign-in link has expired or was already used. Send yourself a new one.';
    case 'auth/operation-not-allowed':
      return 'This way of signing in isn’t available yet.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Allow pop-ups for Lacus and try again.';
    case 'auth/quota-exceeded':
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a little and try again.';
    case 'auth/network-request-failed':
      return 'No connection. Check your internet and try again.';
    case 'auth/account-exists-with-different-credential':
      return 'This email address already has a Lacus account with a different sign-in. Use that one, or the email link.';
    case 'auth/requires-recent-login':
      return 'For your security, sign in again, then delete your account.';
    default:
      return 'Something went wrong. Try again.';
  }
}
