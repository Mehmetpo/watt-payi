# Ads Monetization — Manual Setup (Mehmet)

These steps cannot be automated and are required before the feature works on a
real device / in production.

> **Note:** the one-time ₺500 "remove ads" purchase was dropped. There is no
> in-app product, no RevenueCat, and no Play Billing permission any more — ads
> always show. The former Play Console / RevenueCat steps have been removed.

## 1. AdMob
- Create an **App Open** ad unit for this app. *(done — `ca-app-pub-1121247025375805/2782836694`)*
- Paste its id into `PROD.appOpen` in `src/lib/ads/adConfig.ts`. *(done)*

## 2. Claude Code release-guard hook (one-time, already done in code review)
- `~/.claude/settings.json` PreToolUse hook: `f=` must point at
  `src/lib/ads/adConfig.ts` (was `src/lib/ads.ts`). Confirm with a
  `./gradlew bundleRelease --dry-run` — it must be DENIED while `AD_TEST_MODE = true`.

## 3. Build wiring
- `npx cap sync android` after pulling this branch.

## 4. Before the signed release
- Flip `AD_TEST_MODE` to `false` in `src/lib/ads/adConfig.ts`.
- Rebuild. The release guard will then allow `bundleRelease`.
- Sanity-check on a **test device registered in AdMob** that real ad units load.
