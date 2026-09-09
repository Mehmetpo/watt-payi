# Ads Monetization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "every 3rd bill" interstitial with a guaranteed bill-add interstitial plus policy-safe periodic full-screen ads (App Open on resume + gated navigation interstitials), and add a one-time ₺500 "remove ads" in-app purchase backed by RevenueCat.

**Architecture:** A new `src/lib/ads/` module replaces the flat `src/lib/ads.ts` + `src/lib/adInterstitialFrequency.ts`. It splits into a pure decision function (`adPolicy.ts`), session/persisted counters with an injectable clock (`adState.ts`), a config file that owns `AD_TEST_MODE` (`adConfig.ts`), a RevenueCat wrapper (`entitlement.ts`), an AdMob orchestrator (`adController.ts`), and a `index.ts` public surface. A headless `<AdOrchestrator />` component in `App.tsx` wires resume + route-change events. `HomeScreen`, `AddFlow`, and `ProfileScreen` get small edits; two new components (`RemoveAdsSheet`, `RemoveAdsStrip`) drive the purchase UI.

**Tech Stack:** React 18 + TypeScript 5.5 + Vite 7, Capacitor 8, `@capacitor-community/admob@8.1.0`, `@revenuecat/purchases-capacitor@^13`, `@capacitor/preferences`, `@capacitor/app`, Vitest (node environment).

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `src/lib/ads/adConfig.ts` | Ad unit IDs, `AD_TEST_MODE`, RevenueCat key, entitlement/product IDs. No logic. |
| `src/lib/ads/adPolicy.ts` | Pure `canShowAd(kind, state)` decision function + policy constants. No I/O. |
| `src/lib/ads/adState.ts` | In-memory session counters + persisted `firstInstallAt` + strip-dismiss timestamp. Injectable clock. |
| `src/lib/ads/entitlement.ts` | RevenueCat wrapper: configure, `isAdFree()` cache, purchase, restore, price, change listener. |
| `src/lib/ads/adController.ts` | AdMob orchestrator: init, banner show/hide + height reporting, `requestInterstitial`, `maybeShowAppOpen`. |
| `src/lib/ads/index.ts` | Public surface — re-exports only what screens/`App.tsx` import. |
| `src/lib/ads/adPolicy.test.ts` | `canShowAd` truth table. Pure, no mocks. |
| `src/lib/ads/adState.test.ts` | `firstInstallAt` write-once, counter increments, cold-start flip, injected clock. |
| `src/lib/ads/entitlement.test.ts` | Mock RevenueCat: cache before/after `CustomerInfo`, purchase outcome mapping, restore, listener. |
| `src/lib/ads/adController.test.ts` | Mock AdMob + policy + entitlement: gate closed → no `showInterstitial`; bill-add bypass; entitlement flip → `hideBanner`. |
| `src/components/ads/AdOrchestrator.tsx` | Headless component: boots purchases, wires `appStateChange` + route-change to the controller. |
| `src/components/ads/RemoveAdsSheet.tsx` | Bottom sheet: pitch, price, "Satın al" / "Geri yükle", loading + result states. |
| `src/components/ads/RemoveAdsSheet.css` | Sheet styles (mirrors `OnboardingTour.css` backdrop/dialog pattern). |
| `src/components/ads/RemoveAdsStrip.tsx` | Dismissible inline strip shown on Home after a bill-add interstitial. |
| `src/components/ads/RemoveAdsStrip.css` | Strip styles. |

### Deleted files

- `src/lib/ads.ts`
- `src/lib/adInterstitialFrequency.ts`
- `src/lib/adInterstitialFrequency.test.ts`

### Modified files

- `src/App.tsx` — render `<AdOrchestrator />` inside the authed shell.
- `src/screens/home/HomeScreen.tsx` — gate banner on `!isAdFree()`, re-run on entitlement change, render `<RemoveAdsStrip />`.
- `src/screens/add/AddFlow.tsx` — `maybeShowBillAddedInterstitial()` → `requestInterstitial('bill-add')`.
- `src/screens/profile/ProfileScreen.tsx` — new remove-ads row.
- `package.json` — add `@revenuecat/purchases-capacitor`.
- `~/.claude/settings.json` — re-point the release-guard hook's `f=` path (manual; see Task 1).
- `android/app/src/main/AndroidManifest.xml` — verify `com.android.vending.BILLING` after `cap sync` (Task 12).

### Import-path note

`src/lib/ads.ts` becomes `src/lib/ads/index.ts`. Vite and Vitest both resolve `../../lib/ads` to the directory's `index.ts`, so **existing import specifiers do not change** — only the named imports do.

---

## Task 1: `adConfig.ts` + release-guard hook re-point

**Files:**
- Create: `src/lib/ads/adConfig.ts`
- Modify: `~/.claude/settings.json` (global — the PreToolUse Bash hook added 2026-08-29)

- [ ] **Step 1: Create the config file**

Create `src/lib/ads/adConfig.ts`:

```ts
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
  // TODO(Mehmet): create an App Open ad unit in AdMob for this app and paste its id here.
  appOpen: 'TODO_MEHMET_APP_OPEN_AD_UNIT_ID',
};

export const AD_UNITS = AD_TEST_MODE ? TEST : PROD;

// RevenueCat Android *public* SDK key (RevenueCat dashboard → Project settings →
// API keys → Android). This is a client key, not a secret — safe to commit.
// TODO(Mehmet): paste the real key.
export const REVENUECAT_ANDROID_API_KEY = 'TODO_MEHMET_REVENUECAT_ANDROID_KEY';

export const ENTITLEMENT_ID = 'ad_free';
export const AD_FREE_PRODUCT_ID = 'wp_ad_free';
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc -b`
Expected: no new errors (the file has no imports and is not yet referenced).

- [ ] **Step 3: Re-point the release-guard hook**

Open `~/.claude/settings.json`. Find the PreToolUse Bash hook whose command contains `AD_TEST_MODE`. It currently sets:

```
f="$proj/src/lib/ads.ts"
```

Change that single assignment to:

```
f="$proj/src/lib/ads/adConfig.ts"
```

Leave the rest of the hook untouched — the `grep -qE '^export const AD_TEST_MODE = true'` line-anchor still matches the snippet in Step 1.

> This is a manual edit to a global settings file. If you cannot edit it in this environment, STOP and tell Mehmet the exact one-line change above — the release guard is disabled until it is done, because deleting `src/lib/ads.ts` in Task 6 makes the old hook's `[ -f "$f" ] || exit 0` guard pass silently.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ads/adConfig.ts
git commit -m "feat(ads): add adConfig with AD_TEST_MODE, ad units, RevenueCat key"
```

(The `~/.claude/settings.json` change is outside the repo and is not committed here.)

---

## Task 2: `adPolicy.ts` — pure decision function

**Files:**
- Create: `src/lib/ads/adPolicy.ts`
- Test: `src/lib/ads/adPolicy.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ads/adPolicy.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ads/adPolicy.test.ts`
Expected: FAIL — cannot resolve `./adPolicy`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/ads/adPolicy.ts`:

