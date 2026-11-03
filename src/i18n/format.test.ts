import { describe, it, expect } from 'vitest';
import { formatNumber, formatPercent, formatPeriod, numberLocale } from './format';

describe('numberLocale', () => {
  it('maps languages to BCP-47 tags', () => {
    expect(numberLocale('tr')).toBe('tr-TR');
    expect(numberLocale('en')).toBe('en-US');
  });
});

describe('formatNumber', () => {
  it('matches the previous tr-TR output byte for byte', () => {
    for (const n of [0, 5, 999, 1234, 12345.67, 1234567]) {
      expect(formatNumber(n, 'tr')).toBe(n.toLocaleString('tr-TR'));
    }
    expect(formatNumber(3.456, 'tr', { maximumFractionDigits: 2 })).toBe(
      (3.456).toLocaleString('tr-TR', { maximumFractionDigits: 2 }),
    );
  });

  it('uses English separators for en', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
    expect(formatNumber(3.456, 'en', { maximumFractionDigits: 2 })).toBe('3.46');
  });
});

describe('formatPercent', () => {
  it('puts the sign first in Turkish and last in English', () => {
    expect(formatPercent('12', 'tr')).toBe('%12');
    expect(formatPercent('12', 'en')).toBe('12%');
  });
});

describe('formatPeriod', () => {
  it('keeps the Turkish month names', () => {
    expect(formatPeriod('2026-01-01', 'tr')).toBe('Ocak 2026');
    expect(formatPeriod('2026-02-01', 'tr')).toBe('Şubat 2026');
    expect(formatPeriod('2026-12-01', 'tr')).toBe('Aralık 2026');
  });

  it('uses English month names for en', () => {
    expect(formatPeriod('2026-01-01', 'en')).toBe('January 2026');
    expect(formatPeriod('2026-10-01', 'en')).toBe('October 2026');
  });
});
