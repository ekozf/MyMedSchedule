import * as Notifications from 'expo-notifications';
import {
  createIntakeLog,
  createIntakeLogAndUpdateInventory,
  getActiveProfile,
  InventoryInsufficientError,
} from '@/lib/db/operations';
import i18n from '@/lib/i18n';
import { ensureNext3DoseNotificationsForMedication } from '@/lib/notifications/scheduler';

// Set up how notifications should be handled when the app is in the foreground
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      // shouldShowAlert is deprecated; keep notifications visible in foreground via banner/list.
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// Set up notification categories with actions
export async function setupNotificationCategories() {
  await Notifications.setNotificationCategoryAsync('MEDICATION_REMINDER', [
    {
      identifier: 'TAKE',
      buttonTitle: i18n.t('notifications.actions.take'),
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: i18n.t('notifications.actions.snooze15'),
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'SKIP',
      buttonTitle: i18n.t('notifications.actions.skip'),
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

// Handle notification responses (when user taps on notification or action button)
export function handleNotificationResponse(response: Notifications.NotificationResponse) {
  const { notification, actionIdentifier } = response;
  const data = notification.request.content.data;

  switch (actionIdentifier) {
    case 'TAKE':
      handleTakeAction(data);
      break;
    case 'SNOOZE':
      handleSnoozeAction(data);
      break;
    case 'SKIP':
      handleSkipAction(data);
      break;
    case Notifications.DEFAULT_ACTION_IDENTIFIER:
      // User tapped the notification itself (opens app)
      break;
  }
}

async function handleTakeAction(data: any) {
  try {
    const profile = await getActiveProfile();
    if (!profile) return;

    await createIntakeLogAndUpdateInventory({
      medicationId: data.medicationId,
      profileId: profile.id,
      scheduledTime: data.scheduledTime,
      actualTime: new Date(),
      action: 'taken',
      dosageAmount: data.dosageAmount,
    });

    // Keep next-3 buffer topped up
    await ensureNext3DoseNotificationsForMedication(data.medicationId);
  } catch (error) {
    if (
      error instanceof InventoryInsufficientError ||
      (error as any)?.name === 'InventoryInsufficientError'
    ) {
      // Not enough inventory: do not log or decrement.
      console.warn('Skipped logging intake from notification due to insufficient inventory');
      return;
    }
    console.error('Failed to log intake from notification:', error);
  }
}

async function handleSnoozeAction(data: any) {
  try {
    const snoozeTime = new Date();
    snoozeTime.setMinutes(snoozeTime.getMinutes() + 15);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.snoozedTitle'),
        body: i18n.t('notifications.snoozedBody', { medication: data.medicationName }),
        data: {
          ...data,
          kind: 'snooze',
        },
        sound: 'default',
        categoryIdentifier: 'MEDICATION_REMINDER',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeTime,
        channelId: 'medication_reminders',
      },
    });

    // Also keep normal dose reminders at next-3
    if (data?.medicationId) {
      await ensureNext3DoseNotificationsForMedication(data.medicationId);
    }
  } catch (error) {
    console.error('Failed to snooze notification:', error);
  }
}

async function handleSkipAction(data: any) {
  try {
    const profile = await getActiveProfile();
    if (!profile) return;

    await createIntakeLog({
      medicationId: data.medicationId,
      profileId: profile.id,
      scheduledTime: data.scheduledTime,
      actualTime: new Date(),
      action: 'skipped',
      dosageAmount: data.dosageAmount,
    });

    // Keep next-3 buffer topped up
    await ensureNext3DoseNotificationsForMedication(data.medicationId);
  } catch (error) {
    console.error('Failed to log skip from notification:', error);
  }
}