```ts
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
  isAdFree: boolean;
}

export type AdKind = 'bill-add' | 'navigation' | 'app-open';

/** Pure decision function. No side effects. Fully unit-testable. */
export function canShowAd(kind: AdKind, s: AdGateState): boolean {
  if (s.isAdFree) return false;

  // The user's own action — guaranteed, only gated by isAdFree.
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ads/adPolicy.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ads/adPolicy.ts src/lib/ads/adPolicy.test.ts
git commit -m "feat(ads): pure canShowAd gate with policy constants"
```

---

## Task 3: `adState.ts` — session + persisted state

**Files:**
- Create: `src/lib/ads/adState.ts`
- Test: `src/lib/ads/adState.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ads/adState.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Preferences } from '@capacitor/preferences';
import {
  loadPersistentState,
  getGateState,
  recordFullScreenAd,
  recordNavigationInterstitial,
  markWarmStart,
  FIRST_INSTALL_AT_KEY,
  __setClockForTests,
  __resetStateForTests,
} from './adState';

vi.mock('@capacitor/preferences', () => ({
  Preferences: { get: vi.fn(), set: vi.fn() },
}));

let nowValue = 1_000_000_000;

beforeEach(() => {
  vi.mocked(Preferences.get).mockReset();
  vi.mocked(Preferences.set).mockReset();
  vi.mocked(Preferences.set).mockResolvedValue(undefined);
  nowValue = 1_000_000_000;
  __setClockForTests(() => nowValue);
  __resetStateForTests();
});

describe('adState', () => {
  it('writes firstInstallAt once and reuses it afterwards', async () => {
    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: null });
    await loadPersistentState();
    expect(Preferences.set).toHaveBeenCalledWith({ key: FIRST_INSTALL_AT_KEY, value: String(nowValue) });

    vi.mocked(Preferences.set).mockClear();
    vi.mocked(Preferences.get).mockResolvedValueOnce({ value: '777' });
    __resetStateForTests();
    await loadPersistentState();
    expect(Preferences.set).not.toHaveBeenCalled();
    expect(getGateState({ isAdFree: false }).firstInstallAt).toBe(777);
  });

  it('increments the session counter only for navigation interstitials', () => {
    expect(getGateState({ isAdFree: false }).sessionInterstitialCount).toBe(0);
    recordFullScreenAd();
    expect(getGateState({ isAdFree: false }).sessionInterstitialCount).toBe(0);
    recordNavigationInterstitial();
    expect(getGateState({ isAdFree: false }).sessionInterstitialCount).toBe(1);
  });

  it('records the last full-screen ad timestamp from the injected clock', () => {
    nowValue = 555;
    recordFullScreenAd();
    expect(getGateState({ isAdFree: false }).lastFullScreenAdAt).toBe(555);
  });

  it('flips cold start to false after the first warm start', () => {
    expect(getGateState({ isAdFree: false }).isColdStart).toBe(true);
    markWarmStart();
    expect(getGateState({ isAdFree: false }).isColdStart).toBe(false);
  });

  it('passes isAdFree straight through', () => {
    expect(getGateState({ isAdFree: true }).isAdFree).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ads/adState.test.ts`
Expected: FAIL — cannot resolve `./adState`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/ads/adState.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ads/adState.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ads/adState.ts src/lib/ads/adState.test.ts
git commit -m "feat(ads): session + persisted ad-gate state with injectable clock"
```

---

## Task 4: Install RevenueCat + `entitlement.ts`

**Files:**
- Modify: `package.json` (via npm)
- Create: `src/lib/ads/entitlement.ts`
- Test: `src/lib/ads/entitlement.test.ts`

- [ ] **Step 1: Install the plugin**

Run: `npm install @revenuecat/purchases-capacitor@^13`
Expected: `package.json` gains `"@revenuecat/purchases-capacitor": "^13.x"`; no peer-dep errors (it requires `@capacitor/core >=8.0.0`, satisfied).

Do **not** run `npx cap sync android` yet — that happens in Task 12 after the code compiles.

- [ ] **Step 2: Write the failing test**

Create `src/lib/ads/entitlement.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));

const configure = vi.fn().mockResolvedValue(undefined);
const setLogLevel = vi.fn().mockResolvedValue(undefined);
const logIn = vi.fn();
const logOut = vi.fn();
const getCustomerInfo = vi.fn();
const getOfferings = vi.fn();
const purchasePackage = vi.fn();
const restorePurchases = vi.fn();
let capturedListener: ((info: unknown) => void) | null = null;
const addCustomerInfoUpdateListener = vi.fn(async (cb: (info: unknown) => void) => {
  capturedListener = cb;
  return 'listener-id';
});

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    configure: (...a: unknown[]) => configure(...a),
    setLogLevel: (...a: unknown[]) => setLogLevel(...a),
    logIn: (...a: unknown[]) => logIn(...a),
    logOut: (...a: unknown[]) => logOut(...a),
    getCustomerInfo: (...a: unknown[]) => getCustomerInfo(...a),
    getOfferings: (...a: unknown[]) => getOfferings(...a),
    purchasePackage: (...a: unknown[]) => purchasePackage(...a),
    restorePurchases: (...a: unknown[]) => restorePurchases(...a),
    addCustomerInfoUpdateListener: (...a: unknown[]) => addCustomerInfoUpdateListener(...a),
  },
  LOG_LEVEL: { ERROR: 'ERROR' },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1', PAYMENT_PENDING_ERROR: '20' },
}));

import {
  initPurchases,
  isAdFree,
  purchaseAdFree,
  restorePurchases as restore,
  onEntitlementChange,
  __resetForTests,
} from './entitlement';

const info = (adFree: boolean) => ({
  entitlements: { active: adFree ? { ad_free: { identifier: 'ad_free' } } : {} },
});
const pkg = { identifier: 'ad_free_pkg', product: { identifier: 'wp_ad_free', priceString: '₺500,00' } };

beforeEach(() => {
  vi.clearAllMocks();
  capturedListener = null;
  __resetForTests();
  getCustomerInfo.mockResolvedValue({ customerInfo: info(false) });
  getOfferings.mockResolvedValue({ current: { availablePackages: [pkg] } });
});

