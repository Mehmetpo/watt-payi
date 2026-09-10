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
let configurePromise: Promise<void> | null = null;
let adFreeCache = false;
let priceStringCache: string | null = null;
const listeners = new Set<(adFree: boolean) => void>();

/**
 * Resolves once the entitlement cache reflects a real answer (or init gave up).
 * `initAds()` awaits this so it never runs the UMP consent flow / ad preload
 * for a customer who already bought ad-free.
 */
let markEntitlementReady!: () => void;
export const entitlementReady: Promise<void> = new Promise((resolve) => {
  markEntitlementReady = resolve;
});

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
  if (!Capacitor.isNativePlatform()) {
    markEntitlementReady();
    return;
  }
  try {
    // Promise-cached so React StrictMode's double-mount can't configure twice.
    if (!configurePromise) {
      configurePromise = (async () => {
        await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
        await Purchases.configure(
          appUserID
            ? { apiKey: REVENUECAT_ANDROID_API_KEY, appUserID }
            : { apiKey: REVENUECAT_ANDROID_API_KEY },
        );
        await Purchases.addCustomerInfoUpdateListener((ci) => applyCustomerInfo(ci));
        configured = true;
      })();
      await configurePromise;
    } else {
      await configurePromise;
      if (appUserID) {
        const { customerInfo } = await Purchases.logIn({ appUserID });
        applyCustomerInfo(customerInfo);
      }
    }
    await refreshEntitlement();
  } catch (err) {
    console.error('entitlement: RevenueCat başlatılamadı', err);
  } finally {
    markEntitlementReady();
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

async function findAdFreePackage(
  opts: { exact?: boolean } = {},
): Promise<{ product: { priceString: string } } | null> {
  const offerings = await Purchases.getOfferings();
  const pkgs = offerings.current?.availablePackages ?? [];
  const match = pkgs.find((p) => p.product.identifier === AD_FREE_PRODUCT_ID);
  // Price display tolerates a fallback; a real charge must be the exact product.
  const picked = opts.exact ? match : (match ?? pkgs[0]);
  return (picked ?? null) as { product: { priceString: string } } | null;
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
    const pkg = await findAdFreePackage({ exact: true });
    if (!pkg) return 'error';
    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: pkg as never,
    });
    applyCustomerInfo(customerInfo);
    return isAdFree() ? 'success' : 'pending';
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; code?: string };
    if (err?.userCancelled) return 'cancelled';
    if (err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
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
  configurePromise = null;
  adFreeCache = false;
  priceStringCache = null;
  listeners.clear();
}
