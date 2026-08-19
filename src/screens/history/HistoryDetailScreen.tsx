import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { BillBreakdown } from '../../components/BillBreakdown';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import type { BillItem } from '../../types/domain';
import './HistoryScreen.css';

export function HistoryDetailScreen() {
  const { billId } = useParams<{ billId: string }>();
  const [totalTl, setTotalTl] = useState(0);
  const [items, setItems] = useState<BillItem[]>([]);

  useEffect(() => {
    async function load() {
      if (!billId) return;
      const { data: bill } = await supabase.from('bills').select('total_tl').eq('id', billId).single();
      if (bill) setTotalTl(bill.total_tl);

      const { data: billItems } = await supabase
        .from('bill_items')
        .select('id, device_key, device_name, watt, hours_per_week, monthly_kwh_raw, calibrated_tl, pct_share')
        .eq('bill_id', billId);

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
    load();
  }, [billId]);

  const iconByKey = (key: string | null) => DEVICE_CATALOG.find((d) => d.key === key)?.iconKey ?? 'lighting';

  return (
    <div className="history-shell">
      <Link to="/history" className="history-back">← Geçmiş</Link>
      <div className="home-card" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 16, padding: '1.5rem' }}>
        <BillBreakdown totalTl={totalTl} items={items} iconKeyFor={iconByKey} />
      </div>
    </div>
  );
}