describe('entitlement', () => {
  it('isAdFree() is false until the first CustomerInfo, then reflects it', async () => {
    expect(isAdFree()).toBe(false);
    getCustomerInfo.mockResolvedValueOnce({ customerInfo: info(true) });
    await initPurchases('user-1');
    expect(configure).toHaveBeenCalledWith(expect.objectContaining({ appUserID: 'user-1' }));
    expect(isAdFree()).toBe(true);
  });

  it('notifies listeners when the entitlement flips', async () => {
    const seen: boolean[] = [];
    onEntitlementChange((v) => seen.push(v));
    await initPurchases('user-1'); // false, no change from default
    capturedListener?.(info(true));
    expect(seen).toEqual([true]);
  });

  it('maps purchase outcomes: success / cancelled / pending / error', async () => {
    await initPurchases('user-1');

    purchasePackage.mockResolvedValueOnce({ customerInfo: info(true) });
    expect(await purchaseAdFree()).toBe('success');

    purchasePackage.mockRejectedValueOnce({ userCancelled: true });
    expect(await purchaseAdFree()).toBe('cancelled');

    purchasePackage.mockRejectedValueOnce({ code: '20', userCancelled: false });
    expect(await purchaseAdFree()).toBe('pending');

    purchasePackage.mockRejectedValueOnce({ code: '2', userCancelled: false });
    expect(await purchaseAdFree()).toBe('error');
  });

  it('restorePurchases() returns whether ad_free is now active', async () => {
    await initPurchases('user-1');
    restorePurchases.mockResolvedValueOnce({ customerInfo: info(true) });
    expect(await restore()).toBe(true);
    restorePurchases.mockResolvedValueOnce({ customerInfo: info(false) });
    expect(await restore()).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/ads/entitlement.test.ts`
Expected: FAIL — cannot resolve `./entitlement`.

- [ ] **Step 4: Write the implementation**

Create `src/lib/ads/entitlement.ts`:

```ts
import { Capacitor } from '@capacitor/core';
import {
  Purchases,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from '@revenuecat/purchases-capacitor';
import {
  REVENUECAT_ANDROID_API_KEY,
  ENTITLEMENT_ID,
  AD_FREE_PRODUCT_ID,
} from './adConfig';

export type PurchaseOutcome = 'success' | 'cancelled' | 'pending' | 'error';

let configured = false;
let adFreeCache = false;
let priceStringCache: string | null = null;
const listeners = new Set<(adFree: boolean) => void>();

// CustomerInfo shape varies across platforms; we only read entitlements.active.
type MinimalCustomerInfo = { entitlements: { active: Record<string, unknown> } };

function applyCustomerInfo(ci: unknown): void {
  const active = (ci as MinimalCustomerInfo | undefined)?.entitlements?.active ?? {};
  const next = active[ENTITLEMENT_ID] != null;
  if (next !== adFreeCache) {
    adFreeCache = next;
    listeners.forEach((cb) => cb(next));
  }
}

/** Configure RevenueCat for the logged-in user and prime the entitlement cache. */
export async function initPurchases(appUserID: string | null): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    if (!configured) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
      await Purchases.configure({
        apiKey: REVENUECAT_ANDROID_API_KEY,
        appUserID: appUserID ?? undefined,
      });
      configured = true;
      await Purchases.addCustomerInfoUpdateListener((ci) => applyCustomerInfo(ci));
    } else if (appUserID) {
      const { customerInfo } = await Purchases.logIn({ appUserID });
      applyCustomerInfo(customerInfo);
    }
    await refreshEntitlement();
  } catch (err) {
    console.error('entitlement: RevenueCat başlatılamadı', err);
  }
}

export async function logoutPurchases(): Promise<void> {
  if (!Capacitor.isNativePlatform() || !configured) return;
  try {
    const { customerInfo } = await Purchases.logOut();
    applyCustomerInfo(customerInfo);
  } catch (err) {
    console.error('entitlement: logOut başarısız', err);
  }
}

/** Sync read of the last-known entitlement. Fails toward "show ads". */
export function isAdFree(): boolean {
  return adFreeCache;
}

export async function refreshEntitlement(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    applyCustomerInfo(customerInfo);
  } catch (err) {
    console.error('entitlement: CustomerInfo alınamadı', err);
  }
}

export function onEntitlementChange(cb: (adFree: boolean) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

async function findAdFreePackage(): Promise<{ product: { priceString: string } } | null> {
  const offerings = await Purchases.getOfferings();
  const pkgs = offerings.current?.availablePackages ?? [];
  const match = pkgs.find((p) => p.product.identifier === AD_FREE_PRODUCT_ID);
  return (match ?? pkgs[0] ?? null) as { product: { priceString: string } } | null;
}

export async function getAdFreePriceString(): Promise<string | null> {
  if (priceStringCache) return priceStringCache;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const pkg = await findAdFreePackage();
    priceStringCache = pkg ? pkg.product.priceString : null;
    return priceStringCache;
  } catch (err) {
    console.error('entitlement: fiyat alınamadı', err);
    return null;
  }
}

export async function purchaseAdFree(): Promise<PurchaseOutcome> {
  if (!Capacitor.isNativePlatform()) return 'error';
  try {
    const pkg = await findAdFreePackage();
    if (!pkg) return 'error';
    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: pkg as never,
    });
    applyCustomerInfo(customerInfo);
    return isAdFree() ? 'success' : 'pending';
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; code?: string };
    if (err?.userCancelled) return 'cancelled';
    if (
      err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
    ) {
      return 'cancelled';
    }
    if (err?.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
    console.error('entitlement: satın alma başarısız', e);
    return 'error';
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    applyCustomerInfo(customerInfo);
    return isAdFree();
  } catch (err) {
    console.error('entitlement: geri yükleme başarısız', err);
    return false;
  }
}

