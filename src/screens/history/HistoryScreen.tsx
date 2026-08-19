import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { detectRisingDevices, type BillWithItems } from '../../lib/trends';
import './HistoryScreen.css';

interface BillRow {
  id: string;
  period_month: string;
  total_tl: number;
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function formatPeriod(iso: string) {
  const d = new Date(iso);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export function HistoryScreen() {
  const [bills, setBills] = useState<BillRow[]>([]);
  const [rising, setRising] = useState<{ deviceName: string; months: number }[]>([]);

  useEffect(() => {
    async function load() {
      const { data: billRows } = await supabase
        .from('bills')
        .select('id, period_month, total_tl')
        .order('period_month', { ascending: false });

      setBills(billRows ?? []);

      if (billRows && billRows.length >= 3) {
        const { data: itemRows } = await supabase
          .from('bill_items')
          .select('bill_id, device_key, device_name, calibrated_tl')
          .in('bill_id', billRows.map((b) => b.id));

        const billsWithItems: BillWithItems[] = billRows.map((b) => ({
          periodMonth: b.period_month,
          items: (itemRows ?? [])
            .filter((i) => i.bill_id === b.id)
            .map((i) => ({ deviceKey: i.device_key, deviceName: i.device_name, calibratedTl: i.calibrated_tl })),
        }));

        setRising(detectRisingDevices(billsWithItems));
      }
    }
    load();
  }, []);

  return (
    <div className="history-shell">
      <h1 className="display">Geçmiş</h1>

      {rising.length > 0 && (
        <div className="history-insight">
          {rising.map((r) => `${r.deviceName} ${r.months} aydır artıyor`).join(' · ')}
        </div>
      )}

      <div className="history-list">
        {bills.map((bill) => (
          <Link key={bill.id} to={`/history/${bill.id}`} className="history-row">
            <span className="month">{formatPeriod(bill.period_month)}</span>
            <span className="amount mono">{Math.round(bill.total_tl).toLocaleString('tr-TR')} TL</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
