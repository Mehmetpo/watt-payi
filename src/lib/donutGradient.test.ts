import { describe, it, expect } from 'vitest';
import { donutSegmentGradient } from './donutGradient';

describe('donutSegmentGradient', () => {
  it('builds a conic-gradient string with the colour band between start and end', () => {
    expect(donutSegmentGradient(0, 40, 'var(--chart-1)', 0)).toBe(
      'conic-gradient(transparent 0 0%, var(--chart-1) 0% 40%, transparent 40% 100%)'
    );
  });

  it('insets both edges by half the gap when a gap is given', () => {
    expect(donutSegmentGradient(0, 40, 'red', 1)).toBe(
      'conic-gradient(transparent 0 0.5%, red 0.5% 39.5%, transparent 39.5% 100%)'
    );
  });

  it('never lets the coloured band invert on a sliver segment smaller than the gap', () => {
    // 2%-wide segment, 4% gap requested -> band collapses to zero width, not negative
    const result = donutSegmentGradient(10, 12, 'red', 4);
    expect(result).toBe('conic-gradient(transparent 0 11%, red 11% 11%, transparent 11% 100%)');
  });

  it('clamps to the 0–100 range', () => {
    expect(donutSegmentGradient(0, 100, 'red', 2)).toBe(
      'conic-gradient(transparent 0 1%, red 1% 99%, transparent 99% 100%)'
    );
  });
});