/** Test-only: reset module state. */
export function __resetForTests(): void {
  configured = false;
  adFreeCache = false;
  priceStringCache = null;
  listeners.clear();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/ads/entitlement.test.ts`
Expected: PASS (4 tests).

If TypeScript complains about `Purchases.configure` accepting `appUserID: undefined`, that is fine at runtime (it is an optional field); if `tsc` flags it, change the call to spread conditionally:
`await Purchases.configure(appUserID ? { apiKey: REVENUECAT_ANDROID_API_KEY, appUserID } : { apiKey: REVENUECAT_ANDROID_API_KEY });`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/ads/entitlement.ts src/lib/ads/entitlement.test.ts
git commit -m "feat(ads): RevenueCat entitlement wrapper (purchase, restore, ad_free cache)"
```

---

## Task 5: `adController.ts` — AdMob orchestrator

**Files:**
- Create: `src/lib/ads/adController.ts`
- Test: `src/lib/ads/adController.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/ads/adController.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));

const showInterstitial = vi.fn().mockResolvedValue(undefined);
const prepareInterstitial = vi.fn().mockResolvedValue(undefined);
const showBannerNative = vi.fn().mockResolvedValue(undefined);
const hideBannerNative = vi.fn().mockResolvedValue(undefined);
const isAppOpenLoaded = vi.fn().mockResolvedValue({ value: true });
const showAppOpen = vi.fn().mockResolvedValue(undefined);
const loadAppOpen = vi.fn().mockResolvedValue(undefined);
const addListener = vi.fn().mockResolvedValue({ remove: vi.fn() });

vi.mock('@capacitor-community/admob', () => ({
  AdMob: {
    requestConsentInfo: vi.fn().mockResolvedValue({ isConsentFormAvailable: false }),
    showConsentForm: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    prepareInterstitial: (...a: unknown[]) => prepareInterstitial(...a),
    showInterstitial: (...a: unknown[]) => showInterstitial(...a),
    showBanner: (...a: unknown[]) => showBannerNative(...a),
    hideBanner: (...a: unknown[]) => hideBannerNative(...a),
    isAppOpenLoaded: (...a: unknown[]) => isAppOpenLoaded(...a),
    showAppOpen: (...a: unknown[]) => showAppOpen(...a),
    loadAppOpen: (...a: unknown[]) => loadAppOpen(...a),
    addListener: (...a: unknown[]) => addListener(...a),
  },
  BannerAdPosition: { BOTTOM_CENTER: 'BOTTOM_CENTER' },
  BannerAdSize: { ADAPTIVE_BANNER: 'ADAPTIVE_BANNER' },
  BannerAdPluginEvents: { SizeChanged: 'bannerAdSizeChanged' },
  InterstitialAdPluginEvents: { Dismissed: 'interstitialAdDismissed' },
  AppOpenAdPluginEvents: { Closed: 'appOpenAdClosed', FailedToShow: 'appOpenAdFailedToShow' },
}));

const canShowAd = vi.fn();
vi.mock('./adPolicy', async (orig) => ({
  ...(await orig<typeof import('./adPolicy')>()),
  canShowAd: (...a: unknown[]) => canShowAd(...a),
}));

const isAdFree = vi.fn();
const onEntitlementChange = vi.fn().mockReturnValue(() => {});
vi.mock('./entitlement', () => ({
  isAdFree: (...a: unknown[]) => isAdFree(...a),
  onEntitlementChange: (...a: unknown[]) => onEntitlementChange(...a),
}));

vi.mock('./adState', () => ({
  getGateState: vi.fn().mockReturnValue({}),
  recordFullScreenAd: vi.fn(),
  recordNavigationInterstitial: vi.fn(),
  setPendingRemoveAdsPrompt: vi.fn(),
  loadPersistentState: vi.fn().mockResolvedValue(undefined),
}));

import { initAds, requestInterstitial, hideBanner } from './adController';

beforeEach(() => {
  vi.clearAllMocks();
  isAdFree.mockReturnValue(false);
});

describe('adController', () => {
  it('does not show an interstitial when the gate is closed', async () => {
    await initAds();
    canShowAd.mockReturnValue(false);
    await requestInterstitial('navigation');
    expect(showInterstitial).not.toHaveBeenCalled();
  });

  it('does not show an interstitial when ad-free', async () => {
    await initAds();
    isAdFree.mockReturnValue(true);
    canShowAd.mockReturnValue(true);
    await requestInterstitial('bill-add');
    expect(showInterstitial).not.toHaveBeenCalled();
  });

  it('shows a bill-add interstitial when the gate allows it', async () => {
    await initAds();
    canShowAd.mockReturnValue(true);
    await requestInterstitial('bill-add');
    expect(showInterstitial).toHaveBeenCalledTimes(1);
  });

  it('hideBanner() calls the native hideBanner', async () => {
    await hideBanner();
    expect(hideBannerNative).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/ads/adController.test.ts`
Expected: FAIL — cannot resolve `./adController`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/ads/adController.ts`:

```ts
import {
  AdMob,
  BannerAdPosition,
  BannerAdSize,
  BannerAdPluginEvents,
  InterstitialAdPluginEvents,
  AppOpenAdPluginEvents,
  type AdMobBannerSize,
} from '@capacitor-community/admob';
import { AD_TEST_MODE, AD_UNITS } from './adConfig';
import { canShowAd, type AdKind } from './adPolicy';
import {
  getGateState,
  recordFullScreenAd,
  recordNavigationInterstitial,
  setPendingRemoveAdsPrompt,
  loadPersistentState,
} from './adState';
import { isAdFree, onEntitlementChange } from './entitlement';

let initPromise: Promise<void> | null = null;
let initResolved = false;
let interstitialShowing = false;

function gate(kind: AdKind): boolean {
  return canShowAd(kind, getGateState({ isAdFree: isAdFree() }));
}

async function prepareInterstitial(): Promise<void> {
  try {
    await AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial, isTesting: AD_TEST_MODE });
  } catch (err) {
    console.error('ads: geçiş reklamı hazırlanamadı', err);
  }
}

async function loadAppOpen(): Promise<void> {
  try {
    await AdMob.loadAppOpen({ adId: AD_UNITS.appOpen });
  } catch (err) {
    console.error('ads: app-open reklamı yüklenemedi', err);
  }
}

/**
 * Idempotent, promise-cached. UMP consent → AdMob.initialize → preload the
 * first interstitial and app-open ad. Deliberately called from HomeScreen's
 * mount (see the comment there): initialize() must run only after Capacitor
 * has attached the WebView, or every later showBanner() breaks.
 */
export function initAds(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await loadPersistentState();
      if (!isAdFree()) {
        try {
          const consent = await AdMob.requestConsentInfo();
          if (consent.isConsentFormAvailable) {
            await AdMob.showConsentForm();
          }
        } catch (err) {
          console.error('ads: onay akışı alınamadı', err);
        }
      }
      try {
        await AdMob.initialize({ initializeForTesting: AD_TEST_MODE });
        if (!isAdFree()) {
          await prepareInterstitial();
          await loadAppOpen();
        }
      } catch (err) {
        console.error('ads: AdMob başlatılamadı', err);
      }
      initResolved = true;
    })();

    // When the user buys ad-free mid-session, drop the banner immediately.
    onEntitlementChange((adFree) => {
      if (adFree) void hideBanner();
    });
  }
  return initPromise;
}

// ---- Banner --------------------------------------------------------------

const BANNER_HEIGHT_CACHE_KEY = 'wp.adBannerHeightPx';

export function getReservedBannerHeightPx(): number {
  try {
    const cached = Number(localStorage.getItem(BANNER_HEIGHT_CACHE_KEY));
    if (Number.isFinite(cached) && cached >= 32 && cached <= 120) return cached;
  } catch {
    // locked-down WebView — fall through
  }
  return 60;
}

export function onBannerHeightChange(callback: (heightPx: number) => void): () => void {
  const handle = AdMob.addListener(BannerAdPluginEvents.SizeChanged, (size: AdMobBannerSize) => {
    const heightPx = size?.height ?? 0;
    if (heightPx > 0) {
      try {
        localStorage.setItem(BANNER_HEIGHT_CACHE_KEY, String(heightPx));
      } catch {
        // best-effort cache only
      }
    }
    callback(heightPx);
  });
  return () => { handle.then((h) => h.remove()); };
}

export async function showBanner(): Promise<void> {
  if (isAdFree()) return;
  try {
    await AdMob.showBanner({
      adId: AD_UNITS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: AD_TEST_MODE,
    });
  } catch (err) {
    console.error('ads: banner gösterilemedi', err);
  }
}

export async function hideBanner(): Promise<void> {
  try {
    await AdMob.hideBanner();
  } catch (err) {
    console.error('ads: banner gizlenemedi', err);
  }
}

export async function teardownBanner(): Promise<void> {
  await hideBanner();
}

// ---- Interstitial -------------------------------------------------------

export async function requestInterstitial(kind: 'bill-add' | 'navigation'): Promise<void> {
  if (isAdFree()) return;
  if (!initResolved) return;
  if (interstitialShowing) return;
  if (!gate(kind)) return;

  interstitialShowing = true;
  const dismiss = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
    recordFullScreenAd();
    if (kind === 'navigation') {
      recordNavigationInterstitial();
    } else {
      // bill-add just closed → offer the Home "remove ads" strip once.
      setPendingRemoveAdsPrompt(true);
    }
    interstitialShowing = false;
    dismiss.remove();
    void prepareInterstitial();
  });

  try {
    await AdMob.showInterstitial();
  } catch (err) {
    console.error('ads: geçiş reklamı gösterilemedi', err);
    interstitialShowing = false;
    dismiss.remove();
    void prepareInterstitial();
  }
}

