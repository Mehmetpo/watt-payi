import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEVICE_CATALOG } from '../data/deviceCatalog';
import { getApplianceVisualSrc } from './applianceVisuals';

describe('getApplianceVisualSrc', () => {
  it('provides an existing production image for every catalog appliance', () => {
    for (const device of DEVICE_CATALOG) {
      const imageSrc = getApplianceVisualSrc(device.iconKey);

      expect(imageSrc, `${device.name} için görsel eşlemesi eksik`).toBe(
        `/appliances/3d/${device.iconKey}.webp`,
      );
      expect(
        existsSync(resolve(process.cwd(), 'public', imageSrc!.slice(1))),
        `${device.name} için üretim görseli eksik: ${imageSrc}`,
      ).toBe(true);
    }
  });

  it('keeps the line icon fallback for unknown appliance keys', () => {
    expect(getApplianceVisualSrc('other')).toBeNull();
    expect(getApplianceVisualSrc('not-in-catalog')).toBeNull();
  });
});
