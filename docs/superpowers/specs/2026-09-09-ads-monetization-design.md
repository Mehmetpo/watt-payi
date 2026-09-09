# Ads monetization: aggressive interstitials + "remove ads" purchase

Date: 2026-09-09
Status: approved (design)

## Problem

The current ad setup earns very little:

- Banner on Home only (`showHomeBanner` / `BannerAdSize.ADAPTIVE_BANNER`, bottom-center).
- One interstitial on every 3rd successful bill add
  (`adInterstitialFrequency.ts`, `INTERSTITIAL_EVERY_N_BILLS = 3`).

We want more ad revenue, but without risking the AdMob account — the reason
`AD_TEST_MODE` in `src/lib/ads.ts` stays `true` all through development
(clicking a real ad on a non-test device is invalid traffic) and is flipped
to `false` by hand only right before the signed release build. And we want a
one-time purchase that turns ads off for that account forever.

## Goals

1. A **guaranteed** interstitial on every bill add (drop the "every Nth" cap).
2. A **periodic** full-screen ad experience that feels frequent but stays
   inside AdMob policy — achieved with App Open ads on resume **and**
   interstitials on screen navigation, both behind one shared time-gate.
3. A **one-time ₺500 in-app purchase** ("remove ads") that disables every ad
   (banner + interstitial + app-open) for that RevenueCat customer, across
   devices, offline-tolerant.

## Non-goals

- iOS ads (RevenueCat is cross-platform and will work on iOS, but the AdMob
  iOS wiring — ad units, `Info.plist`, ATT — is out of scope here).
- Server-side entitlement (no Supabase `profiles` column, no RevenueCat
  webhook). Ad logic is 100% client-side, so the RevenueCat SDK's cached
  `CustomerInfo` is the single source of truth.
- Rewarded ads, native ads, mediation.
- Subscriptions. The purchase is a single non-consumable product.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Periodic ad strategy | **App Open on resume + gated interstitial on navigation** |
| Purchase infra | **RevenueCat** (`@revenuecat/purchases-capacitor`) |
| Entitlement storage | **RevenueCat SDK only** — no Supabase mirror |
| Purchase entry point | **Profile row + dismissible strip on Home after an interstitial** |
| Frequency constants | The original set (below) — not the raised variant |

## Ad policy constants

All in one file, `src/lib/ads/adPolicy.ts`:

| Constant | Value | Meaning |
|---|---|---|
| `INTERSTITIAL_MIN_INTERVAL_MS` | `90_000` | Min gap between *any* two full-screen ads (interstitial or app-open). |
| `SESSION_INTERSTITIAL_CAP` | `4` | Max navigation-triggered interstitials per app session. Bill-add interstitials do **not** count against this. |
| `INITIAL_GRACE_MS` | `60_000` | No interstitials in the first 60s after first install ever. |
| `APP_OPEN_MIN_INTERVAL_MS` | `90_000` | Min time since the last full-screen ad before an app-open ad may show. |

Notes:

- App-open and interstitial share a single `lastFullScreenAdAt` timestamp, so
  they can never stack: showing either one closes the 90s gate for both.
- The bill-add interstitial is **guaranteed**: it bypasses the time-gate and
  the session cap, then updates `lastFullScreenAdAt` and (harmlessly) the
  session counter is left untouched.
- If `isAdFree()` is true, every function short-circuits to a no-op before any
  native call.

## Module architecture

New directory `src/lib/ads/`, replacing the flat `src/lib/ads.ts` and
`src/lib/adInterstitialFrequency.ts`.

### `adPolicy.ts` — pure, no native calls

```ts
export interface AdGateState {
  now: number;
  lastFullScreenAdAt: number | null;
  sessionInterstitialCount: number;
  firstInstallAt: number;
  isColdStart: boolean;
  isAdFree: boolean;
}

export type AdKind = 'bill-add' | 'navigation' | 'app-open';

/** Pure decision function. No side effects. Fully unit-testable. */
export function canShowAd(kind: AdKind, s: AdGateState): boolean;
```

Rules inside `canShowAd`:

