import * as Notifications from 'expo-notifications';
import { getDosesForDate } from '@/lib/schedule/calculator';
import type { Medication } from '@/types';
import { addDays, startOfDay, setHours, setMinutes, isAfter, isBefore } from 'date-fns';

// Schedule notifications for next 7 days
export async function scheduleNotificationsForMedication(medication: Medication): Promise<void> {
  if (medication.isPrn || !medication.isActive) {
    return;
  }

  // Cancel existing notifications for this medication
  await cancelNotificationsForMedication(medication.id);

  const today = startOfDay(new Date());
  
  // Schedule for next 7 days
  for (let i = 0; i < 7; i++) {
    const date = addDays(today, i);
    const doses = getDosesForDate(medication, date);

    for (const dose of doses) {
      // Only schedule future doses
      if (isAfter(dose.time, new Date())) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Medication Reminder',
              body: `Time to take ${medication.name}`,
              data: {
                medicationId: medication.id,
                medicationName: medication.name,
                dosageAmount: dose.dosageAmount,
                dosageUnit: dose.dosageUnit,
                scheduledTime: dose.time.toISOString(),
              },
              sound: 'default',
              priority: Notifications.AndroidNotificationPriority.MAX,
              categoryIdentifier: 'MEDICATION_REMINDER',
            },
            trigger: {
              date: dose.time,
              channelId: 'medication_reminders',
            },
          });
        } catch (error) {
          console.error('Failed to schedule notification:', error);
        }
      }
    }
  }
}

export async function scheduleNotificationsForAllMedications(medications: Medication[]): Promise<void> {
  for (const medication of medications) {
    await scheduleNotificationsForMedication(medication);
  }
}

export async function cancelNotificationsForMedication(medicationId: string): Promise<void> {
  const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of scheduledNotifications) {
    if (notification.content.data?.medicationId === medicationId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Reschedule all notifications (call this daily or when medications change)
export async function rescheduleAllNotifications(medications: Medication[]): Promise<void> {
  await cancelAllNotifications();
  await scheduleNotificationsForAllMedications(medications);
}
