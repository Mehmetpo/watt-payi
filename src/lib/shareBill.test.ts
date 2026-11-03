import { describe, it, expect } from 'vitest';
import { buildBillShareText } from './shareBill';

const items = [
  { deviceName: 'Klima', calibratedTl: 120.4 },
  { deviceName: 'Buzdolabı', calibratedTl: 300 },
  { deviceName: 'Küçük', calibratedTl: 0.5 },
];

describe('buildBillShareText', () => {
  it('keeps the Turkish text byte-identical (default language)', () => {
    const expected = [
      'Ocak 2026 elektrik faturam: 1.234 TL',
      '',
      '• Buzdolabı: 300 TL',
      '• Klima: 120 TL',
      '',
      'Watt Payı ile takip ediyorum.',
    ].join('\n');
    expect(buildBillShareText('Ocak 2026', 1234, items)).toBe(expected);
    expect(buildBillShareText('Ocak 2026', 1234, items, 'tr')).toBe(expected);
  });

  it('produces English text with English number formatting', () => {
    const text = buildBillShareText('January 2026', 1234, [
      { deviceName: 'Refrigerator', calibratedTl: 300 },
    ], 'en');
    expect(text).toBe(
      ['My January 2026 electricity bill: 1,234 TL', '', '• Refrigerator: 300 TL', '', 'Tracking it with Watt Payı.'].join('\n'),
    );
  });
});
