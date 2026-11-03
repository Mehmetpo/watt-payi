import { PRIVACY_POLICY_URL } from '../lib/legal';
import { useI18n } from '../i18n/I18nContext';
import './PrivacyLink.css';

// A plain https anchor: Capacitor's WebView hands target="_blank" https links
// to the system browser, so the SPA itself is never navigated away.
export function PrivacyLink() {
  const { t } = useI18n();
  if (!PRIVACY_POLICY_URL) return null;
  return (
    <a className="privacy-link" href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">
      {t('common.privacyPolicy')}
    </a>
  );
}
