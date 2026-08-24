import { Preferences } from '@capacitor/preferences';

export const ONBOARDING_SEEN_KEY = 'onboarding_seen_v1';

export async function getOnboardingSeen(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: ONBOARDING_SEEN_KEY });
    return value === 'true';
  } catch (err) {
    console.error('onboardingStorage: seen bayrağı okunamadı', err);
    return false;
  }
}

export async function setOnboardingSeen(): Promise<void> {
  try {
    await Preferences.set({ key: ONBOARDING_SEEN_KEY, value: 'true' });
  } catch (err) {
    console.error('onboardingStorage: seen bayrağı kaydedilemedi', err);
  }
}
