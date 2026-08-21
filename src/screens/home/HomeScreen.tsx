import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Lightbulb } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { BillBreakdown } from '../../components/BillBreakdown';
import { compareDeviceSpending, type DeviceDeltaResult } from '../../lib/deviceDelta';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import { Card, CardContent } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import type { Bill, BillItem } from '../../types/domain';
import './HomeScreen.css';

export function HomeScreen() {
  const [latestBill, setLatestBill] = useState<Bill | null>(null);
  const [items, setItems] = useState<BillItem[]>([]);
  const [previousTotal, setPreviousTotal] = useState<number | null>(null);
  const [deviceDelta, setDeviceDelta] = useState<DeviceDeltaResult | null>(null);
  const [aiTip, setAiTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: bills } = await supabase
        .from('bills')
        .select('id, period_month, total_tl, rate_tl_per_kwh, photo_url, ai_tip')
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
        setAiTip(latest.ai_tip ?? null);

        const { data: billItems } = await supabase
          .from('bill_items')
          .select('id, bill_id, device_key, device_name, watt, hours_per_week, monthly_kwh_raw, calibrated_tl, pct_share')
          .in('bill_id', previous ? [latest.id, previous.id] : [latest.id]);

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
                .map((row) => ({ key: row.device_key!, name: row.device_name, tl: row.calibrated_tl })),
              previousItems
                .filter((row) => row.device_key)
                .map((row) => ({ key: row.device_key!, name: row.device_name, tl: row.calibrated_tl }))
            )
          );
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const iconByKey = (key: string | null) => (key ? DEVICE_CATALOG.find((d) => d.key === key)?.iconKey ?? 'other' : 'other');

  const delta =
    latestBill && previousTotal ? ((latestBill.totalTl - previousTotal) / previousTotal) * 100 : null;

  return (
    <div className="home-shell">
      <div className="home-hero">
        <div className="home-header">
          <h1 className="display">Bu Ay</h1>
          {delta !== null && (
            <span className="home-delta">
              {delta <= 0 ? '↓' : '↑'} %{Math.abs(delta).toFixed(0)}
            </span>
          )}
        </div>
      </div>

      <div className="home-card-wrap">
        {loading ? (
          <Card>
            <CardContent className="home-skeleton">
              <div className="home-skeleton-summary">
                <Skeleton className="home-skeleton-donut" />
                <Skeleton className="home-skeleton-total" />
              </div>
              <div className="home-skeleton-rows">
                {[0, 1, 2].map((i) => (
                  <div className="home-skeleton-row" key={i}>
                    <Skeleton className="home-skeleton-icon" />
                    <div className="home-skeleton-row-text">
                      <Skeleton className="home-skeleton-line" />
                      <Skeleton className="home-skeleton-line short" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : !latestBill ? (
          <Card className="home-card-anim">
            <CardContent className="home-empty">
              <div className="empty-icon-badge">
                <Zap size={26} strokeWidth={1.6} />
              </div>
              <p>Henüz bir fatura eklemedin.</p>
              <Link to="/add">+ İlk faturanı ekle</Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="home-card-anim">
              <CardContent>
                <BillBreakdown totalTl={latestBill.totalTl} items={items} iconKeyFor={iconByKey} />
                {deviceDelta && (deviceDelta.increased || deviceDelta.decreased) && (
                  <div className="home-device-delta">
                    {deviceDelta.increased && (
                      <span className="up">
                        ↑ {deviceDelta.increased.name} önceki aydan {Math.round(deviceDelta.increased.deltaTl)} TL daha fazla geldi
                      </span>
                    )}
                    {deviceDelta.decreased && (
                      <span className="down">
                        ↓ {deviceDelta.decreased.name} önceki aydan {Math.round(Math.abs(deviceDelta.decreased.deltaTl))} TL daha az geldi
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
