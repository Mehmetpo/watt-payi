import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { DEVICE_CATALOG, COMMON_DEVICE_KEYS, DEVICE_CATEGORIES } from '../../../data/deviceCatalog';
import { ApplianceVisual } from '../../../components/ApplianceVisual';
import { useI18n } from '../../../i18n/I18nContext';

export interface DevicesStepProps {
  selected: Set<string>;
  onToggle: (deviceKey: string) => void;
  /** Devices from the last saved bill; the choice card only shows when > 0. */
  savedCount?: number;
  onUseSaved?: () => void;
  onStartFresh?: () => void;
}

function findDevice(key: string) {
  return DEVICE_CATALOG.find((d) => d.key === key)!;
}

export function DevicesStep({ selected, onToggle, savedCount = 0, onUseSaved, onStartFresh }: DevicesStepProps) {
  const { t, deviceName } = useI18n();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(DEVICE_CATEGORIES.map((c) => c.id))
  );

  function toggleCategory(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
        <span>{deviceName(device.key, device.name)}</span>
      </div>
    );
  }

  return (
    <div className="devices-step">
      {savedCount > 0 && (
        <div className="device-saved-choice">
          <p>{t('devices.savedIntro', { n: savedCount })}</p>
          <div className="device-saved-actions">
            <button type="button" className="device-saved-btn primary" onClick={onUseSaved}>
              {t('devices.useSaved')}
            </button>
            <button type="button" className="device-saved-btn" onClick={onStartFresh}>
              {t('devices.startFresh')}
            </button>
          </div>
        </div>
      )}
      <div className="device-section">
        <h3 className="device-section-label">{t('devices.common')}</h3>
        <div className="device-grid">{COMMON_DEVICE_KEYS.map(renderCard)}</div>
      </div>

      {DEVICE_CATEGORIES.map((category) => {
        const isOpen = expanded.has(category.id);
        const selectedCount = category.keys.filter((k) => selected.has(k)).length;
        return (
          <div className="device-section" key={category.id}>
            <button
              type="button"
              className="device-section-toggle"
              aria-expanded={isOpen}
              onClick={() => toggleCategory(category.id)}
            >
              <span className="device-section-label">
                {t(`deviceCategory.${category.id}`)}
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
