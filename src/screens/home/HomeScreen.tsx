import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { BillBreakdown } from '../../components/BillBreakdown';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import type { Bill, BillItem } from '../../types/domain';
import './HomeScreen.css';

export function HomeScreen() {
  const [latestBill, setLatestBill] = useState<Bill | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [previousTotal, setPreviousTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: bills } = await supabase
        .from('bills')
        .select('id, period_month, total_tl, rate_tl_per_kwh, photo_url')
        .order('period_month', { ascending: false })
        .limit(2);

      if (bills && bills.length > 0) {
        const [latest, previous] = bills;
        setLatestBill({
          id: latest.id,
          periodMonth: latest.period_month,
          totalTl: latest.total_tl,
          rateTlPerKwh: latest.rate_tl_per_kwh,
          photoUrl: latest.photo_url,
        });
        setPreviousTotal(previous ? previous.total_tl : null);

        const { data: billItems } = await supabase
          .from('bill_items')
          .select('id, device_key, device_name, watt, hours_per_week, monthly_kwh_raw, calibrated_tl, pct_share')
          .eq('bill_id', latest.id);

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
      }
      setLoading(false);
    }
    load();
  }, []);

  const iconByKey = (key: string | null) => DEVICE_CATALOG.find((d) => d.key === key)?.iconKey ?? 'lighting';

  if (loading) return null;

  if (!latestBill) {
    return (
      <div className="home-shell">
        <div className="home-empty">
          <p>Henüz bir fatura eklemedin.</p>
          <Link to="/add">+ İlk faturanı ekle</Link>
        </div>
      </div>
    );
  }

  const delta = previousTotal ? ((latestBill.totalTl - previousTotal) / previousTotal) * 100 : null;

  return (
    <div className="home-shell">
      <div className="home-header">
        <h1 className="display">Bu Ay</h1>
        {delta !== null && (
          <span className={'home-delta ' + (delta <= 0 ? 'down' : 'up')}>
            {delta <= 0 ? '↓' : '↑'} %{Math.abs(delta).toFixed(0)}
          </span>
        )}
      </div>
      <div className="home-card">
        <BillBreakdown totalTl={latestBill.totalTl} items={items} iconKeyFor={iconByKey} />
      </div>
    </div>
  );
}
