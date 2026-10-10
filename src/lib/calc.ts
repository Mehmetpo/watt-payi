export interface DeviceUsage {
  key: string;
  watt: number;
  hoursPerWeek: number;
}

export interface BillCalibration {
  billTl: number;
  /** Rate printed on the bill. Only used to infer kWh when `kwh` is unknown. */
  ratePerKwh: number;
  /** Real consumption from the bill. Preferred: makes the TL/kWh rate all-in (taxes + fees included). */
  kwh?: number;
  /** Length of the billing period; defaults to an average month. */
  periodDays?: number;
}

export interface DeviceCorrection {
  key: string;
  factor: number;
  confidence: number;
}

export interface DeviceShare {
  key: string;
  monthlyKwhRaw: number;
  calibratedTl: number;
  pctShare: number;
  correctionFactor: number;
}

export interface CalcResult {
  items: DeviceShare[];
  otherKwh: number;
  otherTl: number;
  otherPct: number;
  totalRawKwh: number;
  impliedKwh: number;
  calcRatio: number;
  /** TL per kWh actually paid (bill total / bill kWh). */
  effectiveRate: number;
}

export const WEEKS_PER_MONTH = 4.345;

/** Share of every bill always kept as "unknown": standby, chargers, bulbs and anything not listed. */
export const OTHER_RESERVE = 0.05;

/**
 * Compressor/thermostat devices draw their rated watts only part of the time they are "on", so
 * 168 h/week × nameplate watts would overstate them by 2-3×. Everything else is assumed to run at
 * rated power for the hours the user enters.
 */
const DUTY_CYCLE: Record<string, number> = {
  fridge: 0.35,
  freezer: 0.4,
  minifridge: 0.4,
  ac: 0.6,
  waterdispenser: 0.3,
  waterheatertank: 0.4,
  dehumidifier: 0.6,
  spaceheater: 0.7,
  electricblanket: 0.5,
  aquarium: 0.5,
};

export function dutyCycle(key: string): number {
  return DUTY_CYCLE[key] ?? 1;
}

/** Billing periods outside ~3-6 weeks are almost certainly an OCR/typing slip, so fall back to a month. */
export function weeksInPeriod(periodDays?: number): number {
  return periodDays && periodDays >= 20 && periodDays <= 45 ? periodDays / 7 : WEEKS_PER_MONTH;
}

export function monthlyKwh(device: DeviceUsage): number {
  return (device.watt / 1000) * device.hoursPerWeek * WEEKS_PER_MONTH;
}

/** kWh a device really consumes over the billing period (duty cycle + period length applied). */
export function deviceKwh(device: DeviceUsage, weeks: number = WEEKS_PER_MONTH): number {
  return (device.watt / 1000) * device.hoursPerWeek * dutyCycle(device.key) * weeks;
}

/**
 * Splits a bill across the selected devices, working in kWh and converting to TL at the rate the
 * household actually paid. Whatever the tracked devices don't explain is the "other" slice; it never
 * shrinks below OTHER_RESERVE of the bill, because some consumption is always untracked — if the
 * entered hours imply more than the rest of the bill, devices are scaled down proportionally.
 */
export function calculateBreakdown(
  devices: DeviceUsage[],
  bill: BillCalibration,
  corrections: DeviceCorrection[] = []
): CalcResult {
  const factorByKey = new Map(corrections.map((c) => [c.key, c.factor]));
  const weeks = weeksInPeriod(bill.periodDays);

  const rows = devices.map((d) => {
    const factor = factorByKey.get(d.key) ?? 1;
    const kwhRaw = deviceKwh(d, weeks);
    return { key: d.key, kwhAdjusted: kwhRaw * factor, factor };
  });

  const totalAdjKwh = rows.reduce((sum, r) => sum + r.kwhAdjusted, 0);

  const billKwh =
    bill.kwh && bill.kwh > 0 ? bill.kwh : bill.ratePerKwh > 0 ? bill.billTl / bill.ratePerKwh : 0;
  const effectiveRate = billKwh > 0 && bill.billTl > 0 ? bill.billTl / billKwh : 0;
  const calcRatio = billKwh > 0 ? totalAdjKwh / billKwh : 0;

  if (bill.billTl <= 0 || billKwh <= 0) {
    return {
      items: rows.map((r) => ({
        key: r.key,
        monthlyKwhRaw: r.kwhAdjusted,
        calibratedTl: 0,
        pctShare: 0,
        correctionFactor: r.factor,
      })),
      otherKwh: 0,
      otherTl: 0,
      otherPct: 0,
      totalRawKwh: totalAdjKwh,
      impliedKwh: billKwh,
      calcRatio,
      effectiveRate,
    };
  }

  const cap = billKwh * (1 - OTHER_RESERVE);
  const scale = totalAdjKwh > cap ? cap / totalAdjKwh : 1;

  const items = rows.map((r) => {
    const kwh = r.kwhAdjusted * scale;
    const tl = kwh * effectiveRate;
    return {
      key: r.key,
      monthlyKwhRaw: kwh,
      calibratedTl: tl,
      pctShare: (tl / bill.billTl) * 100,
      correctionFactor: r.factor,
    };
  });

  const otherKwh = Math.max(0, billKwh - totalAdjKwh * scale);
  const otherTl = otherKwh * effectiveRate;
  const otherPct = (otherTl / bill.billTl) * 100;

  return { items, otherKwh, otherTl, otherPct, totalRawKwh: totalAdjKwh, impliedKwh: billKwh, calcRatio, effectiveRate };
}
