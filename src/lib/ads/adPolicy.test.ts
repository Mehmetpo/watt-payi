import { describe, it, expect } from 'vitest';
import {
  canShowAd,
  INTERSTITIAL_MIN_INTERVAL_MS,
  SESSION_INTERSTITIAL_CAP,
  INITIAL_GRACE_MS,
  type AdGateState,
} from './adPolicy';

const base: AdGateState = {
  now: 10_000_000,
  lastFullScreenAdAt: null,
  sessionInterstitialCount: 0,
  firstInstallAt: 10_000_000 - INITIAL_GRACE_MS - 1, // grace already over
  isColdStart: false,
  isAdFree: false,
};

describe('canShowAd', () => {
  it('never shows anything when ad-free', () => {
    const s = { ...base, isAdFree: true };
    expect(canShowAd('bill-add', s)).toBe(false);
    expect(canShowAd('navigation', s)).toBe(false);
    expect(canShowAd('app-open', s)).toBe(false);
  });

  it('always shows a bill-add interstitial (bypasses grace, gate, cap)', () => {
    const s: AdGateState = {
      ...base,
      firstInstallAt: base.now, // inside grace window
      lastFullScreenAdAt: base.now - 1_000, // gate closed
      sessionInterstitialCount: SESSION_INTERSTITIAL_CAP + 5, // over cap
    };
    expect(canShowAd('bill-add', s)).toBe(true);
  });

  it('blocks navigation + app-open inside the initial grace window', () => {
    const s = { ...base, firstInstallAt: base.now - (INITIAL_GRACE_MS - 1) };
    expect(canShowAd('navigation', s)).toBe(false);
    expect(canShowAd('app-open', s)).toBe(false);
  });

  it('blocks navigation once the session cap is hit', () => {
    expect(canShowAd('navigation', { ...base, sessionInterstitialCount: SESSION_INTERSTITIAL_CAP })).toBe(false);
    expect(canShowAd('navigation', { ...base, sessionInterstitialCount: SESSION_INTERSTITIAL_CAP - 1 })).toBe(true);
  });

  it('blocks navigation + app-open within 90s of the last full-screen ad', () => {
    const recent = { ...base, lastFullScreenAdAt: base.now - (INTERSTITIAL_MIN_INTERVAL_MS - 1) };
    expect(canShowAd('navigation', recent)).toBe(false);
    expect(canShowAd('app-open', recent)).toBe(false);

    const old = { ...base, lastFullScreenAdAt: base.now - (INTERSTITIAL_MIN_INTERVAL_MS + 1) };
    expect(canShowAd('navigation', old)).toBe(true);
    expect(canShowAd('app-open', old)).toBe(true);
  });

  it('never shows an app-open on cold start', () => {
    expect(canShowAd('app-open', { ...base, isColdStart: true })).toBe(false);
  });
});
