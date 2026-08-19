import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BillStep, type BillStepValue } from './steps/BillStep';
import { DevicesStep } from './steps/DevicesStep';
import { UsageStep } from './steps/UsageStep';
import { ResultStep } from './steps/ResultStep';
import { calculateBreakdown, type DeviceUsage } from '../../lib/calc';
import { DEVICE_CATALOG } from '../../data/deviceCatalog';
import { supabase } from '../../lib/supabaseClient';
import './AddFlow.css';

const STEP_LABELS = ['Fatura', 'Cihazlar', 'Kullanım', 'Sonuç'];

export function AddFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [bill, setBill] = useState<BillStepValue>({ billTl: 0, ratePerKwh: 3.5 });
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());

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
    const result = calculateBreakdown(devices, { billTl: bill.billTl, ratePerKwh: bill.ratePerKwh });
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
    const itemRows = result.items.map((item) => ({
      bill_id: billRow.id,
      device_key: item.key,
      device_name: catalogByKey.get(item.key)?.name ?? item.key,
      watt: devices.find((d) => d.key === item.key)!.watt,
      hours_per_week: devices.find((d) => d.key === item.key)!.hoursPerWeek,
      monthly_kwh_raw: item.monthlyKwhRaw,
      calibrated_tl: item.calibratedTl,
      pct_share: item.pctShare,
    }));

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

    setSaving(false);
    navigate('/');
  }

  return (
    <div className="add-shell">
      <div className="add-progress">
        {STEP_LABELS.map((_, i) => (
          <i key={i} className={i < step ? 'done' : i === step ? 'active' : ''} />
        ))}
      </div>
      <div className="add-card">
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
          <ResultStep billTl={bill.billTl} ratePerKwh={bill.ratePerKwh} devices={Array.from(usageByKey.values())} />
        )}
      </div>
      <div className="add-row-btns">
        {step > 0 ? (
          <button className="add-btn add-btn-ghost" onClick={() => setStep(step - 1)}>Geri</button>
        ) : (
          <button className="add-btn add-btn-ghost" onClick={() => navigate('/')}>İptal</button>
        )}
        {step < STEP_LABELS.length - 1 ? (
          <button
            className="add-btn add-btn-primary"
            disabled={(step === 0 && bill.billTl <= 0) || (step === 1 && selectedDevices.size === 0)}
            onClick={() => setStep(step + 1)}
          >
            Devam et
          </button>
        ) : (
          <button className="add-btn add-btn-primary" disabled={saving} onClick={saveBill}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        )}
      </div>
      {saveError && <p className="login-error">{saveError}</p>}
    </div>
  );
}
