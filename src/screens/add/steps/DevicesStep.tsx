import { DEVICE_CATALOG } from '../../../data/deviceCatalog';
import { ApplianceIcon } from '../../../components/ApplianceIcon';

export interface DevicesStepProps {
  selected: Set<string>;
  onToggle: (deviceKey: string) => void;
}

export function DevicesStep({ selected, onToggle }: DevicesStepProps) {
  return (
    <div className="device-grid">
      {DEVICE_CATALOG.map((device) => {
        const on = selected.has(device.key);
        return (
          <div
            key={device.key}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            className={'device-card' + (on ? ' on' : '')}
            onClick={() => onToggle(device.key)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle(device.key);
              }
            }}
          >
            <ApplianceIcon iconKey={device.iconKey} size={22} />
            <span>{device.name}</span>
          </div>
        );
      })}
    </div>
  );
}
