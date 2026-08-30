import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'public', 'appliances', '3d');

const SOURCE_BY_ICON_KEY = {
  fridge: 'store-assets/canva-appliance-set-08/refrigerator.png',
  ac: 'store-assets/canva-appliance-set-02/air-conditioner.png',
  washer: 'store-assets/canva-appliance-set-01/washing-machine.png',
  dishwasher: 'store-assets/canva-appliance-set-02/dishwasher.png',
  oven: 'store-assets/canva-appliance-set-02/oven.png',
  toaster: 'store-assets/canva-appliance-set-04/sandwich-press.png',
  kettle: 'store-assets/canva-appliance-set-02/electric-kettle.png',
  tv: 'store-assets/canva-appliance-set-01/television.png',
  pc: 'store-assets/canva-appliance-set-05/desktop-computer.png',
  lighting: 'store-assets/canva-appliance-set-01/light-bulb.png',
  vacuum: 'store-assets/canva-appliance-set-01/vacuum-cleaner.png',
  dryer: 'store-assets/canva-appliance-set-05/tumble-dryer.png',
  heater: 'store-assets/canva-appliance-set-05/electric-shower-heater.png',
  microwave: 'store-assets/canva-appliance-set-03/microwave.png',
  iron: 'store-assets/canva-appliance-set-03/iron.png',
  hairdryer: 'store-assets/canva-appliance-set-05/hair-dryer.png',
  freezer: 'store-assets/canva-appliance-set-06/deep-freezer.png',
  blender: 'store-assets/canva-appliance-set-04/blender.png',
  coffee: 'store-assets/canva-appliance-set-03/coffee-machine.png',
  fan: 'store-assets/canva-appliance-set-04/pedestal-fan.png',
  router: 'store-assets/canva-appliance-set-03/router.png',
  gameconsole: 'store-assets/canva-appliance-set-07/game-console.png',
  hood: 'store-assets/canva-appliance-set-06/range-hood.png',
  stove: 'store-assets/canva-appliance-set-06/electric-stove.png',
  waterdispenser: 'store-assets/canva-appliance-set-06/water-dispenser.png',
  airfryer: 'store-assets/canva-appliance-set-04/air-fryer.png',
  spaceheater: 'store-assets/canva-appliance-set-07/electric-heater.png',
  dehumidifier: 'store-assets/canva-appliance-set-07/dehumidifier.png',
  airpurifier: 'store-assets/canva-appliance-set-07/air-purifier.png',
  robotvacuum: 'store-assets/canva-appliance-set-08/robot-vacuum.png',
  hairstraightener: 'store-assets/canva-appliance-set-08/hair-straightener.png',
  shaver: 'store-assets/canva-appliance-set-08/electric-shaver.png',
  breadmaker: 'store-assets/canva-appliance-set-09/bread-maker.png',
  pressurecooker: 'store-assets/canva-appliance-set-09/electric-pressure-cooker.png',
  printer: 'store-assets/canva-appliance-set-09/printer.png',
  projector: 'store-assets/canva-appliance-set-09/projector.png',
  smartspeaker: 'store-assets/canva-appliance-set-10/smart-speaker.png',
  minifridge: 'store-assets/canva-appliance-set-10/mini-refrigerator.png',
  waterpurifier: 'store-assets/canva-appliance-set-10/water-purifier.png',
  electricblanket: 'store-assets/canva-appliance-set-10/electric-blanket.png',
  laptop: 'store-assets/canva-appliance-set-11/laptop.png',
  monitor: 'store-assets/canva-appliance-set-11/monitor.png',
  soundbar: 'store-assets/canva-appliance-set-11/soundbar.png',
  mediabox: 'store-assets/canva-appliance-set-11/media-box.png',
  mixer: 'store-assets/canva-appliance-set-12/hand-mixer.png',
  juicer: 'store-assets/canva-appliance-set-12/juicer.png',
  waterheatertank: 'store-assets/canva-appliance-set-12/water-heater-tank.png',
  handvacuum: 'store-assets/canva-appliance-set-12/handheld-vacuum.png',
  sewingmachine: 'store-assets/canva-appliance-set-13/sewing-machine.png',
  aquarium: 'store-assets/canva-appliance-set-13/aquarium.png',
  evcharger: 'store-assets/canva-appliance-set-13/ev-charger.png',
  lawnmower: 'store-assets/canva-appliance-set-13/electric-lawn-mower.png',
};

await mkdir(OUTPUT_DIR, { recursive: true });

await Promise.all(
  Object.entries(SOURCE_BY_ICON_KEY).map(async ([iconKey, relativeSource]) => {
    const source = path.join(ROOT, relativeSource);
    const output = path.join(OUTPUT_DIR, `${iconKey}.webp`);

    await sharp(source)
      .resize(384, 384, { fit: 'contain' })
      .webp({ quality: 88, alphaQuality: 100, smartSubsample: true })
      .toFile(output);
  }),
);

console.log(`${Object.keys(SOURCE_BY_ICON_KEY).length} cihaz görseli uygulama için hazırlandı.`);
