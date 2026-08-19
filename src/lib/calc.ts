export interface DeviceUsage {
  key: string;
  watt: number;
  hoursPerWeek: number;
}

export interface BillCalibration {
  billTl: number;
  ratePerKwh: number;
}

export interface DeviceShare {
  key: string;
  monthlyKwhRaw: number;
  calibratedTl: number;
  pctShare: number;
}

export interface CalcResult {
  items: DeviceShare[];
  totalRawKwh: number;
  impliedKwh: number;
  calcRatio: number;
}

const WEEKS_PER_MONTH = 4.345;

export function monthlyKwh(device: DeviceUsage): number {
  return (device.watt / 1000) * device.hoursPerWeek * WEEKS_PER_MONTH;
}

export function calculateBreakdown(devices: DeviceUsage[], bill: BillCalibration): CalcResult {
  const rawKwhList = devices.map((d) => ({ key: d.key, kwh: monthlyKwh(d) }));
  const totalRawKwh = rawKwhList.reduce((sum, d) => sum + d.kwh, 0);
  const impliedKwh = bill.ratePerKwh > 0 ? bill.billTl / bill.ratePerKwh : 0;
  const calcRatio = totalRawKwh > 0 ? (totalRawKwh * bill.ratePerKwh) / bill.billTl : 0;

  const items: DeviceShare[] = rawKwhList.map(({ key, kwh }) => {
    const share = totalRawKwh > 0 ? kwh / totalRawKwh : 0;
    return {
      key,
      monthlyKwhRaw: kwh,
      calibratedTl: share * bill.billTl,
      pctShare: share * 100,
    };
  });

  return { items, totalRawKwh, impliedKwh, calcRatio };
}
