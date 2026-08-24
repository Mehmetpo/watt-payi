import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '../lib/supabaseClient';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  recovery: boolean;
  clearRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  loading: true,
  recovery: false,
  clearRecovery: () => {},
});

// Deep link back from the password-reset email, e.g.
// com.mehmetcebe.wattpayi://login-callback#access_token=...&refresh_token=...&type=recovery
function parseRecoveryTokens(url: string): { accessToken: string; refreshToken: string } | null {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return null;
  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (params.get('type') !== 'recovery' || !accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const recoveryEstablished = useRef(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    const urlListener = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      const tokens = parseRecoveryTokens(url);
      if (!tokens) return;
      // Set recovery synchronously, before setSession resolves: setSession()
      // triggers the onAuthStateChange subscription above (which sets
      // `session`) internally, strictly before its own promise settles. If
      // `recovery` were only set in a .then() after that, there'd be a real
      // window where `session` is truthy while `recovery` is still false —
      // AuthedShell (src/App.tsx) reads both, so that window could flash the
      // real app UI before the reset-password screen takes over. Falling
      // back to false on failure preserves the original behavior for an
      // invalid/expired reset link (silently return to the login screen).
      //
      // recoveryEstablished guards against a second, stale appUrlOpen event
      // (Capacitor/iOS can redeliver these) whose setSession call fails
      // *after* an earlier link already succeeded — without this guard, that
      // late failure would call setRecovery(false) and kick the user out of
      // an already-legitimate recovery session.
      setRecovery(true);
      supabase.auth
        .setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken })
        .then(({ error }) => {
          if (error) {
            if (!recoveryEstablished.current) setRecovery(false);
          } else {
            recoveryEstablished.current = true;
          }
        });
    });

    return () => {
      subscription.subscription.unsubscribe();
      urlListener.then((l) => l.remove());
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        recovery,
        clearRecovery: () => {
          // Reset alongside `recovery` so a later, unrelated recovery
          // attempt isn't wrongly treated as "already established" by a
          // stale ref from this finished one (see the appUrlOpen listener
          // above for what this ref guards against).
          recoveryEstablished.current = false;
          setRecovery(false);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
