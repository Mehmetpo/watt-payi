import { useMemo } from 'react';
import { calculateBreakdown, type DeviceCorrection, type DeviceUsage } from '../../../lib/calc';
import { BillBreakdown } from '../../../components/BillBreakdown';
import { ApplianceIcon } from '../../../components/ApplianceIcon';
import { DEVICE_CATALOG } from '../../../data/deviceCatalog';

const COMMON_DEVICE_KEYS = ['fridge', 'lighting', 'tv', 'washer', 'vacuum', 'router', 'kettle', 'iron'];
const NUDGE_THRESHOLD_PCT = 5;

export interface ResultStepProps {
  billTl: number;
  ratePerKwh: number;
  devices: DeviceUsage[];
  corrections: DeviceCorrection[];
  learning: boolean;
  selectedKeys: Set<string>;
  onAddDevice: (key: string) => void;
}

export function ResultStep({
  billTl,
  ratePerKwh,
  devices,
  corrections,
  learning,
  selectedKeys,
  onAddDevice,
}: ResultStepProps) {
  const result = useMemo(
    () => calculateBreakdown(devices, { billTl, ratePerKwh }, corrections),
    [devices, billTl, ratePerKwh, corrections]
  );

  const nameByKey = (key: string) => DEVICE_CATALOG.find((d) => d.key === key)?.name ?? key;
  const iconByKey = (key: string | null) => (key ? DEVICE_CATALOG.find((d) => d.key === key)?.iconKey ?? 'other' : 'other');

  const adjustedCount = corrections.filter((c) => c.confidence > 0 && Math.abs(c.factor - 1) > 0.05).length;

  const insight =
    result.totalRawKwh === 0 && result.otherTl === 0
      ? 'Hiç cihaz seçilmedi.'
      : result.otherPct > 1
        ? `Seçtiğin cihazlar faturanın %${Math.round(100 - result.otherPct)}'ini açıklıyor — geri kalan %${Math.round(result.otherPct)}'i "Diğer" olarak ayrıldı (seçilmeyen veya bilinmeyen tüketim).`
        : result.calcRatio > 1.05
          ? `Girdiğin süreler faturandan biraz daha yüksek bir tüketime işaret ediyor, dağılım faturana göre orantılandı.`
          : 'Seçtiğin cihazlar faturanın tamamını açıklıyor.';

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
        <p>Geçmiş faturalarından öğreniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <p className="add-insight">{insight}</p>
      {adjustedCount > 0 && (
        <p className="add-insight add-insight-muted">
          {adjustedCount} cihazın tüketimi geçmiş faturalarından öğrenilen verilerle ayarlandı.
        </p>
      )}
      <BillBreakdown totalTl={billTl} items={items} iconKeyFor={iconByKey} />
      {showNudge && (
        <div className="result-nudge">
          <p>
            Faturanın %{Math.round(result.otherPct)}'i seçmediğin cihazlardan geliyor. Şunlardan birini eklemek ister
            misin?
          </p>
          <div className="result-nudge-chips">
            {missingCommon.map((device) => (
              <button
                type="button"
                key={device.key}
                className="result-nudge-chip"
                onClick={() => onAddDevice(device.key)}
              >
                <ApplianceIcon iconKey={device.iconKey} size={15} />
                {device.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
