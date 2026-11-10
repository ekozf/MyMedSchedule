/**
 * "Send a test reminder" (Settings → Reminders): one local notification a few seconds from now
 * with the normal reminder title and channel, so people can see and hear what a reminder is like.
 * No dose data and no Take / Skip actions, so tapping it does nothing special.
 *
 * @example
 * await scheduleTestReminder(i18n.t('ui.you.reminders.testBody')); // arrives in 5 s
 */
import * as Notifications from 'expo-notifications';
import i18n from '@/lib/i18n';
import { requestNotificationPermissions } from './permissions';

export const TEST_REMINDER_DELAY_S = 5;

/** Resolves false when reminders aren't allowed (nothing is scheduled then). */
export async function scheduleTestReminder(body: string): Promise<boolean> {
  // Sets up the Android channel when allowed; never shows the OS dialog.
  const allowed = await requestNotificationPermissions();
  if (!allowed) return false;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return false;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: i18n.t('notifications.medicationReminder'),
      body,
      data: { kind: 'test' },
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: TEST_REMINDER_DELAY_S,
      channelId: 'medication_reminders',
    },
  });
  return true;
}
