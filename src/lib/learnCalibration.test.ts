import { describe, it, expect } from 'vitest';
import { calculateBreakdown } from './calc';
import { learnDeviceCorrections, type HistoricalBillSample } from './learnCalibration';

const RATE = 3.5;
const DEVICES = [
  { key: 'heater', watt: 2000, hoursPerWeek: 10 }, // ≈ 304 TL at 3.5 ₺/kWh
  { key: 'fridge', watt: 130, hoursPerWeek: 168 }, // ≈ 332 TL — together ≈ 64 % of a 1000 TL bill
];

function sample(billTl: number): HistoricalBillSample {
  return { ratePerKwh: RATE, billTl, items: DEVICES.map((d) => ({ ...d })) };
}

describe('learnDeviceCorrections', () => {
  it('returns no corrections for an empty history', () => {
    expect(learnDeviceCorrections([])).toEqual([]);
  });

  it('keeps the "Diğer / Bilinmeyen" remainder when tracked devices only explain part of every bill', () => {
    // Every past bill is ~36 % unexplained. That is untracked consumption (lighting, chargers,
    // standby…), not proof the devices are under-estimated — learning must not inflate the factors
    // until the unknown slice vanishes from the breakdown.
    const history = Array.from({ length: 8 }, () => sample(1000));
    const corrections = learnDeviceCorrections(history);

    const result = calculateBreakdown(DEVICES, { billTl: 1000, ratePerKwh: RATE }, corrections);

    expect(result.otherTl).toBeGreaterThan(1);
    expect(result.otherPct).toBeGreaterThan(25);
  });

  it('still shrinks devices that over-explain the bill, but leaves room for unknown consumption', () => {
    // 600 TL bills vs ≈ 636 TL of tracked devices: the hours were overestimated.
    const history = Array.from({ length: 6 }, () => sample(600));
    const corrections = learnDeviceCorrections(history);

    expect(corrections.every((c) => c.factor < 1)).toBe(true);

    const result = calculateBreakdown(DEVICES, { billTl: 600, ratePerKwh: RATE }, corrections);
    expect(result.otherTl).toBeGreaterThan(1);
  });

  it('keeps an "unknown" slice across a growing history (the regression)', () => {
    for (const n of [1, 2, 4, 8, 12]) {
      const corrections = learnDeviceCorrections(Array.from({ length: n }, () => sample(1000)));
      const result = calculateBreakdown(DEVICES, { billTl: 1000, ratePerKwh: RATE }, corrections);
      expect(result.otherTl, `history length ${n}`).toBeGreaterThan(1);
    }
  });
});
