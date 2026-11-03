import { useCallback, useEffect, useState } from 'react';
import { Zap, Lightbulb, WifiOff, TriangleAlert, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { BillBreakdown } from '../../components/BillBreakdown';
import { BillBreakdownSkeleton } from '../../components/BillBreakdownSkeleton';
import { compareDeviceSpending, type DeviceDeltaResult } from '../../lib/deviceDelta';
import { useCountUp } from '../../hooks/useCountUp';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import { useI18n } from '../../i18n/I18nContext';
import { shareBillBreakdown } from '../../lib/shareBill';
import { Card, CardContent } from '../../components/ui/card';
import { EmptyState } from '../../components/EmptyState';
import type { Bill, BillItem } from '../../types/domain';
import './HomeScreen.css';

export function HomeScreen() {
  const { t, lang, number, percent, period, deviceName } = useI18n();
  const [latestBill, setLatestBill] = useState<Bill | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [previousTotal, setPreviousTotal] = useState<number | null>(null);
  const [deviceDelta, setDeviceDelta] = useState<DeviceDeltaResult | null>(null);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [budgetTl, setBudgetTl] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: profile } = await supabase.from('profiles').select('budget_tl').single();
      setBudgetTl(profile?.budget_tl ?? null);

      const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('id, period_month, total_tl, rate_tl_per_kwh, photo_url, ai_tip')
        .order('period_month', { ascending: false })
        .limit(2);

      if (billsError) throw billsError;

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
        setAiTip(latest.ai_tip ?? null);

        const { data: billItems, error: itemsError } = await supabase
          .from('bill_items')
          .select('id, bill_id, device_key, device_name, watt, hours_per_week, monthly_kwh_raw, calibrated_tl, pct_share')
          .in('bill_id', previous ? [latest.id, previous.id] : [latest.id]);

        if (itemsError) throw itemsError;

        const latestItems = (billItems ?? []).filter((row) => row.bill_id === latest.id);
        setItems(
          latestItems.map((row) => ({
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

        if (previous) {
          const previousItems = (billItems ?? []).filter((row) => row.bill_id === previous.id);
          setDeviceDelta(
            compareDeviceSpending(
              latestItems
                .filter((row) => row.device_key)
                .map((row) => ({ key: row.device_key!, name: deviceName(row.device_key, row.device_name), tl: row.calibrated_tl })),
              previousItems
                .filter((row) => row.device_key)
                .map((row) => ({ key: row.device_key!, name: deviceName(row.device_key, row.device_name), tl: row.calibrated_tl }))
            )
          );
        } else {
          setDeviceDelta(null);
        }
      } else {
        setLatestBill(null);
      }
    } catch (err) {
      console.error('HomeScreen: fatura verileri yüklenemedi', err);
      setError(t('home.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t, deviceName]);

  useEffect(() => {
    load();
  }, [load]);

  const iconByKey = (key: string | null) => (key ? DEVICE_CATALOG.find((d) => d.key === key)?.iconKey ?? 'other' : 'other');

  const delta =
    latestBill && previousTotal ? ((latestBill.totalTl - previousTotal) / previousTotal) * 100 : null;
  const heroTotal = useCountUp(latestBill ? Math.round(latestBill.totalTl) : 0);

  return (
    <div className="home-shell">
      <div className="home-hero">
        <div className="home-hero-glow" aria-hidden="true" />
        <span className="home-eyebrow">
          {latestBill ? period(latestBill.periodMonth) : t('home.thisMonth')}
        </span>
        {loading ? (
          <div className="home-hero-skeleton" aria-hidden="true" />
        ) : latestBill ? (
          <>
            <div className="home-hero-row">
              <div className="home-hero-total mono">
                {number(heroTotal)}
                <span>TL</span>
              </div>
              {delta !== null && (
                <span className={'home-delta' + (delta <= 0 ? ' down' : ' up')}>
                  {delta <= 0 ? '↓' : '↑'} {percent(Math.abs(delta).toFixed(0))}
                </span>
              )}
            </div>
            {latestBill.rateTlPerKwh != null && (
              <span className="home-hero-sub mono">
                {t('home.unitPrice', { rate: number(latestBill.rateTlPerKwh, { maximumFractionDigits: 2 }) })}
              </span>
            )}
          </>
        ) : (
          <h1 className="display home-hero-empty-title">Watt Payı</h1>
        )}
      </div>

      <div className="home-card-wrap">
        {loading ? (
          <Card>
            <CardContent>
              <BillBreakdownSkeleton />
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="home-card-anim">
            <CardContent className="home-empty">
              <div className="empty-icon-badge home-error-icon">
                <WifiOff size={26} strokeWidth={1.6} />
              </div>
              <p>{error}</p>
              <button type="button" className="home-retry-btn" onClick={load}>
                {t('home.retry')}
              </button>
            </CardContent>
          </Card>
        ) : !latestBill ? (
          <Card className="home-card-anim">
            <CardContent className="home-empty">
              <EmptyState
                icon={<Zap size={26} strokeWidth={1.6} />}
                message={t('home.emptyMessage')}
                actionTo="/add"
                actionLabel={t('home.emptyAction')}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {budgetTl !== null && (
              <Card
                className={
                  'home-card-anim home-budget-card home-budget-' +
                  (latestBill.totalTl >= budgetTl ? 'over' : latestBill.totalTl >= budgetTl * 0.8 ? 'warn' : 'ok')
                }
              >
                <CardContent className="home-budget">
                  <div className="home-budget-head">
                    <span className="home-budget-label">{t('home.budget')}</span>
                    <span className="home-budget-values mono">
                      {number(Math.round(latestBill.totalTl))} / {number(budgetTl)} TL
                    </span>
                  </div>
                  <div className="home-budget-track">
                    <div
                      className="home-budget-fill"
                      style={{ transform: `scaleX(${Math.min(1, latestBill.totalTl / budgetTl)})` }}
                    />
                  </div>
                  {latestBill.totalTl > budgetTl && (
                    <p className="home-budget-over-msg">
                      <TriangleAlert size={14} strokeWidth={1.8} />
                      {t('home.overBudget', { amount: Math.round(latestBill.totalTl - budgetTl) })}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
            <Card className="home-card-anim">
              <CardContent>
                <div className="home-breakdown-header">
                  <button
                    type="button"
                    className="home-share-btn"
                    aria-label={t('share.aria')}
                    onClick={() =>
                      shareBillBreakdown(
                        period(latestBill.periodMonth),
                        latestBill.totalTl,
                        items.map((it) => ({ ...it, deviceName: deviceName(it.deviceKey, it.deviceName) })),
                        lang,
                      )
                    }
                  >
                    <Share2 size={15} strokeWidth={1.8} />
                  </button>
                </div>
                <BillBreakdown totalTl={latestBill.totalTl} items={items} iconKeyFor={iconByKey} showTotal={false} />
                {deviceDelta && (deviceDelta.increased || deviceDelta.decreased) && (
                  <div className="home-device-delta">
                    {deviceDelta.increased && (
                      <span className="up">
                        {t('home.deviceUp', { name: deviceDelta.increased.name, amount: Math.round(deviceDelta.increased.deltaTl) })}
                      </span>
                    )}
                    {deviceDelta.decreased && (
                      <span className="down">
                        {t('home.deviceDown', { name: deviceDelta.decreased.name, amount: Math.round(Math.abs(deviceDelta.decreased.deltaTl)) })}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            {aiTip && (
              <Card className="home-card-anim home-tip-card">
                <CardContent className="home-tip">
                  <div className="home-tip-icon">
                    <Lightbulb size={18} strokeWidth={1.7} />
                  </div>
                  <p>{aiTip}</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
