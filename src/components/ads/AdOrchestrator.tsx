import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from '../../contexts/AuthContext';
import {
  initAds,
  showBanner,
  teardownBanner,
  onBannerHeightChange,
  getReservedBannerHeightPx,
  requestInterstitial,
  maybeShowAppOpen,
  markWarmStart,
} from '../../lib/ads';

/** Publishes the banner's height for CSS (nav lift + screen bottom padding). */
function setBannerSpace(px: number) {
  document.documentElement.style.setProperty('--ad-banner-height', `${px}px`);
  document.body.classList.toggle('has-ad-banner', px > 0);
}

/**
 * Headless. Lives as a sibling of the route-keyed <div> in App.tsx so it
 * persists across navigations. Owns the single, app-wide AdMob banner and
 * wires resume + route-change events to the ad controller.
 *
 * The banner is shown once per login and stays up on every screen. It must
 * NOT be tied to a screen's mount: hiding/showing it on navigation made the
 * bottom nav slide down and back up (and reloaded the ad) on every route
 * change.
 */
export function AdOrchestrator() {
  const { session } = useAuth();
  const location = useLocation();
  const userId = session?.user?.id ?? null;

  // Reserve the banner's space *before* first paint. The native banner view is
  // layered over the WebView and never resizes it, and the SDK only reports its
  // height after the ad loads — so reacting to onBannerHeightChange alone would
  // leave the banner covering the nav through the fill latency, then slide the
  // nav up. Layout effect: the nav and every screen's bottom padding already
  // include the space on the first frame, so nothing animates on login.
  useLayoutEffect(() => {
    if (!userId || !Capacitor.isNativePlatform()) return;
    setBannerSpace(getReservedBannerHeightPx());
    return () => setBannerSpace(0);
  }, [userId]);

  // Boot ads once the user is logged in, then keep the banner up until logout.
  // initAds() is idempotent and promise-cached; it resolves only after UMP
  // consent and AdMob.initialize, and the banner is shown strictly after it
  // (the plugin caches its banner parent view on the first initialize()).
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const removeListener = onBannerHeightChange(setBannerSpace);
    void initAds().then(() => (cancelled ? undefined : showBanner()));
    return () => {
      cancelled = true;
      removeListener();
      void teardownBanner();
    };
  }, [userId]);

  // Resume → app-open ad. Skip the very first appStateChange (see spec);
  // use it only to leave cold-start.
  useEffect(() => {
    if (!userId) return;
    let firstFire = true;
    const handle = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return;
      if (firstFire) {
        firstFire = false;
        markWarmStart();
        return;
      }
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
