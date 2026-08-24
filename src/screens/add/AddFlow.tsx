import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { BillStep, type BillStepValue } from './steps/BillStep';
import { DevicesStep } from './steps/DevicesStep';
import { UsageStep } from './steps/UsageStep';
import { ResultStep } from './steps/ResultStep';
import { calculateBreakdown, type CalcResult, type DeviceCorrection, type DeviceUsage } from '../../lib/calc';
import { learnDeviceCorrections, type HistoricalBillSample } from '../../lib/learnCalibration';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import { supabase } from '../../lib/supabaseClient';
import { Button } from '../../components/ui/button';
import './AddFlow.css';

const OTHER_DEVICE_NAME = 'Diğer / Bilinmeyen Tüketim';
const HISTORY_WINDOW = 12; // how many past bills feed the learned calibration

const STEP_LABELS = ['Fatura', 'Cihazlar', 'Kullanım', 'Sonuç'];

export function AddFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const prevStepRef = useRef(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [bill, setBill] = useState<BillStepValue>({ billTl: 0, ratePerKwh: 3.5 });
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

  function goToStep(next: number) {
    setDirection(next > step ? 'forward' : 'back');
    prevStepRef.current = step;
    setStep(next);
    setFurthest((f) => Math.max(f, next));
  }

  function toggleDevice(key: string) {
    setSelectedDevices((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const [usageByKey, setUsageByKey] = useState<Map<string, DeviceUsage>>(new Map());
  const [deviceOverrides, setDeviceOverrides] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    async function loadOverrides() {
      const { data } = await supabase.from('user_devices').select('device_key, watt').eq('is_custom', false);
      const overrides = new Map<string, number>();
      for (const row of data ?? []) {
        if (row.device_key) overrides.set(row.device_key, row.watt);
      }
      setDeviceOverrides(overrides);
    }
    loadOverrides();
  }, []);

  const [billHistory, setBillHistory] = useState<HistoricalBillSample[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      const { data: bills } = await supabase
        .from('bills')
        .select('id, total_tl, rate_tl_per_kwh')
        .order('period_month', { ascending: false })
        .limit(HISTORY_WINDOW);

      if (!bills || bills.length === 0) {
        setHistoryLoaded(true);
        return;
      }

      const { data: items } = await supabase
        .from('bill_items')
        .select('bill_id, device_key, watt, hours_per_week')
        .in(
          'bill_id',
          bills.map((b) => b.id)
        );

      const itemsByBill = new Map<string, { key: string; watt: number; hoursPerWeek: number }[]>();
      for (const row of items ?? []) {
        if (!row.device_key) continue; // skip the "other/unknown" pseudo-row from earlier bills
        const list = itemsByBill.get(row.bill_id) ?? [];
        list.push({ key: row.device_key, watt: row.watt, hoursPerWeek: row.hours_per_week });
        itemsByBill.set(row.bill_id, list);
      }

      setBillHistory(
        bills.map((b) => ({
          ratePerKwh: b.rate_tl_per_kwh,
          billTl: b.total_tl,
          items: itemsByBill.get(b.id) ?? [],
        }))
      );
      setHistoryLoaded(true);
    }
    loadHistory();
  }, []);

  const [corrections, setCorrections] = useState<DeviceCorrection[]>([]);
  const [learning, setLearning] = useState(false);
  const learnedRef = useRef(false);

  useEffect(() => {
    if (step !== 3 || !historyLoaded || learnedRef.current) return;
    learnedRef.current = true;

    if (billHistory.length === 0) {
      setCorrections([]);
      return;
    }

    setLearning(true);
    const timer = setTimeout(() => {
      setCorrections(learnDeviceCorrections(billHistory));
      setLearning(false);
    }, 550);
    return () => clearTimeout(timer);
  }, [step, historyLoaded, billHistory]);

  function updateUsage(key: string, patch: Partial<DeviceUsage>) {
    setUsageByKey((prev) => {
      const next = new Map(prev);
      const catalogEntry = DEVICE_CATALOG.find((d) => d.key === key)!;
      const defaultWatt = deviceOverrides.get(key) ?? catalogEntry.defaultWatt;
      const current = next.get(key) ?? { key, watt: defaultWatt, hoursPerWeek: 0 };
      next.set(key, { ...current, ...patch });
      return next;
    });
  }

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Best-effort: asks Claude for a short savings tip about the priciest device and stores it on
  // the bill once ready. Never blocks or fails the save — a missing tip just means no tip shown.
  async function generateTip(billId: string, result: CalcResult, devices: DeviceUsage[]) {
    const top = [...result.items].filter((it) => it.calibratedTl > 0).sort((a, b) => b.calibratedTl - a.calibratedTl)[0];
    if (!top) return;

    const catalogEntry = DEVICE_CATALOG.find((d) => d.key === top.key);
    const usage = devices.find((d) => d.key === top.key);
    if (!catalogEntry || !usage) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-tip`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        deviceName: catalogEntry.name,
        watt: usage.watt,
        hoursPerWeek: usage.hoursPerWeek,
        calibratedTl: top.calibratedTl,
        pctShare: top.pctShare,
      }),
    });
    if (!res.ok) return;
    const json = await res.json();
    if (!json.tip) return;

    await supabase.from('bills').update({ ai_tip: json.tip }).eq('id', billId);
  }

  async function saveBill() {
    setSaving(true);
    setSaveError(null);

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setSaveError('Oturum bulunamadı, tekrar giriş yap.');
      setSaving(false);
      return;
    }

    const devices = Array.from(usageByKey.values());
    const result = calculateBreakdown(devices, { billTl: bill.billTl, ratePerKwh: bill.ratePerKwh }, corrections);
    const periodMonth = new Date();
    periodMonth.setDate(1);

    const { data: billRow, error: billError } = await supabase
      .from('bills')
      .insert({
        user_id: userId,
        period_month: periodMonth.toISOString().slice(0, 10),
        total_tl: bill.billTl,
        rate_tl_per_kwh: bill.ratePerKwh,
      })
      .select()
      .single();

    if (billError || !billRow) {
      setSaveError('Fatura kaydedilemedi, tekrar dene.');
      setSaving(false);
      return;
    }

    const catalogByKey = new Map(DEVICE_CATALOG.map((d) => [d.key, d]));
    const itemRows: {
      bill_id: string;
      device_key: string | null;
      device_name: string;
      watt: number;
      hours_per_week: number;
      monthly_kwh_raw: number;
      calibrated_tl: number;
      pct_share: number;
    }[] = result.items.map((item) => ({
      bill_id: billRow.id,
      device_key: item.key,
      device_name: catalogByKey.get(item.key)?.name ?? item.key,
      watt: devices.find((d) => d.key === item.key)!.watt,
      hours_per_week: devices.find((d) => d.key === item.key)!.hoursPerWeek,
      monthly_kwh_raw: item.monthlyKwhRaw,
      calibrated_tl: item.calibratedTl,
      pct_share: item.pctShare,
    }));

    if (result.otherTl > 1) {
      itemRows.push({
        bill_id: billRow.id,
        device_key: null,
        device_name: OTHER_DEVICE_NAME,
        watt: 0,
        hours_per_week: 0,
        monthly_kwh_raw: result.otherKwh,
        calibrated_tl: result.otherTl,
        pct_share: result.otherPct,
      });
    }

    const { error: itemsError } = await supabase.from('bill_items').insert(itemRows);

    if (itemsError) {
      setSaving(false);
      setSaveError('Cihaz kırılımı kaydedilemedi, tekrar dene.');
      return;
    }

    // Remember any watt values the user edited so the next Add flow starts from them.
    const overrideRows = devices
      .filter((d) => d.watt !== (deviceOverrides.get(d.key) ?? catalogByKey.get(d.key)?.defaultWatt))
      .map((d) => ({ user_id: userId, device_key: d.key, watt: d.watt, is_custom: false }));

    if (overrideRows.length > 0) {
      await supabase.from('user_devices').upsert(overrideRows, { onConflict: 'user_id,device_key' });
    }

    generateTip(billRow.id, result, devices).catch(() => {});

    setSaving(false);
    setSaved(true);
    setTimeout(() => navigate('/'), 1100);
  }

  if (saved) {
    return (
      <div className="add-shell add-success">
        <div className="add-success-icon">
          <CheckCircle2 size={56} strokeWidth={1.6} />
        </div>
        <h2 className="display">Fatura kaydedildi</h2>
        <p className="add-success-sub">Ana sayfana yönlendiriliyorsun...</p>
      </div>
    );
  }

  return (
    <div className="add-shell">
      <p aria-live="polite" className="sr-only">
        {`Adım ${step + 1} / ${STEP_LABELS.length}: ${STEP_LABELS[step]}`}
      </p>
      <div className="add-progress-head">
        <span className="add-progress-label">{STEP_LABELS[step]}</span>
        <span className="add-progress-count mono">{step + 1} / {STEP_LABELS.length}</span>
      </div>
      <div
        className="add-progress"
        role="tablist"
        aria-label="Adımlar"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            const next = Math.min(step + 1, furthest);
            if (next !== step) goToStep(next);
          } else if (e.key === 'ArrowLeft' && step > 0) {
            goToStep(step - 1);
          }
        }}
      >
        {STEP_LABELS.map((label, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === step}
            aria-label={`Adım ${i + 1}: ${label}`}
            disabled={i > furthest}
            className={i < step ? 'done' : i === step ? 'active' : ''}
            onClick={() => i !== step && goToStep(i)}
          />
        ))}
      </div>
      <div className="add-card">
        <div key={step} className={'add-step-anim ' + (direction === 'forward' ? 'from-right' : 'from-left')}>
          {step === 0 && <BillStep value={bill} onChange={setBill} />}
          {step === 1 && <DevicesStep selected={selectedDevices} onToggle={toggleDevice} />}
          {step === 2 && (
            <UsageStep
              selectedKeys={selectedDevices}
              usageByKey={usageByKey}
              overridesByKey={deviceOverrides}
              onChange={updateUsage}
            />
          )}
          {step === 3 && (
            <ResultStep
              billTl={bill.billTl}
              ratePerKwh={bill.ratePerKwh}
              devices={Array.from(usageByKey.values())}
              corrections={corrections}
              learning={learning}
              selectedKeys={selectedDevices}
              onAddDevice={(key) => {
                toggleDevice(key);
                goToStep(1);
              }}
            />
          )}
        </div>
      </div>
      <div className="add-row-btns">
        {step > 0 ? (
          <Button type="button" variant="outline" size="lg" className="h-12 flex-none" onClick={() => goToStep(step - 1)}>
            Geri
          </Button>
        ) : (
          <Button type="button" variant="outline" size="lg" className="h-12 flex-none" onClick={() => navigate('/')}>
            İptal
          </Button>
        )}
        {step < STEP_LABELS.length - 1 ? (
          <Button
            type="button"
            size="lg"
            className="h-12 flex-1 text-base"
            disabled={(step === 0 && bill.billTl <= 0) || (step === 1 && selectedDevices.size === 0)}
            onClick={() => goToStep(step + 1)}
          >
            Devam et
          </Button>
        ) : (
          <Button type="button" size="lg" className="h-12 flex-1 text-base" disabled={saving} onClick={saveBill}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        )}
      </div>
      {saveError && <p className="form-error">{saveError}</p>}
    </div>
  );
}
