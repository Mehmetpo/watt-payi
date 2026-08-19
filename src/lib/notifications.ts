import { LocalNotifications } from '@capacitor/local-notifications';

const REMINDER_NOTIFICATION_ID = 1001;

export async function scheduleMonthlyReminder(dayOfMonth: number): Promise<void> {
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') {
    const requested = await LocalNotifications.requestPermissions();
    if (requested.display !== 'granted') return;
  }

  await LocalNotifications.cancel({ notifications: [{ id: REMINDER_NOTIFICATION_ID }] });

  await LocalNotifications.schedule({
    notifications: [
      {
        id: REMINDER_NOTIFICATION_ID,
        title: 'Watt Payı',
        body: 'Bu ayın faturasını eklemeyi unutma.',
        schedule: {
          on: { day: dayOfMonth, hour: 10, minute: 0 },
          repeats: true,
        },
      },
    ],
  });
}
