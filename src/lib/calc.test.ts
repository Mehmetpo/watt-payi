import { describe, it, expect } from 'vitest';
import { monthlyKwh, calculateBreakdown } from './calc';

describe('monthlyKwh', () => {
  it('converts watt + hours/week into kWh/month using 4.345 weeks/month', () => {
    const result = monthlyKwh({ key: 'fridge', watt: 130, hoursPerWeek: 168 });
    expect(result).toBeCloseTo(94.8948, 4);
  });
});

describe('calculateBreakdown', () => {
  it('returns empty items and zero ratio when there are no devices', () => {
    const result = calculateBreakdown([], { billTl: 1000, ratePerKwh: 3.5 });
    expect(result.items).toEqual([]);
    expect(result.totalRawKwh).toBe(0);
    expect(result.calcRatio).toBe(0);
    expect(result.impliedKwh).toBeCloseTo(285.7142857, 4);
  });

  it('guards against a zero rate instead of dividing by zero', () => {
    const result = calculateBreakdown(
      [{ key: 'fridge', watt: 130, hoursPerWeek: 168 }],
      { billTl: 1000, ratePerKwh: 0 }
    );
    expect(result.impliedKwh).toBe(0);
  });

  it('allocates the full bill amount proportionally across devices', () => {
    const result = calculateBreakdown(
      [
        { key: 'fridge', watt: 130, hoursPerWeek: 168 },
        { key: 'toaster', watt: 800, hoursPerWeek: 1 },
      ],
      { billTl: 1000, ratePerKwh: 3.5 }
    );

    const sumTl = result.items.reduce((sum, item) => sum + item.calibratedTl, 0);
    const sumPct = result.items.reduce((sum, item) => sum + item.pctShare, 0);

    expect(sumTl).toBeCloseTo(1000, 6);
    expect(sumPct).toBeCloseTo(100, 6);
    expect(result.items[0].calibratedTl).toBeGreaterThan(result.items[1].calibratedTl);
  });
});
