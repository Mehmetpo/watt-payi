import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { DEVICE_CATALOG, COMMON_DEVICE_KEYS, DEVICE_CATEGORIES } from '../../../data/deviceCatalog';
import { ApplianceVisual } from '../../../components/ApplianceVisual';

export interface DevicesStepProps {
  selected: Set<string>;
  onToggle: (deviceKey: string) => void;
}

function findDevice(key: string) {
  return DEVICE_CATALOG.find((d) => d.key === key)!;
}

export function DevicesStep({ selected, onToggle }: DevicesStepProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(DEVICE_CATEGORIES.map((c) => c.label))
  );

  function toggleCategory(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function renderCard(key: string) {
    const device = findDevice(key);
    const on = selected.has(key);
    return (
      <div
        key={key}
        role="button"
        tabIndex={0}
        aria-pressed={on}
        className={'device-card' + (on ? ' on' : '')}
        onClick={() => onToggle(key)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(key);
          }
        }}
      >
        {on && (
          <span className="device-card-check">
            <Check size={11} strokeWidth={3} />
          </span>
        )}
        <ApplianceVisual iconKey={device.iconKey} size={22} imageSize={34} />
        <span>{device.name}</span>
      </div>
    );
  }

  return (
    <div className="devices-step">
      <div className="device-section">
        <h3 className="device-section-label">Yaygın</h3>
        <div className="device-grid">{COMMON_DEVICE_KEYS.map(renderCard)}</div>
      </div>

      {DEVICE_CATEGORIES.map((category) => {
        const isOpen = expanded.has(category.label);
        const selectedCount = category.keys.filter((k) => selected.has(k)).length;
        return (
          <div className="device-section" key={category.label}>
            <button
              type="button"
              className="device-section-toggle"
              aria-expanded={isOpen}
              onClick={() => toggleCategory(category.label)}
            >
              <span className="device-section-label">
                {category.label}
                {selectedCount > 0 && <span className="device-section-count">{selectedCount}</span>}
              </span>
              <ChevronDown size={16} strokeWidth={2} className={'device-section-chevron' + (isOpen ? ' open' : '')} />
            </button>
            {isOpen && <div className="device-grid">{category.keys.map(renderCard)}</div>}
          </div>
        );
      })}
    </div>
  );
}
