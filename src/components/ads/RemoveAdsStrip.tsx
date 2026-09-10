import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  getPendingRemoveAdsPrompt,
  isRemoveAdsStripDismissed,
  dismissRemoveAdsStrip,
  isAdFree,
  onEntitlementChange,
} from '../../lib/ads';
import { RemoveAdsSheet } from './RemoveAdsSheet';
import './RemoveAdsStrip.css';

export function RemoveAdsStrip() {
  const [visible, setVisible] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const dismissed = await isRemoveAdsStripDismissed();
      if (alive) setVisible(getPendingRemoveAdsPrompt() && !isAdFree() && !dismissed);
    })();
    const off = onEntitlementChange((adFree) => { if (adFree) setVisible(false); });
    return () => { alive = false; off(); };
  }, []);

  if (!visible) return null;

  return (
    <>
      <div className="remove-ads-strip" role="note">
        <Sparkles size={18} strokeWidth={1.8} className="remove-ads-strip-icon" />
        <p>Reklamlar rahatsız edici mi? Tek seferlik ödemeyle tamamen kaldır.</p>
        <button type="button" className="remove-ads-strip-cta" onClick={() => setSheetOpen(true)}>
          Kaldır
        </button>
        <button
          type="button"
          className="remove-ads-strip-dismiss"
          aria-label="Kapat"
          onClick={() => { void dismissRemoveAdsStrip(); setVisible(false); }}
        >
          <X size={16} strokeWidth={2} />
        </button>
      </div>
      {sheetOpen && <RemoveAdsSheet onClose={() => setSheetOpen(false)} />}
    </>
  );
}
