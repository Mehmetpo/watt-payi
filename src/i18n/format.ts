import type { Lang } from './language';

const MONTHS: Record<Lang, readonly string[]> = {
  tr: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export function numberLocale(lang: Lang): string {
  return lang === 'en' ? 'en-US' : 'tr-TR';
}

export function formatNumber(n: number, lang: Lang, opts?: Intl.NumberFormatOptions): string {
  return n.toLocaleString(numberLocale(lang), opts);
}

// Turkish writes the sign first (%12), English last (12%).
export function formatPercent(value: string | number, lang: Lang): string {
  return lang === 'en' ? `${value}%` : `%${value}`;
}

export function formatPeriod(iso: string, lang: Lang): string {
  const d = new Date(iso);
  return `${MONTHS[lang][d.getMonth()]} ${d.getFullYear()}`;
}
