export interface DeviceSpend {
  key: string;
  name: string;
  tl: number;
}

export interface DeviceDeltaEntry {
  name: string;
  deltaTl: number;
}

export interface DeviceDeltaResult {
  increased: DeviceDeltaEntry | null;
  decreased: DeviceDeltaEntry | null;
}

/**
 * Compares device-level spend between two bills. Only devices present in both are compared —
 * a device newly added (or dropped) this month isn't a meaningful "change" to surface.
 */
export function compareDeviceSpending(current: DeviceSpend[], previous: DeviceSpend[]): DeviceDeltaResult {
  const prevByKey = new Map(previous.map((d) => [d.key, d]));

  const deltas: DeviceDeltaEntry[] = current
    .filter((d) => prevByKey.has(d.key))
    .map((d) => ({ name: d.name, deltaTl: d.tl - prevByKey.get(d.key)!.tl }));

  const increased = [...deltas].filter((d) => d.deltaTl > 0).sort((a, b) => b.deltaTl - a.deltaTl)[0] ?? null;
  const decreased = [...deltas].filter((d) => d.deltaTl < 0).sort((a, b) => a.deltaTl - b.deltaTl)[0] ?? null;

  return { increased, decreased };
}
