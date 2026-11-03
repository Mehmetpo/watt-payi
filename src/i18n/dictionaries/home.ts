// Home screen, sharing and generic load-error copy.
export const tr = {
  'share.headline': '{period} elektrik faturam: {total} TL',
  'share.footer': 'Watt Payı ile takip ediyorum.',
  'share.title': 'Fatura dağılımı',
  'share.dialogTitle': 'Paylaş',
  'share.aria': 'Paylaş',

  'home.thisMonth': 'Bu Ay',
  'home.unitPrice': '{rate} ₺/kWh birim fiyat',
  'home.loadError': 'Veriler yüklenemedi. Bağlantını kontrol edip tekrar dene.',
  'home.retry': 'Tekrar dene',
  'home.emptyMessage': 'Henüz bir fatura eklemedin.',
  'home.emptyAction': '+ İlk faturanı ekle',
  'home.budget': 'Bütçe hedefi',
  'home.overBudget': '{amount} TL bütçe hedefini aştın',
  'home.deviceUp': '↑ {name} önceki aydan {amount} TL daha fazla geldi',
  'home.deviceDown': '↓ {name} önceki aydan {amount} TL daha az geldi',
};

export const en: Record<keyof typeof tr, string> = {
  'share.headline': 'My {period} electricity bill: {total} TL',
  'share.footer': 'Tracking it with Watt Payı.',
  'share.title': 'Bill breakdown',
  'share.dialogTitle': 'Share',
  'share.aria': 'Share',

  'home.thisMonth': 'This Month',
  'home.unitPrice': '{rate} ₺/kWh unit price',
  'home.loadError': 'Couldn’t load your data. Check your connection and try again.',
  'home.retry': 'Try again',
  'home.emptyMessage': 'You haven’t added a bill yet.',
  'home.emptyAction': '+ Add your first bill',
  'home.budget': 'Budget goal',
  'home.overBudget': 'You’re {amount} TL over your budget goal',
  'home.deviceUp': '↑ {name} came to {amount} TL more than last month',
  'home.deviceDown': '↓ {name} came to {amount} TL less than last month',
};
