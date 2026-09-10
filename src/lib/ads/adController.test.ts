import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));

const showInterstitial = vi.fn().mockResolvedValue(undefined);
const prepareInterstitial = vi.fn().mockResolvedValue(undefined);
const showBannerNative = vi.fn().mockResolvedValue(undefined);
const hideBannerNative = vi.fn().mockResolvedValue(undefined);
const isAppOpenLoaded = vi.fn().mockResolvedValue({ value: true });
const showAppOpen = vi.fn().mockResolvedValue(undefined);
const loadAppOpen = vi.fn().mockResolvedValue(undefined);
const addListener = vi.fn().mockResolvedValue({ remove: vi.fn() });

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    requestConsentInfo: vi.fn().mockResolvedValue({ isConsentFormAvailable: false }),
    showConsentForm: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    prepareInterstitial: (...a: unknown[]) => prepareInterstitial(...a),
    showInterstitial: (...a: unknown[]) => showInterstitial(...a),
    showBanner: (...a: unknown[]) => showBannerNative(...a),
    hideBanner: (...a: unknown[]) => hideBannerNative(...a),
    isAppOpenLoaded: (...a: unknown[]) => isAppOpenLoaded(...a),
    showAppOpen: (...a: unknown[]) => showAppOpen(...a),
    loadAppOpen: (...a: unknown[]) => loadAppOpen(...a),
    addListener: (...a: unknown[]) => addListener(...a),
  },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
  BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
  BannerAdPluginEvents: { SizeChanged: 'bannerAdSizeChanged' },
  InterstitialAdPluginEvents: {
    Dismissed: 'interstitialAdDismissed',
    FailedToShow: 'interstitialAdFailedToShow',
  },
  AppOpenAdPluginEvents: { Closed: 'appOpenAdClosed', FailedToShow: 'appOpenAdFailedToShow' },
}));

const canShowAd = vi.fn();
vi.mock('./adPolicy', async (orig) => ({
  ...(await orig<typeof import('./adPolicy')>()),
  canShowAd: (...a: unknown[]) => canShowAd(...a),
}));

vi.mock('./adState', () => ({
  getGateState: vi.fn().mockReturnValue({}),
  recordFullScreenAd: vi.fn(),
  recordNavigationInterstitial: vi.fn(),
  loadPersistentState: vi.fn().mockResolvedValue(undefined),
}));

import { initAds, requestInterstitial, hideBanner } from './adController';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('adController', () => {
  it('does not show an interstitial when the gate is closed', async () => {
    await initAds();
    canShowAd.mockReturnValue(false);
    await requestInterstitial('navigation');
    expect(showInterstitial).not.toHaveBeenCalled();
  });

  it('shows a bill-add interstitial when the gate allows it', async () => {
    await initAds();
    canShowAd.mockReturnValue(true);
    await requestInterstitial('bill-add');
    expect(showInterstitial).toHaveBeenCalledTimes(1);
  });

  it('hideBanner() calls the native hideBanner', async () => {
    await hideBanner();
    expect(hideBannerNative).toHaveBeenCalledTimes(1);
  });
});
