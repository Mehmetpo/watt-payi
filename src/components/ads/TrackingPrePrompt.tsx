import { useEffect, useState } from 'react';
import { Check, X, ShieldCheck } from 'lucide-react';
import {
  subscribeTrackingExplainer,
  acknowledgeTrackingExplainer,
} from '../../lib/ads/trackingConsent';
import './TrackingPrePrompt.css';

// Structure (Can / Can't lists + one primary action) follows the "Permission
// Grant" pattern from 21st.dev, rebuilt on this app's tokens and lucide icons.
const CAN = [
  'Sana daha alakalı reklamlar gösterilmesine yardımcı olur.',
  'Uygulamayı ücretsiz tutan reklam gelirini destekler.',
];
const CANT = [
  'Fatura, cihaz veya tüketim verilerine erişmez.',
  'Reddedersen uygulama aynı şekilde çalışır; yalnızca reklamlar daha az kişisel olur.',
];

/** Rendered by AdOrchestrator; opens only when the ad bootstrap asks for it. */
export function TrackingPrePrompt() {
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
        <h2 id="att-title" className="att-title">Reklam deneyimini kişiselleştir</h2>
        <p id="att-desc" className="att-desc">
          Devam edince iOS sana izin sorusunu gösterecek. Seçim tamamen senin.
        </p>

        <div className="att-panel">
          <p className="att-label">Ne sağlar</p>
          <ul className="att-list">
            {CAN.map((t) => (
              <li key={t}><Check size={16} className="att-yes" aria-hidden="true" />{t}</li>
            ))}
          </ul>
          <p className="att-label">Ne yapmaz</p>
          <ul className="att-list">
            {CANT.map((t) => (
              <li key={t}><X size={16} className="att-no" aria-hidden="true" />{t}</li>
            ))}
          </ul>
        </div>

        <button type="button" className="att-btn" onClick={acknowledgeTrackingExplainer} autoFocus>
          Devam
        </button>
      </section>
    </div>
  );
}
