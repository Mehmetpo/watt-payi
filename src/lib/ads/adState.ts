import { Preferences } from '@capacitor/preferences';
import { INITIAL_GRACE_MS, type AdGateState } from './adPolicy';

export const FIRST_INSTALL_AT_KEY = 'wp.ads.firstInstallAt';

let clock: () => number = () => Date.now();
export function __setClockForTests(fn: () => number): void { clock = fn; }

let processStartAt = clock();
let lastFullScreenAdAt: number | null = null;
let sessionInterstitialCount = 0;
let isColdStart = true;
let firstInstallAt: number | null = null;

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

export function getGateState(): AdGateState {
  const now = clock();
  return {
    now,
    lastFullScreenAdAt,
    sessionInterstitialCount,
    firstInstallAt: firstInstallAt ?? now - INITIAL_GRACE_MS,
    // Cold start also lapses on its own once the grace window is past.
    isColdStart: isColdStart && now - processStartAt < INITIAL_GRACE_MS,
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

/** Test-only: wipe in-memory session state and restore the real clock baseline. */
export function __resetStateForTests(): void {
  processStartAt = clock();
  lastFullScreenAdAt = null;
  sessionInterstitialCount = 0;
  isColdStart = true;
  firstInstallAt = null;
}
