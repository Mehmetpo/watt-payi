import { Preferences } from '@capacitor/preferences';
import { parseLanguagePreference, type LanguagePreference } from './language';

export const LANGUAGE_PREF_KEY = 'watt-payi.language';

export async function getLanguagePreference(): Promise<LanguagePreference> {
  try {
    const { value } = await Preferences.get({ key: LANGUAGE_PREF_KEY });
    return parseLanguagePreference(value);
  } catch {
    return 'auto';
  }
}

export async function setLanguagePreference(pref: LanguagePreference): Promise<void> {
  try {
    if (pref === 'auto') await Preferences.remove({ key: LANGUAGE_PREF_KEY });
    else await Preferences.set({ key: LANGUAGE_PREF_KEY, value: pref });
  } catch {
    // Best effort: the in-memory choice still applies for this session.
  }
}
