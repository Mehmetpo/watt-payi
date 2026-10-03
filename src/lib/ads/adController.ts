import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  BannerAdPluginEvents,
  InterstitialAdPluginEvents,
  AppOpenAdPluginEvents,
  type AdMobBannerSize,
} from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { AD_TEST_MODE, AD_UNITS } from './adConfig';
import { createBannerController } from './bannerController';
import { canShowAd, type AdKind } from './adPolicy';
import {
  getGateState,
  recordFullScreenAd,
  recordNavigationInterstitial,
  loadPersistentState,
} from './adState';

let initPromise: Promise<void> | null = null;
let initResolved = false;
let interstitialShowing = false;

function gate(kind: AdKind): boolean {
  return canShowAd(kind, getGateState());
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
 * first interstitial and app-open ad. Called by AdOrchestrator once the user is
 * signed in; the banner is shown only after this resolves, since initialize()
 * must run after Capacitor has attached the WebView or every later
 * showBanner() breaks.
 */
export function initAds(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await loadPersistentState();
      try {
        const consent = await AdMob.requestConsentInfo();
        if (consent.isConsentFormAvailable) {
          await AdMob.showConsentForm();
        }
      } catch (err) {
        console.error('ads: onay akışı alınamadı', err);
      }
      try {
        await AdMob.initialize({ initializeForTesting: AD_TEST_MODE });
        await prepareInterstitial();
        await loadAppOpen();
      } catch (err) {
        console.error('ads: AdMob başlatılamadı', err);
      }
      initResolved = true;
    })();
  }
  return initPromise;
}

// ---- Banner --------------------------------------------------------------

const BANNER_HEIGHT_CACHE_KEY = 'wp.adBannerHeightPx';

function getReservedBannerHeightPx(): number {
  try {
    const cached = Number(localStorage.getItem(BANNER_HEIGHT_CACHE_KEY));
    if (Number.isFinite(cached) && cached >= 32 && cached <= 120) return cached;
  } catch {
    // locked-down WebView — fall through
  }
  return 60;
}

// Published as --ad-banner-height + body.has-ad-banner; BottomNav.css and
// tokens.css (--content-bottom-pad) lift the nav / pad every screen by it.
function applyBannerSpace(px: number) {
  document.documentElement.style.setProperty('--ad-banner-height', `${px}px`);
  document.body.classList.toggle('has-ad-banner', px > 0);
}

let banner: ReturnType<typeof createBannerController> | null = null;

function getBanner() {
  if (!banner) {
    banner = createBannerController(
      {
        show: async () => {
          await AdMob.showBanner({
            adId: AD_UNITS.banner,
            adSize: BannerAdSize.ADAPTIVE_BANNER,
            position: BannerAdPosition.BOTTOM_CENTER,
            isTesting: AD_TEST_MODE,
          });
        },
        resume: () => AdMob.resumeBanner(),
        hide: () => AdMob.hideBanner(),
        onSize: (cb) => {
          void AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => cb(size?.height ?? 0));
        },
        onLoaded: (cb) => { void AdMob.addListener(BannerAdPluginEvents.Loaded, cb); },
        onFailed: (cb) => { void AdMob.addListener(BannerAdPluginEvents.FailedToLoad, cb); },
      },
      {
        ready: initAds,
        reservedHeightPx: getReservedBannerHeightPx,
        onSpace: applyBannerSpace,
        onHeight: (px) => {
          try {
            localStorage.setItem(BANNER_HEIGHT_CACHE_KEY, String(px));
          } catch {
            // best-effort cache only
          }
        },
      },
    );
  }
  return banner;
}

/**
 * Declare whether the app currently wants the bottom banner. Safe to call
 * before ads are initialised and in any order — see bannerController.ts.
 * No-op on the web build, where there is no native banner to make room for.
 */
export function setBannerWanted(wanted: boolean): void {
  if (!Capacitor.isNativePlatform()) return;
  getBanner().setWanted(wanted);
}

// ---- Interstitial -------------------------------------------------------

export async function requestInterstitial(kind: 'bill-add' | 'navigation'): Promise<void> {
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
