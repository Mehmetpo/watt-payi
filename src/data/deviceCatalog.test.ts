import { describe, expect, it } from 'vitest';
import { DEVICE_CATALOG, DEVICE_CATEGORIES } from './deviceCatalog';

describe('device catalog game console entry', () => {
  it('shows one generic game console in the electronics picker', () => {
    const consoles = DEVICE_CATALOG
      .filter((device) => device.iconKey === 'gameconsole')
      .map(({ key, name }) => ({ key, name }));
    const electronics = DEVICE_CATEGORIES.find((category) => category.label === 'Elektronik');

    expect(consoles).toEqual([{ key: 'gameconsole', name: 'Oyun Konsolu' }]);
    expect(electronics?.keys.filter((key) => ['gameconsole', 'playstation', 'xbox'].includes(key)))
      .toEqual(['gameconsole']);
  });
});
