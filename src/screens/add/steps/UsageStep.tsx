import type { CSSProperties } from 'react';
import { DEVICE_CATALOG } from '../../../data/deviceCatalog';
import { ApplianceVisual } from '../../../components/ApplianceVisual';
import { Slider } from '../../../components/ui/slider';
import { cn } from '../../../lib/utils';
import type { DeviceUsage } from '../../../lib/calc';

const HOUR_PRESETS = [
  { label: 'Kullanmıyorum', hours: 0 },
  { label: 'Az', hours: 7 },
  { label: 'Orta', hours: 21 },
  { label: 'Çok', hours: 56 },
  { label: 'Sürekli', hours: 168 },
];

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
      {devices.map((device, i) => {
        const defaultWatt = overridesByKey.get(device.key) ?? device.defaultWatt;
        const usage = usageByKey.get(device.key) ?? { key: device.key, watt: defaultWatt, hoursPerWeek: 0 };
        return (
          <div className="usage-row usage-row-in" style={{ '--i': i } as CSSProperties} key={device.key}>
            <div className="usage-top">
              <div className="usage-icon"><ApplianceVisual iconKey={device.iconKey} size={17} imageSize={25} /></div>
              <div className="usage-name">{device.name}</div>
              <div className="usage-watt">
                <input
                  type="number"
                  aria-label={`${device.name} watt değeri`}
                  value={usage.watt}
                  onChange={(e) => onChange(device.key, { watt: Number(e.target.value) })}
                />
                <span>W</span>
              </div>
            </div>
            <div className="usage-presets">
              {HOUR_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset.label}
                  className={cn('usage-preset-chip', usage.hoursPerWeek === preset.hours && 'selected')}
                  aria-pressed={usage.hoursPerWeek === preset.hours}
                  onClick={() => onChange(device.key, { hoursPerWeek: preset.hours })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="usage-slider-row">
              <Slider
                className="usage-slider"
                aria-label={`${device.name} haftalık kullanım saati`}
                min={0}
                max={168}
                step={0.5}
                value={[usage.hoursPerWeek]}
                onValueChange={(v) => onChange(device.key, { hoursPerWeek: Array.isArray(v) ? v[0] : v })}
              />
              <span className="usage-val mono">{usage.hoursPerWeek.toFixed(1)} sa/hafta</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
