import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BillStep, type BillStepValue } from './steps/BillStep';
import { DevicesStep } from './steps/DevicesStep';
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