- `isAdFree` → always `false`.
- `kind === 'bill-add'` → `true` (only gated by `isAdFree`; the grace window,
  time-gate and session cap are all bypassed — the user's own action).
- `now - firstInstallAt < INITIAL_GRACE_MS` → `false` (for `navigation` and
  `app-open` only).
- `kind === 'navigation'`:
  - `sessionInterstitialCount >= SESSION_INTERSTITIAL_CAP` → `false`.
  - `lastFullScreenAdAt` set and `now - lastFullScreenAdAt < INTERSTITIAL_MIN_INTERVAL_MS` → `false`.
  - else `true`.
- `kind === 'app-open'`:
  - `isColdStart` → `false`.
  - `lastFullScreenAdAt` set and `now - lastFullScreenAdAt < APP_OPEN_MIN_INTERVAL_MS` → `false`.
  - else `true`.

### `adState.ts` — session + persisted state

- In-memory: `lastFullScreenAdAt`, `sessionInterstitialCount`, `isColdStart`
  (starts `true`, flips to `false` after the first `appStateChange` →
  foreground, or after `INITIAL_GRACE_MS`, whichever first).
- Persisted via `@capacitor/preferences`: `firstInstallAt` (written once, on
  first `initAds()` if absent).
- Exposes `getGateState({ now, isAdFree }): AdGateState` and mutators
  `recordFullScreenAd()`, `recordNavigationInterstitial()`.
- Clock is injectable (`() => number`, default `Date.now`) for tests.

### `entitlement.ts` — RevenueCat wrapper

```ts
export function initPurchases(): Promise<void>;   // Purchases.configure + prime CustomerInfo
export function isAdFree(): boolean;              // sync, from last-known CustomerInfo
export function refreshEntitlement(): Promise<void>;
export function purchaseAdFree(): Promise<'success' | 'cancelled' | 'pending' | 'error'>;
export function restorePurchases(): Promise<boolean>; // true if ad_free now active
export function getAdFreePriceString(): string | null; // from the offering package
export function onEntitlementChange(cb: (adFree: boolean) => void): () => void;
```

- `Purchases.configure({ apiKey, appUserID: <supabase user id> })` so the
  entitlement follows the account, not the device. Called after login, in
  `initPurchases()`. On logout, `Purchases.logOut()`.
- `ENTITLEMENT_ID = 'ad_free'`, product id `wp_ad_free`.
- `isAdFree()` reads a module-level cache updated by
  `addCustomerInfoUpdateListener` and every explicit refresh. Returns `false`
  until the first `CustomerInfo` arrives (fail toward showing ads, never
  toward free).
- `purchaseAdFree()` calls `getOfferings()`, finds the package whose
  `product.identifier === 'wp_ad_free'` (fallback: current offering's first
  package), then `purchasePackage`. Maps RevenueCat's
  `PurchasesError` `userCancelled` → `'cancelled'`, `PENDING` outcome →
  `'pending'`, everything else → `'error'`.

### `adController.ts` — orchestrator (wraps `@capacitor-community/admob`)

```ts
export function initAds(): Promise<void>;
export function showBanner(): Promise<void>;
export function hideBanner(): Promise<void>;
export function requestInterstitial(kind: 'bill-add' | 'navigation'): Promise<void>;
export function maybeShowAppOpen(): Promise<void>;
export function teardownBanner(): Promise<void>;
```

- `initAds()` (idempotent, promise-cached — same pattern as today):
  UMP consent flow (skipped when `isAdFree()`), `AdMob.initialize`,
  then `prepareInterstitial({ adId })` and `loadAppOpen({ adId })` to
  preload the first of each.
- `requestInterstitial(kind)`:
  1. `if (isAdFree()) return;`
  2. `if (!canShowAd(kind === 'bill-add' ? 'bill-add' : 'navigation', getGateState(...))) return;`
  3. `await AdMob.showInterstitial()` (already prepared via
     `prepareInterstitial`). On dismiss
     (`InterstitialAdPluginEvents.Dismissed`): `recordFullScreenAd()`, and
     if `kind === 'navigation'` `recordNavigationInterstitial()`. Then
     `prepareInterstitial({ adId })` again.
  4. Any failure (`FailedToLoad`, `FailedToShow`) → swallow, log,
     re-prepare. Never blocks the caller.
  5. On dismiss of a **bill-add** interstitial, set a one-shot
     `pendingRemoveAdsPrompt` flag in `adState` (drives the Home strip).
- `maybeShowAppOpen()`:
  1. `if (isAdFree()) return;`
  2. `if (!canShowAd('app-open', ...)) return;`
  3. If an interstitial is currently on screen or `initAds()` hasn't
     resolved → return.
  4. `if (!(await AdMob.isAppOpenLoaded()).value) return;`
  5. `await AdMob.showAppOpen()`; on success (`AppOpenAdPluginEvents.Closed`)
     `recordFullScreenAd()`, then `AdMob.loadAppOpen({ adId })` again.
     Failures (`FailedToShow` / `FailedToLoad`) swallowed and re-loaded.
- Banner calls also short-circuit on `isAdFree()`.
- Subscribes to `onEntitlementChange`: when it flips to `true`, immediately
  `hideBanner()` + stop preloading.

### `index.ts` — public surface

Re-exports exactly what screens/`App.tsx` use:
`initAds, initPurchases, showBanner, hideBanner, teardownBanner,
onBannerHeightChange, getReservedBannerHeightPx, requestInterstitial,
maybeShowAppOpen, isAdFree, purchaseAdFree, restorePurchases,
getAdFreePriceString, onEntitlementChange`.

`onBannerHeightChange` / `getReservedBannerHeightPx` keep their current
behavior and move here unchanged (they feed the BottomNav clearance fix).

## Ad unit config

`src/lib/ads/adConfig.ts` (extracted from today's `ads.ts` top block):

```ts
// Flipped to false BY HAND right before the signed release AAB, exactly as
// in today's src/lib/ads.ts. Keep the comment block from that file verbatim.
export const AD_TEST_MODE = true;

const TEST = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  appOpen: 'ca-app-pub-3940256099942544/9257395921', // Google's official test unit
};
const PROD = {
  banner: 'ca-app-pub-1121247025375805/1970518759',
  interstitial: 'ca-app-pub-1121247025375805/6688598166',
  appOpen: '<<TODO: Mehmet creates an App Open ad unit in AdMob>>',
};

export const AD_UNITS = AD_TEST_MODE ? TEST : PROD;
export const REVENUECAT_ANDROID_API_KEY = '<<TODO: Mehmet supplies the public SDK key>>';
```

`AD_TEST_MODE` is a plain manual flag (there is no CI/hook enforcing it —
just the comment convention). Move the existing explanatory comment block
from `src/lib/ads.ts` into this file unchanged so the "flip before release"
instruction travels with the constant. `initAds()` still passes
`initializeForTesting: AD_TEST_MODE` and `isTesting: AD_TEST_MODE` on
`prepareInterstitial` / `showBanner`; `loadAppOpen` has no `isTesting` field,
so app-open test ads rely on the test `appOpen` unit id plus
`initializeForTesting`.

## Integration points

### `App.tsx` — new `useAdOrchestration()` hook

- On mount (post-auth): `initPurchases()` then `initAds()`.
- `@capacitor/app` `appStateChange`: on `isActive === true` (and not the very
  first fire) → `adController.maybeShowAppOpen()`.
- Route change (already keyed by `location.pathname` for `.route-view`):
  on pathname change → `adController.requestInterstitial('navigation')`.
  Skip the very first pathname the hook sees (the cold-start landing screen),
  fire only on subsequent changes. Trailing-debounce ~400ms so a redirect
  chain (e.g. `/` → `/login`) fires at most once.
- On unmount / logout: `teardownBanner()`, `Purchases.logOut()`.

### `HomeScreen.tsx`

- Banner effect unchanged in shape, but wrapped: only runs the
  `showBanner()` / height-reservation path when `!isAdFree()`. When ad-free,
  `--ad-banner-height` stays 0 and `body.has-ad-banner` is never set.
- Re-run the effect when `onEntitlementChange` fires (so buying mid-session
  removes the banner without an app restart).
- New: `<RemoveAdsStrip />` rendered when `adState.pendingRemoveAdsPrompt`
  is set and `!isAdFree()`. Dismiss writes `wp.removeAdsStripDismissedAt` to
  Preferences; the strip stays hidden for 30 days, then may reappear.

### `AddFlow.tsx`

- `maybeShowBillAddedInterstitial()` call site (line ~259) becomes
  `requestInterstitial('bill-add')`. Same fire-and-forget `.catch(() => {})`.

### `ProfileScreen.tsx`

- New row under the account section:
  - Not ad-free: **"Reklamları kaldır — {priceString}"** → opens
    `<RemoveAdsSheet />`.
  - Ad-free: **"Reklamsız ✓"** with a secondary **"Satın alımları geri
    yükle"** action.

### New components

- `src/components/ads/RemoveAdsSheet.tsx` — bottom sheet: one-line pitch,
  price (`getAdFreePriceString()` with `"₺500"` fallback copy), **"Satın al"**
  and **"Satın alımları geri yükle"** buttons, loading + result states
  (`success` → "Teşekkürler, reklamlar kapatıldı", `pending` → "İşlem
  beklemede, onaylanınca kapanacak", `cancelled` → silent close, `error` →
  retry copy).
- `src/components/ads/RemoveAdsStrip.tsx` — dismissible inline strip on Home.

Both follow existing motion tokens (`--dur-*`, `--ease-out`) and the dark-mode
palette. No hardcoded colors.

## Error handling

| Situation | Behavior |
|---|---|
| RevenueCat init fails / offline on first run | `isAdFree()` → `false`; ads run; retry `refreshEntitlement()` on next resume. No crash, no user-facing error. |
| Interstitial not filled | Skip silently; never block bill save or navigation; re-`prepareInterstitial()` in the background. |
| App-open ad requested while interstitial on screen | Return without showing. |
| App-open on cold start | Never shown (`isColdStart` guard). |
| Purchase pending (slow card / family approval) | Sheet shows "işlem beklemede"; `addCustomerInfoUpdateListener` resolves it later and flips the UI. |
| Reinstall / new device, already owns `wp_ad_free` | "Satın alımları geri yükle" → `restorePurchases()` re-activates `ad_free`. |
| `AD_TEST_MODE` true | App-open + interstitial + banner all use test unit IDs; purchases still hit the real RevenueCat sandbox/Play test track. |

## Testing (vitest, mirrors existing `*.test.ts` style)

- `adPolicy.test.ts` — `canShowAd` truth table: ad-free short-circuit,
  bill-add always, grace window, session cap, 90s gate for navigation, cold
  start + 90s gate for app-open. Pure, no mocks.
- `adState.test.ts` — `firstInstallAt` written once and reused; session
  counter increments only for navigation interstitials; cold-start flips
  after first foreground; injected clock.
- `entitlement.test.ts` — mock `@revenuecat/purchases-capacitor`:
  `isAdFree()` cache before/after `CustomerInfo`; `purchaseAdFree()` outcome
  mapping (`success` / `cancelled` / `pending` / `error`); `restorePurchases()`
  truth value; listener updates the cache.
- `adController.test.ts` — mock AdMob + `adPolicy` + `entitlement`: verify
  `showInterstitial` is **not** called when the gate is closed or ad-free;
  verify bill-add bypasses the gate; verify entitlement flip triggers
  `hideBanner`.
- **Delete** `src/lib/adInterstitialFrequency.test.ts`.

Target: full `npx vitest run` green, `npx tsc -b` clean, `npm run build` ok.

## Out-of-code setup (Mehmet — cannot be automated)

1. **AdMob**: create an **App Open** ad unit for the app; put its id in
   `PROD.appOpen`.
2. **Play Console**: create managed in-app product `wp_ad_free`, price ₺500,
   activate it. (App is already on a closed-test track, so products can be
   created.)
3. **RevenueCat dashboard**: project for `com.mehmetcebe.wattpayi`, entitlement
   `ad_free`, attach product `wp_ad_free`, one Offering with a package for it.
   Supply the **Android public SDK key** for `REVENUECAT_ANDROID_API_KEY`.
4. `npx cap sync android` after adding the plugin (adds the Billing
   permission).

## Dependency

- Add `@revenuecat/purchases-capacitor` (latest v11+, Capacitor 8 compatible).
- `@capacitor-community/admob@8.1.0` is already installed and its App Open API
  is confirmed present: `AdMob.loadAppOpen({ adId })`, `AdMob.showAppOpen()`,
  `AdMob.isAppOpenLoaded()`, and `AppOpenAdPluginEvents`
  (`Loaded` / `FailedToLoad` / `Opened` / `Closed` / `FailedToShow` /
  `AdImpression`). Interstitial API in use: `prepareInterstitial({ adId })`,
  `showInterstitial()`, `InterstitialAdPluginEvents.Dismissed`.

## File-change summary

| File | Change |
|---|---|
| `src/lib/ads/adPolicy.ts` | new — pure gate |
| `src/lib/ads/adState.ts` | new — session + persisted state |
| `src/lib/ads/adConfig.ts` | new — ad unit ids + `AD_TEST_MODE` + RC key |
| `src/lib/ads/entitlement.ts` | new — RevenueCat wrapper |
| `src/lib/ads/adController.ts` | new — orchestrator (absorbs old `ads.ts`) |
| `src/lib/ads/index.ts` | new — public surface |
| `src/lib/ads.ts` | deleted |
| `src/lib/adInterstitialFrequency.ts` | deleted |
| `src/lib/adInterstitialFrequency.test.ts` | deleted |
| `src/lib/ads/*.test.ts` | new — 4 test files |
| `src/App.tsx` | `useAdOrchestration()` — resume + route-change hooks |
| `src/screens/home/HomeScreen.tsx` | banner gated on `!isAdFree()`; `<RemoveAdsStrip />` |
| `src/screens/add/AddFlow.tsx` | `requestInterstitial('bill-add')` |
| `src/screens/profile/ProfileScreen.tsx` | remove-ads row |
| `src/components/ads/RemoveAdsSheet.tsx` | new |
| `src/components/ads/RemoveAdsStrip.tsx` | new |
| `package.json` | `+ @revenuecat/purchases-capacitor` |
| `android/app/src/main/AndroidManifest.xml` | RevenueCat / Play Billing may need `com.android.vending.BILLING` (added by `cap sync`) — verify after sync |
