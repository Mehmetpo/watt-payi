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
