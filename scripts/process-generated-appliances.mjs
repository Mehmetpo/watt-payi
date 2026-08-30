import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const sourceRoot = 'C:/Users/cebem/.codex/generated_images/01a0496d-9b5a-78a2-a41d-bf56c920b006';

function seedGrid(left, top, right, bottom, step = 12) {
  const seeds = [];
  for (let y = top; y <= bottom; y += step) {
    for (let x = left; x <= right; x += step) {
      seeds.push({ x, y, safe: true });
    }
  }
  return seeds;
}

const sets = [
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-01'),
    assets: [
      ['light-bulb', 'exec-7fda9d88-41e8-45cf-8b31-afd8947bd98e.png'],
      ['television', 'exec-bac6d036-ebd2-49d9-96b1-615067df1399.png'],
      ['washing-machine', 'exec-1856d14f-7fb5-4373-b517-a9bf76dc1f62.png'],
      ['vacuum-cleaner', 'exec-b9f8ac89-2486-4294-98c8-f1f348473494.png'],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-02'),
    assets: [
      ['air-conditioner', 'exec-187335a1-afd5-4c68-a0ad-a979aea15403.png'],
      ['dishwasher', 'exec-70b70510-df63-44a9-950e-06f6f82041f5.png'],
      ['oven', 'exec-68da9ec0-9bb0-459b-844b-592df777c1e0.png'],
      ['electric-kettle', 'exec-d5fca681-8b99-4f39-91f7-16769684a6d6.png', [{ x: 900, y: 600 }]],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-03'),
    assets: [
      ['microwave', 'exec-7c521e4c-f0c6-4dc9-a74f-8e851e30d369.png'],
      ['iron', 'exec-c0378dea-2177-43cf-bbe4-42fc6462c186.png', [{ x: 780, y: 700 }]],
      ['router', 'exec-df9c60fe-57f2-4a7c-a2c1-8b874748869a.png'],
      ['coffee-machine', 'exec-59b27423-1849-4359-a460-59e17a9b3bb8.png'],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-04'),
    assets: [
      ['air-fryer', 'exec-2812a860-6593-407c-adbc-976583cd449d.png'],
      ['sandwich-press', 'exec-2ef91687-4eab-4521-941f-b66b76bc1ffb.png'],
      ['blender', 'exec-17b3742b-58ad-41b5-bb31-ddd4e52c62d7.png', [{ x: 800, y: 400 }]],
      ['pedestal-fan', 'exec-da96faeb-4075-43fa-801d-2c470797202f.png', [], { removeAllBackground: true }],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-05'),
    assets: [
      ['desktop-computer', 'exec-f43a25bb-36f2-4f52-a889-4cf1dfce49c8.png'],
      ['tumble-dryer', 'exec-4b143b75-c0dd-4402-8910-1d4aa6a1aa41.png'],
      ['electric-shower-heater', 'exec-977ddc3f-a0d8-4497-a93d-94ef5e006583.png', [{ x: 700, y: 1050 }]],
      ['hair-dryer', 'exec-914a6580-622e-49bc-abd6-610ddd8aa555.png'],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-06'),
    assets: [
      ['deep-freezer', 'exec-9c52eaa2-31ec-4d4c-a178-f67678bff45b.png'],
      ['range-hood', 'exec-cf6dd09b-95e3-4437-96ae-a80abc6b0173.png'],
      ['electric-stove', 'exec-5f63aed2-af3c-46c3-973e-a58d210c1951.png'],
      ['water-dispenser', 'exec-179f8499-84d5-42cb-8a12-48b0886a875b.png'],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-07'),
    assets: [
      ['game-console', 'exec-ac363927-afcc-4b05-b460-58f57179425d.png'],
      ['electric-heater', 'exec-5a809432-313d-406f-8f6e-fb1f4418e7bd.png', [{ x: 404, y: 181 }]],
      ['dehumidifier', 'exec-3597eb96-2a1f-44c3-b6bf-050918558451.png'],
      ['air-purifier', 'exec-8a97451c-eb12-4408-82a0-b54a22b83979.png'],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-08'),
    assets: [
      ['refrigerator', 'exec-7c1ba4f7-89e6-44b2-9522-b657a0c6357c.png'],
      ['robot-vacuum', 'exec-f5e5208b-7faf-4653-be0a-21fd449540df.png'],
      ['hair-straightener', 'exec-c5ae6d95-5d89-479c-8893-d95f361fb5ab.png'],
      ['electric-shaver', 'exec-2af018c4-19ef-4beb-9393-8603fbc5235f.png'],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-09'),
    assets: [
      ['bread-maker', 'exec-a6429142-deff-49a0-8954-393ce1f7dc0e.png'],
      ['electric-pressure-cooker', 'exec-916ad1be-cbd5-44de-b8a2-e0efc63b147e.png'],
      ['printer', 'exec-57f05e8f-6a11-4283-a5a6-b1b58807b2b1.png'],
      ['projector', 'exec-bfc8162c-dd90-46ef-8e83-4832f86fde5a.png'],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-10'),
    assets: [
      ['smart-speaker', 'exec-ca89c13a-27af-402a-8849-3ef3ac49aa6f.png'],
      ['mini-refrigerator', 'exec-e9d272e8-0e36-41d9-a612-9fa2add3e603.png'],
      ['water-purifier', 'exec-374e132b-a19d-4310-8490-35f12f6cca53.png'],
      ['electric-blanket', 'exec-69f458f1-98d1-4efa-9897-d88254df111a.png'],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-11'),
    assets: [
      ['laptop', 'exec-2b9c5a80-d867-4fc9-8a4a-3f38e418977b.png'],
      ['monitor', 'exec-c8cf132b-c8d9-4b8d-8347-a0c21defbd14.png'],
      ['soundbar', 'exec-9da75cea-65e2-438a-aeef-dea013b8b7be.png'],
      ['media-box', 'exec-0aa5e2b3-104b-4876-bc35-a892484a10c7.png'],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-12'),
    assets: [
      ['hand-mixer', 'exec-525f80fe-9613-40dc-a76e-fe5006750dc4.png', [
        { x: 920, y: 410 },
        ...seedGrid(80, 760, 450, 1170),
      ]],
      ['juicer', 'exec-0b8c49ae-9986-4a8b-b16b-835d3d6b7588.png', [{ x: 1100, y: 900 }]],
      ['water-heater-tank', 'exec-b3e425da-887c-478f-8a98-dc5cb28bedca.png', [{ x: 960, y: 355 }]],
      ['handheld-vacuum', 'exec-90872877-6e1f-44f3-b029-e12226a5a246.png', [{ x: 960, y: 315 }]],
    ],
  },
  {
    outputRoot: path.resolve('store-assets/canva-appliance-set-13'),
    assets: [
      ['sewing-machine', 'exec-35b14186-92d7-4f07-802b-5826f24636b7.png', [{ x: 700, y: 650 }]],
      ['aquarium', 'exec-a111f5e4-2c5d-4b10-997e-f6e5683fb163.png'],
      ['ev-charger', 'exec-065dc08e-727c-4721-815b-af6678cac3c2.png', [
        ...seedGrid(780, 150, 1080, 1050),
        ...seedGrid(300, 800, 900, 1180),
      ]],
      ['electric-lawn-mower', 'exec-4d218076-cbe9-4967-91be-da4aeea9a732.png', [
        { x: 850, y: 180 },
        { x: 750, y: 450 },
      ]],
    ],
  },
];

function isBackground(r, g, b) {
  const min = Math.min(r, g, b);
  const max = Math.max(r, g, b);
  return min >= 235 && max - min <= 18;
}

async function removeGeneratedCheckerboard(source, destination, extraSeeds = [], options = {}) {
  const { data, info } = await sharp(source)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const pixelCount = width * height;
  const outside = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const enqueue = (index) => {
    if (outside[index]) return;
    const offset = index * channels;
    if (!isBackground(data[offset], data[offset + 1], data[offset + 2])) return;
    outside[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  for (const { x, y, safe } of extraSeeds) {
    if (safe) {
      let safeBackground = true;
      for (let offsetY = -2; offsetY <= 2 && safeBackground; offsetY += 1) {
        for (let offsetX = -2; offsetX <= 2; offsetX += 1) {
          const sampleX = x + offsetX;
          const sampleY = y + offsetY;
          if (sampleX < 0 || sampleX >= width || sampleY < 0 || sampleY >= height) {
            safeBackground = false;
            break;
          }
          const sampleOffset = (sampleY * width + sampleX) * channels;
          if (!isBackground(data[sampleOffset], data[sampleOffset + 1], data[sampleOffset + 2])) {
            safeBackground = false;
            break;
          }
        }
      }
      if (!safeBackground) continue;
    }
    enqueue(y * width + x);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  if (options.removeAllBackground) {
    for (let index = 0; index < pixelCount; index += 1) {
      const offset = index * channels;
      if (isBackground(data[offset], data[offset + 1], data[offset + 2])) {
        outside[index] = 1;
      }
    }
  }

  const rgba = Buffer.alloc(pixelCount * 4);
  for (let index = 0; index < pixelCount; index += 1) {
    const sourceOffset = index * channels;
    const targetOffset = index * 4;
    rgba[targetOffset] = data[sourceOffset];
    rgba[targetOffset + 1] = data[sourceOffset + 1];
    rgba[targetOffset + 2] = data[sourceOffset + 2];
    rgba[targetOffset + 3] = outside[index] ? 0 : 255;
  }

  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .resize(1024, 1024, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9, palette: true, quality: 100 })
    .toFile(destination);
}

for (const set of sets) {
  await mkdir(set.outputRoot, { recursive: true });

  for (const [name, filename, extraSeeds, options] of set.assets) {
    const source = path.join(sourceRoot, filename);
    const destination = path.join(set.outputRoot, `${name}.png`);
    await removeGeneratedCheckerboard(source, destination, extraSeeds, options);
    const metadata = await sharp(destination).metadata();
    console.log(`${name}: ${metadata.width}x${metadata.height}, alpha=${metadata.hasAlpha}`);
  }
}
