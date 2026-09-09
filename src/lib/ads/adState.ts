import { Preferences } from '@capacitor/preferences';
import { INITIAL_GRACE_MS, type AdGateState } from './adPolicy';

export const FIRST_INSTALL_AT_KEY = 'wp.ads.firstInstallAt';
export const REMOVE_ADS_STRIP_DISMISSED_KEY = 'wp.ads.removeAdsStripDismissedAt';
export const STRIP_HIDE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let clock: () => number = () => Date.now();
export function __setClockForTests(fn: () => number): void { clock = fn; }

let processStartAt = clock();
let lastFullScreenAdAt: number | null = null;
let sessionInterstitialCount = 0;
let isColdStart = true;
let firstInstallAt: number | null = null;
let pendingRemoveAdsPrompt = false;

/** Read once at startup; also writes firstInstallAt the first time ever. */
export async function loadPersistentState(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: FIRST_INSTALL_AT_KEY });
    if (value) {
      firstInstallAt = Number(value);
    } else {
      firstInstallAt = clock();
      await Preferences.set({ key: FIRST_INSTALL_AT_KEY, value: String(firstInstallAt) });
    }
  } catch (err) {
    console.error('adState: firstInstallAt okunamadı', err);
    // Fail toward "grace window already over" so ads still run.
    firstInstallAt = clock() - INITIAL_GRACE_MS;
  }
}

export function getGateState(opts: { isAdFree: boolean }): AdGateState {
  const now = clock();
  return {
    now,
    lastFullScreenAdAt,
    sessionInterstitialCount,
    firstInstallAt: firstInstallAt ?? now - INITIAL_GRACE_MS,
    // Cold start also lapses on its own once the grace window is past.
    isColdStart: isColdStart && now - processStartAt < INITIAL_GRACE_MS,
    isAdFree: opts.isAdFree,
  };
}

export function recordFullScreenAd(): void {
  lastFullScreenAdAt = clock();
}

export function recordNavigationInterstitial(): void {
  sessionInterstitialCount += 1;
}

export function markWarmStart(): void {
  isColdStart = false;
}

export function setPendingRemoveAdsPrompt(v: boolean): void {
  pendingRemoveAdsPrompt = v;
}

export function getPendingRemoveAdsPrompt(): boolean {
  return pendingRemoveAdsPrompt;
}

export async function isRemoveAdsStripDismissed(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: REMOVE_ADS_STRIP_DISMISSED_KEY });
    if (!value) return false;
    return clock() - Number(value) < STRIP_HIDE_MS;
  } catch {
    return false;
  }
}

export async function dismissRemoveAdsStrip(): Promise<void> {
  pendingRemoveAdsPrompt = false;
  try {
    await Preferences.set({ key: REMOVE_ADS_STRIP_DISMISSED_KEY, value: String(clock()) });
  } catch (err) {
    console.error('adState: strip dismiss yazılamadı', err);
  }
}

/** Test-only: wipe in-memory session state and restore the real clock baseline. */
export function __resetStateForTests(): void {
  processStartAt = clock();
  lastFullScreenAdAt = null;
  sessionInterstitialCount = 0;
  isColdStart = true;
  firstInstallAt = null;
  pendingRemoveAdsPrompt = false;
}
