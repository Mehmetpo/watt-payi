import { describe, it, expect } from 'vitest';
import { detectRisingDevices } from './trends';

describe('detectRisingDevices', () => {
  it('flags a device whose cost strictly increased for 3+ consecutive months', () => {
    const bills = [
      { periodMonth: '2026-05-01', items: [
        { deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 400 },
        { deviceKey: 'fridge', deviceName: 'Buzdolabı', calibratedTl: 300 },
      ]},
      { periodMonth: '2026-06-01', items: [
        { deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 500 },
        { deviceKey: 'fridge', deviceName: 'Buzdolabı', calibratedTl: 300 },
      ]},
      { periodMonth: '2026-07-01', items: [
        { deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 650 },
        { deviceKey: 'fridge', deviceName: 'Buzdolabı', calibratedTl: 300 },
      ]},
      { periodMonth: '2026-08-01', items: [
        { deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 850 },
        { deviceKey: 'fridge', deviceName: 'Buzdolabı', calibratedTl: 300 },
      ]},
    ];

    const result = detectRisingDevices(bills);

    expect(result).toEqual([{ deviceName: 'Klima', months: 4 }]);
  });

  it('returns an empty list when nothing rises for the minimum streak', () => {
    const bills = [
      { periodMonth: '2026-06-01', items: [{ deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 400 }] },
      { periodMonth: '2026-07-01', items: [{ deviceKey: 'ac', deviceName: 'Klima', calibratedTl: 500 }] },
    ];

    expect(detectRisingDevices(bills)).toEqual([]);
  });
});
