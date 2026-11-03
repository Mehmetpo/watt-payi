import { useMemo, type CSSProperties } from 'react';
import { calculateBreakdown, type DeviceCorrection, type DeviceUsage } from '../../../lib/calc';
import { BillBreakdown } from '../../../components/BillBreakdown';
import { ApplianceVisual } from '../../../components/ApplianceVisual';
import { DEVICE_CATALOG, COMMON_DEVICE_KEYS } from '../../../data/deviceCatalog';
import { useI18n } from '../../../i18n/I18nContext';

const NUDGE_THRESHOLD_PCT = 5;

export interface ResultStepProps {
  billTl: number;
  ratePerKwh: number;
  kwh?: number;
  periodDays?: number;
  devices: DeviceUsage[];
  corrections: DeviceCorrection[];
  learning: boolean;
  selectedKeys: Set<string>;
  onAddDevice: (key: string) => void;
}

export function ResultStep({
  billTl,
  ratePerKwh,
  kwh,
  periodDays,
  devices,
  corrections,
  learning,
  selectedKeys,
  onAddDevice,
}: ResultStepProps) {
  const { t, deviceName } = useI18n();
  const result = useMemo(
    () => calculateBreakdown(devices, { billTl, ratePerKwh, kwh, periodDays }, corrections),
    [devices, billTl, ratePerKwh, kwh, periodDays, corrections]
  );

  const nameByKey = (key: string) => deviceName(key, DEVICE_CATALOG.find((d) => d.key === key)?.name ?? key);
  const iconByKey = (key: string | null) => (key ? DEVICE_CATALOG.find((d) => d.key === key)?.iconKey ?? 'other' : 'other');

  const adjustedCount = corrections.filter((c) => c.confidence > 0 && Math.abs(c.factor - 1) > 0.05).length;

  const insight =
    result.totalRawKwh === 0 && result.otherTl === 0
      ? t('result.noDevices')
      : result.otherPct > 1
        ? t('result.insightOther', { explained: Math.round(100 - result.otherPct), other: Math.round(result.otherPct) })
        : result.calcRatio > 0.95
          ? t('result.insightOver')
          : t('result.insightFull');

  const missingCommon = COMMON_DEVICE_KEYS.filter((key) => !selectedKeys.has(key))
    .map((key) => DEVICE_CATALOG.find((d) => d.key === key))
    .filter((d): d is (typeof DEVICE_CATALOG)[number] => Boolean(d))
    .slice(0, 3);
  const showNudge = result.otherPct > NUDGE_THRESHOLD_PCT && missingCommon.length > 0;

  const items = [
    ...result.items.map((item) => ({
      deviceKey: item.key,
      deviceName: nameByKey(item.key),
      calibratedTl: item.calibratedTl,
      pctShare: item.pctShare,
    })),
    ...(result.otherTl > 1
      ? [
          {
            deviceKey: null,
            deviceName: 'Diğer / Bilinmeyen',
            calibratedTl: result.otherTl,
            pctShare: result.otherPct,
          },
        ]
      : []),
  ];

  if (learning) {
    return (
      <div className="result-learning">
        <div className="result-learning-dots">
          <span />
          <span />
          <span />
        </div>
        <p>{t('result.learning')}</p>
      </div>
    );
  }

  const breakdownDelay = adjustedCount > 0 ? 2 : 1;
  const nudgeDelay = breakdownDelay + 1;

  return (
    <div>
      <p className="add-insight result-in" style={{ '--i': 0 } as CSSProperties}>
        {insight}
      </p>
      {adjustedCount > 0 && (
        <p className="add-insight add-insight-muted result-in" style={{ '--i': 1 } as CSSProperties}>
          {t('result.adjusted', { n: adjustedCount })}
        </p>
      )}
      <div className="result-in" style={{ '--i': breakdownDelay } as CSSProperties}>
        <BillBreakdown totalTl={billTl} items={items} iconKeyFor={iconByKey} />
      </div>
      {showNudge && (
        <div className="result-nudge result-in" style={{ '--i': nudgeDelay } as CSSProperties}>
          <p>
            {t('result.nudge', { pct: Math.round(result.otherPct) })}
          </p>
          <div className="result-nudge-chips">
            {missingCommon.map((device) => (
              <button
                type="button"
                key={device.key}
                className="result-nudge-chip"
                onClick={() => onAddDevice(device.key)}
              >
                <ApplianceVisual iconKey={device.iconKey} size={15} imageSize={22} />
                {deviceName(device.key, device.name)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
