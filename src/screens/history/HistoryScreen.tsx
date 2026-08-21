import { useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { FileClock } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { detectRisingDevices, type BillWithItems } from '../../lib/trends';
import { Skeleton } from '../../components/ui/skeleton';
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
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
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

      {loading ? (
        <div className="history-list">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="history-row-skeleton" />
          ))}
        </div>
      ) : bills.length === 0 ? (
        <div className="history-empty">
          <div className="empty-icon-badge">
            <FileClock size={26} strokeWidth={1.6} />
          </div>
          <p>Henüz geçmiş fatura yok.</p>
          <Link to="/add">+ İlk faturanı ekle</Link>
        </div>
      ) : (
        <div className="history-list">
          {(() => {
            const maxTotal = Math.max(...bills.map((b) => b.total_tl));
            return bills.map((bill, i) => {
              const prev = bills[i + 1];
              const delta = prev ? ((bill.total_tl - prev.total_tl) / prev.total_tl) * 100 : null;
              return (
                <Link
                  key={bill.id}
                  to={`/history/${bill.id}`}
                  className="history-row"
                  style={{ '--i': i } as CSSProperties}
                >
                  <div
                    className="history-row-bar"
                    style={{ transform: `scaleX(${Math.max(0.04, bill.total_tl / maxTotal)})` }}
                  />
                  <div className="history-row-content">
                    <span className="month">{formatPeriod(bill.period_month)}</span>
                    <div className="history-row-right">
                      {delta !== null && (
                        <span className={'history-delta' + (delta > 0 ? ' up' : '')}>
                          {delta <= 0 ? '↓' : '↑'} %{Math.abs(delta).toFixed(0)}
                        </span>
                      )}
                      <span className="amount mono">{Math.round(bill.total_tl).toLocaleString('tr-TR')} TL</span>
                    </div>
                  </div>
                </Link>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
