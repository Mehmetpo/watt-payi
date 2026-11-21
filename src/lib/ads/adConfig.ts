// Real AdMob ad unit IDs are wired in below (PROD). AD_TEST_MODE is false for
// release builds (iOS build 6+, Play release AAB).
//
// Flip it to true while developing on a real device: clicking a real ad on a
// non-test device counts as invalid traffic and risks the AdMob account. Flip
// it back to false before building a signed release. Everything ad-related
// reads from this one file.
//
// A PreToolUse hook in ~/.claude/settings.json denies bundleRelease /
// assembleRelease while the next line still reads `= true`, so the flip
// cannot be forgotten. If this file ever moves, update that hook's `f=` path.
export const AD_TEST_MODE = false;

import { Capacitor } from '@capacitor/core';

export interface AdUnits {
  banner: string;
  interstitial: string;
  appOpen: string;
}

// Google's official test units (identical on both platforms for these formats
// except where noted by Google; the ids below work on Android and iOS alike).
export const TEST_UNITS: AdUnits = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  appOpen: 'ca-app-pub-3940256099942544/9257395921', // Google's official App Open test unit
};

// AdMob ad units belong to ONE app. The Android app (~9086591444) and the iOS
// app (~1814701549) each need their own, otherwise ads never load on the other
// platform and the failure is silent.
export const PROD_ANDROID: AdUnits = {
  banner: 'ca-app-pub-1121247025375805/1970518759',
  interstitial: 'ca-app-pub-1121247025375805/6688598166',
  appOpen: 'ca-app-pub-1121247025375805/2782836694',
};

export const PROD_IOS: AdUnits = {
  banner: 'ca-app-pub-1121247025375805/3291995164',
  interstitial: 'ca-app-pub-1121247025375805/4362580431',
  appOpen: 'ca-app-pub-1121247025375805/7287080490',
};

export function pickAdUnits(platform: string, testMode: boolean): AdUnits {
  if (testMode) return TEST_UNITS;
  return platform === 'ios' ? PROD_IOS : PROD_ANDROID;
}

export const AD_UNITS = pickAdUnits(Capacitor.getPlatform(), AD_TEST_MODE);
