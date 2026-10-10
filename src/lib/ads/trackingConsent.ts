import { AdMob } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

/**
 * iOS App Tracking Transparency, in two steps: our own explainer screen
 * (TrackingPrePrompt) first, then Apple's one-shot system dialog. Apple only
 * ever shows the system dialog once, so the explainer is where we earn the
 * "Allow". It has a single "Devam" button on purpose: the system dialog is
 * always shown next and is the only place the user actually decides, which is
 * what App Review expects from a pre-prompt.
 */

type AttStatus = 'authorized' | 'denied' | 'notDetermined' | 'restricted';

export interface TrackingDeps {
  isIos: () => boolean;
  getStatus: () => Promise<AttStatus>;
  requestSystemPrompt: () => Promise<void>;
  /** Resolves once the user has read the explainer and tapped "Devam". */
  showExplainer: () => Promise<void>;
}

const realDeps = (showExplainer: () => Promise<void>): TrackingDeps => ({
  isIos: () => Capacitor.getPlatform() === 'ios',
  getStatus: async () => (await AdMob.trackingAuthorizationStatus()).status,
  requestSystemPrompt: () => AdMob.requestTrackingAuthorization(),
  showExplainer,
});

/**
 * No-op everywhere except iOS with an undetermined status. Never throws:
 * failing to ask must not block ads (or the rest of the app) from starting.
 */
export async function ensureTrackingDecision(deps: TrackingDeps): Promise<void> {
  try {
    if (!deps.isIos()) return;
    if ((await deps.getStatus()) !== 'notDetermined') return;
    await deps.showExplainer();
    await deps.requestSystemPrompt();
  } catch (err) {
    console.error('ads: izleme izni akışı tamamlanamadı', err);
  }
}

// ---- Bridge between the ad bootstrap and the React explainer -------------

let pending: (() => void) | null = null;
const listeners = new Set<(open: boolean) => void>();

function emit(open: boolean) {
  listeners.forEach((l) => l(open));
}

/** Subscribed to by <TrackingPrePrompt>; fires true when it should show. */
export function subscribeTrackingExplainer(cb: (open: boolean) => void): () => void {
  listeners.add(cb);
  // The bootstrap may have asked before the component mounted.
  if (pending) cb(true);
  return () => { listeners.delete(cb); };
}

/** Called by <TrackingPrePrompt> when the user taps "Devam". */
export function acknowledgeTrackingExplainer(): void {
  const resolve = pending;
  pending = null;
  emit(false);
  resolve?.();
}

let explainerPromise: Promise<void> | null = null;

// Shared, so a second concurrent caller waits on the same tap instead of
// overwriting (and orphaning) the first caller's resolver.
function showExplainerUi(): Promise<void> {
  if (!explainerPromise) {
    explainerPromise = new Promise<void>((resolve) => {
      pending = () => {
        explainerPromise = null;
        resolve();
      };
      emit(true);
    });
  }
  return explainerPromise;
}

export function requestTrackingConsent(): Promise<void> {
  return ensureTrackingDecision(realDeps(showExplainerUi));
}
