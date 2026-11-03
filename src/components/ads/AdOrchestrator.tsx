import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from '../../contexts/AuthContext';
import {
  initAds,
  setBannerWanted,
  requestInterstitial,
  maybeShowAppOpen,
  markWarmStart,
} from '../../lib/ads';

/**
 * Headless. Lives as a sibling of the route-keyed <div> in App.tsx so it
 * persists across navigations. Owns the single, app-wide AdMob banner and
 * wires resume + route-change events to the ad controller.
 *
 * The banner is wanted for the whole signed-in session and stays up on every
 * screen. It must NOT be tied to a screen's mount: hiding/showing it on
 * navigation made the bottom nav slide down and back up (and reloaded the ad)
 * on every route change.
 */
export function AdOrchestrator() {
  const { session } = useAuth();
  const location = useLocation();
  const userId = session?.user?.id ?? null;

  // Layout effect so the banner's cached height is reserved (--ad-banner-height)
  // before first paint: the nav and every screen's bottom padding already
  // include the space on the first frame, so nothing animates on login. The
  // controller itself waits for initAds() before touching the native banner.
  useLayoutEffect(() => {
    if (!userId) return;
    setBannerWanted(true);
    return () => setBannerWanted(false);
  }, [userId]);

  // Boot ads once the user is logged in (idempotent, promise-cached) so
  // interstitials / app-open work independently of the banner.
  useEffect(() => {
    if (!userId) return;
    void initAds();
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
