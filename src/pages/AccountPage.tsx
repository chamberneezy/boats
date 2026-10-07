import { useEffect, useState, useSyncExternalStore, type FormEvent, type ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router';
import {
  ACCOUNTS_ENABLED,
  authErrorMessage,
  completeSignInLink,
  deleteAccount,
  getAccountState,
  isSignInLink,
  pendingSignInEmail,
  enabledProviders,
  sendSignInLink,
  signInWithProvider,
  type ProviderId,
  signOut,
  subscribeAccount,
} from '../account/auth';
import { ProviderLogo } from '../account/ProviderLogos';
import { Button } from '../components/Button';
import { ACCOUNT_PATH } from '../routes';
import { useDocumentTitle } from '../useDocumentTitle';

const CARD = 'rounded-[14px] bg-surface-card p-5 shadow-card md:p-7';
const INPUT =
  'w-full rounded-[12px] border border-hairline bg-surface-card px-4 py-3 font-body text-base text-deep-lake outline-none placeholder:text-stone-grey focus:border-alpine-sky';
const OUTLINED =
  'inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-hairline bg-surface-card px-7 py-3.5 font-display text-[15px] font-medium leading-5 text-deep-lake disabled:cursor-default disabled:text-stone-grey';

// Opening an emailed sign-in link lands here with the link's code in the URL. 'checking' until we
// know; 'confirm-email' when the link was opened on another device and the address is needed.
type LinkStep = 'checking' | 'none' | 'confirm-email' | 'completing';

export function AccountPage() {
  if (!ACCOUNTS_ENABLED) return <Navigate to="/" replace />;
  return <Account />;
}

function Account() {
  useDocumentTitle('Account — Lacus');
  const account = useSyncExternalStore(subscribeAccount, getAccountState, getAccountState);
  const navigate = useNavigate();
  const [linkStep, setLinkStep] = useState<LinkStep>('checking');
  const [error, setError] = useState<string | null>(null);

  // Finish signing in from an emailed link, then drop the one-time code from the address bar.
  async function finishLink(email: string) {
    setLinkStep('completing');
    setError(null);
    try {
      await completeSignInLink(window.location.href, email);
    } catch (e) {
      setError(authErrorMessage(e));
    }
    setLinkStep('none');
    navigate(ACCOUNT_PATH, { replace: true });
  }

  useEffect(() => {
    let cancelled = false;
    void isSignInLink(window.location.href).then((isLink) => {
      if (cancelled) return;
      if (!isLink) return setLinkStep('none');
      const email = pendingSignInEmail();
      if (email) void finishLink(email);
      else setLinkStep('confirm-email');
    });
    return () => {
      cancelled = true;
    };
    // Runs once per visit; finishLink only reads the current URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let body: ReactNode;
  if (linkStep === 'checking' || linkStep === 'completing' || account.status === 'loading') {
    body = (
      <div className={CARD} aria-busy="true">
        <div className="skel h-6 w-2/3" />
        <div className="skel mt-4 h-12 w-full" />
      </div>
    );
  } else if (linkStep === 'confirm-email') {
    body = <ConfirmEmail error={error} onSubmit={finishLink} />;
  } else if (account.status === 'signed-in') {
    body = <SignedIn email={account.email} initialError={error} />;
  } else {
    body = <SignIn initialError={error} />;
  }

  return (
    <main className="mx-auto max-w-[1440px] px-5 pb-16 pt-2 md:px-16 md:pt-14">
      <div className="max-w-[560px]">
        {/* Phones show the title in the header bar, as on Schedules. */}
        <h1 className="m-0 hidden font-display text-[32px] font-medium leading-tight text-deep-lake md:block">Account</h1>
        <div className="mt-2 md:mt-6">{body}</div>
        <p className="m-0 mt-5 font-body text-[13px] leading-relaxed text-stone-grey">
          Lacus keeps only your email address and a random account number. Saved trips stay on your device and are
          never uploaded.
        </p>
      </div>
    </main>
  );
}

function ErrorText({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="m-0 mt-3 font-body text-sm text-deep-lake">
      {children}
    </p>
  );
}

function SignIn({ initialError }: { initialError: string | null }) {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  async function send(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address || busy) return;
    setBusy(true);
    setError(null);
    try {
      await sendSignInLink(address);
      setSentTo(address);
    } catch (err) {
      setError(authErrorMessage(err));
    }
    setBusy(false);
  }

  async function withProvider(id: ProviderId) {
    setError(null);
    try {
      await signInWithProvider(id);
    } catch (err) {
      setError(authErrorMessage(err));
    }
  }

  const providers = enabledProviders();

  if (sentTo) {
    return (
      <div className={CARD}>
        <h2 className="m-0 font-display text-lg font-medium text-deep-lake">Check your email</h2>
        <p className="m-0 mt-2 font-body text-[15px] text-deep-lake">
          We sent a sign-in link to <span className="font-medium">{sentTo}</span>. Open it on this device to sign in.
        </p>
        <p className="m-0 mt-2 font-body text-[13px] text-stone-grey">No email after a few minutes? Check your spam folder.</p>
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => setSentTo(null)}>
            Use a different address
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={CARD}>
      <h2 className="m-0 font-display text-lg font-medium text-deep-lake">Sign in or create an account</h2>
      <form onSubmit={send} className="mt-4 flex flex-col gap-2">
        <label htmlFor="account-email" className="font-body text-[13px] text-alpine-sky">
          Sign in with your email
        </label>
        <input
          id="account-email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-describedby="account-email-hint"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT}
        />
        <p id="account-email-hint" className="m-0 font-body text-[13px] text-stone-grey">
          Only used to sign you in. No password: we email you a one-time sign-in link. No newsletters, no marketing.
        </p>
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="mt-1 inline-flex w-full cursor-pointer items-center justify-center rounded-[12px] border-0 bg-sunline-gold px-7 py-3.5 font-display text-[15px] font-medium leading-5 text-white active:bg-sunline-gold-pressed disabled:cursor-default disabled:bg-cta-disabled disabled:text-cta-disabled-text"
        >
          {busy ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      </form>
      {providers.length > 0 && (
        <>
          <div className="my-4 flex items-center gap-3 font-body text-[13px] text-stone-grey" aria-hidden="true">
            <span className="h-px flex-1 bg-hairline" />
            or continue with
            <span className="h-px flex-1 bg-hairline" />
          </div>
          <div className="flex flex-col gap-3">
            {providers.map((provider) => (
              <button key={provider.id} type="button" onClick={() => void withProvider(provider.id)} className={OUTLINED}>
                <ProviderLogo id={provider.id} />
                Continue with {provider.label}
              </button>
            ))}
          </div>
        </>
      )}
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

// The link was opened on a different device or browser than the one it was requested from.
function ConfirmEmail({ error, onSubmit }: { error: string | null; onSubmit: (email: string) => void }) {
  const [email, setEmail] = useState('');
  return (
    <div className={CARD}>
      <h2 className="m-0 font-display text-lg font-medium text-deep-lake">Confirm your email</h2>
      <p className="m-0 mt-2 font-body text-[15px] text-deep-lake">
        You opened the sign-in link on a different device. Enter the address it was sent to.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) onSubmit(email.trim());
        }}
        className="mt-4 flex flex-col gap-3"
      >
        <label htmlFor="confirm-email" className="font-body text-[13px] text-alpine-sky">
          Email address
        </label>
        <input
          id="confirm-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT}
        />
        <Button fullWidth disabled={!email.trim()} onClick={() => email.trim() && onSubmit(email.trim())}>
          Sign in
        </Button>
      </form>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}

function SignedIn({ email, initialError }: { email: string | null; initialError: string | null }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (err) {
      const message = authErrorMessage(err);
      // Firebase asks for a fresh sign-in before deleting; signing out gets the rider there.
      if (err && typeof err === 'object' && 'code' in err && err.code === 'auth/requires-recent-login') await signOut();
      setError(message);
    }
    setBusy(false);
  }

  return (
    <div className={CARD}>
      <p className="m-0 font-body text-[13px] text-alpine-sky">Signed in as</p>
      <p className="m-0 mt-1 break-all font-display text-lg font-medium text-deep-lake">{email ?? 'Your account'}</p>

      <div className="mt-4 flex items-center justify-between border-t border-hairline pt-4">
        <span className="font-body text-[15px] text-deep-lake">Plan</span>
        <span className="font-display text-[15px] font-medium text-deep-lake">Free</span>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <button type="button" onClick={() => void signOut()} className={OUTLINED}>
          Sign out
        </button>
        {!confirming ? (
          <Button variant="secondary" fullWidth onClick={() => setConfirming(true)}>
            Delete account
          </Button>
        ) : (
          <div className="rounded-[12px] bg-surface-sunken p-4">
            <p className="m-0 font-body text-[15px] text-deep-lake">
              Delete your Lacus account? This can’t be undone.
            </p>
            <div className="mt-3 flex gap-3">
              <button type="button" disabled={busy} onClick={remove} className={OUTLINED}>
                {busy ? 'Deleting…' : 'Delete account'}
              </button>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
      {error && <ErrorText>{error}</ErrorText>}
    </div>
  );
}
