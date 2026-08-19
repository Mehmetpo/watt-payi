import { DEVICE_CATALOG } from '../../../data/deviceCatalog';
import { ApplianceIcon } from '../../../components/ApplianceIcon';
import type { DeviceUsage } from '../../../lib/calc';

export interface UsageStepProps {
  selectedKeys: Set<string>;
  usageByKey: Map<string, DeviceUsage>;
  overridesByKey: Map<string, number>;
  onChange: (key: string, patch: Partial<DeviceUsage>) => void;
}

export function UsageStep({ selectedKeys, usageByKey, overridesByKey, onChange }: UsageStepProps) {
  const devices = DEVICE_CATALOG.filter((d) => selectedKeys.has(d.key));

  return (
    <div>
      {devices.map((device) => {
        const defaultWatt = overridesByKey.get(device.key) ?? device.defaultWatt;
        const usage = usageByKey.get(device.key) ?? { key: device.key, watt: defaultWatt, hoursPerWeek: 0 };
        return (
          <div className="usage-row" key={device.key}>
            <div className="usage-top">
              <div className="usage-icon"><ApplianceIcon iconKey={device.iconKey} size={17} /></div>
              <div className="usage-name">{device.name}</div>
              <div className="usage-watt">
                <input
                  type="number"
                  value={usage.watt}
                  onChange={(e) => onChange(device.key, { watt: Number(e.target.value) })}
                />
                <span>W</span>
              </div>
            </div>
            <div className="usage-slider-row">
              <input
                type="range"
                min={0}
                max={168}
                step={0.5}
                value={usage.hoursPerWeek}
                onChange={(e) => onChange(device.key, { hoursPerWeek: Number(e.target.value) })}
              />
              <span className="usage-val mono">{usage.hoursPerWeek.toFixed(1)} sa/hafta</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
