export interface BillTotal {
  total_tl: number;
}

export interface BillSummary {
  averageTl: number;
  highestTl: number;
  lowestTl: number;
  count: number;
}

/** Average / highest / lowest bill total. Returns null with fewer than 2 bills, where a summary would be noise. */
export function summarizeBills(bills: BillTotal[]): BillSummary | null {
  if (bills.length < 2) return null;
  const totals = bills.map((b) => b.total_tl);
  const sum = totals.reduce((a, b) => a + b, 0);
  return {
    averageTl: Math.round(sum / totals.length),
    highestTl: Math.max(...totals),
    lowestTl: Math.min(...totals),
    count: totals.length,
  };
}
