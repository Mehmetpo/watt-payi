import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  BannerAdPluginEvents,
  InterstitialAdPluginEvents,
  AppOpenAdPluginEvents,
  type AdMobBannerSize,
} from '@capacitor-community/admob';
import { AD_TEST_MODE, AD_UNITS } from './adConfig';
import { canShowAd, type AdKind } from './adPolicy';
import {
  getGateState,
  recordFullScreenAd,
  recordNavigationInterstitial,
  setPendingRemoveAdsPrompt,
  loadPersistentState,
} from './adState';
import { isAdFree, onEntitlementChange, entitlementReady } from './entitlement';

let initPromise: Promise<void> | null = null;
let initResolved = false;
let interstitialShowing = false;

function gate(kind: AdKind): boolean {
  return canShowAd(kind, getGateState({ isAdFree: isAdFree() }));
}

async function prepareInterstitial(): Promise<void> {
  try {
    await AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial, isTesting: AD_TEST_MODE });
  } catch (err) {
    console.error('ads: geçiş reklamı hazırlanamadı', err);
  }
}

async function loadAppOpen(): Promise<void> {
  try {
    await AdMob.loadAppOpen({ adId: AD_UNITS.appOpen });
  } catch (err) {
    console.error('ads: app-open reklamı yüklenemedi', err);
  }
}

/**
 * Idempotent, promise-cached. UMP consent → AdMob.initialize → preload the
 * first interstitial and app-open ad. Deliberately called from HomeScreen's
 * mount (see the comment there): initialize() must run only after Capacitor
 * has attached the WebView, or every later showBanner() breaks.
 */
export function initAds(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await loadPersistentState();
      // Let the entitlement cache settle first (with a cap so an offline first
      // run still initializes) — otherwise a paying user gets the consent form
      // and an ad preload on every cold start.
      await Promise.race([
        entitlementReady,
        new Promise<void>((resolve) => setTimeout(resolve, 2000)),
      ]);
      if (!isAdFree()) {
        try {
          const consent = await AdMob.requestConsentInfo();
          if (consent.isConsentFormAvailable) {
            await AdMob.showConsentForm();
          }
        } catch (err) {
          console.error('ads: onay akışı alınamadı', err);
        }
      }
      try {
        await AdMob.initialize({ initializeForTesting: AD_TEST_MODE });
        if (!isAdFree()) {
          await prepareInterstitial();
          await loadAppOpen();
        }
      } catch (err) {
        console.error('ads: AdMob başlatılamadı', err);
      }
      initResolved = true;
    })();

    // When the user buys ad-free mid-session, drop the banner immediately.
    onEntitlementChange((adFree) => {
      if (adFree) void hideBanner();
    });
  }
  return initPromise;
}

// ---- Banner --------------------------------------------------------------

const BANNER_HEIGHT_CACHE_KEY = 'wp.adBannerHeightPx';

export function getReservedBannerHeightPx(): number {
  try {
    const cached = Number(localStorage.getItem(BANNER_HEIGHT_CACHE_KEY));
    if (Number.isFinite(cached) && cached >= 32 && cached <= 120) return cached;
  } catch {
    // locked-down WebView — fall through
  }
  return 60;
}

export function onBannerHeightChange(callback: (heightPx: number) => void): () => void {
  const handle = AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
    const heightPx = size?.height ?? 0;
    if (heightPx > 0) {
      try {
        localStorage.setItem(BANNER_HEIGHT_CACHE_KEY, String(heightPx));
      } catch {
        // best-effort cache only
      }
    }
    callback(heightPx);
  });
  return () => { handle.then((h) => h.remove()); };
}

export async function showBanner(): Promise<void> {
  if (isAdFree()) return;
  try {
    await AdMob.showBanner({
      adId: AD_UNITS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: AD_TEST_MODE,
    });
  } catch (err) {
    console.error('ads: banner gösterilemedi', err);
  }
}

export async function hideBanner(): Promise<void> {
  try {
    await AdMob.hideBanner();
  } catch (err) {
    console.error('ads: banner gizlenemedi', err);
  }
}

export async function teardownBanner(): Promise<void> {
  await hideBanner();
}

// ---- Interstitial -------------------------------------------------------

export async function requestInterstitial(kind: 'bill-add' | 'navigation'): Promise<void> {
  if (isAdFree()) return;
  if (!initResolved) return;
  if (interstitialShowing) return;
  if (!gate(kind)) return;

  interstitialShowing = true;

  let settled = false;
  const settle = () => {
    if (settled) return;
    settled = true;
    clearTimeout(watchdog);
    interstitialShowing = false;
    dismiss.remove();
    failed.remove();
    void prepareInterstitial();
  };

  // Belt-and-braces: if neither Dismissed nor FailedToShow ever fires (plugin
  // quirk, process suspended mid-ad), don't latch the flag for the session.
  const watchdog = setTimeout(settle, 90_000);
  (watchdog as unknown as { unref?: () => void }).unref?.();

  const dismiss = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
    recordFullScreenAd();
    if (kind === 'navigation') {
      recordNavigationInterstitial();
    } else {
      // bill-add just closed → offer the Home "remove ads" strip once.
      setPendingRemoveAdsPrompt(true);
    }
    settle();
  });
  // No-fill / show failure resolves showInterstitial() but never emits Dismissed.
  const failed = await AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
    console.error('ads: geçiş reklamı gösterilemedi (FailedToShow)');
    settle();
  });

  try {
    await AdMob.showInterstitial();
  } catch (err) {
    console.error('ads: geçiş reklamı gösterilemedi', err);
    settle();
  }
}

// ---- App Open ----------------------------------------------------------

export async function maybeShowAppOpen(): Promise<void> {
  if (isAdFree()) return;
  if (!initResolved) return;
  if (interstitialShowing) return;
  if (!gate('app-open')) return;

  try {
    const loaded = await AdMob.isAppOpenLoaded();
    if (!loaded.value) {
      void loadAppOpen();
      return;
    }
  } catch {
    void loadAppOpen();
    return;
  }

  const closed = await AdMob.addListener(AppOpenAdPluginEvents.Closed, () => {
    recordFullScreenAd();
    closed.remove();
    void loadAppOpen();
  });
  const failed = await AdMob.addListener(AppOpenAdPluginEvents.FailedToShow, () => {
    failed.remove();
    void loadAppOpen();
  });

  try {
    await AdMob.showAppOpen();
  } catch (err) {
    console.error('ads: app-open reklamı gösterilemedi', err);
    closed.remove();
    failed.remove();
    void loadAppOpen();
  }
}
