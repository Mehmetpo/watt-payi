import { describe, it, expect } from 'vitest';
import { summarizeBills } from './billStats';

describe('summarizeBills', () => {
  it('returns null for fewer than two bills', () => {
    expect(summarizeBills([])).toBeNull();
    expect(summarizeBills([{ total_tl: 1000 }])).toBeNull();
  });

  it('computes rounded average, highest and lowest across bills', () => {
    const result = summarizeBills([
      { total_tl: 1000 },
      { total_tl: 2000 },
      { total_tl: 1500 },
    ]);
    expect(result).toEqual({ averageTl: 1500, highestTl: 2000, lowestTl: 1000, count: 3 });
  });

  it('rounds the average to the nearest lira', () => {
    const result = summarizeBills([{ total_tl: 1000 }, { total_tl: 1001 }]);
    expect(result?.averageTl).toBe(1001); // 1000.5 -> 1001
  });
});
