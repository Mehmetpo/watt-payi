import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { deviceLocales, resolveLanguage, type Lang, type LanguagePreference } from './language';
import { translate, type Dictionaries, type Params } from './translate';
import { formatNumber, formatPercent, formatPeriod } from './format';
import { getLanguagePreference, setLanguagePreference } from './storage';
import { tr } from './dictionaries/tr';
import { en } from './dictionaries/en';

export const DICTIONARIES: Dictionaries = { tr, en };

interface I18nValue {
  lang: Lang;
  preference: LanguagePreference;
  setPreference: (pref: LanguagePreference) => void;
  t: (key: string, params?: Params) => string;
  number: (n: number, opts?: Intl.NumberFormatOptions) => string;
  percent: (value: string | number) => string;
  period: (iso: string) => string;
  /** Localized device name; falls back to the stored name for custom devices. */
  deviceName: (deviceKey: string | null, fallback: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LanguagePreference>('auto');
  const lang = useMemo(() => resolveLanguage(preference, deviceLocales()), [preference]);

  useEffect(() => {
    let cancelled = false;
    void getLanguagePreference().then((p) => {
      if (!cancelled) setPreferenceState(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setPreference = useCallback((pref: LanguagePreference) => {
    setPreferenceState(pref);
    void setLanguagePreference(pref);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      preference,
      setPreference,
      t: (key, params) => translate(DICTIONARIES, lang, key, params),
      number: (n, opts) => formatNumber(n, lang, opts),
      percent: (v) => formatPercent(v, lang),
      period: (iso) => formatPeriod(iso, lang),
      deviceName: (deviceKey, fallback) => {
        if (deviceKey === null) return translate(DICTIONARIES, lang, 'device.other');
        const key = `device.${deviceKey}`;
        const hit = translate(DICTIONARIES, lang, key);
        return hit === key ? fallback : hit;
      },
    }),
    [lang, preference, setPreference],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
