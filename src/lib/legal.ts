// The App Store / Play listing must point at a public https URL. Set
// VITE_PRIVACY_POLICY_URL to wherever public/gizlilik.html is deployed.
//
// Only an https URL is accepted: inside the native WebView a relative path
// (e.g. /gizlilik.html) would load capacitor://localhost with no way back, so
// native builds without a valid URL show no link rather than a broken one.
// The dev server (plain browser) may still use the bundled copy.
const configured = (import.meta.env.VITE_PRIVACY_POLICY_URL ?? '').trim();

export const PRIVACY_POLICY_URL: string | null = /^https:\/\//i.test(configured)
  ? configured
  : import.meta.env.DEV
    ? '/gizlilik.html'
    : null;
