import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileX2, WifiOff, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { BillBreakdown } from '../../components/BillBreakdown';
import { BillBreakdownSkeleton } from '../../components/BillBreakdownSkeleton';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import { formatPeriod } from '../../lib/format';
import { shareBillBreakdown } from '../../lib/shareBill';
import { Card, CardContent } from '../../components/ui/card';
import type { BillItem } from '../../types/domain';
import './HistoryScreen.css';

export function HistoryDetailScreen() {
  const { billId } = useParams<{ billId: string }>();
  const [periodMonth, setPeriodMonth] = useState<string | null>(null);
  const [totalTl, setTotalTl] = useState(0);
  const [items, setItems] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!billId) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const { data: bill, error: billError } = await supabase
        .from('bills')
        .select('total_tl, period_month')
        .eq('id', billId)
        .single();

      if (billError) {
        // PGRST116 = no row matched .single(): the bill doesn't exist (or isn't
        // this user's), which is a "not found" state, not a fetch failure.
        if (billError.code === 'PGRST116') {
          setNotFound(true);
          return;
        }
        throw billError;
      }
      setTotalTl(bill.total_tl);
      setPeriodMonth(bill.period_month);

      const { data: billItems, error: itemsError } = await supabase
        .from('bill_items')
        .select('id, device_key, device_name, watt, hours_per_week, monthly_kwh_raw, calibrated_tl, pct_share')
        .eq('bill_id', billId);

      if (itemsError) throw itemsError;

      setItems(
        (billItems ?? []).map((row) => ({
          id: row.id,
          deviceKey: row.device_key,
          deviceName: row.device_name,
          watt: row.watt,
          hoursPerWeek: row.hours_per_week,
          monthlyKwhRaw: row.monthly_kwh_raw,
          calibratedTl: row.calibrated_tl,
          pctShare: row.pct_share,
        }))
      );
    } catch (err) {
      console.error('HistoryDetailScreen: fatura detayı yüklenemedi', err);
      setError('Fatura yüklenemedi. Bağlantını kontrol edip tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, [billId]);

  useEffect(() => {
    load();
  }, [load]);

  const iconByKey = (key: string | null) => (key ? DEVICE_CATALOG.find((d) => d.key === key)?.iconKey ?? 'other' : 'other');

  return (
    <div className="history-shell">
      <div className="history-detail-topbar">
        <Link to="/history" className="history-back">
          <ArrowLeft size={15} strokeWidth={1.8} /> Geçmiş
        </Link>
        {!loading && !error && !notFound && (
          <button
            type="button"
            className="history-share-btn"
            aria-label="Paylaş"
            onClick={() => shareBillBreakdown(periodMonth ? formatPeriod(periodMonth) : 'Bu ayki', totalTl, items)}
          >
            <Share2 size={16} strokeWidth={1.8} />
          </button>
        )}
      </div>
      <Card>
        <CardContent>
          {loading ? (
            <BillBreakdownSkeleton />
          ) : error ? (
            <div className="history-empty history-state-in">
              <div className="empty-icon-badge history-error-icon">
                <WifiOff size={26} strokeWidth={1.6} />
              </div>
              <p>{error}</p>
              <button type="button" className="history-retry-btn" onClick={load}>
                Tekrar dene
              </button>
            </div>
          ) : notFound ? (
            <div className="history-empty history-state-in">
              <div className="empty-icon-badge">
                <FileX2 size={26} strokeWidth={1.6} />
              </div>
              <p>Bu fatura bulunamadı.</p>
              <Link to="/history">Geçmişe dön</Link>
            </div>
          ) : (
            <BillBreakdown totalTl={totalTl} items={items} iconKeyFor={iconByKey} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
