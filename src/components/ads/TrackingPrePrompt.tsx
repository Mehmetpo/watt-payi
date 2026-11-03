import { useEffect, useState } from 'react';
import { Check, X, ShieldCheck } from 'lucide-react';
import {
  subscribeTrackingExplainer,
  acknowledgeTrackingExplainer,
} from '../../lib/ads/trackingConsent';
import { useI18n } from '../../i18n/I18nContext';
import './TrackingPrePrompt.css';

// Structure (Can / Can't lists + one primary action) follows the "Permission
// Grant" pattern from 21st.dev, rebuilt on this app's tokens and lucide icons.
const CAN = ['att.can1', 'att.can2'];
const CANT = ['att.cant1', 'att.cant2'];

/** Rendered by AdOrchestrator; opens only when the ad bootstrap asks for it. */
export function TrackingPrePrompt() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => subscribeTrackingExplainer(setOpen), []);

  if (!open) return null;

  return (
    <div className="att-backdrop" role="presentation">
      <section
        className="att-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="att-title"
        aria-describedby="att-desc"
      >
        <span className="att-icon" aria-hidden="true"><ShieldCheck size={20} /></span>
        <h2 id="att-title" className="att-title">{t('att.title')}</h2>
        <p id="att-desc" className="att-desc">
          {t('att.desc')}
        </p>

        <div className="att-panel">
          <p className="att-label">{t('att.can')}</p>
          <ul className="att-list">
            {CAN.map((k) => (
              <li key={k}><Check size={16} className="att-yes" aria-hidden="true" />{t(k)}</li>
            ))}
          </ul>
          <p className="att-label">{t('att.cant')}</p>
          <ul className="att-list">
            {CANT.map((k) => (
              <li key={k}><X size={16} className="att-no" aria-hidden="true" />{t(k)}</li>
            ))}
          </ul>
        </div>

        <button type="button" className="att-btn" onClick={acknowledgeTrackingExplainer} autoFocus>
          {t('att.continue')}
        </button>
      </section>
    </div>
  );
}
