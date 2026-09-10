import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, TriangleAlert } from 'lucide-react';
import { Button } from '../ui/button';
import {
  purchaseAdFree,
  restorePurchases,
  getAdFreePriceString,
  type PurchaseOutcome,
} from '../../lib/ads';
import './RemoveAdsSheet.css';

type Phase = 'idle' | 'buying' | 'restoring' | PurchaseOutcome | 'restored-none';

const PRICE_FALLBACK = '₺500';

export function RemoveAdsSheet({ onClose }: { onClose: () => void }) {
  const [price, setPrice] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  useEffect(() => {
    let alive = true;
    getAdFreePriceString().then((p) => { if (alive) setPrice(p); });
    return () => { alive = false; };
  }, []);

  const busy = phase === 'buying' || phase === 'restoring';

  async function buy() {
    setPhase('buying');
    const outcome = await purchaseAdFree();
    if (outcome === 'cancelled') { setPhase('idle'); return; }
    setPhase(outcome);
    if (outcome === 'success') setTimeout(onClose, 1400);
  }

  async function restore() {
    setPhase('restoring');
    const ok = await restorePurchases();
    if (ok) {
      setPhase('success');
      setTimeout(onClose, 1400);
    } else {
      setPhase('restored-none');
    }
  }

  return (
    <div
      className="remove-ads-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Reklamları kaldır"
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div className="remove-ads-sheet">
        <h2>Reklamları kaldır</h2>
        <p>
          Tek seferlik <span className="remove-ads-price">{price ?? PRICE_FALLBACK}</span> ödeme ile
          banner, geçiş ve açılış reklamlarının tamamı bu hesap için kalıcı olarak kapanır.
        </p>

        {phase === 'success' && (
          <p className="remove-ads-result ok">
            <CheckCircle2 size={16} strokeWidth={1.8} /> Teşekkürler, reklamlar kapatıldı.
          </p>
        )}
        {phase === 'pending' && (
          <p className="remove-ads-result pending">
            <Clock size={16} strokeWidth={1.8} /> İşlem beklemede — onaylandığında reklamlar otomatik kapanacak.
          </p>
        )}
        {phase === 'error' && (
          <p className="remove-ads-result err">
            <TriangleAlert size={16} strokeWidth={1.8} /> Satın alma tamamlanamadı. Lütfen tekrar dene.
          </p>
        )}
        {phase === 'restored-none' && (
          <p className="remove-ads-result err">
            <TriangleAlert size={16} strokeWidth={1.8} /> Bu hesapta geri yüklenecek bir satın alma bulunamadı.
          </p>
        )}

        <div className="remove-ads-actions">
          <Button size="lg" className="h-12 text-base" onClick={buy} disabled={busy || phase === 'success'}>
            {phase === 'buying' ? 'İşleniyor…' : `Satın al · ${price ?? PRICE_FALLBACK}`}
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-12 text-base"
            onClick={restore}
            disabled={busy || phase === 'success'}
          >
            {phase === 'restoring' ? 'Kontrol ediliyor…' : 'Satın alımları geri yükle'}
          </Button>
        </div>
      </div>
    </div>
  );
}
