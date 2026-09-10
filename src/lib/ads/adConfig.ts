// Real AdMob ad unit IDs are wired in below (PROD), but AD_TEST_MODE stays
// true through development: clicking a real ad on a non-test device counts
// as invalid traffic and risks the AdMob account. Flip this to false only
// right before building the signed release AAB for Play Store submission,
// then rebuild. Everything ad-related reads from this one file.
//
// A PreToolUse hook in ~/.claude/settings.json denies bundleRelease /
// assembleRelease while the next line still reads `= true`, so the flip
// cannot be forgotten. If this file ever moves, update that hook's `f=` path.
export const AD_TEST_MODE = true;

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
