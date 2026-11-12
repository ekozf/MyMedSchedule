import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { initDatabase } from '@/lib/db';
import { initializeLocale } from '@/lib/i18n';
import { handleReminderAction, parseTaskResponse } from '@/lib/notifications/handlers';

/**
 * Android only: reminder buttons (Take / Snooze / Skip) don't open the app, so when the app is in
 * the background or closed, expo-notifications delivers the press only to this task. Without it
 * the buttons do nothing. The app may have been started just for this, so the task opens the
 * database itself.
 */
export const NOTIFICATION_ACTION_TASK = 'notification-action-task';

// Must be defined in module scope, from the entry file (index.js), so it exists in a headless start.
TaskManager.defineTask(NOTIFICATION_ACTION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('Reminder action task failed:', error);
    return;
  }
  const response = parseTaskResponse(data);
  if (!response) return;
  try {
    try {
      await initializeLocale();
    } catch {
      // Falls back to the default language for the snoozed reminder text.
    }
    await initDatabase();
    await handleReminderAction(response.actionIdentifier, response.notificationId, response.data);
  } catch (err) {
    console.error('Could not handle reminder action in the background:', err);
  }
});

export async function registerNotificationActionTask(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.registerTaskAsync(NOTIFICATION_ACTION_TASK);
  } catch (error) {
    console.warn('Could not register the reminder action task:', error);
  }
}
