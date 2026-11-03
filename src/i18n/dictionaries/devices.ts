// Device and category labels. The Turkish names mirror DEVICE_CATALOG (they are
// also what gets stored in bill_items.device_name); dictionaries.test.ts keeps
// them in sync.
import { DEVICE_CATALOG, DEVICE_CATEGORIES } from '../../data/deviceCatalog';

const EN_DEVICE_NAMES: Record<string, string> = {
  fridge: 'Refrigerator',
  ac: 'Air Conditioner',
  washer: 'Washing Machine',
  dishwasher: 'Dishwasher',
  oven: 'Oven',
  toaster: 'Toaster',
  kettle: 'Electric Kettle',
  tv: 'Television',
  pc: 'Desktop Computer',
  lighting: 'Lighting',
  vacuum: 'Vacuum Cleaner',
  dryer: 'Clothes Dryer',
  heater: 'Instant Water Heater',
  microwave: 'Microwave',
  iron: 'Iron',
  hairdryer: 'Hair Dryer',
  freezer: 'Chest Freezer',
  blender: 'Blender',
  coffee: 'Coffee Maker',
  fan: 'Fan',
  router: 'Modem / Router',
  gameconsole: 'Game Console',
  hood: 'Range Hood',
  stove: 'Electric Stove',
  waterdispenser: 'Water Dispenser',
  airfryer: 'Air Fryer',
  spaceheater: 'Space Heater',
  dehumidifier: 'Dehumidifier',
  airpurifier: 'Air Purifier',
  robotvacuum: 'Robot Vacuum',
  hairstraightener: 'Hair Straightener',
  shaver: 'Electric Shaver',
  breadmaker: 'Bread Maker',
  pressurecooker: 'Electric Pressure Cooker',
  printer: 'Printer',
  projector: 'Projector',
  smartspeaker: 'Smart Speaker',
  minifridge: 'Mini Fridge',
  waterpurifier: 'Water Purifier',
  electricblanket: 'Electric Blanket',
  laptop: 'Laptop',
  monitor: 'Monitor',
  soundbar: 'Soundbar',
  mediabox: 'Media Box',
  mixer: 'Mixer',
  juicer: 'Juicer',
  waterheatertank: 'Storage Water Heater',
  handvacuum: 'Handheld Vacuum',
  sewingmachine: 'Sewing Machine',
  aquarium: 'Aquarium',
  evcharger: 'EV Charger',
  lawnmower: 'Lawn Mower',
};

const EN_CATEGORY_LABELS: Record<string, string> = {
  whiteGoods: 'Major Appliances',
  kitchen: 'Kitchen',
  climate: 'Heating & Cooling',
  electronics: 'Electronics',
  cleaning: 'Cleaning',
  personalCare: 'Personal Care',
  otherAppliances: 'Other Appliances',
};

export const TR_DEVICES: Record<string, string> = {
  ...Object.fromEntries(DEVICE_CATALOG.map((d) => [`device.${d.key}`, d.name])),
  ...Object.fromEntries(DEVICE_CATEGORIES.map((c) => [`deviceCategory.${c.id}`, c.label])),
};

export const EN_DEVICES: Record<string, string> = {
  ...Object.fromEntries(DEVICE_CATALOG.map((d) => [`device.${d.key}`, EN_DEVICE_NAMES[d.key] ?? d.name])),
  ...Object.fromEntries(
    DEVICE_CATEGORIES.map((c) => [`deviceCategory.${c.id}`, EN_CATEGORY_LABELS[c.id] ?? c.label]),
  ),
};
