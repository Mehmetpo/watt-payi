import { Share } from '@capacitor/share';
import { DICTIONARIES } from '../i18n/dictionaries';
import { formatNumber } from '../i18n/format';
import type { Lang } from '../i18n/language';
import { translate } from '../i18n/translate';

export interface ShareableBillItem {
  deviceName: string;
  calibratedTl: number;
}

export function buildBillShareText(
  periodLabel: string,
  totalTl: number,
  items: ShareableBillItem[],
  lang: Lang = 'tr',
): string {
  const t = (key: string, params?: Record<string, string | number>) => translate(DICTIONARIES, lang, key, params);
  const lines = [...items]
    .filter((item) => item.calibratedTl > 1)
    .sort((a, b) => b.calibratedTl - a.calibratedTl)
    .map((item) => `• ${item.deviceName}: ${Math.round(item.calibratedTl)} TL`);

  return [
    t('share.headline', { period: periodLabel, total: formatNumber(Math.round(totalTl), lang) }),
    '',
    ...lines,
    '',
    t('share.footer'),
  ].join('\n');
}

export async function shareBillBreakdown(
  periodLabel: string,
  totalTl: number,
  items: ShareableBillItem[],
  lang: Lang = 'tr',
): Promise<void> {
  await Share.share({
    title: translate(DICTIONARIES, lang, 'share.title'),
    text: buildBillShareText(periodLabel, totalTl, items, lang),
    dialogTitle: translate(DICTIONARIES, lang, 'share.dialogTitle'),
  });
}
