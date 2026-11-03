import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { getLanguagePreference, setLanguagePreference, LANGUAGE_PREF_KEY } from './storage';

vi.mock('@capacitor/preferences', () => ({
  Preferences: { get: vi.fn(), set: vi.fn(), remove: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(Preferences.get).mockReset();
  vi.mocked(Preferences.set).mockReset();
  vi.mocked(Preferences.remove).mockReset();
});

describe('getLanguagePreference', () => {
  it('returns auto when nothing is stored', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    expect(await getLanguagePreference()).toBe('auto');
  });

  it('returns the stored language', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: 'en' });
    expect(await getLanguagePreference()).toBe('en');
    expect(Preferences.get).toHaveBeenCalledWith({ key: LANGUAGE_PREF_KEY });
  });

  it('returns auto for a corrupt value', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: 'xx' });
    expect(await getLanguagePreference()).toBe('auto');
  });

  it('returns auto when the native bridge rejects', async () => {
    vi.mocked(Preferences.get).mockRejectedValue(new Error('bridge'));
    expect(await getLanguagePreference()).toBe('auto');
  });
});

describe('setLanguagePreference', () => {
  it('stores an explicit language', async () => {
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
    await setLanguagePreference('tr');
    expect(Preferences.set).toHaveBeenCalledWith({ key: LANGUAGE_PREF_KEY, value: 'tr' });
  });

  it('removes the key for auto', async () => {
    vi.mocked(Preferences.remove).mockResolvedValue(undefined);
    await setLanguagePreference('auto');
    expect(Preferences.remove).toHaveBeenCalledWith({ key: LANGUAGE_PREF_KEY });
    expect(Preferences.set).not.toHaveBeenCalled();
  });

  it('does not throw when the native bridge rejects', async () => {
    vi.mocked(Preferences.set).mockRejectedValue(new Error('bridge'));
    await expect(setLanguagePreference('en')).resolves.toBeUndefined();
  });
});
