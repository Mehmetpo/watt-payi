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

const OTHER_RESERVE = 0.08; // share of every bill always left for untracked consumption (lighting, chargers, standby…)

function rawKwh(watt: number, hoursPerWeek: number): number {
  return (watt / 1000) * hoursPerWeek * WEEKS_PER_MONTH;
}

/**
 * Exact minimiser of  LAMBDA·(f − 1)² + Σ wc2ᵢ·max(0, f − tᵢ)²  over f. The objective is convex, so
 * scan the breakpoints in ascending order: within each interval the active set is fixed and the
 * minimiser is closed-form; the first one that lands inside its own interval is the global answer.
 */
function minimiseOneSided(terms: { t: number; wc2: number }[]): number {
  const sorted = [...terms].sort((a, b) => a.t - b.t);
  let sumWc2 = 0;
  let sumWc2T = 0;

  for (let k = 0; k <= sorted.length; k++) {
    const candidate = (LAMBDA + sumWc2T) / (LAMBDA + sumWc2);
    const upper = k < sorted.length ? sorted[k].t : Infinity;
    if (candidate <= upper) return candidate;
    sumWc2 += sorted[k].wc2;
    sumWc2T += sorted[k].wc2 * sorted[k].t;
  }
  return 1;
}

/**
 * Fits a per-device correction factor from past bills via ridge-regularized coordinate descent:
 * for each device, holding every other device's factor fixed, the factor that best fits past bills
 * is found exactly, so we sweep over all devices repeatedly until the fit settles. The fit is
 * one-sided: factors are only pulled DOWN when tracked devices would exceed a bill (minus an
 * unknown-consumption reserve) and never pushed up to close a gap, so unexplained usage stays
 * visible as "Diğer / Bilinmeyen". history must be ordered newest-first so recency weighting
 * favors the household's current habits.
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
      // One-sided loss: a bill only pushes this device's factor when the tracked devices would
      // exceed the ceiling (bill minus the unknown-consumption reserve). Under-explaining is never
      // penalised — that gap is real untracked consumption, and "fixing" it by inflating device
      // factors would erase the "Diğer / Bilinmeyen" slice. Each bill's term is (f·c − limit)²
      // above the breakpoint t = limit / c, so the 1-D objective is convex and piecewise quadratic.
      const terms: { t: number; wc2: number }[] = [];

      history.forEach((bill, i) => {
        const row = contributions[i];
        const own = row.find((r) => r.key === key);
        if (!own || own.c <= 0) return;

        const othersTotal = row.reduce((sum, r) => (r.key === key ? sum : sum + factors.get(r.key)! * r.c), 0);
        const room = bill.billTl * (1 - OTHER_RESERVE) - othersTotal;
        terms.push({ t: room / own.c, wc2: weights[i] * own.c * own.c });
      });

      factors.set(key, Math.min(FACTOR_MAX, Math.max(FACTOR_MIN, minimiseOneSided(terms))));
    }
  }

  return deviceKeys.map((key) => ({
    key,
    factor: factors.get(key)!,
    confidence: Math.min(1, (occurrenceCount.get(key) ?? 0) / MIN_OCCURRENCES_FOR_FULL_CONFIDENCE),
  }));
}
