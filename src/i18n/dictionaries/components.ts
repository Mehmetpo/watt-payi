// Strings for shared components (nav, pickers, onboarding, ATT pre-prompt).
export const tr = {
  'nav.home': 'Ana Sayfa',
  'nav.history': 'Geçmiş',
  'nav.profile': 'Profil',
  'nav.addBill': 'Fatura ekle',

  'common.back': 'Geri',
  'common.skip': 'Geç',
  'common.next': 'İleri',
  'common.start': 'Başla',
  'common.privacyPolicy': 'Gizlilik Politikası',

  'captcha.title': 'Güvenlik doğrulaması',

  // "Her ayın <b>5.</b> günü" — the day is bolded, so the sentence is split around it.
  'dayPicker.pre': 'Her ayın ',
  'dayPicker.daySuffix': '.',
  'dayPicker.post': ' günü',
  'dayPicker.aria': 'Ayın günü seç',

  'onboarding.aria': 'Uygulama tanıtımı',
  'onboarding.welcome.title': "watt-payi'ye hoş geldin",
  'onboarding.welcome.desc':
    'Elektrik faturanı cihazlarına göre otomatik olarak bölüştürüp, evindeki gerçek tüketim dağılımını gösterir.',
  'onboarding.bill.title': 'Faturanı fotoğrafla',
  'onboarding.bill.desc':
    'Elektrik faturanın fotoğrafını çek, tutarı ve dönemi biz senin için okuyalım — elle girmene gerek kalmasın.',
  'onboarding.devices.title': 'Cihazlarını seç',
  'onboarding.devices.desc':
    'Evindeki buzdolabı, klima, çamaşır makinesi gibi cihazları işaretle, biz saatlik kullanımına göre payını hesaplayalım.',
  'onboarding.result.title': 'Harcamanı gör',
  'onboarding.result.desc': 'Hangi cihaz ne kadar tüketiyor, grafikte gör — ve tasarruf için kişisel önerini al.',

  'att.title': 'Reklam deneyimini kişiselleştir',
  'att.desc': 'Devam edince iOS sana izin sorusunu gösterecek. Seçim tamamen senin.',
  'att.can': 'Ne sağlar',
  'att.cant': 'Ne yapmaz',
  'att.can1': 'Sana daha alakalı reklamlar gösterilmesine yardımcı olur.',
  'att.can2': 'Uygulamayı ücretsiz tutan reklam gelirini destekler.',
  'att.cant1': 'Fatura, cihaz veya tüketim verilerine erişmez.',
  'att.cant2': 'Reddedersen uygulama aynı şekilde çalışır; yalnızca reklamlar daha az kişisel olur.',
  'att.continue': 'Devam',
};

export const en: Record<keyof typeof tr, string> = {
  'nav.home': 'Home',
  'nav.history': 'History',
  'nav.profile': 'Profile',
  'nav.addBill': 'Add bill',

  'common.back': 'Back',
  'common.skip': 'Skip',
  'common.next': 'Next',
  'common.start': 'Get started',
  'common.privacyPolicy': 'Privacy Policy',

  'captcha.title': 'Security check',

  'dayPicker.pre': 'On day ',
  'dayPicker.daySuffix': '',
  'dayPicker.post': ' of every month',
  'dayPicker.aria': 'Pick the day of the month',

  'onboarding.aria': 'App introduction',
  'onboarding.welcome.title': 'Welcome to Watt Payı',
  'onboarding.welcome.desc':
    'It splits your electricity bill across your appliances and shows where your home’s power really goes.',
  'onboarding.bill.title': 'Snap your bill',
  'onboarding.bill.desc':
    'Take a photo of your electricity bill and we’ll read the total and the period for you — no typing needed.',
  'onboarding.devices.title': 'Pick your appliances',
  'onboarding.devices.desc':
    'Tick the fridge, air conditioner, washing machine and the rest, and we’ll work out each one’s share from its hours of use.',
  'onboarding.result.title': 'See your spending',
  'onboarding.result.desc': 'See on a chart which appliance uses how much — and get a personal tip to save.',

  'att.title': 'Personalize your ad experience',
  'att.desc': 'When you continue, iOS will ask for your permission. The choice is entirely yours.',
  'att.can': 'What it does',
  'att.cant': 'What it doesn’t do',
  'att.can1': 'Helps show you more relevant ads.',
  'att.can2': 'Supports the ad revenue that keeps the app free.',
  'att.cant1': 'It never accesses your bill, appliance or usage data.',
  'att.cant2': 'If you decline, the app works the same; ads just become less personal.',
  'att.continue': 'Continue',
};
