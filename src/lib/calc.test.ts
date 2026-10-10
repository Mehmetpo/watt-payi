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

  it('keeps an unknown share even when entered hours overshoot the bill', () => {
    const result = calculateBreakdown(
      [
        { key: 'heater', watt: 1500, hoursPerWeek: 40 },
        { key: 'fridge', watt: 130, hoursPerWeek: 168 },
      ],
      { billTl: 1000, ratePerKwh: 3.5 }
    );

    const sumTl = result.items.reduce((sum, item) => sum + item.calibratedTl, 0) + result.otherTl;
    expect(sumTl).toBeCloseTo(1000, 6);
    expect(result.otherPct).toBeCloseTo(5, 6);
    expect(result.items[0].calibratedTl).toBeGreaterThan(result.items[1].calibratedTl);
  });

  it('prices kWh at the all-in rate when the bill kWh is known', () => {
    // 1000 TL for 250 kWh => 4 TL/kWh paid, even though the printed unit price is 2.5.
    const result = calculateBreakdown([{ key: 'tv', watt: 100, hoursPerWeek: 10 }], {
      billTl: 1000,
      ratePerKwh: 2.5,
      kwh: 250,
    });
    expect(result.effectiveRate).toBeCloseTo(4, 6);
    expect(result.impliedKwh).toBe(250);
    expect(result.items[0].calibratedTl).toBeCloseTo(((100 / 1000) * 10 * 4.345) * 4, 6);
    expect(result.items[0].calibratedTl + result.otherTl).toBeCloseTo(1000 - 0, 0);
  });

  it('applies the duty cycle to compressor appliances', () => {
    const always = calculateBreakdown([{ key: 'fridge', watt: 150, hoursPerWeek: 168 }], { billTl: 2000, ratePerKwh: 4 });
    const raw = (150 / 1000) * 168 * 4.345;
    expect(always.items[0].monthlyKwhRaw).toBeCloseTo(raw * 0.35, 6);
  });

  it('scales usage by the billing period length', () => {
    const month = calculateBreakdown([{ key: 'tv', watt: 100, hoursPerWeek: 10 }], { billTl: 1000, ratePerKwh: 4 });
    const short = calculateBreakdown([{ key: 'tv', watt: 100, hoursPerWeek: 10 }], { billTl: 1000, ratePerKwh: 4, periodDays: 28 });
    expect(short.items[0].monthlyKwhRaw / month.items[0].monthlyKwhRaw).toBeCloseTo(4 / 4.345, 5);
  });
});
