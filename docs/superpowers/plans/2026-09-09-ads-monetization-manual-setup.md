# Ads Monetization — Manual Setup (Mehmet)

These steps cannot be automated and are required before the feature works on a
real device / in production.

## 1. AdMob
- Create an **App Open** ad unit for this app.
- Paste its id into `PROD.appOpen` in `src/lib/ads/adConfig.ts`.

## 2. Google Play Console
- Create a **managed in-app product**: id `wp_ad_free`, price **₺500**, status **active**.
- The app is on a closed-test track, so in-app products can be created now.

## 3. RevenueCat dashboard
- Project for `com.mehmetcebe.wattpayi`.
- Entitlement id **`ad_free`**.
- Attach product **`wp_ad_free`** to that entitlement.
- One **Offering** (mark it *current*) with a package containing `wp_ad_free`.
- Copy the **Android public SDK key** → `REVENUECAT_ANDROID_API_KEY` in `src/lib/ads/adConfig.ts`.

## 4. Claude Code release-guard hook (one-time, already done in code review)
- `~/.claude/settings.json` PreToolUse hook: `f=` must point at
  `src/lib/ads/adConfig.ts` (was `src/lib/ads.ts`). Confirm with a
  `./gradlew bundleRelease --dry-run` — it must be DENIED while `AD_TEST_MODE = true`.

## 5. Build wiring
- `npx cap sync android` after pulling this branch.
- Confirm `com.android.vending.BILLING` is in the merged `AndroidManifest.xml`.

## 6. Before the signed release
- Flip `AD_TEST_MODE` to `false` in `src/lib/ads/adConfig.ts`.
- Rebuild. The release guard will then allow `bundleRelease`.
- Sanity-check on a **test device registered in AdMob** that real ad units load.
