import type { DeviceCatalogEntry } from '../types/domain';

// Default watt values were researched against real-world appliance
// specs/consumption tables (energy.gov-style wattage charts + Turkish
// market sources) as of 2026-08 — see commit message for the pass that
// last updated them. They're starting points the user can always override.
export const DEVICE_CATALOG: DeviceCatalogEntry[] = [
  { key: 'fridge', name: 'Buzdolabı', defaultWatt: 150, iconKey: 'fridge' },
  { key: 'ac', name: 'Klima', defaultWatt: 1100, iconKey: 'ac' },
  { key: 'washer', name: 'Çamaşır Makinesi', defaultWatt: 800, iconKey: 'washer' },
  { key: 'dishwasher', name: 'Bulaşık Makinesi', defaultWatt: 1300, iconKey: 'dishwasher' },
  { key: 'oven', name: 'Fırın', defaultWatt: 2000, iconKey: 'oven' },
  { key: 'toaster', name: 'Tost Makinesi', defaultWatt: 900, iconKey: 'toaster' },
  { key: 'kettle', name: 'Su Isıtıcısı', defaultWatt: 2200, iconKey: 'kettle' },
  { key: 'tv', name: 'Televizyon', defaultWatt: 100, iconKey: 'tv' },
  { key: 'pc', name: 'Bilgisayar', defaultWatt: 260, iconKey: 'pc' },
  { key: 'lighting', name: 'Aydınlatma', defaultWatt: 150, iconKey: 'lighting' },
  { key: 'vacuum', name: 'Süpürge', defaultWatt: 1400, iconKey: 'vacuum' },
  { key: 'dryer', name: 'Kurutucu', defaultWatt: 1800, iconKey: 'dryer' },
  { key: 'heater', name: 'Şofben', defaultWatt: 6500, iconKey: 'heater' },
  { key: 'microwave', name: 'Mikrodalga Fırın', defaultWatt: 1200, iconKey: 'microwave' },
  { key: 'iron', name: 'Ütü', defaultWatt: 2000, iconKey: 'iron' },
  { key: 'hairdryer', name: 'Saç Kurutma Makinesi', defaultWatt: 2000, iconKey: 'hairdryer' },
  { key: 'freezer', name: 'Derin Dondurucu', defaultWatt: 150, iconKey: 'freezer' },
  { key: 'blender', name: 'Blender', defaultWatt: 600, iconKey: 'blender' },
  { key: 'coffee', name: 'Kahve Makinesi', defaultWatt: 1000, iconKey: 'coffee' },
  { key: 'fan', name: 'Vantilatör', defaultWatt: 60, iconKey: 'fan' },
  { key: 'router', name: 'Modem / Router', defaultWatt: 10, iconKey: 'router' },
  { key: 'gameconsole', name: 'Oyun Konsolu', defaultWatt: 200, iconKey: 'gameconsole' },
  { key: 'hood', name: 'Davlumbaz', defaultWatt: 150, iconKey: 'hood' },
  { key: 'stove', name: 'Elektrikli Ocak', defaultWatt: 1500, iconKey: 'stove' },
  { key: 'waterdispenser', name: 'Su Sebili', defaultWatt: 100, iconKey: 'waterdispenser' },
  { key: 'airfryer', name: 'Airfryer', defaultWatt: 1500, iconKey: 'airfryer' },
  { key: 'spaceheater', name: 'Elektrikli Isıtıcı', defaultWatt: 2000, iconKey: 'spaceheater' },
  { key: 'dehumidifier', name: 'Nem Alma Cihazı', defaultWatt: 500, iconKey: 'dehumidifier' },
  { key: 'airpurifier', name: 'Hava Temizleyici', defaultWatt: 50, iconKey: 'airpurifier' },
  { key: 'robotvacuum', name: 'Robot Süpürge', defaultWatt: 40, iconKey: 'robotvacuum' },
  { key: 'hairstraightener', name: 'Saç Düzleştirici', defaultWatt: 45, iconKey: 'hairstraightener' },
  { key: 'shaver', name: 'Tıraş Makinesi', defaultWatt: 15, iconKey: 'shaver' },
  { key: 'breadmaker', name: 'Ekmek Yapma Makinesi', defaultWatt: 600, iconKey: 'breadmaker' },
  { key: 'pressurecooker', name: 'Elektrikli Düdüklü Tencere', defaultWatt: 1000, iconKey: 'pressurecooker' },
  { key: 'printer', name: 'Yazıcı', defaultWatt: 30, iconKey: 'printer' },
  { key: 'projector', name: 'Projeksiyon Cihazı', defaultWatt: 200, iconKey: 'projector' },
  { key: 'smartspeaker', name: 'Akıllı Hoparlör', defaultWatt: 5, iconKey: 'smartspeaker' },
  { key: 'minifridge', name: 'Mini Buzdolabı', defaultWatt: 70, iconKey: 'minifridge' },
  { key: 'waterpurifier', name: 'Su Arıtma Cihazı', defaultWatt: 40, iconKey: 'waterpurifier' },
  { key: 'electricblanket', name: 'Elektrikli Battaniye', defaultWatt: 100, iconKey: 'electricblanket' },
  { key: 'laptop', name: 'Dizüstü Bilgisayar', defaultWatt: 60, iconKey: 'laptop' },
  { key: 'monitor', name: 'Monitör', defaultWatt: 30, iconKey: 'monitor' },
  { key: 'soundbar', name: 'Ses Sistemi (Soundbar)', defaultWatt: 30, iconKey: 'soundbar' },
  { key: 'mediabox', name: 'Medya Kutusu', defaultWatt: 10, iconKey: 'mediabox' },
  { key: 'mixer', name: 'Mikser', defaultWatt: 350, iconKey: 'mixer' },
  { key: 'juicer', name: 'Meyve Sıkacağı', defaultWatt: 400, iconKey: 'juicer' },
  { key: 'waterheatertank', name: 'Termosifon', defaultWatt: 2000, iconKey: 'waterheatertank' },
  { key: 'handvacuum', name: 'El Süpürgesi', defaultWatt: 600, iconKey: 'handvacuum' },
  { key: 'sewingmachine', name: 'Dikiş Makinesi', defaultWatt: 100, iconKey: 'sewingmachine' },
  { key: 'aquarium', name: 'Akvaryum', defaultWatt: 80, iconKey: 'aquarium' },
  { key: 'evcharger', name: 'Elektrikli Araç Şarj Cihazı', defaultWatt: 7400, iconKey: 'evcharger' },
  { key: 'lawnmower', name: 'Çim Biçme Makinesi', defaultWatt: 1200, iconKey: 'lawnmower' },
];

