import { EN_DEVICES } from './devices';
import { en as components } from './components';
import { en as auth } from './auth';
import { en as home } from './home';
import { en as history } from './history';
import { en as profile } from './profile';

export const en: Record<string, string> = {
  ...EN_DEVICES,
  'device.other': 'Other / Unknown Usage',
  ...components,
  ...auth,
  ...home,
  ...history,
  ...profile,
};
