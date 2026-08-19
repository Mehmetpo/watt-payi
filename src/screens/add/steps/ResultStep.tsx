import { useMemo } from 'react';
import { calculateBreakdown, type DeviceUsage } from '../../../lib/calc';
import { BillBreakdown } from '../../../components/BillBreakdown';
import { DEVICE_CATALOG } from '../../../data/deviceCatalog';

export interface ResultStepProps {
  billTl: number;
  ratePerKwh: number;
  devices: DeviceUsage[];
}

export function ResultStep({ billTl, ratePerKwh, devices }: ResultStepProps) {
  const result = useMemo(
    () => calculateBreakdown(devices, { billTl, ratePerKwh }),
    [devices, billTl, ratePerKwh]
  );

  const nameByKey = (key: string) => DEVICE_CATALOG.find((d) => d.key === key)?.name ?? key;
  const iconByKey = (key: string | null) => DEVICE_CATALOG.find((d) => d.key === key)?.iconKey ?? 'lighting';

  const insight =
    result.totalRawKwh === 0
      ? 'Hiç cihaz seçilmedi.'
      : result.calcRatio < 0.6
        ? `Girdiğin sürelere göre hesaplanan tüketim faturanın yalnızca %${Math.round(result.calcRatio * 100)}'i kadar — dağılım faturana göre orantılandı.`
        : result.calcRatio > 1.6
          ? `Girdiğin süreler faturandan çok daha yüksek bir tüketime işaret ediyor (%${Math.round(result.calcRatio * 100)}).`
          : `Hesaplanan tüketim faturanın %${Math.round(result.calcRatio * 100)}'i kadar çıktı.`;

  return (
    <div>
      <p className="add-insight">{insight}</p>
      <BillBreakdown
        totalTl={billTl}
        items={result.items.map((item) => ({
          deviceKey: item.key,
          deviceName: nameByKey(item.key),
          calibratedTl: item.calibratedTl,
          pctShare: item.pctShare,
        }))}
        iconKeyFor={iconByKey}
      />
    </div>
  );
}
