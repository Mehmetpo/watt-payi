export type Lang = 'tr' | 'en';
export type LanguagePreference = 'auto' | Lang;

export const DEFAULT_LANG: Lang = 'tr';

// Turkish device -> Turkish UI. Any other recognisable device language -> English
// (the only other language we ship). No locale info at all -> the app default.
export function detectLanguage(candidates: readonly string[]): Lang {
  let sawLocale = false;
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const code = raw.trim().toLowerCase().split(/[-_]/)[0];
    if (!code) continue;
    sawLocale = true;
    if (code === 'tr') return 'tr';
    if (code === 'en') return 'en';
  }
  return sawLocale ? 'en' : DEFAULT_LANG;
}

export function parseLanguagePreference(value: string | null | undefined): LanguagePreference {
  return value === 'tr' || value === 'en' ? value : 'auto';
}

export function resolveLanguage(pref: LanguagePreference, candidates: readonly string[]): Lang {
  return pref === 'auto' ? detectLanguage(candidates) : pref;
}

export function deviceLocales(): string[] {
  if (typeof navigator === 'undefined') return [];
  if (navigator.languages && navigator.languages.length > 0) return [...navigator.languages];
  return navigator.language ? [navigator.language] : [];
}
