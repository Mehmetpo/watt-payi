import type { DeviceCorrection } from './calc';

export interface HistoricalBillSample {
  ratePerKwh: number;
  billTl: number;
  items: { key: string; watt: number; hoursPerWeek: number }[];
}

const WEEKS_PER_MONTH = 4.345;
const LAMBDA = 3; // regularization strength — pulls a device's factor back toward 1 when data is sparse
const SWEEPS = 40; // coordinate-descent passes over the whole history
const RECENCY_DECAY = 0.88; // older bills influence the fit less than recent ones
const FACTOR_MIN = 0.4;
const FACTOR_MAX = 2.5;
const MIN_OCCURRENCES_FOR_FULL_CONFIDENCE = 4;

function rawKwh(watt: number, hoursPerWeek: number): number {
  return (watt / 1000) * hoursPerWeek * WEEKS_PER_MONTH;
}

/**
 * Fits a per-device correction factor from past bills via ridge-regularized coordinate descent:
 * for each device, holding every other device's factor fixed, the factor that best explains past
 * bills has a closed form, so we sweep over all devices repeatedly until the fit settles. history
 * must be ordered newest-first so recency weighting favors the household's current habits.
 */
export function learnDeviceCorrections(history: HistoricalBillSample[]): DeviceCorrection[] {
  if (history.length === 0) return [];

  const weights = history.map((_, i) => Math.pow(RECENCY_DECAY, i));

  const contributions = history.map((bill) =>
    bill.items.map((item) => ({ key: item.key, c: rawKwh(item.watt, item.hoursPerWeek) * bill.ratePerKwh }))
  );

  const deviceKeys = Array.from(new Set(contributions.flatMap((row) => row.map((r) => r.key))));
  if (deviceKeys.length === 0) return [];

  const occurrenceCount = new Map<string, number>();
  for (const row of contributions) {
    for (const { key } of row) occurrenceCount.set(key, (occurrenceCount.get(key) ?? 0) + 1);
  }

  const factors = new Map<string, number>(deviceKeys.map((k) => [k, 1]));

  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    for (const key of deviceKeys) {
      let numerator = LAMBDA * 1;
      let denominator = LAMBDA;

      history.forEach((bill, i) => {
        const row = contributions[i];
        const own = row.find((r) => r.key === key);
        if (!own) return;

        const othersTotal = row.reduce((sum, r) => (r.key === key ? sum : sum + factors.get(r.key)! * r.c), 0);
        const residual = bill.billTl - othersTotal;
        const w = weights[i];

        numerator += w * own.c * residual;
        denominator += w * own.c * own.c;
      });

      const updated = denominator > 0 ? numerator / denominator : 1;
      factors.set(key, Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, updated)));
    }
  }

  return deviceKeys.map((key) => ({
    key,
    factor: factors.get(key)!,
    confidence: Math.min(1, (occurrenceCount.get(key) ?? 0) / MIN_OCCURRENCES_FOR_FULL_CONFIDENCE),
  }));
}
