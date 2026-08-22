import { Share } from '@capacitor/share';

export interface ShareableBillItem {
  deviceName: string;
  calibratedTl: number;
}

export function buildBillShareText(periodLabel: string, totalTl: number, items: ShareableBillItem[]): string {
  const lines = [...items]
    .filter((item) => item.calibratedTl > 1)
    .sort((a, b) => b.calibratedTl - a.calibratedTl)
    .map((item) => `• ${item.deviceName}: ${Math.round(item.calibratedTl)} TL`);

  return [
    `${periodLabel} elektrik faturam: ${Math.round(totalTl).toLocaleString('tr-TR')} TL`,
    '',
    ...lines,
    '',
    'Watt Payı ile takip ediyorum.',
  ].join('\n');
}

export async function shareBillBreakdown(periodLabel: string, totalTl: number, items: ShareableBillItem[]): Promise<void> {
  await Share.share({
    title: 'Fatura dağılımı',
    text: buildBillShareText(periodLabel, totalTl, items),
    dialogTitle: 'Paylaş',
  });
}
