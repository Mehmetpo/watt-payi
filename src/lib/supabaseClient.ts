import { createClient } from '@supabase/supabase-js';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

// One-time migration: existing sessions were written to Preferences
// (unencrypted) before this adapter switched to SecureStorage. A thrown
// StorageError from a decrypt failure is treated as "not found" so a
// corrupted keystore entry can't crash session restore on startup.
const capacitorStorageAdapter = {
  getItem: async (key: string) => {
    let value: string | null = null;
    try {
      const stored = await SecureStorage.get(key);
      value = stored === null ? null : String(stored);
    } catch {
      value = null;
    }
    if (value !== null) return value;

    const legacy = await Preferences.get({ key });
    if (legacy.value === null) return null;

    try {
      await SecureStorage.set(key, legacy.value);
      await Preferences.remove({ key }).catch(() => {});
    } catch {
      // Leave the legacy value in Preferences; migration retries next launch.
    }
    return legacy.value;
  },
  setItem: async (key: string, value: string) => {
    await SecureStorage.set(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStorage.remove(key).catch(() => {});
  },
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: capacitorStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
