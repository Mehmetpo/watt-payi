import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Camera, TriangleAlert } from 'lucide-react';
import { captureBillPhoto, extractBillFromPhoto } from '../../../lib/billExtraction';

export interface BillStepValue {
  billTl: number;
  ratePerKwh: number;
}

export interface BillStepProps {
  value: BillStepValue;
  onChange: (value: BillStepValue) => void;
}

// Loose plausibility bounds for a Turkish household bill, just wide enough to
// catch a fat-finger extra digit or a missed decimal without blocking real
// (if unusual) values. Never blocks saving — just a visible, dismissible nudge.
const BILL_TL_RANGE = { min: 50, max: 50000 };
const RATE_RANGE = { min: 0.5, max: 20 };

function looksOffRange(value: number, range: { min: number; max: number }) {
  return value > 0 && (value < range.min || value > range.max);
}

export function BillStep({ value, onChange }: BillStepProps) {
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [justFilled, setJustFilled] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(flashTimer.current), []);

  async function handleCapture() {
    setReadError(null);
    setReading(true);
    try {
      const photo = await captureBillPhoto();
      if (!photo) {
        setReading(false);
        return;
      }
      const extracted = await extractBillFromPhoto(photo.base64, photo.mediaType);
      onChange({
        billTl: extracted.toplam_tutar ?? value.billTl,
        ratePerKwh: extracted.birim_fiyat ?? value.ratePerKwh,
      });
      if (extracted.toplam_tutar === null) {
        setReadError('Tutarı okuyamadık, elle girebilir misin?');
      } else {
        // Briefly highlight the fields the OCR just filled in, so the win is felt, not just read.
        setJustFilled(true);
        clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setJustFilled(false), 700);
      }
    } catch {
      setReadError('Fotoğraf işlenemedi, elle girebilir misin?');
    } finally {
      setReading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className="add-photo-btn bill-in"
        style={{ '--i': 0 } as CSSProperties}
        onClick={handleCapture}
        disabled={reading}
      >
        <Camera size={18} strokeWidth={1.7} />
        {reading ? 'Okunuyor...' : 'Fatura fotoğrafı çek'}
      </button>
      {readError && <p className="form-error">{readError}</p>}
      <div className="add-field bill-in" style={{ '--i': 1 } as CSSProperties}>
        <label htmlFor="billTl">Aylık fatura tutarı</label>
        <div className={'add-amount' + (justFilled ? ' flash' : '')}>
          <input
            id="billTl"
            type="number"
            min={0}
            value={value.billTl || ''}
            onChange={(e) => onChange({ ...value, billTl: Number(e.target.value) })}
            placeholder="2000"
          />
          <span className="unit">TL</span>
        </div>
        {looksOffRange(value.billTl, BILL_TL_RANGE) && (
          <p className="add-field-warning">
            <TriangleAlert size={13} strokeWidth={2} />
            Bu tutar alışılmadık görünüyor, kontrol eder misin?
          </p>
        )}
      </div>
      <div className="add-field bill-in" style={{ '--i': 2 } as CSSProperties}>
        <label htmlFor="rate">Birim fiyat</label>
        <div className={'add-amount' + (justFilled ? ' flash' : '')}>
          <input
            id="rate"
            type="number"
            min={0.1}
            step={0.1}
            value={value.ratePerKwh || ''}
            onChange={(e) => onChange({ ...value, ratePerKwh: Number(e.target.value) })}
          />
          <span className="unit">TL / kWh</span>
        </div>
        {looksOffRange(value.ratePerKwh, RATE_RANGE) && (
          <p className="add-field-warning">
            <TriangleAlert size={13} strokeWidth={2} />
            Bu birim fiyat alışılmadık görünüyor, kontrol eder misin?
          </p>
        )}
      </div>
    </div>
  );
}
