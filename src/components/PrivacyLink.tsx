import { privacyPolicyUrlFor } from '../lib/legal';
import { useI18n } from '../i18n/I18nContext';
import './PrivacyLink.css';

// A plain https anchor: Capacitor's WebView hands target="_blank" https links
// to the system browser, so the SPA itself is never navigated away.
export function PrivacyLink() {
  const { t, lang } = useI18n();
  const url = privacyPolicyUrlFor(lang);
  if (!url) return null;
  return (
    <a className="privacy-link" href={url} target="_blank" rel="noopener noreferrer">
      {t('common.privacyPolicy')}
    </a>
  );
}
