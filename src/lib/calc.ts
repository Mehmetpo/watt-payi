export interface DeviceUsage {
  key: string;
  watt: number;
  hoursPerWeek: number;
}

export interface BillCalibration {
  billTl: number;
  ratePerKwh: number;
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
}

const WEEKS_PER_MONTH = 4.345;

export function monthlyKwh(device: DeviceUsage): number {
  return (device.watt / 1000) * device.hoursPerWeek * WEEKS_PER_MONTH;
}

/**
 * Splits a bill across the selected devices. When the tracked devices only explain part of the
 * bill (calcRatio < 1), each device is valued directly at the real rate and the remainder is left
 * as untracked "other" consumption rather than force-distributed — when they imply more than the
 * whole bill (hours were likely overestimated), everything is scaled down proportionally instead,
 * since "other" can't go negative.
 */
export function calculateBreakdown(
  devices: DeviceUsage[],
  bill: BillCalibration,
  corrections: DeviceCorrection[] = []
): CalcResult {
  const factorByKey = new Map(corrections.map((c) => [c.key, c.factor]));

  const rows = devices.map((d) => {
    const factor = factorByKey.get(d.key) ?? 1;
    const kwhRaw = monthlyKwh(d);
    return { key: d.key, kwhRaw, kwhAdjusted: kwhRaw * factor, factor };
  });

  const totalAdjKwh = rows.reduce((sum, r) => sum + r.kwhAdjusted, 0);
  const impliedKwh = bill.ratePerKwh > 0 ? bill.billTl / bill.ratePerKwh : 0;
  const calcRatio = impliedKwh > 0 ? totalAdjKwh / impliedKwh : 0;

  let items: DeviceShare[];
  let otherTl = 0;

  if (bill.billTl <= 0) {
    items = rows.map((r) => ({
      key: r.key,
      monthlyKwhRaw: r.kwhAdjusted,
      calibratedTl: 0,
      pctShare: 0,
      correctionFactor: r.factor,
    }));
  } else if (totalAdjKwh <= impliedKwh) {
    items = rows.map((r) => {
      const tl = r.kwhAdjusted * bill.ratePerKwh;
      return {
        key: r.key,
        monthlyKwhRaw: r.kwhAdjusted,
        calibratedTl: tl,
        pctShare: (tl / bill.billTl) * 100,
        correctionFactor: r.factor,
      };
    });
    otherTl = bill.billTl - items.reduce((sum, it) => sum + it.calibratedTl, 0);
  } else {
    items = rows.map((r) => {
      const share = totalAdjKwh > 0 ? r.kwhAdjusted / totalAdjKwh : 0;
      const tl = share * bill.billTl;
      return {
        key: r.key,
        monthlyKwhRaw: r.kwhAdjusted,
        calibratedTl: tl,
        pctShare: share * 100,
        correctionFactor: r.factor,
      };
    });
  }

  const otherKwh = bill.ratePerKwh > 0 ? otherTl / bill.ratePerKwh : 0;
  const otherPct = bill.billTl > 0 ? (otherTl / bill.billTl) * 100 : 0;

  return { items, otherKwh, otherTl, otherPct, totalRawKwh: totalAdjKwh, impliedKwh, calcRatio };
}
