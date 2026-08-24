import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { getOnboardingSeen, setOnboardingSeen, ONBOARDING_SEEN_KEY } from './onboardingStorage';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('getOnboardingSeen', () => {
  beforeEach(() => {
    vi.mocked(Preferences.get).mockReset();
  });

  it('returns false when the flag was never set', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    expect(await getOnboardingSeen()).toBe(false);
  });

  it('returns true when the flag is "true"', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: 'true' });
    expect(await getOnboardingSeen()).toBe(true);
  });

  it('returns false when Preferences.get rejects', async () => {
    vi.mocked(Preferences.get).mockRejectedValue(new Error('native bridge unavailable'));
    expect(await getOnboardingSeen()).toBe(false);
  });
});

describe('setOnboardingSeen', () => {
  beforeEach(() => {
    vi.mocked(Preferences.set).mockReset();
  });

  it('writes the flag as "true"', async () => {
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
    await setOnboardingSeen();
    expect(Preferences.set).toHaveBeenCalledWith({ key: ONBOARDING_SEEN_KEY, value: 'true' });
  });

  it('does not throw when Preferences.set rejects', async () => {
    vi.mocked(Preferences.set).mockRejectedValue(new Error('native bridge unavailable'));
    await expect(setOnboardingSeen()).resolves.toBeUndefined();
  });
});
