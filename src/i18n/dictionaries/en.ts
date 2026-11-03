import { EN_DEVICES } from './devices';
import { en as components } from './components';

export const en: Record<string, string> = {
  ...EN_DEVICES,
  'device.other': 'Other / Unknown Usage',
  ...components,
};
