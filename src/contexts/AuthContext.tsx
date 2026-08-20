import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { App as CapacitorApp } from '@capacitor/app';
import { supabase } from '../lib/supabaseClient';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ session: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    const listenerHandle = CapacitorApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url.includes('login-callback')) return;

      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        const params = new URLSearchParams(url.slice(hashIndex + 1));
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
        return;
      }

      if (url.includes('code=')) {
        await supabase.auth.exchangeCodeForSession(url);
      }
    });

    return () => {
      subscription.subscription.unsubscribe();
      listenerHandle.then((listener) => listener.remove());
    };
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
