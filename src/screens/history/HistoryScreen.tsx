import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { FileClock, WifiOff } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { detectRisingDevices, type BillWithItems } from '../../lib/trends';
import { summarizeBills } from '../../lib/billStats';
import { useI18n } from '../../i18n/I18nContext';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/EmptyState';
import './HistoryScreen.css';

interface BillRow {
  id: string;
  period_month: string;
  total_tl: number;
}

export function HistoryScreen() {
  const { t, number, percent, period, deviceName } = useI18n();
  const [bills, setBills] = useState<BillRow[]>([]);
  const [rising, setRising] = useState<{ deviceName: string; months: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: billRows, error: billsError } = await supabase
        .from('bills')
        .select('id, period_month, total_tl')
        .order('period_month', { ascending: false });

      if (billsError) throw billsError;

      setBills(billRows ?? []);

      if (billRows && billRows.length >= 3) {
        const { data: itemRows, error: itemsError } = await supabase
          .from('bill_items')
          .select('bill_id, device_key, device_name, calibrated_tl')
          .in('bill_id', billRows.map((b) => b.id));

        if (itemsError) throw itemsError;

        const billsWithItems: BillWithItems[] = billRows.map((b) => ({
          periodMonth: b.period_month,
          items: (itemRows ?? [])
            .filter((i) => i.bill_id === b.id)
            .map((i) => ({ deviceKey: i.device_key, deviceName: deviceName(i.device_key, i.device_name), calibratedTl: i.calibrated_tl })),
        }));

        setRising(detectRisingDevices(billsWithItems));
      } else {
        setRising([]);
      }
    } catch (err) {
      console.error('HistoryScreen: geçmiş faturalar yüklenemedi', err);
      setError(t('history.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, deviceName]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = summarizeBills(bills);

  return (
    <div className="history-shell">
      <h1 className="display history-in" style={{ '--i': 0 } as CSSProperties}>{t('history.title')}</h1>

      {!loading && !error && summary && (
        <div className="history-summary history-in" style={{ '--i': 1 } as CSSProperties}>
          <div className="history-summary-cell">
            <span className="history-summary-label">{t('history.average')}</span>
            <span className="history-summary-value mono">{number(summary.averageTl)} TL</span>
          </div>
          <div className="history-summary-cell">
            <span className="history-summary-label">{t('history.highest')}</span>
            <span className="history-summary-value mono">{number(summary.highestTl)} TL</span>
          </div>
          <div className="history-summary-cell">
            <span className="history-summary-label">{t('history.lowest')}</span>
            <span className="history-summary-value mono">{number(summary.lowestTl)} TL</span>
          </div>
        </div>
      )}

      {rising.length > 0 && (
        <div className="history-insight history-in" style={{ '--i': 2 } as CSSProperties}>
          {rising.map((r) => t('history.rising', { name: r.deviceName, months: r.months })).join(' · ')}
        </div>
      )}

      {loading ? (
        <div className="history-list">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="history-row-skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="history-empty history-state-in">
          <div className="empty-icon-badge history-error-icon">
            <WifiOff size={26} strokeWidth={1.6} />
          </div>
          <p>{error}</p>
          <button type="button" className="history-retry-btn" onClick={load}>
            {t('history.retry')}
          </button>
        </div>
      ) : bills.length === 0 ? (
        <div className="history-empty history-state-in">
          <EmptyState
            icon={<FileClock size={26} strokeWidth={1.6} />}
            message={t('history.emptyMessage')}
            actionTo="/add"
            actionLabel={t('history.emptyAction')}
          />
        </div>
      ) : (
        <div className="history-list">
          {(() => {
            const maxTotal = Math.max(...bills.map((b) => b.total_tl));
            const showBars = bills.length >= 2;
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
                  {showBars && (
                    <div
                      className="history-row-bar"
                      style={{ transform: `scaleX(${Math.max(0.04, bill.total_tl / maxTotal)})` }}
                    />
                  )}
                  <div className="history-row-content">
                    <span className="month">{period(bill.period_month)}</span>
                    <div className="history-row-right">
                      {delta !== null && (
                        <span className={'history-delta' + (delta > 0 ? ' up' : '')}>
                          {delta <= 0 ? '↓' : '↑'} {percent(Math.abs(delta).toFixed(0))}
                        </span>
                      )}
                      <span className="amount mono">{number(Math.round(bill.total_tl))} TL</span>
                    </div>
                  </div>
                </Link>
              );
            });
          })()}
        </div>
      )}

      {!loading && !error && bills.length >= 1 && bills.length < 3 && (
        <Link to="/add" className="history-nudge history-state-in">
          <span>{t('history.nudge')}</span>
          <span className="history-nudge-cta">{t('history.nudgeCta')}</span>
        </Link>
      )}
    </div>
  );
}
