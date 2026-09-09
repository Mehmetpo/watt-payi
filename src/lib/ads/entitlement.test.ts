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
    addCustomerInfoUpdateListener: (cb: (info: unknown) => void) => addCustomerInfoUpdateListener(cb),
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
