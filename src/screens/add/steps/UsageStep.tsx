import type { CSSProperties } from 'react';
import { DEVICE_CATALOG } from '../../../data/deviceCatalog';
import { ApplianceVisual } from '../../../components/ApplianceVisual';
import { Slider } from '../../../components/ui/slider';
import { cn } from '../../../lib/utils';
import { useI18n } from '../../../i18n/I18nContext';
import type { DeviceUsage } from '../../../lib/calc';

const HOUR_PRESETS = [
  { labelKey: 'usage.preset.none', hours: 0 },
  { labelKey: 'usage.preset.low', hours: 7 },
  { labelKey: 'usage.preset.mid', hours: 21 },
  { labelKey: 'usage.preset.high', hours: 56 },
  { labelKey: 'usage.preset.always', hours: 168 },
];

export interface UsageStepProps {
  selectedKeys: Set<string>;
  usageByKey: Map<string, DeviceUsage>;
  overridesByKey: Map<string, number>;
  onChange: (key: string, patch: Partial<DeviceUsage>) => void;
}

export function UsageStep({ selectedKeys, usageByKey, overridesByKey, onChange }: UsageStepProps) {
  const { t, deviceName } = useI18n();
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
              <div className="usage-name">{deviceName(device.key, device.name)}</div>
              <div className="usage-watt">
                <input
                  type="number"
                  aria-label={t('usage.wattAria', { name: deviceName(device.key, device.name) })}
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
                  key={preset.labelKey}
                  className={cn('usage-preset-chip', usage.hoursPerWeek === preset.hours && 'selected')}
                  aria-pressed={usage.hoursPerWeek === preset.hours}
                  onClick={() => onChange(device.key, { hoursPerWeek: preset.hours })}
                >
                  {t(preset.labelKey)}
                </button>
              ))}
            </div>
            <div className="usage-slider-row">
              <Slider
                className="usage-slider"
                aria-label={t('usage.hoursAria', { name: deviceName(device.key, device.name) })}
                min={0}
                max={168}
                step={0.5}
                value={[usage.hoursPerWeek]}
                onValueChange={(v) => onChange(device.key, { hoursPerWeek: Array.isArray(v) ? v[0] : v })}
              />
              <span className="usage-val mono">{usage.hoursPerWeek.toFixed(1)} {t('usage.perWeek')}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
