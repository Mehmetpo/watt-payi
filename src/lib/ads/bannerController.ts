/**
 * Owns the one native AdMob banner for the whole app session and reconciles
 * it against a single "does the current screen want a banner" flag.
 *
 * Why a state machine instead of show/hide per Home mount: the plugin's
 * calls and events are all async and race each other —
 *  - a second showBanner() on Android only reloads the ad and never makes the
 *    hidden (GONE) layout visible again, so after leaving Home once the nav
 *    was lifted over an empty gap;
 *  - on iOS an ad that finishes loading *after* hideBanner() is attached
 *    visible anyway, so leaving Home before the fill landed left the banner
 *    covering the bottom nav on other screens;
 *  - the height-0 SizeChanged that hideBanner() emits can arrive after a
 *    quick return to Home and dropped the nav back under the banner;
 *  - initAds().then(showBanner) fired even when Home had already unmounted.
 * So: create the banner once, toggle it with hide/resume after that, ignore
 * height-0 size events (failure is signalled separately), re-hide a banner
 * that loads while unwanted, and serialise every native call.
 */
export interface BannerNative {
  /** Create + load the banner. */
  show(): Promise<void>;
  /** Make an existing, hidden banner visible again. */
  resume(): Promise<void>;
  hide(): Promise<void>;
  onSize(cb: (heightPx: number) => void): void;
  onLoaded(cb: () => void): void;
  onFailed(cb: () => void): void;
}

export interface BannerControllerOptions {
  /** Resolves once AdMob is initialised; no native call happens before it. */
  ready: () => Promise<void>;
  /** Height to reserve before the SDK reports the real one. */
  reservedHeightPx: () => number;
  /** Space (px) the bottom nav must clear right now; 0 = no banner. */
  onSpace: (px: number) => void;
  /** A real banner height the SDK reported (for caching). */
  onHeight: (px: number) => void;
}

type Phase = 'none' | 'loading' | 'loaded';

export function createBannerController(native: BannerNative, opts: BannerControllerOptions) {
  let wanted = false;
  let phase: Phase = 'none';
  // Whether the native view is (or will be, once loaded) on screen.
  let visible = false;
  let heightPx = 0;
  // The last load attempt failed: stop reserving space until we retry.
  let failed = false;
  let lastSpace = -1;
  let queue: Promise<void> = Promise.resolve();

  function publish() {
    // Reserve from the cached height *before* the ad paints: the native view
    // is layered over the WebView and never resizes it, so waiting for the
    // SDK's SizeChanged would leave the banner over the nav for the whole
    // fill latency.
    let px = 0;
    if (wanted && !failed) {
      px = phase === 'loaded' && heightPx > 0 ? heightPx : opts.reservedHeightPx();
    }
    if (px !== lastSpace) {
      lastSpace = px;
      opts.onSpace(px);
    }
  }

  async function reconcile() {
    await opts.ready();
    if (wanted) {
      if (phase === 'none') {
        phase = 'loading';
        visible = true;
        try {
          await native.show();
        } catch (err) {
          console.error('ads: banner gösterilemedi', err);
          phase = 'none';
          failed = true;
          visible = false;
          publish();
        }
      } else if (!visible) {
        visible = true;
        try {
          await native.resume();
        } catch {
          // iOS rejects resume until the first ad has loaded; the view is
          // attached visible on load anyway (see onLoaded).
        }
      }
    } else if (phase !== 'none' && visible) {
      visible = false;
      try {
        await native.hide();
      } catch (err) {
        console.error('ads: banner gizlenemedi', err);
      }
    }
  }

  function schedule() {
    queue = queue.then(reconcile, reconcile);
  }

  native.onSize((h) => {
    if (h <= 0) return;
    heightPx = h;
    opts.onHeight(h);
    publish();
  });

  native.onLoaded(() => {
    phase = 'loaded';
    // A load always leaves the view attached and visible on iOS, even if
    // hide() already ran while it was still loading.
    visible = true;
    publish();
    if (!wanted) schedule();
  });

  native.onFailed(() => {
    // The plugin destroys the view on a failed load; next want recreates it.
    phase = 'none';
    visible = false;
    failed = true;
    publish();
  });

  return {
    setWanted(next: boolean) {
      if (wanted === next) return;
      wanted = next;
      if (next) failed = false;
      publish();
      schedule();
    },
  };
}
