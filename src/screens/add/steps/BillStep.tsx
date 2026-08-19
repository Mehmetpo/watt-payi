export interface BillStepValue {
  billTl: number;
  ratePerKwh: number;
}

export interface BillStepProps {
  value: BillStepValue;
  onChange: (value: BillStepValue) => void;
}

export function BillStep({ value, onChange }: BillStepProps) {
  return (
    <div>
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
