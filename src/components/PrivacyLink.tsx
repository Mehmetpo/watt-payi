import { PRIVACY_POLICY_URL } from '../lib/legal';
import './PrivacyLink.css';

// A plain https anchor: Capacitor's WebView hands target="_blank" https links
// to the system browser, so the SPA itself is never navigated away.
export function PrivacyLink() {
  if (!PRIVACY_POLICY_URL) return null;
  return (
    <a className="privacy-link" href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
      Gizlilik Politikası
    </a>
  );
}
