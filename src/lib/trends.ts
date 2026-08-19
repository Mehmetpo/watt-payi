export interface BillItemForTrend {
  deviceKey: string | null;
  deviceName: string;
  calibratedTl: number;
}

export interface BillWithItems {
  periodMonth: string;
  items: BillItemForTrend[];
}

export interface RisingDevice {
  deviceName: string;
  months: number;
}

export function detectRisingDevices(bills: BillWithItems[], minConsecutiveMonths = 3): RisingDevice[] {
  const sorted = [...bills].sort((a, b) => a.periodMonth.localeCompare(b.periodMonth));
  const byDevice = new Map<string, { deviceName: string; values: number[] }>();

  for (const bill of sorted) {
    for (const item of bill.items) {
      const id = item.deviceKey ?? item.deviceName;
      const entry = byDevice.get(id) ?? { deviceName: item.deviceName, values: [] };
      entry.values.push(item.calibratedTl);
      byDevice.set(id, entry);
    }
  }

  const rising: RisingDevice[] = [];
  for (const { deviceName, values } of byDevice.values()) {
    let streak = 1;
    let maxStreak = 1;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i - 1]) {
        streak += 1;
        maxStreak = Math.max(maxStreak, streak);
      } else {
        streak = 1;
      }
    }
    if (maxStreak >= minConsecutiveMonths) {
      rising.push({ deviceName, months: maxStreak });
    }
  }

  return rising;
}
