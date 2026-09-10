export const INTERSTITIAL_MIN_INTERVAL_MS = 90_000;
export const SESSION_INTERSTITIAL_CAP = 4;
export const INITIAL_GRACE_MS = 60_000;
export const APP_OPEN_MIN_INTERVAL_MS = 90_000;

export interface AdGateState {
  now: number;
  lastFullScreenAdAt: number | null;
  sessionInterstitialCount: number;
  firstInstallAt: number;
  isColdStart: boolean;
}

export type AdKind = 'bill-add' | 'navigation' | 'app-open';

/** Pure decision function. No side effects. Fully unit-testable. */
export function canShowAd(kind: AdKind, s: AdGateState): boolean {
  // The user's own action — guaranteed.
  if (kind === 'bill-add') return true;

  // Grace window applies to navigation + app-open only.
  if (s.now - s.firstInstallAt < INITIAL_GRACE_MS) return false;

  if (kind === 'navigation') {
    if (s.sessionInterstitialCount >= SESSION_INTERSTITIAL_CAP) return false;
    if (
      s.lastFullScreenAdAt !== null &&
      s.now - s.lastFullScreenAdAt < INTERSTITIAL_MIN_INTERVAL_MS
    ) {
      return false;
    }
    return true;
  }

  // kind === 'app-open'
  if (s.isColdStart) return false;
  if (
    s.lastFullScreenAdAt !== null &&
    s.now - s.lastFullScreenAdAt < APP_OPEN_MIN_INTERVAL_MS
  ) {
    return false;
  }
  return true;
}
