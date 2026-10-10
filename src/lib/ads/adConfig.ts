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

const TEST = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  appOpen: 'ca-app-pub-3940256099942544/9257395921', // Google's official App Open test unit
};

const PROD = {
  banner: 'ca-app-pub-1121247025375805/1970518759',
  interstitial: 'ca-app-pub-1121247025375805/6688598166',
  appOpen: 'ca-app-pub-1121247025375805/2782836694',
};

export const AD_UNITS = AD_TEST_MODE ? TEST : PROD;