// The devices most households have; shown first and unclustered in the device
// picker so the common case never waits behind a category tap. Also used to
// suggest additions when a bill has a large unexplained share (see ResultStep).
export const COMMON_DEVICE_KEYS = ['fridge', 'lighting', 'tv', 'washer', 'vacuum', 'router', 'kettle', 'iron'];

export interface DeviceCategory {
  label: string;
  keys: string[];
}

// Everything outside COMMON_DEVICE_KEYS, grouped so the device picker can
// disclose the long tail progressively instead of one long card wall.
export const DEVICE_CATEGORIES: DeviceCategory[] = [
  { label: 'Beyaz Eşya', keys: ['dishwasher', 'dryer', 'freezer', 'minifridge'] },
  {
    label: 'Mutfak',
    keys: [
      'oven', 'toaster', 'microwave', 'blender', 'coffee', 'hood',
      'stove', 'waterdispenser', 'airfryer', 'breadmaker', 'pressurecooker', 'waterpurifier',
      'mixer', 'juicer',
    ],
  },
  { label: 'Isıtma & Soğutma', keys: ['ac', 'heater', 'fan', 'spaceheater', 'dehumidifier', 'airpurifier', 'electricblanket', 'waterheatertank'] },
  { label: 'Elektronik', keys: ['pc', 'gameconsole', 'projector', 'smartspeaker', 'printer', 'laptop', 'monitor', 'soundbar', 'mediabox'] },
  { label: 'Temizlik', keys: ['robotvacuum', 'handvacuum'] },
  { label: 'Kişisel Bakım', keys: ['hairdryer', 'hairstraightener', 'shaver'] },
  { label: 'Diğer Ev Aletleri', keys: ['sewingmachine', 'aquarium', 'evcharger', 'lawnmower'] },
];
