import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import {
  loadPersistentState,
  getGateState,
  recordFullScreenAd,
  recordNavigationInterstitial,
  markWarmStart,
  FIRST_INSTALL_AT_KEY,
  __setClockForTests,
  __resetStateForTests,
} from './adState';

vi.mock('@capacitor/preferences', () => ({
  Preferences: { get: vi.fn(), set: vi.fn() },
}));

let nowValue = 1_000_000_000;

beforeEach(() => {
  vi.mocked(Preferences.get).mockReset();
  vi.mocked(Preferences.set).mockReset();
  vi.mocked(Preferences.set).mockResolvedValue(undefined);
  nowValue = 1_000_000_000;
  __setClockForTests(() => nowValue);
  __resetStateForTests();
});

describe('adState', () => {
  it('writes firstInstallAt once and reuses it afterwards', async () => {
    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: null });
    await loadPersistentState();
    expect(Preferences.set).toHaveBeenCalledWith({ key: FIRST_INSTALL_AT_KEY, value: String(nowValue) });

    vi.mocked(Preferences.set).mockClear();
    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: '777' });
    __resetStateForTests();
    await loadPersistentState();
    expect(Preferences.set).not.toHaveBeenCalled();
    expect(getGateState().firstInstallAt).toBe(777);
  });

  it('increments the session counter only for navigation interstitials', () => {
    expect(getGateState().sessionInterstitialCount).toBe(0);
    recordFullScreenAd();
    expect(getGateState().sessionInterstitialCount).toBe(0);
    recordNavigationInterstitial();
    expect(getGateState().sessionInterstitialCount).toBe(1);
  });

  it('records the last full-screen ad timestamp from the injected clock', () => {
    nowValue = 555;
    recordFullScreenAd();
    expect(getGateState().lastFullScreenAdAt).toBe(555);
  });

  it('flips cold start to false after the first warm start', () => {
    expect(getGateState().isColdStart).toBe(true);
    markWarmStart();
    expect(getGateState().isColdStart).toBe(false);
  });
});
