import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  BannerAdPluginEvents,
  type AdMobBannerSize,
} from '@capacitor-community/admob';
import { shouldShowInterstitialForBillAdd } from './adInterstitialFrequency';

// Real AdMob App ID + ad unit IDs are wired in below (PROD_*), but
// AD_TEST_MODE stays true through development: clicking a real ad on a
// non-test device counts as invalid traffic and risks the AdMob account.
// Flip this to false only right before building the signed release AAB
// for Play Store submission, then rebuild. Everything ad-related reads
// from this one file.
export const AD_TEST_MODE = true;

const TEST_BANNER_AD_UNIT_ID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-3940256099942544/1033173712';

const PROD_BANNER_AD_UNIT_ID = 'ca-app-pub-1121247025375805/1970518759';
const PROD_INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-1121247025375805/6688598166';

const BANNER_AD_UNIT_ID = AD_TEST_MODE ? TEST_BANNER_AD_UNIT_ID : PROD_BANNER_AD_UNIT_ID;
const INTERSTITIAL_AD_UNIT_ID = AD_TEST_MODE ? TEST_INTERSTITIAL_AD_UNIT_ID : PROD_INTERSTITIAL_AD_UNIT_ID;

let initPromise: Promise<void> | null = null;
let interstitialReady = false;

async function preloadInterstitial() {
  try {
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_UNIT_ID, isTesting: AD_TEST_MODE });
    interstitialReady = true;
  } catch (err) {
    console.error('ads: geçiş reklamı hazırlanamadı', err);
  }
}

// Runs Google's UMP consent flow (required in the EEA/UK) before starting the
// SDK, then preloads the first interstitial so it's ready for the first bill.
export function initAds(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
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
        await preloadInterstitial();
      } catch (err) {
        console.error('ads: AdMob başlatılamadı', err);
      }
    })();
  }
  return initPromise;
}

export function onBannerHeightChange(callback: (heightPx: number) => void): () => void {
  const handle = AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
    if (size?.height) callback(size.height);
  });
  return () => {
    handle.then((h) => h.remove());
  };
}

export async function showHomeBanner() {
  try {
    await AdMob.showBanner({
      adId: BANNER_AD_UNIT_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: AD_TEST_MODE,
    });
  } catch (err) {
    console.error('ads: banner gösterilemedi', err);
  }
}

export async function hideHomeBanner() {
  try {
    await AdMob.hideBanner();
  } catch (err) {
    console.error('ads: banner gizlenemedi', err);
  }
}

// Best-effort, like the AI tip generator in AddFlow: never blocks or fails
// the bill save. Caps itself to every Nth bill via shouldShowInterstitialForBillAdd.
export async function maybeShowBillAddedInterstitial() {
  const due = await shouldShowInterstitialForBillAdd();
  if (!due || !interstitialReady) return;
  interstitialReady = false;
  try {
    await AdMob.showInterstitial();
  } catch (err) {
    console.error('ads: geçiş reklamı gösterilemedi', err);
  } finally {
    preloadInterstitial();
  }
}
