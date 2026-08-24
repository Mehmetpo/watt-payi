import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import { shouldShowInterstitialForBillAdd, AD_BILL_ADD_COUNT_KEY } from './adInterstitialFrequency';

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('shouldShowInterstitialForBillAdd', () => {
  beforeEach(() => {
    vi.mocked(Preferences.get).mockReset();
    vi.mocked(Preferences.set).mockReset();
    vi.mocked(Preferences.set).mockResolvedValue(undefined);
  });

  it('does not show on the 1st or 2nd bill', async () => {
    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: null });
    expect(await shouldShowInterstitialForBillAdd()).toBe(false);

    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: '1' });
    expect(await shouldShowInterstitialForBillAdd()).toBe(false);
  });

  it('shows on every 3rd bill', async () => {
    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: '2' });
    expect(await shouldShowInterstitialForBillAdd()).toBe(true);
    expect(Preferences.set).toHaveBeenCalledWith({ key: AD_BILL_ADD_COUNT_KEY, value: '3' });

    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: '5' });
    expect(await shouldShowInterstitialForBillAdd()).toBe(true);
  });

  it('persists the incremented count even when it does not show', async () => {
    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: '3' });
    expect(await shouldShowInterstitialForBillAdd()).toBe(false);
    expect(Preferences.set).toHaveBeenCalledWith({ key: AD_BILL_ADD_COUNT_KEY, value: '4' });
  });

  it('returns false when Preferences rejects', async () => {
    vi.mocked(Preferences.get).mockRejectedValue(new Error('native bridge unavailable'));
    expect(await shouldShowInterstitialForBillAdd()).toBe(false);
  });
});
