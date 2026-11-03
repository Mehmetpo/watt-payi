// History list and bill detail screens.
export const tr = {
  'history.title': 'Geçmiş',
  'history.average': 'Ortalama',
  'history.highest': 'En yüksek',
  'history.lowest': 'En düşük',
  'history.rising': '{name} {months} aydır artıyor',
  'history.loadError': 'Geçmiş yüklenemedi. Bağlantını kontrol edip tekrar dene.',
  'history.retry': 'Tekrar dene',
  'history.emptyMessage': 'Henüz geçmiş fatura yok.',
  'history.emptyAction': '+ İlk faturanı ekle',
  'history.nudge': 'Trend grafiğini ve cihaz artış uyarılarını görmek için en az 3 fatura ekle.',
  'history.nudgeCta': '+ Fatura ekle',

  'historyDetail.loadError': 'Fatura yüklenemedi. Bağlantını kontrol edip tekrar dene.',
  'historyDetail.notFound': 'Bu fatura bulunamadı.',
  'historyDetail.backToHistory': 'Geçmişe dön',
  'historyDetail.thisMonth': 'Bu ayki',
};

export const en: Record<keyof typeof tr, string> = {
  'history.title': 'History',
  'history.average': 'Average',
  'history.highest': 'Highest',
  'history.lowest': 'Lowest',
  'history.rising': '{name} has been rising for {months} months',
  'history.loadError': 'Couldn’t load your history. Check your connection and try again.',
  'history.retry': 'Try again',
  'history.emptyMessage': 'No past bills yet.',
  'history.emptyAction': '+ Add your first bill',
  'history.nudge': 'Add at least 3 bills to see the trend chart and device increase alerts.',
  'history.nudgeCta': '+ Add bill',

  'historyDetail.loadError': 'Couldn’t load this bill. Check your connection and try again.',
  'historyDetail.notFound': 'This bill couldn’t be found.',
  'historyDetail.backToHistory': 'Back to history',
  'historyDetail.thisMonth': 'current month',
};
