import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BillStep, type BillStepValue } from './steps/BillStep';
import { DevicesStep } from './steps/DevicesStep';
import { UsageStep } from './steps/UsageStep';
import type { DeviceUsage } from '../../lib/calc';
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
      </div>
      <div className="add-row-btns">
        {step > 0 ? (
          <button className="add-btn add-btn-ghost" onClick={() => setStep(step - 1)}>Geri</button>
        ) : (
          <button className="add-btn add-btn-ghost" onClick={() => navigate('/')}>İptal</button>
        )}
        <button
          className="add-btn add-btn-primary"
          disabled={(step === 0 && bill.billTl <= 0) || (step === 1 && selectedDevices.size === 0)}
          onClick={() => setStep(Math.min(step + 1, STEP_LABELS.length - 1))}
        >
          Devam et
        </button>
      </div>
    </div>
  );
}
