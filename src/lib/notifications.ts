import { LocalNotifications } from '@capacitor/local-notifications';
import { DICTIONARIES } from '../i18n/dictionaries';
import type { Lang } from '../i18n/language';
import { translate } from '../i18n/translate';

const REMINDER_NOTIFICATION_ID = 1001;

export async function scheduleMonthlyReminder(
  dayOfMonth: number,
  lang: Lang = 'tr',
  { requestPermission = true }: { requestPermission?: boolean } = {},
): Promise<void> {
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') {
    if (!requestPermission) return;
    const requested = await LocalNotifications.requestPermissions();
    if (requested.display !== 'granted') return;
  }

  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIFICATION_ID }] });

  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_NOTIFICATION_ID,
        title: translate(DICTIONARIES, lang, 'reminder.title'),
        body: translate(DICTIONARIES, lang, 'reminder.body'),
        schedule: {
          on: { day: dayOfMonth, hour: 10, minute: 0 },
          repeats: true,
        },
      },
    ],
  });
}
