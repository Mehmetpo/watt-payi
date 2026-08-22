import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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
async function handleAuthDeepLink(url: string): Promise<boolean> {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return false;
  const params = new URLSearchParams(url.slice(hashIndex + 1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (params.get('type') !== 'recovery' || !accessToken || !refreshToken) return false;

  const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  return !error;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    const urlListener = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      handleAuthDeepLink(url).then((isRecovery) => {
        if (isRecovery) setRecovery(true);
      });
    });

    return () => {
      subscription.subscription.unsubscribe();
      urlListener.then((l) => l.remove());
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, recovery, clearRecovery: () => setRecovery(false) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
