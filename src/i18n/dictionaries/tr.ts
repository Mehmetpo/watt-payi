import { TR_DEVICES } from './devices';
import { tr as components } from './components';

export const tr: Record<string, string> = {
  ...TR_DEVICES,
  'device.other': 'Diğer / Bilinmeyen Tüketim',
  ...components,
};
