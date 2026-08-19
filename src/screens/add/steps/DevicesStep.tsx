import { DEVICE_CATALOG } from '../../../data/deviceCatalog';
import { ApplianceIcon } from '../../../components/ApplianceIcon';

export interface DevicesStepProps {
  selected: Set<string>;
  onToggle: (deviceKey: string) => void;
}

export function DevicesStep({ selected, onToggle }: DevicesStepProps) {
  return (
    <div className="device-grid">
      {DEVICE_CATALOG.map((device) => (
        <div
          key={device.key}
          className={'device-card' + (selected.has(device.key) ? ' on' : '')}
          onClick={() => onToggle(device.key)}
        >
          <ApplianceIcon iconKey={device.iconKey} size={22} />
          <span>{device.name}</span>
        </div>
      ))}
    </div>
  );
}