// ---- App Open ----------------------------------------------------------

export async function maybeShowAppOpen(): Promise<void> {
  if (isAdFree()) return;
  if (!initResolved) return;
  if (interstitialShowing) return;
  if (!gate('app-open')) return;

  try {
    const loaded = await AdMob.isAppOpenLoaded();
    if (!loaded.value) {
      void loadAppOpen();
      return;
    }
  } catch {
    void loadAppOpen();
    return;
  }

  const closed = await AdMob.addListener(AppOpenAdPluginEvents.Closed, () => {
    recordFullScreenAd();
    closed.remove();
    void loadAppOpen();
  });
  const failed = await AdMob.addListener(AppOpenAdPluginEvents.FailedToShow, () => {
    failed.remove();
    void loadAppOpen();
  });

  try {
    await AdMob.showAppOpen();
  } catch (err) {
    console.error('ads: app-open reklamı gösterilemedi', err);
    closed.remove();
    failed.remove();
    void loadAppOpen();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/ads/adController.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ads/adController.ts src/lib/ads/adController.test.ts
git commit -m "feat(ads): AdMob orchestrator — gated interstitial + app-open + banner"
```

---

## Task 6: `index.ts`, delete legacy, rewire imports

**Files:**
- Create: `src/lib/ads/index.ts`
- Delete: `src/lib/ads.ts`, `src/lib/adInterstitialFrequency.ts`, `src/lib/adInterstitialFrequency.test.ts`
- Modify: `src/screens/add/AddFlow.tsx:10`, `src/screens/add/AddFlow.tsx:259`
- Modify: `src/screens/home/HomeScreen.tsx:14`, `src/screens/home/HomeScreen.tsx:135-139`

- [ ] **Step 1: Create the public surface**

Create `src/lib/ads/index.ts`:

```ts
export {
  initAds,
  showBanner,
  hideBanner,
  teardownBanner,
  onBannerHeightChange,
  getReservedBannerHeightPx,
  requestInterstitial,
  maybeShowAppOpen,
} from './adController';

export {
  initPurchases,
  logoutPurchases,
  isAdFree,
  refreshEntitlement,
  purchaseAdFree,
  restorePurchases,
  getAdFreePriceString,
  onEntitlementChange,
  type PurchaseOutcome,
} from './entitlement';

export {
  markWarmStart,
  getPendingRemoveAdsPrompt,
  setPendingRemoveAdsPrompt,
  isRemoveAdsStripDismissed,
  dismissRemoveAdsStrip,
} from './adState';
```

- [ ] **Step 2: Delete the legacy files**

```bash
git rm src/lib/ads.ts src/lib/adInterstitialFrequency.ts src/lib/adInterstitialFrequency.test.ts
```

- [ ] **Step 3: Rewire `AddFlow.tsx`**

In `src/screens/add/AddFlow.tsx`, change line 10 from:

```ts
import { maybeShowBillAddedInterstitial } from '../../lib/ads';
```

to:

```ts
import { requestInterstitial } from '../../lib/ads';
```

And change line ~259 from:

```ts
    maybeShowBillAddedInterstitial().catch(() => {});
```

to:

```ts
    requestInterstitial('bill-add').catch(() => {});
```

- [ ] **Step 4: Rewire `HomeScreen.tsx` imports**

In `src/screens/home/HomeScreen.tsx`, change line 14 from:

```ts
import { initAds, showHomeBanner, hideHomeBanner, onBannerHeightChange, getReservedBannerHeightPx } from '../../lib/ads';
```

to:

```ts
import { initAds, showBanner, hideBanner, onBannerHeightChange, getReservedBannerHeightPx } from '../../lib/ads';
```

Then in the banner `useEffect` (lines ~135 and ~139) replace `showHomeBanner` → `showBanner` and `hideHomeBanner` → `hideBanner`:

```ts
    const removeListener = onBannerHeightChange(setBannerSpace);
    initAds().then(showBanner);
    return () => {
      removeListener();
      setBannerSpace(0);
      hideBanner();
    };
```

(The `!isAdFree()` gating comes in Task 8 — this step only renames.)

- [ ] **Step 5: Full test + type + build**

Run: `npx vitest run`
Expected: PASS — all suites green, including the 4 new `src/lib/ads/*.test.ts`; the deleted `adInterstitialFrequency.test.ts` is gone.

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(ads): split lib/ads.ts into lib/ads/ module; drop every-Nth interstitial"
```

---

## Task 7: `<AdOrchestrator />` in `App.tsx`

**Files:**
- Create: `src/components/ads/AdOrchestrator.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the orchestrator**

Create `src/components/ads/AdOrchestrator.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from '../../contexts/AuthContext';
import {
  initAds,
  initPurchases,
  logoutPurchases,
  teardownBanner,
  requestInterstitial,
  maybeShowAppOpen,
  refreshEntitlement,
  markWarmStart,
} from '../../lib/ads';

/**
 * Headless. Lives as a sibling of the route-keyed <div> in App.tsx so it
 * persists across navigations. Boots RevenueCat for the logged-in user and
 * wires resume + route-change events to the ad controller.
 *
 * initAds() is NOT called here for its banner side effects — HomeScreen owns
 * that timing — but calling it (idempotent, promise-cached) is safe and lets
 * interstitials/app-open work even if the user never lands on Home first.
 */
export function AdOrchestrator() {
  const { session } = useAuth();
  const location = useLocation();
  const userId = session?.user?.id ?? null;

  // Boot purchases + ads, keyed to the logged-in user.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      await initPurchases(userId);
      if (cancelled) return;
      await initAds();
    })();
    return () => {
      cancelled = true;
      void teardownBanner();
      void logoutPurchases();
    };
  }, [userId]);

  // Resume → app-open ad. Skip the very first appStateChange (see spec);
  // use it only to leave cold-start and refresh the entitlement.
  useEffect(() => {
    if (!userId) return;
    let firstFire = true;
    const handle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      if (firstFire) {
        firstFire = false;
        markWarmStart();
        void refreshEntitlement();
        return;
      }
      void refreshEntitlement();
      void maybeShowAppOpen();
    });
    return () => { handle.then((l) => l.remove()); };
  }, [userId]);

  // Route change → gated navigation interstitial. Skip the first pathname the
  // hook sees (cold-start landing); trailing-debounce so a redirect chain
  // fires at most once.
  const seenFirstPath = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!userId) return;
    if (!seenFirstPath.current) {
      seenFirstPath.current = true;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void requestInterstitial('navigation');
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [location.pathname, userId]);

  return null;
}
```

- [ ] **Step 2: Wire it into `App.tsx`**

In `src/App.tsx`, add the import after line 13:

```ts
import { AdOrchestrator } from './components/ads/AdOrchestrator';
```

Then render it inside the authed fragment (after `<BottomNav />`):

```tsx
  return (
    <>
      <div className="route-view" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/add" element={<AddFlow />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/history/:billId" element={<HistoryDetailScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
      <AdOrchestrator />
      {onboarding.open && <OnboardingTour />}
    </>
  );
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/ads/AdOrchestrator.tsx src/App.tsx
git commit -m "feat(ads): AdOrchestrator wires resume + route-change to the ad controller"
```

---

## Task 8: Gate the Home banner on `isAdFree()`

**Files:**
- Modify: `src/screens/home/HomeScreen.tsx`

- [ ] **Step 1: Add entitlement state + import**

In `src/screens/home/HomeScreen.tsx`, extend the line-14 import to add `isAdFree` and `onEntitlementChange`:

```ts
import { initAds, showBanner, hideBanner, onBannerHeightChange, getReservedBannerHeightPx, isAdFree, onEntitlementChange } from '../../lib/ads';
```

Add near the other `useState` calls (after line ~26):

```ts
  const [adFree, setAdFree] = useState(isAdFree());
```

Add a small effect that keeps `adFree` in sync (place it just above the banner effect, ~line 116):

```ts
  useEffect(() => {
    setAdFree(isAdFree());
    return onEntitlementChange(setAdFree);
  }, []);
```

- [ ] **Step 2: Gate the banner effect**

Change the banner `useEffect` dependency array from `[]` to `[adFree]`, and short-circuit when ad-free:

```ts
  useEffect(() => {
    const setBannerSpace = (px: number) => {
      document.documentElement.style.setProperty('--ad-banner-height', `${px}px`);
      document.body.classList.toggle('has-ad-banner', px > 0);
    };

    if (adFree) {
      setBannerSpace(0);
      void hideBanner();
      return;
    }

    if (Capacitor.isNativePlatform()) {
      setBannerSpace(getReservedBannerHeightPx());
    }

    const removeListener = onBannerHeightChange(setBannerSpace);
    initAds().then(showBanner);
    return () => {
      removeListener();
      setBannerSpace(0);
      void hideBanner();
    };
  }, [adFree]);
```

Keep the existing explanatory comment block above the effect.

- [ ] **Step 3: Type-check + build**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/screens/home/HomeScreen.tsx
git commit -m "feat(ads): hide Home banner + reclaim its space when ad-free"
```

---

## Task 9: `RemoveAdsSheet` component

**Files:**
- Create: `src/components/ads/RemoveAdsSheet.tsx`
- Create: `src/components/ads/RemoveAdsSheet.css`

- [ ] **Step 1: Write the stylesheet**

Create `src/components/ads/RemoveAdsSheet.css`:

```css
.remove-ads-backdrop {
  position: fixed; inset: 0; z-index: 60;
  display: flex; align-items: flex-end; justify-content: center;
  background: rgba(10, 10, 18, .55);
  animation: remove-ads-backdrop-in var(--dur-base) var(--ease-out);
}
@keyframes remove-ads-backdrop-in { from { opacity: 0; } to { opacity: 1; } }

.remove-ads-sheet {
  width: min(100vw, 480px);
  background: var(--surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  padding: 1.5rem 1.25rem calc(1.5rem + var(--safe-bottom));
  box-shadow: var(--shadow);
  animation: remove-ads-sheet-in var(--dur-base) var(--ease-out);
}
@keyframes remove-ads-sheet-in {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.remove-ads-sheet h2 { margin: 0 0 .4rem; font-size: 1.15rem; }
.remove-ads-sheet p { margin: 0 0 1rem; font-size: .88rem; line-height: 1.55; color: var(--ink-muted); }
.remove-ads-price { color: var(--accent); font-weight: 800; }

.remove-ads-actions { display: flex; flex-direction: column; gap: .6rem; margin-top: .4rem; }

.remove-ads-result {
  display: flex; align-items: flex-start; gap: .5rem; margin: 0 0 1rem;
  padding: .7rem .85rem; border-radius: var(--radius-md);
  font-size: .84rem; font-weight: 600; line-height: 1.45;
}
.remove-ads-result svg { flex: none; margin-top: 1px; }
.remove-ads-result.ok { background: var(--good-soft); color: var(--good); }
.remove-ads-result.pending { background: var(--accent-soft); color: var(--accent-strong); }
.remove-ads-result.err { background: var(--coral-soft); color: var(--coral); }

@media (prefers-reduced-motion: reduce) {
  .remove-ads-backdrop, .remove-ads-sheet { animation: none; }
}
```

- [ ] **Step 2: Write the component**

Create `src/components/ads/RemoveAdsSheet.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, TriangleAlert } from 'lucide-react';
import { Button } from '../ui/button';
import {
  purchaseAdFree,
  restorePurchases,
  getAdFreePriceString,
  type PurchaseOutcome,
} from '../../lib/ads';
import './RemoveAdsSheet.css';

type Phase = 'idle' | 'buying' | 'restoring' | PurchaseOutcome | 'restored-none';

const PRICE_FALLBACK = '₺500';

export function RemoveAdsSheet({ onClose }: { onClose: () => void }) {
  const [price, setPrice] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    let alive = true;
    getAdFreePriceString().then((p) => { if (alive) setPrice(p); });
    return () => { alive = false; };
  }, []);

  const busy = phase === 'buying' || phase === 'restoring';

  async function buy() {
    setPhase('buying');
    const outcome = await purchaseAdFree();
    if (outcome === 'cancelled') { setPhase('idle'); return; }
    setPhase(outcome);
    if (outcome === 'success') setTimeout(onClose, 1400);
  }

  async function restore() {
    setPhase('restoring');
    const ok = await restorePurchases();
    if (ok) {
      setPhase('success');
      setTimeout(onClose, 1400);
    } else {
      setPhase('restored-none');
    }
  }

  return (
    <div
      className="remove-ads-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Reklamları kaldır"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className="remove-ads-sheet">
        <h2>Reklamları kaldır</h2>
        <p>
          Tek seferlik <span className="remove-ads-price">{price ?? PRICE_FALLBACK}</span> ödeme ile
          banner, geçiş ve açılış reklamlarının tamamı bu hesap için kalıcı olarak kapanır.
        </p>

        {phase === 'success' && (
          <p className="remove-ads-result ok">
            <CheckCircle2 size={16} strokeWidth={1.8} /> Teşekkürler, reklamlar kapatıldı.
          </p>
        )}
        {phase === 'pending' && (
          <p className="remove-ads-result pending">
            <Clock size={16} strokeWidth={1.8} /> İşlem beklemede — onaylandığında reklamlar otomatik kapanacak.
          </p>
        )}
        {phase === 'error' && (
          <p className="remove-ads-result err">
            <TriangleAlert size={16} strokeWidth={1.8} /> Satın alma tamamlanamadı. Lütfen tekrar dene.
          </p>
        )}
        {phase === 'restored-none' && (
          <p className="remove-ads-result err">
            <TriangleAlert size={16} strokeWidth={1.8} /> Bu hesapta geri yüklenecek bir satın alma bulunamadı.
          </p>
        )}

        <div className="remove-ads-actions">
          <Button size="lg" className="h-12 text-base" onClick={buy} disabled={busy || phase === 'success'}>
            {phase === 'buying' ? 'İşleniyor…' : `Satın al · ${price ?? PRICE_FALLBACK}`}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-12 text-base"
            onClick={restore}
            disabled={busy || phase === 'success'}
          >
            {phase === 'restoring' ? 'Kontrol ediliyor…' : 'Satın alımları geri yükle'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds (component is not yet rendered anywhere — that is fine, it is exported and imported in Task 10).

If `tsc` flags the unused component, skip the standalone build check here and let Task 10's build cover it.

- [ ] **Step 4: Commit**

```bash
git add src/components/ads/RemoveAdsSheet.tsx src/components/ads/RemoveAdsSheet.css
git commit -m "feat(ads): RemoveAdsSheet bottom sheet (buy / restore / result states)"
```

---

## Task 10: ProfileScreen remove-ads row

**Files:**
- Modify: `src/screens/profile/ProfileScreen.tsx`

- [ ] **Step 1: Add imports + state**

In `src/screens/profile/ProfileScreen.tsx`, add to the lucide import on line 2: `Sparkles` and `CheckCircle2`:

```ts
import { RotateCcw, WifiOff, TriangleAlert, PlayCircle, Sparkles, CheckCircle2 } from 'lucide-react';
```

Add after the existing component imports (after line 14):

```ts
import { RemoveAdsSheet } from '../../components/ads/RemoveAdsSheet';
import { isAdFree, onEntitlementChange, restorePurchases } from '../../lib/ads';
```

Inside `ProfileScreen()`, next to the other `useState` calls (~line 28):

```ts
  const [adFree, setAdFree] = useState(isAdFree());
  const [showRemoveAds, setShowRemoveAds] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
```

Add an effect near the other effects:

```ts
  useEffect(() => {
    setAdFree(isAdFree());
    return onEntitlementChange(setAdFree);
  }, []);
```

- [ ] **Step 2: Render the row**

In `src/screens/profile/ProfileScreen.tsx`, insert this block immediately before the "Tanıtımı tekrar izle" button (before line ~297):

```tsx
      {adFree ? (
        <div className="profile-adfree-row profile-in" style={{ '--i': 3 } as CSSProperties}>
          <span className="profile-adfree-badge">
            <CheckCircle2 size={16} strokeWidth={1.8} /> Reklamsız
          </span>
          <Button
            variant="link"
            className="profile-adfree-restore"
            onClick={async () => {
              setRestoreMsg(null);
              const ok = await restorePurchases();
              setRestoreMsg(ok ? 'Satın alımlar geri yüklendi.' : 'Geri yüklenecek satın alma bulunamadı.');
            }}
          >
            Satın alımları geri yükle
          </Button>
          {restoreMsg && <p className="profile-adfree-msg">{restoreMsg}</p>}
        </div>
      ) : (
        <Button
          variant="outline"
          size="lg"
          className="w-full h-12 text-base profile-in"
          style={{ '--i': 3 } as CSSProperties}
          onClick={() => setShowRemoveAds(true)}
        >
          <Sparkles strokeWidth={1.8} />
          Reklamları kaldır
        </Button>
      )}
```

Then at the end of the component's returned JSX, just before the closing tag of the root element, render the sheet:

```tsx
      {showRemoveAds && <RemoveAdsSheet onClose={() => setShowRemoveAds(false)} />}
```

- [ ] **Step 3: Add row styles**

Append to `src/screens/profile/ProfileScreen.css`:

```css
.profile-adfree-row {
  display: flex; flex-direction: column; align-items: center; gap: .4rem;
  padding: .85rem 1rem; margin-top: .25rem;
  background: var(--good-soft); border-radius: var(--radius-lg);
}
.profile-adfree-badge {
  display: flex; align-items: center; gap: .4rem;
  color: var(--good); font-size: .9rem; font-weight: 700;
}
.profile-adfree-restore { color: var(--ink-muted); font-size: .8rem; font-weight: 600; height: auto; padding: 0; }
.profile-adfree-msg { margin: 0; font-size: .78rem; color: var(--ink-muted); }
```

- [ ] **Step 4: Test + type + build**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

Run: `npx vitest run`
Expected: all suites still green.

- [ ] **Step 5: Commit**

```bash
git add src/screens/profile/ProfileScreen.tsx src/screens/profile/ProfileScreen.css
git commit -m "feat(ads): Profile remove-ads row + restore action"
```

---

## Task 11: `RemoveAdsStrip` on Home

**Files:**
- Create: `src/components/ads/RemoveAdsStrip.tsx`
- Create: `src/components/ads/RemoveAdsStrip.css`
- Modify: `src/screens/home/HomeScreen.tsx`

- [ ] **Step 1: Write the stylesheet**

Create `src/components/ads/RemoveAdsStrip.css`:

```css
.remove-ads-strip {
  display: flex; align-items: center; gap: .6rem;
  margin: 1rem 0 0; padding: .7rem .85rem;
  background: var(--accent-soft); border-radius: var(--radius-lg);
  animation: remove-ads-strip-in var(--dur-base) var(--ease-out);
}
@keyframes remove-ads-strip-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.remove-ads-strip-icon { flex: none; color: var(--accent); }
.remove-ads-strip p { flex: 1; margin: 0; font-size: .8rem; font-weight: 600; color: var(--ink); line-height: 1.4; }
.remove-ads-strip-cta {
  flex: none; border: 0; background: var(--accent-button); color: #fff;
  font-family: inherit; font-size: .78rem; font-weight: 700;
  padding: .4rem .75rem; border-radius: var(--radius-md); cursor: pointer;
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.remove-ads-strip-cta:hover { opacity: .92; }
.remove-ads-strip-cta:active { transform: scale(.97); }
.remove-ads-strip-dismiss {
  flex: none; border: 0; background: transparent; color: var(--ink-faint);
  cursor: pointer; padding: .2rem; display: flex; align-items: center;
}
@media (prefers-reduced-motion: reduce) {
  .remove-ads-strip { animation: none; }
  .remove-ads-strip-cta { transition: none; }
}
```

- [ ] **Step 2: Write the component**

Create `src/components/ads/RemoveAdsStrip.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  getPendingRemoveAdsPrompt,
  isRemoveAdsStripDismissed,
  dismissRemoveAdsStrip,
  isAdFree,
  onEntitlementChange,
} from '../../lib/ads';
import { RemoveAdsSheet } from './RemoveAdsSheet';
import './RemoveAdsStrip.css';

export function RemoveAdsStrip() {
  const [visible, setVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const dismissed = await isRemoveAdsStripDismissed();
      if (alive) setVisible(getPendingRemoveAdsPrompt() && !isAdFree() && !dismissed);
    })();
    const off = onEntitlementChange((adFree) => { if (adFree) setVisible(false); });
    return () => { alive = false; off(); };
  }, []);

  if (!visible) return null;

  return (
    <>
      <div className="remove-ads-strip" role="note">
        <Sparkles size={18} strokeWidth={1.8} className="remove-ads-strip-icon" />
        <p>Reklamlar rahatsız edici mi? Tek seferlik ödemeyle tamamen kaldır.</p>
        <button type="button" className="remove-ads-strip-cta" onClick={() => setSheetOpen(true)}>
          Kaldır
        </button>
        <button
          type="button"
          className="remove-ads-strip-dismiss"
          aria-label="Kapat"
          onClick={() => { void dismissRemoveAdsStrip(); setVisible(false); }}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
      {sheetOpen && <RemoveAdsSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}
```

- [ ] **Step 3: Render it on Home**

In `src/screens/home/HomeScreen.tsx`, add the import near the other component imports:

```ts
import { RemoveAdsStrip } from '../../components/ads/RemoveAdsStrip';
```

Render `<RemoveAdsStrip />` just inside `<div className="home-shell">`, above `<div className="home-hero">`:

```tsx
    <div className="home-shell">
      <RemoveAdsStrip />
      <div className="home-hero">
```

- [ ] **Step 4: Test + type + build**

Run: `npx tsc -b`
Expected: no errors.

Run: `npm run build`
Expected: build succeeds.

Run: `npx vitest run`
Expected: all suites green.

- [ ] **Step 5: Commit**

```bash
git add src/components/ads/RemoveAdsStrip.tsx src/components/ads/RemoveAdsStrip.css src/screens/home/HomeScreen.tsx
git commit -m "feat(ads): dismissible RemoveAdsStrip on Home after a bill-add interstitial"
```

---

## Task 12: Wrap-up — cap sync, full verification, manual checklist

**Files:**
- Modify (by tooling): `android/app/src/main/AndroidManifest.xml`, `android/` Gradle files
- Create: `docs/superpowers/plans/2026-09-09-ads-monetization-manual-setup.md`

- [ ] **Step 1: Sync the Android project**

Run: `npx cap sync android`
Expected: `@revenuecat/purchases-capacitor` and `@capacitor-community/admob` both listed under "Found N Capacitor plugins"; no errors.

- [ ] **Step 2: Verify the Billing permission**

Run: `git diff android/app/src/main/AndroidManifest.xml`
Expected: either no change (permission already present / injected by the plugin's manifest merge) or an added `<uses-permission android:name="com.android.vending.BILLING" />`. If absent after sync, add it manually to `android/app/src/main/AndroidManifest.xml` inside `<manifest>`.

- [ ] **Step 3: Full green gate**

Run: `npx vitest run`
Expected: all suites pass; no reference to `adInterstitialFrequency`.

Run: `npx tsc -b`
Expected: clean.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Verify the release guard still fires**

With `AD_TEST_MODE = true` still in `src/lib/ads/adConfig.ts`, attempt a dry-run release build so the PreToolUse hook evaluates:

Run: `cd android && ./gradlew bundleRelease --dry-run`
Expected: the Bash PreToolUse hook DENIES the command with the `AD_TEST_MODE hala TRUE` reason. If it instead runs, the `~/.claude/settings.json` `f=` path from Task 1 Step 3 was not updated — fix it now and re-test.

- [ ] **Step 5: Write the manual-setup checklist for Mehmet**

Create `docs/superpowers/plans/2026-09-09-ads-monetization-manual-setup.md`:

```markdown
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
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(ads): cap sync android + manual-setup checklist"
```

---

## Self-Review

### 1. Spec coverage

| Spec requirement | Task |
|---|---|
| Guaranteed interstitial on every bill add | Task 5 (`requestInterstitial('bill-add')` bypasses gate), Task 6 (AddFlow rewire) |
| App Open on resume, gated | Task 5 (`maybeShowAppOpen`), Task 7 (`appStateChange`) |
| Navigation interstitials, gated | Task 5 (`requestInterstitial('navigation')`), Task 7 (route-change debounce) |
| Shared 90s `lastFullScreenAdAt` gate | Task 2 (`canShowAd` uses one timestamp), Task 3 (`recordFullScreenAd`) |
| Session cap 4, bill-add exempt | Task 2 (`SESSION_INTERSTITIAL_CAP`, only `navigation` checks it; `recordNavigationInterstitial` only on nav) |
| 60s post-install grace | Task 2 (`INITIAL_GRACE_MS`), Task 3 (`firstInstallAt` persisted once) |
| ₺500 one-time purchase, RevenueCat, cross-device | Task 4 (`purchaseAdFree`, `configure({ appUserID })`) |
| Client-only entitlement, no Supabase mirror | Task 4 (module cache + `addCustomerInfoUpdateListener`; nothing writes Supabase) |
| `isAdFree()` short-circuits every ad path | Task 5 (guards in `requestInterstitial`, `maybeShowAppOpen`, `showBanner`, `initAds`) |
| Banner gated + reclaims space when ad-free | Task 8 |
| Profile row (buy / restore) | Task 10 |
| Dismissible Home strip after interstitial, 30-day hide | Task 3 (`isRemoveAdsStripDismissed`, `STRIP_HIDE_MS`), Task 5 (`setPendingRemoveAdsPrompt` on bill-add dismiss), Task 11 |
| `adConfig.ts` owns `AD_TEST_MODE` + comment block | Task 1 |
| Release-guard hook re-point + dry-run verify | Task 1 Step 3, Task 12 Step 4 |
| Delete `ads.ts` + `adInterstitialFrequency.ts` + its test | Task 6 |
| 4 new `*.test.ts`, existing style | Tasks 2–5 |
| `index.ts` public surface | Task 6 |
| Mehmet out-of-code checklist (AdMob unit, Play product, RC dashboard, cap sync) | Task 12 Step 5 |
| Dependency `@revenuecat/purchases-capacitor` | Task 4 Step 1 |
| `com.android.vending.BILLING` verify | Task 12 Step 2 |

No gaps found.

### 2. Placeholder scan

The only `TODO_` tokens are the three values that are genuinely Mehmet's to supply (`PROD.appOpen`, `REVENUECAT_ANDROID_API_KEY`) — spelled out in Task 12 Step 5. Every code step contains complete, runnable code. No "add error handling" / "similar to Task N" placeholders.

### 3. Type consistency

- `canShowAd(kind, s)` / `AdGateState` — defined Task 2, consumed unchanged in Task 3 (`getGateState` returns `AdGateState`) and Task 5 (`gate()`).
- `AdKind` is `'bill-add' | 'navigation' | 'app-open'`; `requestInterstitial` narrows its param to `'bill-add' | 'navigation'` consistently in Tasks 5, 6, 7.
- `isAdFree(): boolean` (sync) — Task 4 defines, Tasks 5/8/10/11 consume synchronously. `getAdFreePriceString(): Promise<string | null>` — async, consumed with `await`/`.then` in Tasks 9/10.
- `PurchaseOutcome` exported from `entitlement.ts` (Task 4) and re-exported via `index.ts` (Task 6), imported by `RemoveAdsSheet` (Task 9).
- `onEntitlementChange(cb) => () => void` — unsubscribe contract used identically in Tasks 5, 8, 10, 11.
- `recordFullScreenAd` vs `recordNavigationInterstitial` — distinct names, used correctly (full-screen on every dismiss, navigation-only counter on nav dismiss) in Task 5.
- Banner fns renamed once: `showHomeBanner`→`showBanner`, `hideHomeBanner`→`hideBanner` in Task 6, referenced by the new names everywhere after.
- `markWarmStart` exported from `adState` (Task 3), re-exported in `index.ts` (Task 6), consumed in `AdOrchestrator` (Task 7).

No inconsistencies found.
