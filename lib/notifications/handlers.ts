import * as Notifications from 'expo-notifications';
import { 
  createIntakeLog, 
  getActiveProfile,
  getMedicationById,
  updateMedicationInventory 
} from '@/lib/db/operations';

// Set up how notifications should be handled when the app is in the foreground
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
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
      buttonTitle: 'Mark as Taken',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'SNOOZE',
      buttonTitle: 'Snooze 15min',
      options: {
        opensAppToForeground: false,
      },
    },
    {
      identifier: 'SKIP',
      buttonTitle: 'Skip',
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

    // Create intake log
    await createIntakeLog({
      medicationId: data.medicationId,
      profileId: profile.id,
      scheduledTime: data.scheduledTime,
      actualTime: new Date(),
      action: 'taken',
      dosageAmount: data.dosageAmount,
    });

    // Update inventory
    const medication = await getMedicationById(data.medicationId);
    if (medication) {
      const newCount = Math.max(0, medication.inventoryCount - data.dosageAmount);
      await updateMedicationInventory(medication.id, newCount);
    }
  } catch (error) {
    console.error('Failed to log intake from notification:', error);
  }
}

async function handleSnoozeAction(data: any) {
  try {
    const snoozeTime = new Date();
    snoozeTime.setMinutes(snoozeTime.getMinutes() + 15);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Medication Reminder (Snoozed)',
        body: `Time to take ${data.medicationName}`,
        data,
        sound: 'default',
        categoryIdentifier: 'MEDICATION_REMINDER',
      },
      trigger: {
        date: snoozeTime,
        channelId: 'medication_reminders',
      },
    });
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
  } catch (error) {
    console.error('Failed to log skip from notification:', error);
  }
}
