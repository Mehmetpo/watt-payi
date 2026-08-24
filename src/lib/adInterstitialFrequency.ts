import { Preferences } from '@capacitor/preferences';

export const AD_BILL_ADD_COUNT_KEY = 'ad_bill_add_count';

// Showing a full-screen ad after every single bill would be obnoxious for a
// utility app people open monthly — only every Nth successful save earns one.
export const INTERSTITIAL_EVERY_N_BILLS = 3;

export async function shouldShowInterstitialForBillAdd(): Promise<boolean> {
  try {
    const { value } = await Preferences.get({ key: AD_BILL_ADD_COUNT_KEY });
    const count = (value ? parseInt(value, 10) : 0) + 1;
    await Preferences.set({ key: AD_BILL_ADD_COUNT_KEY, value: String(count) });
    return count % INTERSTITIAL_EVERY_N_BILLS === 0;
  } catch (err) {
    console.error('adInterstitialFrequency: sayaç okunamadı/yazılamadı', err);
    return false;
  }
}
