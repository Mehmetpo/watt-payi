import type { DeviceCatalogEntry } from '../types/domain';

export const DEVICE_CATALOG: DeviceCatalogEntry[] = [
  { key: 'fridge', name: 'Buzdolabı', defaultWatt: 130, iconKey: 'fridge' },
  { key: 'ac', name: 'Klima', defaultWatt: 1200, iconKey: 'ac' },
  { key: 'washer', name: 'Çamaşır Makinesi', defaultWatt: 700, iconKey: 'washer' },
  { key: 'dishwasher', name: 'Bulaşık Makinesi', defaultWatt: 1300, iconKey: 'dishwasher' },
  { key: 'oven', name: 'Fırın', defaultWatt: 2000, iconKey: 'oven' },
  { key: 'toaster', name: 'Tost Makinesi', defaultWatt: 800, iconKey: 'toaster' },
  { key: 'kettle', name: 'Su Isıtıcısı', defaultWatt: 2000, iconKey: 'kettle' },
  { key: 'tv', name: 'Televizyon', defaultWatt: 120, iconKey: 'tv' },
  { key: 'pc', name: 'Bilgisayar', defaultWatt: 250, iconKey: 'pc' },
  { key: 'lighting', name: 'Aydınlatma', defaultWatt: 200, iconKey: 'lighting' },
  { key: 'vacuum', name: 'Süpürge', defaultWatt: 900, iconKey: 'vacuum' },
  { key: 'dryer', name: 'Kurutucu', defaultWatt: 2500, iconKey: 'dryer' },
  { key: 'heater', name: 'Şofben', defaultWatt: 2000, iconKey: 'heater' },
];
