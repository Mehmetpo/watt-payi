import { useState } from 'react';
import { captureBillPhoto, extractBillFromPhoto } from '../../../lib/billExtraction';

export interface BillStepValue {
  billTl: number;
  ratePerKwh: number;
}

export interface BillStepProps {
  value: BillStepValue;
  onChange: (value: BillStepValue) => void;
}

export function BillStep({ value, onChange }: BillStepProps) {
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

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
      }
    } catch {
      setReadError('Fotoğraf işlenemedi, elle girebilir misin?');
    } finally {
      setReading(false);
    }
  }

  return (
    <div>
      <button type="button" className="add-photo-btn" onClick={handleCapture} disabled={reading}>
        {reading ? 'Okunuyor...' : '📷 Fatura fotoğrafı çek'}
      </button>
      {readError && <p className="login-error">{readError}</p>}
      <div className="add-field">
        <label htmlFor="billTl">Aylık fatura tutarı</label>
        <div className="add-amount">
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
      </div>
      <div className="add-field">
        <label htmlFor="rate">Birim fiyat</label>
        <div className="add-amount">
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
      </div>
    </div>
  );
}
