import { TR_DEVICES } from './devices';
import { tr as components } from './components';
import { tr as auth } from './auth';
import { tr as home } from './home';
import { tr as history } from './history';
import { tr as profile } from './profile';

export const tr: Record<string, string> = {
  ...TR_DEVICES,
  'device.other': 'Diğer / Bilinmeyen Tüketim',
  ...components,
  ...auth,
  ...home,
  ...history,
  ...profile,
};
